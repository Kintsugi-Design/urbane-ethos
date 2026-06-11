#!/usr/bin/env node
// W6.7 — landscape phone + reduced-motion sanity sweep.
//
// 8 pages × 2 conditions:
//   1. Landscape phone (667×375 + 896×414) — assert no horizontal scroll
//      and that the sticky header doesn't eat > 30% of viewport height.
//   2. Reduced-motion (any viewport, prefers-reduced-motion: reduce) —
//      assert no transition / animation declarations animate (transition
//      delays close to 0ms on a sample of motion-driven selectors).
//
// Exits 1 on any failure. Local run, not gated in CI.

import { chromium } from "playwright";

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

const browser = await chromium.launch();
const failures = [];

// Test 1: landscape phones.
console.log("--- landscape phone (667×375 + 896×414) ---");
for (const dims of [{ w: 667, h: 375 }, { w: 896, h: 414 }]) {
  const ctx = await browser.newContext({ viewport: { width: dims.w, height: dims.h } });
  for (const path of PAGES) {
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const obs = await page.evaluate(({ vw, vh }) => {
      const sw = document.documentElement.scrollWidth;
      const header = document.querySelector(".site-header");
      const headerH = header ? header.getBoundingClientRect().height : 0;
      return { sw, headerH };
    }, { vw: dims.w, vh: dims.h });

    const overflow = obs.sw - dims.w > 4;
    const headerEatsTooMuch = obs.headerH / dims.h > 0.30;
    const status = overflow || headerEatsTooMuch ? "FAIL" : "ok";
    console.log(`  ${dims.w}×${dims.h}  ${path.padEnd(18)} ${status} (header ${Math.round(obs.headerH)}px / ${dims.h}px = ${(obs.headerH / dims.h * 100).toFixed(1)}%)`);
    if (overflow) failures.push({ kind: "overflow", dims, path });
    if (headerEatsTooMuch) failures.push({ kind: "header-too-tall", dims, path, headerH: obs.headerH });
    await page.close();
  }
  await ctx.close();
}

// Test 2: reduced-motion at 375×667.
console.log("\n--- prefers-reduced-motion: reduce (375×667) ---");
const rmCtx = await browser.newContext({
  viewport: { width: 375, height: 667 },
  reducedMotion: "reduce",
});
for (const path of PAGES) {
  const page = await rmCtx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  // Check a sample of motion-bearing elements have either no transition
  // declared OR a transition-duration ≤ 1ms (the project's reduce convention).
  const samples = await page.evaluate(() => {
    const sels = [".fade-in-up", ".chatbot-launcher", ".nav-toggle svg .line-top"];
    // motion.css reduce sets duration to 0.001ms (1e-06s); anything below
    // 10ms is effectively instant for our purposes.
    const parse = s => s.trim().split(",")[0].replace("s","");
    return sels.map(sel => {
      const el = document.querySelector(sel);
      if (!el) return { sel, present: false };
      const cs = getComputedStyle(el);
      const td = parseFloat(parse(cs.transitionDuration));
      const ad = parseFloat(parse(cs.animationDuration));
      const motion = (td > 0.01) || (ad > 0.01);   // > 10ms
      return { sel, present: true, td: cs.transitionDuration, ad: cs.animationDuration, motion };
    });
  });
  const moving = samples.filter(s => s.present && s.motion);
  if (moving.length) {
    console.log(`  ${path.padEnd(18)} FAIL — ${moving.map(m => `${m.sel}=${m.td}`).join(", ")}`);
    failures.push({ kind: "reduce-not-honored", path, moving });
  } else {
    console.log(`  ${path.padEnd(18)} ok`);
  }
  await page.close();
}
await rmCtx.close();

await browser.close();

if (failures.length === 0) {
  console.log("\n✓ landscape + reduced-motion checks pass");
  process.exit(0);
}
console.log(`\n✗ ${failures.length} failure(s):`);
for (const f of failures) console.log(`  - ${JSON.stringify(f)}`);
process.exit(1);
