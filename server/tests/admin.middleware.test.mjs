import assert from "node:assert/strict";
import { test } from "node:test";
import admin from "../middleware/admin.js";
import User from "../models/User.js";

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

test("admin middleware allows explicit admin token", async () => {
  let nextCalled = false;
  const req = { user: { id: "user-1", role: "admin" } };
  const res = createRes();

  await admin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("admin middleware checks DB role for non-admin token", async () => {
  const originalFindById = User.findById;
  let nextCalled = false;
  const req = { user: { id: "user-2", role: "customer" } };
  const res = createRes();

  User.findById = () => ({
    select: async () => ({ _id: "user-2", role: "admin" }),
  });

  try {
    await admin(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.user.role, "admin");
  } finally {
    User.findById = originalFindById;
  }
});

test("admin middleware returns 403 when role is not admin", async () => {
  const originalFindById = User.findById;
  const req = { user: { id: "user-3", role: "customer" } };
  const res = createRes();
  let nextCalled = false;

  User.findById = () => ({
    select: async () => ({ _id: "user-3", role: "customer" }),
  });

  try {
    await admin(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.message, "Admin access required");
  } finally {
    User.findById = originalFindById;
  }
});
