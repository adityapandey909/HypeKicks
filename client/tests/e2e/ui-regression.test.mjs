import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

test("core UI selectors exist for major storefront systems", () => {
  const css = read("src/index.css");
  assert.match(css, /\.promo-banner/);
  assert.match(css, /\.mega-menu/);
  assert.match(css, /\.nav-search/);
  assert.match(css, /\.compare-panel/);
  assert.match(css, /\.mobile-bottom-nav/);
  assert.match(css, /\.review-form/);
  assert.match(css, /\.policy-shell/);
  assert.match(css, /prefers-reduced-motion/);
});

test("app routes include wishlist and legal/support pages", () => {
  const app = read("src/App.jsx");
  assert.match(app, /pathname === "\/wishlist"/);
  assert.match(app, /pathname === "\/returns"/);
  assert.match(app, /pathname === "\/shipping"/);
  assert.match(app, /pathname === "\/privacy"/);
  assert.match(app, /pathname === "\/terms"/);
  assert.match(app, /pathname === "\/faq"/);
  assert.match(app, /pathname === "\/contact"/);
  assert.match(app, /MobileBottomNav/);
  assert.match(app, /PromoBanner/);
});

test("product grid keeps compare and wishlist capabilities", () => {
  const grid = read("src/components/ProductGrid.jsx");
  assert.match(grid, /Compare/);
  assert.match(grid, /wishlist-heart/);
  assert.match(grid, /quick-view-modal/);
});
