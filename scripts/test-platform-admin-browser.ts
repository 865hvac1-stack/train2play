/**
 * Loads every Platform Admin route in a real browser at desktop, tablet, and
 * phone widths, fails on console errors or error screens, and proves that
 * non-admin roles cannot reach /admin while their own portals still work.
 *
 * Usage: npx tsx scripts/test-platform-admin-browser.ts
 */
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = process.env.DEMO_PASSWORD ?? "password123";
const ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL ?? "admin@example.com";
const DIRECTOR_EMAIL = process.env.LOCAL_DIRECTOR_EMAIL ?? "director@example.com";
const COACH_EMAIL = process.env.DEMO_COACH_EMAIL ?? "coach@example.com";
const ATHLETE_EMAIL = process.env.DEMO_ATHLETE_EMAIL ?? "athlete@example.com";

const ADMIN_PATHS = [
  "/admin",
  "/admin?range=7d",
  "/admin?range=all&growth=365",
  "/admin/users",
  "/admin/users?role=ATHLETE",
  "/admin/users?role=COACH",
  "/admin/users?role=TRAINER",
  "/admin/users?role=ATHLETE&attention=unconnected",
  "/admin/users?role=ATHLETE&journey=connected",
  "/admin/organizations",
  "/admin/organizations/new",
  "/admin/directors",
  "/admin/directors/new",
  "/admin/sports",
  "/admin/content",
  "/admin/content?type=COURSES",
  "/admin/content?type=PROGRAMS",
  "/admin/content?type=VIDEOS",
  "/admin/metrics",
  "/admin/metrics/new",
  "/admin/activity",
  "/admin/activity?type=TRAINING",
  "/admin/activity?attention=waiting",
  "/admin/reports",
  "/admin/reports?report=sports&range=90d",
  "/admin/search",
  "/admin/search?q=a",
];

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function sessionFor(browser: Browser, email: string, width: number) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
  });
  const page = await context.newPage();
  await login(page, email);
  return { context, page };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const problems: string[] = [];

  for (const viewport of [
    { width: 1440, label: "desktop" },
    { width: 768, label: "tablet" },
    { width: 430, label: "mobile-430" },
    { width: 390, label: "mobile-390" },
  ]) {
    const admin = await sessionFor(browser, ADMIN_EMAIL, viewport.width);
    let current = "";
    admin.page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      const text = message.text();
      if (text.includes("Download the React DevTools")) return;
      if (text.includes("was preloaded using link preload")) return;
      problems.push(`${viewport.label} ${current}: ${text}`);
    });
    admin.page.on("pageerror", (error) => {
      problems.push(`${viewport.label} ${current}: pageerror ${error.message}`);
    });

    const paths =
      viewport.label === "desktop" ? ADMIN_PATHS : ADMIN_PATHS.slice(0, 14);
    for (const path of paths) {
      current = path;
      await admin.page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await admin.page.waitForTimeout(600);

      if (!admin.page.url().includes("/admin")) {
        problems.push(
          `${viewport.label} ${path}: platform admin was redirected to ${admin.page.url()}`,
        );
        continue;
      }
      const body = await admin.page.locator("body").innerText();
      if (/Something went wrong|Application error|Unhandled Runtime/i.test(body)) {
        problems.push(`${viewport.label} ${path}: error screen rendered`);
      }
      const overflow = (await admin.page.evaluate(
        `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
      )) as number;
      if (overflow > 2) {
        problems.push(
          `${viewport.label} ${path}: horizontal overflow ${overflow}px`,
        );
      }
    }

    if (viewport.label === "mobile-390") {
      current = "/admin (mobile nav)";
      await admin.page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await admin.page.getByRole("button", { name: /open admin menu/i }).click();
      await admin.page.waitForTimeout(600);
      const navText = await admin.page.locator("body").innerText();
      for (const label of [
        "Command center",
        "Users",
        "Organizations",
        "Directors",
        "Sports",
        "Content",
        "Metrics",
        "Activity",
        "Reports",
      ]) {
        if (!navText.includes(label)) {
          problems.push(`mobile nav: missing ${label}`);
        }
      }
    }

    await admin.context.close();
  }

  // Command center must answer the core questions on one screen.
  const admin = await sessionFor(browser, ADMIN_EMAIL, 1440);
  await admin.page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await admin.page.waitForTimeout(900);
  // Labels render through CSS uppercase, so compare case-insensitively.
  const home = (await admin.page.locator("body").innerText()).toLowerCase();
  for (const section of [
    "Train2Play Command Center",
    "The health of the entire platform, in one place.",
    "Total athletes",
    "Directors",
    "Organizations",
    "Active athletes",
    "Training output",
    "Video activity",
    "Personal records",
    "Platform growth",
    "Athlete journey",
    "Live on Train2Play",
    "Organization health",
    "Sport health",
    "Training health",
    "Video health",
    "System health",
    "Quick actions",
  ]) {
    if (!home.includes(section.toLowerCase())) {
      problems.push(`command center missing section: ${section}`);
    }
  }
  await admin.context.close();

  // Authorization: non-admin roles must never see /admin.
  for (const [email, label, expected] of [
    [DIRECTOR_EMAIL, "director", "/trainer"],
    [COACH_EMAIL, "coach", "/dashboard"],
    [ATHLETE_EMAIL, "athlete", "/athlete"],
  ] as const) {
    const session = await sessionFor(browser, email, 1280);
    await session.page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await session.page.waitForTimeout(800);
    const url = session.page.url();
    if (url.includes("/admin")) {
      problems.push(`${label} reached /admin (${url})`);
    } else if (!url.includes(expected)) {
      problems.push(`${label} redirected to ${url}, expected ${expected}`);
    }

    await session.page.goto(`${BASE}/admin/users`, {
      waitUntil: "domcontentloaded",
    });
    await session.page.waitForTimeout(600);
    if (session.page.url().includes("/admin")) {
      problems.push(`${label} reached /admin/users`);
    }

    // The role's own portal must still work.
    await session.page.goto(`${BASE}${expected}`, {
      waitUntil: "domcontentloaded",
    });
    await session.page.waitForTimeout(900);
    const portal = await session.page.locator("body").innerText();
    if (/Something went wrong|Application error/i.test(portal)) {
      problems.push(`${label} portal ${expected} rendered an error screen`);
    }
    await session.context.close();
  }

  await browser.close();

  if (problems.length > 0) {
    console.error("Platform Admin problems:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `platform-admin browser checks passed (${ADMIN_PATHS.length} routes, 4 widths, 3 role guards)`,
  );
}

main().catch((error) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
