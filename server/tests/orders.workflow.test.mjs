import assert from "node:assert/strict";
import { test } from "node:test";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { handleStripeWebhookEvent } from "../routes/orders.js";

test("checkout.session.completed marks order paid and updates stock", async () => {
  const originals = {
    findById: Order.findById,
    findOne: Order.findOne,
    productFindById: Product.findById,
  };

  const order = {
    _id: "order-1",
    status: "pending",
    paymentProvider: "stripe",
    paymentSessionId: null,
    paymentIntentId: null,
    checkoutUrl: null,
    paidAt: null,
    items: [{ product: "product-1", size: "9", quantity: 2 }],
    save: async () => order,
  };

  const product = {
    _id: "product-1",
    sizeOptions: [
      { size: "9", stock: 5 },
      { size: "10", stock: 4 },
    ],
    totalStock: 9,
    save: async () => product,
  };

  Order.findById = async (id) => (id === "order-1" ? order : null);
  Order.findOne = async () => null;
  Product.findById = async (id) => (id === "product-1" ? product : null);

  try {
    const result = await handleStripeWebhookEvent({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          metadata: { orderId: "order-1" },
          payment_intent: "pi_test_1",
        },
      },
    });

    assert.equal(result.handled, true);
    assert.equal(order.status, "paid");
    assert.equal(order.paymentSessionId, "cs_test_1");
    assert.equal(order.paymentIntentId, "pi_test_1");
    assert.ok(order.paidAt instanceof Date);
    assert.equal(product.sizeOptions[0].stock, 3);
    assert.equal(product.totalStock, 7);
  } finally {
    Order.findById = originals.findById;
    Order.findOne = originals.findOne;
    Product.findById = originals.productFindById;
  }
});

test("checkout.session.expired marks pending order failed", async () => {
  const originals = {
    findById: Order.findById,
    findOne: Order.findOne,
  };

  const order = {
    _id: "order-2",
    status: "pending",
    save: async () => order,
  };

  Order.findById = async (id) => (id === "order-2" ? order : null);
  Order.findOne = async () => null;

  try {
    const result = await handleStripeWebhookEvent({
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_test_2",
          metadata: { orderId: "order-2" },
        },
      },
    });

    assert.equal(result.handled, true);
    assert.equal(order.status, "failed");
  } finally {
    Order.findById = originals.findById;
    Order.findOne = originals.findOne;
  }
});
