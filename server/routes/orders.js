import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import auth from "../middleware/auth.js";
import verifiedEmail from "../middleware/verifiedEmail.js";
import { sanitizeText, toSafeNumber } from "../utils/validators.js";

const router = express.Router();
const DEFAULT_CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

let stripeInstance;
async function getStripeClient() {
  if (stripeInstance) return stripeInstance;
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const stripeModule = await import("stripe");
    stripeInstance = new stripeModule.default(process.env.STRIPE_SECRET_KEY);
    return stripeInstance;
  } catch {
    return null;
  }
}

function buildShippingAddress(input = {}) {
  return {
    name: sanitizeText(input.name),
    email: sanitizeText(input.email),
    line1: sanitizeText(input.line1),
    line2: sanitizeText(input.line2),
    city: sanitizeText(input.city),
    state: sanitizeText(input.state),
    postalCode: sanitizeText(input.postalCode),
    country: sanitizeText(input.country || "US"),
  };
}

function isOrderOwner(orderUserId, authUserId) {
  return String(orderUserId) === String(authUserId);
}

async function applyOrderInventory(order) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0 && item.size) {
      const idx = product.sizeOptions.findIndex((option) => option.size === item.size);
      if (idx >= 0) {
        const currentStock = Number(product.sizeOptions[idx].stock) || 0;
        product.sizeOptions[idx].stock = Math.max(0, currentStock - item.quantity);
      }
      product.totalStock = product.sizeOptions.reduce(
        (sum, option) => sum + (Number(option.stock) || 0),
        0
      );
    } else {
      product.totalStock = Math.max(0, (Number(product.totalStock) || 0) - item.quantity);
    }

    await product.save();
  }
}

async function markOrderPaid(order, paymentMeta = {}) {
  if (!order) return null;
  if (order.status === "paid") return order;

  order.status = "paid";
  order.paymentProvider = paymentMeta.paymentProvider || order.paymentProvider;
  order.paymentSessionId = paymentMeta.paymentSessionId || order.paymentSessionId;
  order.paymentIntentId = paymentMeta.paymentIntentId || order.paymentIntentId;
  order.checkoutUrl = paymentMeta.checkoutUrl || order.checkoutUrl;
  order.paidAt = new Date();
  await order.save();

  await applyOrderInventory(order);
  return order;
}

async function findOrderBySessionId(sessionId) {
  if (!sessionId) return null;
  return Order.findOne({ paymentSessionId: sessionId });
}

export async function handleStripeWebhookEvent(event) {
  if (!event || !event.type) return { handled: false, message: "Invalid event payload" };

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const orderId = session?.metadata?.orderId;
    const order =
      (orderId ? await Order.findById(orderId) : null) ||
      (await findOrderBySessionId(session?.id));

    if (!order) return { handled: false, message: "Order not found for completed session" };

    await markOrderPaid(order, {
      paymentProvider: "stripe",
      paymentSessionId: session?.id,
      paymentIntentId: session?.payment_intent,
      checkoutUrl: session?.url || order.checkoutUrl,
    });

    return { handled: true, message: "Order marked as paid" };
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data?.object;
    const orderId = session?.metadata?.orderId;
    const order =
      (orderId ? await Order.findById(orderId) : null) ||
      (await findOrderBySessionId(session?.id));

    if (!order) return { handled: false, message: "Order not found for expired session" };

    if (order.status !== "paid") {
      order.status = "failed";
      await order.save();
    }

    return { handled: true, message: "Order marked as failed due to session expiry" };
  }

  return { handled: true, message: `Event ignored: ${event.type}` };
}

router.get("/me", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json({ orders });
  } catch {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!isOrderOwner(order.user, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    return res.json({ order });
  } catch {
    return res.status(500).json({ message: "Failed to load order" });
  }
});

router.post("/checkout", auth, verifiedEmail, async (req, res) => {
  try {
    const { items = [], shippingAddress = {}, forceMock = false } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const sanitizedItems = items
      .map((item) => ({
        productId: sanitizeText(item.productId || item.id),
        quantity: Math.max(1, Math.floor(toSafeNumber(item.quantity, 1))),
        size: sanitizeText(item.size),
      }))
      .filter((item) => item.productId);

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ message: "No valid items in cart" });
    }

    const productIds = sanitizedItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));

    const orderItems = [];
    for (const item of sanitizedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        return res.status(400).json({ message: "One or more products no longer exist" });
      }

      if (Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0 && item.size) {
        const selectedSize = product.sizeOptions.find((sizeOption) => sizeOption.size === item.size);
        if (!selectedSize || selectedSize.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name} (${item.size})`,
          });
        }
      } else if (product.totalStock > 0 && product.totalStock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      const lineTotal = Number((product.price * item.quantity).toFixed(2));
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        size: item.size,
        quantity: item.quantity,
        price: product.price,
        lineTotal,
      });
    }

    const subtotal = Number(
      orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );
    const shippingFee = subtotal >= 150 ? 0 : 9.99;
    const tax = Number((subtotal * 0.08).toFixed(2));
    const total = Number((subtotal + shippingFee + tax).toFixed(2));

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      subtotal,
      shippingFee,
      tax,
      total,
      paymentProvider: "mock",
      shippingAddress: buildShippingAddress(shippingAddress),
      paidAt: null,
    });

    const stripe = forceMock ? null : await getStripeClient();
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${DEFAULT_CLIENT_URL}/checkout/success?orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${DEFAULT_CLIENT_URL}/checkout/cancel?orderId=${order._id}`,
        line_items: orderItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(item.price * 100),
            product_data: {
              name: item.name,
              images: item.image ? [item.image] : [],
              metadata: {
                size: item.size || "N/A",
              },
            },
          },
        })),
        metadata: {
          orderId: String(order._id),
          userId: String(req.user.id),
        },
      });

      order.paymentProvider = "stripe";
      order.paymentSessionId = session.id;
      order.checkoutUrl = session.url;
      await order.save();

      return res.json({
        message: "Checkout session created",
        checkoutUrl: session.url,
        orderId: order._id,
        paymentProvider: "stripe",
      });
    }

    const checkoutUrl = `${DEFAULT_CLIENT_URL}/checkout/success?mock=1&orderId=${order._id}`;
    order.checkoutUrl = checkoutUrl;
    order.paymentProvider = "mock";
    await order.save();

    return res.json({
      message: "Mock checkout created",
      checkoutUrl,
      orderId: order._id,
      paymentProvider: "mock",
    });
  } catch {
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
});

router.post("/:id/mock-confirm", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!isOrderOwner(order.user, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to confirm this order" });
    }

    const paidOrder = await markOrderPaid(order, {
      paymentProvider: order.paymentProvider || "mock",
      paymentSessionId: order.paymentSessionId,
      paymentIntentId: order.paymentIntentId,
      checkoutUrl: order.checkoutUrl,
    });
    return res.json({ message: "Order confirmed", order: paidOrder });
  } catch {
    return res.status(500).json({ message: "Failed to confirm order" });
  }
});

router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!isOrderOwner(order.user, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    if (order.status === "paid") {
      return res.status(400).json({ message: "Paid orders cannot be cancelled from this endpoint" });
    }

    order.status = "cancelled";
    await order.save();
    return res.json({ message: "Order cancelled", order });
  } catch {
    return res.status(500).json({ message: "Failed to cancel order" });
  }
});

router.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).send("Stripe is not configured");
    }

    const signature = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) {
      return res.status(400).send("Missing stripe signature or webhook secret");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch (error) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    await handleStripeWebhookEvent(event);
    return res.status(200).json({ received: true });
  } catch {
    return res.status(500).json({ message: "Failed to process Stripe webhook" });
  }
});

export default router;
