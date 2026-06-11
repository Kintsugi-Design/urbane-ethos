#!/usr/bin/env node
// W7 — axe-core sweep on the chatbot panel.
//
// The chatbot panel is built lazily on launcher click, so the CLI axe
// sweep over the static page only sees the launcher button. This script:
//   1. Launches playwright Chromium against http://localhost:8080/
//   2. Dismisses consent banner if present (avoids overlay)
//   3. Clicks .chatbot-launcher
//   4. Waits for .chatbot-panel to render
//   5. Runs axe-core scoped to the panel
//   6. Prints violations; exits 1 if any serious/critical surface
//
// Usage:
//   bin/server &
//   node bin/axe-chatbot.mjs
//
// Not gated in CI — local run before handover.

import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const URL = process.env.URL || "http://localhost:8080/";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "domcontentloaded" });

// Dismiss consent if present (it intercepts pointer events on the launcher)
const acceptAll = page.locator('[data-consent-action="all"]');
if (await acceptAll.count()) {
  await acceptAll.first().click();
  await page.waitForTimeout(800);  // sage-stamp + banner exit animation
}

await page.locator(".chatbot-launcher").click();
await page.locator(".chatbot-panel").waitFor({ state: "visible", timeout: 5000 });

// Give the panel a moment to settle (animations, lazy content)
await page.waitForTimeout(500);

const axe = new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
  .include(".chatbot-panel");

const { violations } = await axe.analyze();

await browser.close();

if (violations.length === 0) {
  console.log("axe-chatbot: 0 violations ✓");
  process.exit(0);
}

console.log(`axe-chatbot: ${violations.length} violation(s)`);
for (const v of violations) {
  console.log(`  - [${v.impact}] ${v.id}: ${v.help}`);
  console.log(`    ${v.helpUrl}`);
  for (const node of v.nodes) {
    console.log(`    target: ${node.target.join(" ")}`);
    console.log(`    html:   ${node.html.slice(0, 200)}`);
  }
}

const critical = violations.filter(v => v.impact === "critical" || v.impact === "serious");
process.exit(critical.length > 0 ? 1 : 0);
