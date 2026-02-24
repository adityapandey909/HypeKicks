import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { before, test } from "node:test";

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "pipe",
      shell: false,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${command} ${args.join(" ")}): ${stderr}`));
    });
  });
}

before(async () => {
  await runCommand("npm", ["run", "build"]);
});

test("build output should contain SPA root container", () => {
  const htmlPath = path.resolve(process.cwd(), "dist/index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  assert.match(html, /<div id="root"><\/div>/);
});

test("built bundle should include key route markers for auth/cart/checkout/admin", () => {
  const assetsDir = path.resolve(process.cwd(), "dist/assets");
  const bundleFile = fs
    .readdirSync(assetsDir)
    .find((file) => file.startsWith("index-") && file.endsWith(".js"));

  assert.ok(bundleFile, "No bundled JS file found in dist/assets");

  const bundle = fs.readFileSync(path.join(assetsDir, bundleFile), "utf8");
  assert.match(bundle, /\/login/);
  assert.match(bundle, /\/checkout/);
  assert.match(bundle, /\/checkout\/success/);
  assert.match(bundle, /\/admin/);
  assert.match(bundle, /Add to cart/);
});

test("source app should wire cart drawer and protected routes", () => {
  const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.jsx"), "utf8");
  assert.match(appSource, /CartDrawer/);
  assert.match(appSource, /pathname === "\/checkout"/);
  assert.match(appSource, /pathname === "\/admin"/);
  assert.match(appSource, /setCartItems\(\[\]\)/);
});
