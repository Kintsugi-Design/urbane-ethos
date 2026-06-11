#!/usr/bin/env node
// W6.6 — Responsive sweep: 8 pages × 4 viewports.
//
// For each (page, viewport) pair:
//   1. Navigate
//   2. Screenshot to docs/responsive-sweep/<page>-<wxh>.png (full page)
//   3. Detect horizontal scroll (scrollWidth > viewport width by > 4px tolerance)
//
// Exits 1 if any horizontal-scroll violation surfaces. Not gated in CI —
// local sweep before handover. Screenshots are gitignored (see .gitignore).

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.URL || "http://localhost:8080";
const PAGES = [
  "/",
  "/about.html",
  "/staff.html",
  "/services.html",
  "/blog.html",
  "/contact.html",
  "/analytics.html",
  "/privacy.html",
];
const VIEWPORTS = [
  { name: "375x667", width: 375, height: 667 },
  { name: "414x896", width: 414, height: 896 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
];
const OUTDIR = "docs/responsive-sweep";
const TOLERANCE = 4;  // 4px slack for scrollbar / rounding

mkdirSync(OUTDIR, { recursive: true });

const browser = await chromium.launch();
const violations = [];

for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: 2,
  });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const slug = path === "/" ? "index" : path.replace(/^\//, "").replace(/\.html$/, "");
    const file = `${OUTDIR}/${slug}-${v.name}.png`;
    await page.screenshot({ path: file, fullPage: true });

    const overflow = await page.evaluate(({ vw, tol }) => {
      const sw = document.documentElement.scrollWidth;
      return { sw, vw, overflow: sw - vw > tol };
    }, { vw: v.width, tol: TOLERANCE });

    const status = overflow.overflow ? "OVERFLOW" : "ok";
    console.log(`${v.name}  ${path.padEnd(18)} ${status} (scrollWidth=${overflow.sw}, viewport=${overflow.vw})`);
    if (overflow.overflow) {
      violations.push({ path, viewport: v.name, scrollWidth: overflow.sw, vw: overflow.vw });
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close();

if (violations.length === 0) {
  console.log("\n✓ no horizontal-scroll violations across 8 pages × 4 viewports (32 captures)");
  process.exit(0);
}
console.log(`\n✗ ${violations.length} horizontal-scroll violation(s):`);
for (const v of violations) console.log(`  - ${v.path} @ ${v.viewport} — scrollWidth ${v.scrollWidth} > viewport ${v.vw}`);
process.exit(1);
