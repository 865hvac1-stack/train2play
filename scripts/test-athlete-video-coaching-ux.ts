/**
 * Athlete Video Coaching page UX smoke (requires local Next + demo users).
 * Run: npx tsx scripts/test-athlete-video-coaching-ux.ts
 */
import { chromium, type Page } from "playwright-core";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

async function logout(page: Page) {
  await page.goto(`${BASE}/api/auth/signout`, { waitUntil: "domcontentloaded" }).catch(
    async () => {
      await page.context().clearCookies();
    },
  );
  await page.context().clearCookies();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await login(page, "athlete@example.com", "password123");
  await page.goto(`${BASE}/athlete/videos`, { waitUntil: "networkidle" });
  const empty = await page.locator("main").innerText();
  assert.match(empty, /Video coaching/i);
  assert.match(empty, /Send a video to your coach and review your feedback/i);
  assert.match(empty, /Send to coach for review/i);
  assert.match(empty, /Upload \/ manage my videos/i);
  assert.match(empty, /Connect with a coach first/i);
  assert.match(empty, /Enter coach code/i);
  assert.match(empty, /Find a coach/i);
  console.log("no-coach empty state: ok");

  await page.getByRole("link", { name: /upload \/ manage my videos/i }).click();
  await page.waitForURL(/\/athlete\/profile/, { timeout: 15_000 });
  console.log("profile upload route: ok");

  await logout(page);

  await login(page, "john.video.1787951325803@example.com", "TestPass123!");
  await page.goto(`${BASE}/athlete/videos`, { waitUntil: "networkidle" });
  const submitted = await page.locator("main").innerText();
  assert.match(submitted, /Coach reviews/i);
  assert.match(submitted, /Submitted/i);
  assert.match(submitted, /Sent to Coach Lester for review/i);
  await page.getByRole("link", { name: /Shooting Form/i }).click();
  await page.waitForURL(/\/athlete\/videos\/reviews\//, { timeout: 15_000 });
  const submittedDetail = await page.locator("main").innerText();
  assert.match(submittedDetail, /Submitted/i);
  assert.match(submittedDetail, /Sent to Coach Lester for review/i);
  console.log("submitted card + detail: ok");

  await logout(page);

  await login(page, "john.video.1787942036954@example.com", "TestPass123!");
  await page.goto(`${BASE}/athlete/videos`, { waitUntil: "networkidle" });
  const inReview = await page.locator("main").innerText();
  assert.match(inReview, /In review/i);
  assert.match(inReview, /Coach Lester is reviewing your video/i);
  await page.getByRole("link", { name: /Shooting Form/i }).click();
  await page.waitForURL(/\/athlete\/videos\/reviews\//, { timeout: 15_000 });
  const inReviewDetail = await page.locator("main").innerText();
  assert.match(inReviewDetail, /In review/i);
  assert.match(
    inReviewDetail,
    /Coach Lester is reviewing your video. We'll notify you when feedback is ready/i,
  );
  console.log("in-review card + detail: ok");

  await logout(page);

  await login(page, "voiceathlete@example.com", "password123");
  await page.goto(`${BASE}/athlete/videos`, { waitUntil: "networkidle" });
  const ready = await page.locator("main").innerText();
  assert.match(ready, /Feedback Ready/i);
  assert.match(ready, /Voice Review UI Test/i);
  assert.match(ready, /Demo Coach/i);
  assert.match(ready, /Voice Feedback/i);
  await page.getByRole("link", { name: /Voice Review UI Test/i }).click();
  await page.waitForURL(/\/athlete\/videos\/reviews\//, { timeout: 15_000 });
  const readyDetail = await page.locator("main").innerText();
  assert.match(readyDetail, /Feedback Ready/i);
  assert.match(readyDetail, /Watch coach review|Coach feedback/i);
  console.log("feedback-ready card + existing review: ok");

  for (const width of [375, 390, 430, 768, 1280]) {
    await page.setViewportSize({
      width,
      height: width < 768 ? 844 : 900,
    });
    await page.goto(`${BASE}/athlete/videos`, { waitUntil: "networkidle" });
    const primary = page.getByRole("link", { name: /send to coach for review/i }).first();
    assert.equal(await primary.isVisible(), true);
    const box = await primary.boundingBox();
    assert.ok(box && box.height >= 40, `primary too small at ${width}px`);
  }
  console.log("viewport tap targets: ok");

  await browser.close();
  console.log("athlete video coaching UX smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
