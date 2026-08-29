/**
 * Alert preference UI smoke (requires local Next + demo athlete).
 * Run: npx tsx scripts/test-alert-preferences-ux.ts
 */
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "athlete@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });

  await page.goto(`${BASE}/athlete/profile`, { waitUntil: "networkidle" });
  const profile = await page.locator("main").innerText();
  assert.match(profile, /Get notified/i);
  assert.match(profile, /Enable Notifications/);
  assert.match(profile, /Text alerts/);
  await page.getByRole("button", { name: /enable notifications/i }).click();
  await page.waitForTimeout(400);
  const after = await page.locator("main").innerText();
  assert.doesNotMatch(after, /Notification\.requestPermission is not a function/);

  await page.fill("#alert-phone", "555");
  await page.getByLabel(/text me when a coach/i).check();
  await page.getByRole("button", { name: /save text alerts/i }).click();
  await page.waitForTimeout(800);
  assert.match(await page.locator("main").innerText(), /valid mobile number/i);

  await browser.close();
  console.log("alert preference ux smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
