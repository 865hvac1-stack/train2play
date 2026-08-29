/**
 * Rasterize the existing T2P monogram into PWA icon sizes.
 * Reuses the same black / white / orange mark as app/icon.tsx — no brand redesign.
 * Run: npx tsx scripts/generate-pwa-icons.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

import { brand } from "../lib/brand";

const OUT = path.join(process.cwd(), "public", "icons");

function markHtml(size: number, padRatio = 0) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const fontSize = Math.round(inner * 0.34);
  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:${size}px;height:${size}px;background:${brand.colors.black};}
  .frame{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${brand.colors.black};}
  .mark{font-family:"Barlow Condensed",Impact,sans-serif;font-weight:800;font-style:italic;font-size:${fontSize}px;letter-spacing:-0.04em;line-height:1;color:${brand.colors.white};}
  .two{color:${brand.colors.orange};}
</style></head>
<body><div class="frame"><div class="mark">T<span class="two">2</span>P</div></div></body></html>`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  await page.setContent(markHtml(1024), { waitUntil: "networkidle" });
  const buf = await page.screenshot({ type: "png", omitBackground: false });
  await page.setContent(markHtml(1024, 0.18), { waitUntil: "networkidle" });
  const maskable = await page.screenshot({ type: "png", omitBackground: false });
  await browser.close();

  const jobs: Array<{ name: string; size: number; src: Buffer }> = [
    { name: "icon-192.png", size: 192, src: buf },
    { name: "icon-512.png", size: 512, src: buf },
    { name: "maskable-192.png", size: 192, src: maskable },
    { name: "maskable-512.png", size: 512, src: maskable },
    { name: "apple-touch-icon.png", size: 180, src: buf },
  ];

  for (const job of jobs) {
    await sharp(job.src)
      .resize(job.size, job.size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, job.name));
  }

  await writeFile(
    path.join(OUT, "README.txt"),
    "Train2Play T2P monogram icons generated from the existing brand colors. Do not add small tagline text.\n",
  );
  console.log("PWA icons written to public/icons");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
