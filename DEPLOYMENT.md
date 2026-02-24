# HypeKicks Deployment Guide

## 1) Backend on Render (Web Service)

1. Create a new Render Web Service connected to this repo.
2. Set **Root Directory** to `server`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
   - `MONGO_URI`
   - `PORT` (Render provides one automatically, optional)
   - `JWT_SECRET`
   - `CLIENT_URL` (your frontend URL)
   - `CORS_ORIGINS` (comma separated, include frontend URL)
   - `STRIPE_SECRET_KEY` (required for Stripe checkout)
   - `STRIPE_WEBHOOK_SECRET` (required for Stripe webhook verification)
   - `EMAIL_FROM`
   - `RESEND_API_KEY` (or SMTP settings below)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 2) Frontend on Vercel

1. Create a new Vercel project from this repo.
2. Set **Root Directory** to `client`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
   - `VITE_API_URL` = deployed backend base URL (example: `https://hypekicks-api.onrender.com`)

## 3) Post-deploy checklist

1. Update backend `CLIENT_URL` and `CORS_ORIGINS` with your real frontend domain.
2. Test routes:
   - `/` storefront
   - `/login`
   - `/checkout`
   - `/admin` (admin account only)
3. Register a fresh account after `JWT_SECRET` rotation.
4. Validate checkout:
   - Mock checkout should redirect to `/checkout/success`
   - Stripe checkout requires `STRIPE_SECRET_KEY`
   - Stripe webhook endpoint: `POST /api/orders/webhook/stripe`

## Stripe Webhook Setup

1. In Stripe Dashboard, create webhook endpoint:
   - URL: `https://<your-api-domain>/api/orders/webhook/stripe`
2. Subscribe at least to:
   - `checkout.session.completed`
   - `checkout.session.expired`
3. Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Keep `paymentProvider=stripe` orders in `pending` until webhook marks them `paid`.

### Local Stripe Testing Commands

1. Validate Stripe config:
   - `cd server`
   - `npm run check:stripe`
2. If using Stripe CLI:
   - `stripe login`
   - `stripe listen --forward-to localhost:5001/api/orders/webhook/stripe`
   - Copy the emitted signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Trigger test event from Stripe CLI:
   - `stripe trigger checkout.session.completed`
4. Or simulate a signed webhook directly against local API:
   - `npm run stripe:webhook:simulate -- --order=<orderId>`

## Email Provider Setup

1. Recommended: Resend
   - Set `RESEND_API_KEY`
   - Set `EMAIL_FROM` to a verified sender/domain.
2. Alternative: SMTP
   - Set SMTP vars in `.env`.
3. If no provider is configured, API falls back to dev links in non-production.

## Image Storage Setup

1. Set Cloudinary credentials in backend env.
2. Admin image uploads call `POST /api/uploads/image` and store returned URL in product records.
3. If Cloudinary is not configured, upload route returns a dev fallback payload.

## Monitoring And Security Final Checklist

1. Enable centralized logs on host platform and track `X-Request-Id` for incident debugging.
2. Add error monitoring (Sentry or equivalent) in both API and client.
3. Set strict production origins in `CORS_ORIGINS`; do not keep wildcard values.
4. Rotate all secrets before launch:
   - `JWT_SECRET`
   - DB password / `MONGO_URI` credentials
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - email provider API keys
5. Run verification suite before each deploy:
   - `server: npm test`
   - `client: npm run lint && npm run build && npm run test:e2e`

## 4) Optional Render Blueprint

Use [`render.yaml`](/Users/adityapandey/HypeKicks/render.yaml) for one-click setup of API + static client on Render.
