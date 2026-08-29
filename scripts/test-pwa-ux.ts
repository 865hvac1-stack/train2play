/**
 * PWA install CTA + asset smoke (requires local Next).
 * Run: npx tsx scripts/test-pwa-ux.ts
 */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const assetPage = await browser.newPage();
  for (const path of [
    "/manifest.webmanifest",
    "/sw.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/apple-touch-icon.png",
    "/offline",
  ]) {
    const response = await assetPage.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
    });
    assert.ok(response?.ok(), `${path} should be reachable`);
  }

  const manifest = await (await assetPage.goto(`${BASE}/manifest.webmanifest`))?.json();
  assert.equal(manifest.name, "Train2Play");
  assert.equal(manifest.short_name, "Train2Play");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/launch");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);

  const sw = await (await assetPage.goto(`${BASE}/sw.js`))?.text();
  assert.match(String(sw), /addEventListener\("push"/);

  await assetPage.goto(`${BASE}/launch`, { waitUntil: "domcontentloaded" });
  assert.match(assetPage.url(), /\/login/);

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "athlete@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });

  await page.goto(`${BASE}/athlete`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const home = await page.locator("main").innerText();
  assert.match(home, /Install Train2Play/);
  assert.match(home, /Add to Home Screen/);
  await page.getByRole("button", { name: /not now/i }).click();
  await page.waitForTimeout(200);
  assert.equal(await page.getByRole("heading", { name: /install train2play/i }).count(), 0);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("heading", { name: /install train2play/i }).count(), 0);

  await page.goto(`${BASE}/athlete/profile`, { waitUntil: "networkidle" });
  const profile = await page.locator("main").innerText();
  assert.match(profile, /Install Train2Play/);

  await page.goto(`${BASE}/athlete/train`, { waitUntil: "domcontentloaded" });
  assert.match(page.url(), /\/athlete\/train/);
  await page.goto(`${BASE}/athlete/videos`, { waitUntil: "domcontentloaded" });
  assert.match(page.url(), /\/athlete\/videos/);
  await page.goto(`${BASE}/athlete/progress`, { waitUntil: "domcontentloaded" });
  assert.match(page.url(), /\/athlete\/progress/);

  for (const width of [375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto(`${BASE}/athlete`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("main").first().isVisible(), true);
    assert.equal(await page.getByRole("link", { name: "Home" }).first().isVisible(), true);
  }

  await browser.close();
  console.log("pwa ux smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
