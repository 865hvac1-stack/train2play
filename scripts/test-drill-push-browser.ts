/**
 * Clicks the real director flow in a browser: send a suggested drill, land on
 * the delivery report, and confirm players and coaches are listed.
 *
 * Usage: npx tsx scripts/test-drill-push-browser.ts
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const EMAIL = process.env.LOCAL_DIRECTOR_EMAIL ?? "director@example.com";
const PASSWORD = process.env.LOCAL_DIRECTOR_PASSWORD ?? "password123";

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const problems: string[] = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  page.on("pageerror", (error) => {
    problems.push(`pageerror ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("Download the React DevTools")) return;
    if (text.includes("was preloaded using link preload")) return;
    problems.push(`console ${text}`);
  });

  await login(page);
  await page.goto(`${BASE}/trainer/drills?sport=Baseball`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(800);

  const listText = await page.locator("body").innerText();
  for (const label of ["In audience", "Sent", "Opened it", "Coach hand-offs"]) {
    if (!listText.includes(label)) {
      problems.push(`drill list missing delivery stat: ${label}`);
    }
  }

  await page
    .getByRole("button", { name: /^Send now$/ })
    .first()
    .click();
  await page.waitForURL(/\/trainer\/drills\/[^/?]+\?sent=\d+/, {
    timeout: 20000,
  });
  await page.waitForTimeout(600);

  const reportText = await page.locator("body").innerText();
  if (!/Sent to \d+ player|Nothing sent/.test(reportText)) {
    problems.push("report page missing the send confirmation");
  }
  for (const label of [
    "In audience",
    "Actually sent",
    "Opened it",
    "Coaches with access",
    "Coaches passing it on",
    "Players",
    "Coaches",
  ]) {
    if (!reportText.includes(label)) {
      problems.push(`report page missing section: ${label}`);
    }
  }
  if (/Something went wrong|Application error/i.test(reportText)) {
    problems.push("report page rendered an error screen");
  }

  const reportUrl = page.url();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(reportUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const overflow = (await page.evaluate(
    `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
  )) as number;
  if (overflow > 2) {
    problems.push(`report page horizontal overflow ${overflow}px on mobile`);
  }

  await context.close();
  await browser.close();

  if (problems.length > 0) {
    console.error("Drill push problems:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("drill-push browser checks passed (send + delivery report)");
}

main().catch((error) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
