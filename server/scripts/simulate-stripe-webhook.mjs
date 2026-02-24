import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

function parseArg(prefix, fallback = "") {
  const arg = process.argv.find((value) => value.startsWith(`${prefix}=`));
  if (!arg) return fallback;
  return arg.slice(prefix.length + 1);
}

function buildEvent(type, orderId, sessionId) {
  return {
    id: `evt_sim_${Date.now()}`,
    object: "event",
    api_version: "2025-01-01",
    created: Math.floor(Date.now() / 1000),
    type,
    data: {
      object: {
        id: sessionId || `cs_sim_${Date.now()}`,
        object: "checkout.session",
        metadata: {
          orderId,
          userId: "simulated-user",
        },
        payment_intent: `pi_sim_${Date.now()}`,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
  };
}

async function main() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET in environment");
    process.exit(1);
  }

  const orderId = parseArg("--order");
  if (!orderId) {
    console.error("Usage: npm run stripe:webhook:simulate -- --order=<orderId> [--type=completed|expired] [--api=http://localhost:5001]");
    process.exit(1);
  }

  const apiBase = parseArg("--api", "http://localhost:5001");
  const typeAlias = parseArg("--type", "completed");
  const type =
    typeAlias === "expired"
      ? "checkout.session.expired"
      : "checkout.session.completed";
  const sessionId = parseArg("--session", `cs_sim_${Date.now()}`);

  const event = buildEvent(type, orderId, sessionId);
  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const stripeSignature = `t=${timestamp},v1=${signature}`;

  const response = await fetch(`${apiBase}/api/orders/webhook/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": stripeSignature,
    },
    body: payload,
  });

  const text = await response.text();
  console.log(`status=${response.status}`);
  console.log(text);

  if (!response.ok) process.exit(1);
}

main();
