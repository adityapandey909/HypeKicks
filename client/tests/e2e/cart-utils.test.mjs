import assert from "node:assert/strict";
import { test } from "node:test";
import { computeSubtotal, itemKey, loadCart, saveCart } from "../../src/lib/cart.js";

function mockStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test("computeSubtotal calculates aggregate line total", () => {
  const subtotal = computeSubtotal([
    { price: 100, quantity: 2 },
    { price: 49.5, quantity: 1 },
    { price: 10, quantity: 0 },
  ]);

  assert.equal(subtotal, 249.5);
});

test("itemKey combines product and size", () => {
  assert.equal(itemKey({ productId: "abc", size: "10" }), "abc::10");
  assert.equal(itemKey({ productId: "abc", size: "" }), "abc::");
});

test("loadCart and saveCart use localStorage persistence", () => {
  const previousStorage = global.localStorage;
  global.localStorage = mockStorage();

  try {
    const initial = loadCart();
    assert.deepEqual(initial, []);

    saveCart([{ productId: "p1", quantity: 1, price: 100 }]);
    const persisted = loadCart();
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].productId, "p1");
  } finally {
    global.localStorage = previousStorage;
  }
});
