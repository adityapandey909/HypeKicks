import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import authRouter from "../routes/auth.js";
import productsRouter from "../routes/products.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

function getRouteHandlers(router, method, routePath) {
  const layer = router.stack.find(
    (entry) =>
      entry.route &&
      entry.route.path === routePath &&
      entry.route.methods[method.toLowerCase()]
  );

  if (!layer) {
    throw new Error(`Route ${method} ${routePath} was not found`);
  }

  return layer.route.stack.map((entry) => entry.handle);
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runHandlers(handlers, req, res) {
  let index = 0;
  const next = async (error) => {
    if (error) throw error;
    const handler = handlers[index];
    index += 1;
    if (!handler) return;
    await handler(req, res, next);
  };

  await next();
  return res;
}

test("GET /products/:id/reviews returns ordered reviews and summary", async () => {
  const handlers = getRouteHandlers(productsRouter, "get", "/:id/reviews");
  const req = { params: { id: "product-1" } };
  const res = mockResponse();

  const originalFindById = Product.findById;
  Product.findById = () => ({
    select: async () => ({
      _id: "product-1",
      reviews: [
        {
          _id: new mongoose.Types.ObjectId(),
          userName: "Buyer A",
          rating: 5,
          title: "Great",
          body: "Loved it",
          createdAt: new Date("2026-03-10"),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userName: "Buyer B",
          rating: 4,
          title: "Nice",
          body: "Comfortable",
          createdAt: new Date("2026-03-09"),
        },
      ],
    }),
  });

  try {
    await runHandlers(handlers, req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.reviews.length, 2);
    assert.equal(res.body.summary.count, 2);
    assert.equal(res.body.summary.average, 4.5);
    assert.equal(res.body.reviews[0].userName, "Buyer A");
  } finally {
    Product.findById = originalFindById;
  }
});

test("PUT /auth/wishlist/toggle adds product and returns hydrated items", async () => {
  const handlers = getRouteHandlers(authRouter, "put", "/wishlist/toggle").slice(-1);

  const req = {
    user: { id: "user-1" },
    body: { productId: "680000000000000000000001" },
  };
  const res = mockResponse();

  const originalUserFindById = User.findById;
  const originalProductFindById = Product.findById;
  const originalProductFind = Product.find;

  const userDoc = {
    _id: "user-1",
    wishlist: [],
    save: async () => userDoc,
  };

  User.findById = () => ({
    select: async () => userDoc,
  });
  Product.findById = () => ({
    select: async () => ({ _id: new mongoose.Types.ObjectId(req.body.productId) }),
  });
  Product.find = () => ({
    select: async () => [
      {
        _id: new mongoose.Types.ObjectId(req.body.productId),
        name: "Jordan Retro Pulse",
        brand: "Jordan",
        image: "catalog/shoes/shoe-01.svg",
        price: 189.99,
        category: "Basketball",
        totalStock: 8,
        sizeOptions: [{ size: "9", stock: 4 }],
      },
    ],
  });

  try {
    await runHandlers(handlers, req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(Array.isArray(res.body.items), true);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].productId, req.body.productId);
  } finally {
    User.findById = originalUserFindById;
    Product.findById = originalProductFindById;
    Product.find = originalProductFind;
  }
});
