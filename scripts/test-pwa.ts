/**
 * PWA foundation checks (no browser).
 * Run: npx tsx scripts/test-pwa.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { brand } from "../lib/brand";

const root = process.cwd();
const sw = readFileSync(path.join(root, "public/sw.js"), "utf8");

assert.match(sw, /t2p-shell-v1/);
assert.match(sw, /addEventListener\("push"/);
assert.match(sw, /notificationclick/);
assert.match(sw, /skipWaiting/);
assert.doesNotMatch(sw, /\/api\/athlete/);
assert.match(sw, /isSensitive/);
assert.match(sw, /pathname\.startsWith\("\/api\/"\)/);

const icons = [
  "icon-192.png",
  "icon-512.png",
  "maskable-192.png",
  "maskable-512.png",
  "apple-touch-icon.png",
];
for (const name of icons) {
  const file = path.join(root, "public/icons", name);
  assert.equal(existsSync(file), true, `missing ${name}`);
  assert.ok(statSync(file).size > 500, `${name} looks empty`);
}

const manifest = readFileSync(path.join(root, "app/manifest.ts"), "utf8");
assert.match(manifest, /start_url: "\/launch"/);
assert.match(manifest, /display: "standalone"/);
assert.match(manifest, /short_name: brand.shortName/);
assert.equal(brand.subtagline, "The Athlete Development Platform");
assert.equal(brand.colors.orange, "#FF6600");

assert.equal(existsSync(path.join(root, "app/launch/page.tsx")), true);
assert.equal(existsSync(path.join(root, "components/install-train2play.tsx")), true);
assert.equal(existsSync(path.join(root, "components/pwa-runtime.tsx")), true);

console.log("pwa foundation checks passed");
