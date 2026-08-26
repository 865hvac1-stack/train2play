/**
 * Finds elements that stick out past the right edge of a phone-sized viewport.
 *
 * Usage: npx tsx scripts/check-mobile-overflow.ts [baseUrl]
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:43123";
const WIDTHS = [320, 360, 390, 430];
const HEIGHT = 844;

const REVIEW_ID = process.env.REVIEW_ID ?? "";
const ATHLETE_ID = process.env.ATHLETE_ID ?? "";

const PUBLIC_PAGES = ["/", "/login", "/privacy", "/terms"];

const COACH_PAGES = [
  "/dashboard",
  "/athletes",
  ATHLETE_ID ? `/athletes/${ATHLETE_ID}` : "",
  "/videos",
  REVIEW_ID ? `/videos/reviews/${REVIEW_ID}` : "",
  "/training",
  "/calendar",
  "/connections",
  "/courses",
  "/pickup-players",
  "/reports",
  "/settings",
  "/teams",
].filter(Boolean);

const ATHLETE_PAGES = [
  "/athlete",
  "/athlete/videos",
  REVIEW_ID ? `/athlete/videos/reviews/${REVIEW_ID}` : "",
  "/athlete/training",
  "/athlete/connect",
  "/athlete/profile",
].filter(Boolean);

type Offender = {
  selector: string;
  right: number;
  width: number;
  text: string;
};

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Runs in the page. Kept as a string so the bundler cannot inject helpers. */
const AUDIT_SCRIPT = (viewportWidth: number) => `(() => {
  var docScroll = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth
  );
  var offenders = [];
  var seen = {};
  var all = document.querySelectorAll('*');

  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    var style = getComputedStyle(el);
    if (style.position === 'fixed') continue;
    if (style.visibility === 'hidden' || style.display === 'none') continue;

    var overflowsViewport = rect.right > ${viewportWidth} + 1;
    var scrollsItself = el.scrollWidth > el.clientWidth + 1;
    if (!overflowsViewport && !scrollsItself) continue;

    var cls = (el.getAttribute('class') || '').split(/\\s+/)
      .filter(Boolean).slice(0, 6).join('.');
    var key = el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (cls ? '.' + cls : '');
    if (seen[key]) continue;
    seen[key] = true;

    offenders.push({
      selector: key,
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      text: (el.textContent || '').trim().slice(0, 60)
    });
  }

  return { docScroll: docScroll, offenders: offenders };
})()`;

/** Unclips the page so overflow hidden by `overflow-x: hidden` still shows up. */
const REVEAL_CSS = `
  html, body, div, section, main, header, aside, nav {
    overflow-x: visible !important;
  }
`;

async function audit(page: Page, path: string, width: number) {
  await page.setViewportSize({ width, height: HEIGHT });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.addStyleTag({ content: REVEAL_CSS });
  await page.waitForTimeout(250);

  const result = (await page.evaluate(AUDIT_SCRIPT(width))) as {
    docScroll: number;
    offenders: Offender[];
  };

  const realOffenders = result.offenders.filter(
    (off) => off.right > width + 1 && off.width > 4,
  );
  const bad = result.docScroll > width + 1 || realOffenders.length > 0;
  if (!bad) return false;

  console.log(
    `OVERFLOW ${width}px ${path}  docScrollWidth=${result.docScroll}`,
  );
  for (const off of realOffenders.slice(0, 10)) {
    console.log(
      `    ${off.selector}\n      right=${off.right} width=${off.width} text="${off.text}"`,
    );
  }
  return true;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const newPhone = () =>
    browser.newContext({
      viewport: { width: WIDTHS[0]!, height: HEIGHT },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

  let failures = 0;

  const publicContext = await newPhone();
  const anon = await publicContext.newPage();
  console.log("=== Public pages ===");
  for (const width of WIDTHS) {
    for (const path of PUBLIC_PAGES) {
      if (await audit(anon, path, width)) failures += 1;
    }
  }
  await publicContext.close();

  const coachContext = await newPhone();
  const coach = await coachContext.newPage();
  await login(coach, "coach@example.com");
  console.log("=== Coach pages ===");
  for (const width of WIDTHS) {
    for (const path of COACH_PAGES) {
      if (await audit(coach, path, width)) failures += 1;
    }
  }
  await coachContext.close();

  const athleteContext = await newPhone();
  const athlete = await athleteContext.newPage();
  await login(athlete, "athlete@example.com");
  console.log("=== Athlete pages ===");
  for (const width of WIDTHS) {
    for (const path of ATHLETE_PAGES) {
      if (await audit(athlete, path, width)) failures += 1;
    }
  }
  await athleteContext.close();

  await browser.close();
  console.log(`\n${failures} page/width combination(s) overflow.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
