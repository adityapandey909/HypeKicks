import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import authRouter from "../routes/auth.js";
import productsRouter from "../routes/products.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

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
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
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

test("POST /register returns token and admin role for first user", async () => {
  const handlers = getRouteHandlers(authRouter, "post", "/register");
  const req = {
    body: {
      name: "Test Admin",
      email: "admin@example.com",
      password: "password123",
    },
  };
  const res = mockResponse();

  const originals = {
    findOne: User.findOne,
    countDocuments: User.countDocuments,
    create: User.create,
  };

  User.findOne = async () => null;
  User.countDocuments = async () => 0;
  User.create = async (payload) => ({
    ...payload,
    _id: new mongoose.Types.ObjectId(),
    role: "admin",
    emailVerified: false,
  });

  try {
    await runHandlers(handlers, req, res);
    assert.equal(res.statusCode, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, "admin");
    assert.equal(res.body.user.email, "admin@example.com");
  } finally {
    User.findOne = originals.findOne;
    User.countDocuments = originals.countDocuments;
    User.create = originals.create;
  }
});

test("POST /login rejects invalid email format before DB query", async () => {
  const handlers = getRouteHandlers(authRouter, "post", "/login");
  const req = {
    body: {
      email: "bad-email",
      password: "password123",
    },
  };
  const res = mockResponse();

  await runHandlers(handlers, req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Please provide a valid email address");
});

test("GET /products returns product payload and filter metadata", async () => {
  const handlers = getRouteHandlers(productsRouter, "get", "/");
  const req = {
    query: {
      search: "air",
      minPrice: "100",
      maxPrice: "200",
      sort: "price_asc",
    },
  };
  const res = mockResponse();

  const originals = {
    find: Product.find,
    distinct: Product.distinct,
  };

  let capturedQuery = null;
  Product.find = (query) => {
    capturedQuery = query;
    return {
      sort() {
        return {
          limit: async () => [
            {
              _id: new mongoose.Types.ObjectId(),
              name: "Air Velocity",
              price: 149.99,
              image: "https://example.com/air.jpg",
              brand: "Nike",
            },
          ],
        };
      },
    };
  };

  Product.distinct = async (field) =>
    field === "brand" ? ["Nike", "Adidas"] : ["Running", "Lifestyle"];

  try {
    await runHandlers(handlers, req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.products.length, 1);
    assert.equal(res.body.filters.brands.length, 2);
    assert.equal(res.body.filters.categories.length, 2);
    assert.ok(Array.isArray(capturedQuery.$or));
    assert.equal(capturedQuery.price.$gte, 100);
    assert.equal(capturedQuery.price.$lte, 200);
  } finally {
    Product.find = originals.find;
    Product.distinct = originals.distinct;
  }
});
