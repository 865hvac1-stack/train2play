/**
 * Confirms a phone-sized page cannot be dragged sideways:
 * every field renders at 16px or larger (iOS otherwise zooms and then pans),
 * the horizontal axis has no scrollable range, and sticky headers still stick.
 *
 * Usage: npx tsx scripts/check-mobile-stationary.ts [baseUrl]
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:43123";
const WIDTH = 390;
const HEIGHT = 844;

const CHECK_SCRIPT = `(() => {
  var small = [];
  var fields = document.querySelectorAll('input, select, textarea');
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var type = (field.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox' || type === 'radio' || type === 'range' ||
        type === 'hidden' || type === 'file') continue;
    var size = parseFloat(getComputedStyle(field).fontSize);
    if (size < 16) {
      small.push({
        size: size,
        name: field.getAttribute('name') || field.tagName.toLowerCase()
      });
    }
  }

  var scroller = document.scrollingElement || document.documentElement;
  var sticky = document.querySelector('header');

  return {
    smallFields: small,
    horizontalRange: scroller.scrollWidth - scroller.clientWidth,
    stickyHeaderTop: sticky ? Math.round(sticky.getBoundingClientRect().top) : null
  };
})()`;

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function check(page: Page, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);

  const result = (await page.evaluate(CHECK_SCRIPT)) as {
    smallFields: { size: number; name: string }[];
    horizontalRange: number;
    stickyHeaderTop: number | null;
  };

  const problems: string[] = [];
  if (result.smallFields.length > 0) {
    problems.push(
      `${result.smallFields.length} field(s) under 16px: ` +
        result.smallFields
          .slice(0, 5)
          .map((field) => `${field.name}@${field.size}px`)
          .join(", "),
    );
  }
  if (result.horizontalRange > 1) {
    problems.push(`horizontal scroll range ${result.horizontalRange}px`);
  }
  if (result.stickyHeaderTop !== null && result.stickyHeaderTop > 1) {
    problems.push(`header not sticking (top=${result.stickyHeaderTop})`);
  }

  console.log(
    problems.length === 0
      ? `ok       ${path}`
      : `PROBLEM  ${path}\n    ${problems.join("\n    ")}`,
  );
  return problems.length;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  let problems = 0;
  const page = await context.newPage();

  console.log("=== Public ===");
  problems += await check(page, "/login");

  await login(page, "coach@example.com");
  console.log("=== Coach ===");
  for (const path of [
    "/dashboard",
    "/videos",
    "/athletes",
    "/settings",
    "/pickup-players",
    ...(process.env.REVIEW_ID
      ? [`/videos/reviews/${process.env.REVIEW_ID}`]
      : []),
  ]) {
    problems += await check(page, path);
  }
  await context.close();

  const athleteContext = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const athlete = await athleteContext.newPage();
  await login(athlete, "athlete@example.com");
  console.log("=== Athlete ===");
  for (const path of ["/athlete", "/athlete/videos", "/athlete/connect"]) {
    problems += await check(athlete, path);
  }
  await athleteContext.close();

  await browser.close();
  console.log(`\n${problems} problem(s) found.`);
  if (problems > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
