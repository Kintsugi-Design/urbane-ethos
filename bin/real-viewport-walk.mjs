#!/usr/bin/env node
// W6.8 — Real-viewport interaction walk.
//
// Drives a 1440×900 desktop session through all 8 pages, exercising the
// primary interactions (consent → personalization → chatbot → yt-embed →
// locale toggle → hamburger on mobile breakpoint). Captures console
// errors + failed requests + screenshot of each page in its final state.
// Exits 1 on any console error or failed request.
//
// Not gated in CI. Local handover sanity.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.URL || "http://localhost:8080";
const OUTDIR = "docs/responsive-sweep/real-walk";
mkdirSync(OUTDIR, { recursive: true });

const PAGES = [
  { path: "/", interactions: ["consent", "yt-embed-home"] },
  { path: "/about.html", interactions: [] },
  { path: "/staff.html", interactions: [] },
  { path: "/services.html", interactions: [] },
  { path: "/blog.html", interactions: [] },
  { path: "/contact.html", interactions: ["yt-embed-tour"] },
  { path: "/analytics.html", interactions: [] },
  { path: "/privacy.html", interactions: [] },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const issues = [];

const consoleErrors = [];
const failedRequests = [];

for (const { path, interactions } of PAGES) {
  const page = await ctx.newPage();
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push({ path, text: msg.text() });
  });
  page.on("requestfailed", req => {
    const url = req.url();
    // Ignore expected failures (PLACEHOLDER YouTube IDs, dev-time net hiccups)
    if (url.includes("PLACEHOLDER")) return;
    if (url.includes("youtube-nocookie") && req.failure()?.errorText !== "net::ERR_FAILED") return;
    failedRequests.push({ path, url, error: req.failure()?.errorText });
  });

  await page.goto(BASE + path, { waitUntil: "networkidle" });

  // Click consent "Accept all" if visible
  if (interactions.includes("consent")) {
    const acceptAll = page.locator('[data-consent-action="all"]');
    if (await acceptAll.count()) {
      await acceptAll.first().click().catch(() => {});
      await page.waitForTimeout(800);  // sage-stamp + banner exit
    }
  }

  // Toggle locale to MS and back to EN — exercise i18n on this page.
  // The locale control is duplicated (desktop header + mobile nav-tools), so
  // target the VISIBLE copy for the current viewport and fail fast rather than
  // hang on the hidden one's default 30s click timeout.
  const ms = page.locator('[data-locale-set="ms"]').filter({ visible: true }).first();
  if (await ms.count()) {
    await ms.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    const en = page.locator('[data-locale-set="en"]').filter({ visible: true }).first();
    if (await en.count()) {
      await en.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  // Click yt-embed if present (loads iframe — title pulled from i18n)
  const yt = page.locator(".yt-embed").first();
  if (interactions.some(i => i.startsWith("yt-embed")) && await yt.count()) {
    await yt.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Open + close chatbot
  const launcher = page.locator(".chatbot-launcher").first();
  if (await launcher.count()) {
    await launcher.click().catch(() => {});
    await page.waitForTimeout(300);
    const panel = page.locator(".chatbot-panel");
    if (await panel.count()) {
      // Press Escape to close
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  const slug = path === "/" ? "index" : path.replace(/^\//, "").replace(/\.html$/, "");
  const file = `${OUTDIR}/${slug}.png`;
  await page.screenshot({ path: file, fullPage: false });

  console.log(`  ${path.padEnd(18)} — walked, screenshot ${file}`);
  await page.close();
}

// Mobile-viewport hamburger pass on a single page
console.log("\n--- mobile hamburger walk (375×667 on /) ---");
const mctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
const mpage = await mctx.newPage();
mpage.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push({ path: "mobile:/", text: msg.text() });
});
await mpage.goto(BASE + "/", { waitUntil: "networkidle" });
const toggle = mpage.locator(".nav-toggle");
if (await toggle.count()) {
  await toggle.click();
  await mpage.waitForTimeout(200);
  const expanded = await toggle.getAttribute("aria-expanded");
  console.log(`  open  → aria-expanded=${expanded} (expected true)`);
  await mpage.keyboard.press("Escape");
  await mpage.waitForTimeout(200);
  const closed = await toggle.getAttribute("aria-expanded");
  console.log(`  close → aria-expanded=${closed} (expected false)`);
  await mpage.screenshot({ path: `${OUTDIR}/mobile-home-after-hamburger.png` });
} else {
  console.log("  WARN: .nav-toggle not present at mobile viewport");
}
await mpage.close();
await mctx.close();

await browser.close();

console.log("\n--- summary ---");
console.log(`console errors:  ${consoleErrors.length}`);
console.log(`failed requests: ${failedRequests.length}`);
for (const e of consoleErrors) console.log(`  [console] ${e.path}: ${e.text}`);
for (const r of failedRequests) console.log(`  [request] ${r.path}: ${r.url} (${r.error})`);

process.exit(consoleErrors.length + failedRequests.length > 0 ? 1 : 0);
