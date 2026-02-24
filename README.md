# HypeKicks

HypeKicks is a full-stack sneaker storefront built with React + Vite and Express + MongoDB.
It includes authentication, admin product management, cart and checkout, order history, image uploads, and Stripe-ready payments.

## Project Highlights

- Premium sneaker storefront UI with responsive layout
- Theme switcher (`Default` and `Dark`) with saved preference
- Product discovery with search, category/brand/price filters, and sorting
- Product detail pages with size selection and related products
- Cart drawer with quantity controls and persistent cart state
- Auth system: register, login, logout, email verification, forgot/reset password
- Role-based admin panel for product CRUD and image uploads
- Checkout flow with mock mode and Stripe checkout + webhook support
- Order history and order status tracking

## Tech Stack

### Frontend (`client`)

- React 19
- Vite
- Axios
- Tailwind/PostCSS setup

### Backend (`server`)

- Node.js + Express
- MongoDB + Mongoose
- JWT auth + bcrypt password hashing
- Nodemailer/Resend support for emails
- Stripe integration for payments/webhooks
- Cloudinary integration for image uploads

## Local Development Setup

### 1) Clone and install dependencies

```bash
git clone https://github.com/adityapandey909/HypeKicks.git
cd HypeKicks

cd server && npm install
cd ../client && npm install
```

### 2) Configure environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Update the values in `server/.env` and `client/.env` for your local/dev environment.

### 3) Run backend and frontend

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

App: `http://localhost:5173`  
API: `http://localhost:5001`

## Available Scripts

### Server scripts

- `npm run dev` - start API with nodemon
- `npm start` - start API in production mode
- `npm test` - run backend tests
- `npm run check:mongo` - verify MongoDB connection
- `npm run check:stripe` - verify Stripe config
- `npm run stripe:webhook:simulate` - simulate Stripe webhook event
- `npm run rotate:secrets` - helper for secret rotation workflow

### Client scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - lint client code
- `npm run test:e2e` - run client e2e-style test scripts

## API Quick Map

- `GET /health` - API health check
- `POST /api/auth/register` - register user
- `POST /api/auth/login` - login user
- `POST /api/auth/forgot-password` - request reset link
- `POST /api/auth/reset-password` - reset password
- `POST /api/auth/verify-email` - verify email token
- `GET /api/products` - list/filter/sort products
- `GET /api/products/:id` - product detail
- `POST /api/products` - create product (admin)
- `PUT /api/products/:id` - update product (admin)
- `DELETE /api/products/:id` - delete product (admin)
- `POST /api/orders/checkout` - create checkout session
- `POST /api/orders/webhook/stripe` - Stripe webhook endpoint
- `POST /api/uploads/image` - upload product image (admin)

## Project Structure

```text
HypeKicks/
  client/        # React app (storefront, auth, admin, checkout UI)
  server/        # Express API (auth, products, orders, uploads)
  render.yaml    # Optional Render blueprint
  DEPLOYMENT.md  # Hosting guide (Render + Vercel + Stripe webhooks)
```

## Deployment

Use the full deployment walkthrough in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Notes

- First registered user is promoted to `admin`.
- `.env` files are ignored by git; only `.env.example` templates are committed.
