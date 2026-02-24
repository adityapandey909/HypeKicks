import dotenv from "dotenv";

dotenv.config();

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  console.log("Stripe config status:");
  console.log(`- STRIPE_SECRET_KEY: ${secretKey ? "set" : "missing"}`);
  console.log(`- STRIPE_WEBHOOK_SECRET: ${webhookSecret ? "set" : "missing"}`);
  console.log(`- CLIENT_URL: ${clientUrl}`);
  console.log("- Webhook endpoint: /api/orders/webhook/stripe");

  if (!secretKey) {
    console.log("\nAction needed: set STRIPE_SECRET_KEY in server/.env");
    process.exit(1);
  }

  try {
    const StripeModule = await import("stripe");
    const stripe = new StripeModule.default(secretKey);
    const account = await stripe.accounts.retrieve();
    console.log("\nStripe API check: OK");
    console.log(`- Account ID: ${account.id}`);
    console.log(`- Livemode: ${account.livemode ? "true" : "false"}`);
  } catch (error) {
    console.log("\nStripe API check: FAILED");
    console.log(`- Error: ${error?.message || "Unknown error"}`);
    process.exit(1);
  }

  if (!webhookSecret) {
    console.log(
      "\nAction needed: set STRIPE_WEBHOOK_SECRET (from Stripe Dashboard or stripe listen output)."
    );
    process.exit(1);
  }

  console.log("\nStripe webhook secret is configured.");
}

main();
