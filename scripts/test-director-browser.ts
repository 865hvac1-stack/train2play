/**
 * Loads the director portal in a real browser and fails on any console error
 * or React warning. Catches undefined-href Links and hydration crashes.
 *
 * Usage: npx tsx scripts/test-director-browser.ts
 */
import { chromium, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const EMAIL = process.env.LOCAL_DIRECTOR_EMAIL ?? "director@example.com";
const PASSWORD = process.env.LOCAL_DIRECTOR_PASSWORD ?? "password123";

const PATHS = [
  "/trainer",
  "/trainer?sport=Baseball",
  "/trainer?sport=Basketball",
  "/trainer?sport=Baseball&view=enrollment",
  "/trainer?sport=Baseball&view=active",
  "/trainer?sport=Baseball&view=video",
  "/trainer?sport=Baseball&view=completed",
  "/trainer?sport=Baseball&view=coaches",
  "/trainer?sport=Baseball&view=workouts",
  "/trainer?sport=Baseball&attention=no-training",
  "/trainer?sport=Baseball&attention=no-coach",
  "/trainer?sport=Baseball&attention=reviews",
  "/trainer?sport=Baseball&attention=inactive-coaches",
  "/trainer?sport=Baseball&attention=incomplete-courses",
  "/trainer/drills?sport=Baseball",
];

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

  for (const viewport of [
    { width: 1440, height: 1000, label: "desktop" },
    { width: 390, height: 900, label: "mobile" },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    let current = "";

    page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;
      const text = message.text();
      // Next dev noise that is not a defect in this app.
      if (text.includes("Download the React DevTools")) return;
      if (text.includes("was preloaded using link preload")) return;
      problems.push(`${viewport.label} ${current}: ${text}`);
    });
    page.on("pageerror", (error) => {
      problems.push(`${viewport.label} ${current}: pageerror ${error.message}`);
    });

    await login(page);

    for (const path of PATHS) {
      current = path;
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);

      const body = await page.locator("body").innerText();
      if (/Something went wrong|Application error|Unhandled Runtime/i.test(body)) {
        problems.push(`${viewport.label} ${path}: error screen rendered`);
      }

      if (viewport.label === "mobile") {
        const overflow = (await page.evaluate(
          `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
        )) as number;
        if (overflow > 2) {
          problems.push(
            `${viewport.label} ${path}: horizontal overflow ${overflow}px`,
          );
        }
      }
    }

    // Exercise the mobile sidebar, which is where the crash was reported.
    if (viewport.label === "mobile") {
      current = "/trainer?sport=Baseball (mobile nav)";
      await page.goto(`${BASE}/trainer?sport=Baseball`, {
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("button", { name: /open menu/i }).click();
      await page.waitForTimeout(600);
      const navText = await page.locator("body").innerText();
      for (const label of ["Program health", "Content library", "Suggested drills"]) {
        if (!navText.includes(label)) {
          problems.push(`mobile nav: missing ${label}`);
        }
      }
    }

    await context.close();
  }

  await browser.close();

  if (problems.length > 0) {
    console.error("Director portal problems:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(
    `director-browser checks passed (${PATHS.length} routes, desktop + mobile)`,
  );
}

main().catch((error) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
