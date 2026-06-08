# Polish Pass — Phase 1 (Motion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the motion polish layer of the polish pass — 8 new motion tokens, organic timing rebalance, and 6 paper-and-ink craft moments — as a single squashed `feat(motion)` commit on `main`.

**Architecture:** Pure CSS for 5 of 6 craft moments (link underline, card hover, locale toggle, chatbot panel, organic timing rebalance via tokens). One small new JS module (`sage-stamp.js`) handles the SVG sage stamp injected by both `consent.js` and `personalization.js` on save. No new content strings; no i18n parity impact; no axe-core regression.

**Tech Stack:** Vanilla HTML/CSS/JS, ES modules, SVG SMIL `<animate>` for the sage stamp circle + checkmark draw. Ruby+WEBrick dev server. `npx @axe-core/cli` for the a11y audit (one-off, no install).

**Spec:** `urbane-ethos/docs/superpowers/specs/2026-06-08-polish-pass-design.md` (Phase 1 sections only)

**Base commit:** `0b2c138` (`docs: add polish pass design doc from /office-hours`). All Phase 1 work branches off this.

**Out of scope for this plan:** Phase 2 (photography sourcing, intent captions, YouTube embed scaffolding). Phase 2 gets its own plan after you review Phase 1.

---

## File Structure

```
urbane-ethos/
  assets/
    css/
      tokens.css           (MODIFY — Task 1: add 8 motion tokens, update --dur-1, --dur-2, alias --ease)
      base.css             (MODIFY — Task 7: replace link text-decoration with ink-draw background)
      components.css       (MODIFY — Tasks 2, 5, 9, 10: literal-duration cleanup, .consent-saved fade, .card-inner hover, locale-toggle page-turn-slide)
      motion.css           (MODIFY — Task 3: delete consent-saved-in, rename panel-in → chatbot-unfurl, add page-turn-slide)
    js/
      sage-stamp.js        (CREATE — Task 4: exports renderSageStamp(targetEl))
      consent.js           (MODIFY — Task 5: import renderSageStamp, prepend to "Saved." block, schedule fade+remove)
      personalization.js   (MODIFY — Task 6: import renderSageStamp, render on write() success)
      chatbot.js           (No JS change; panel animation rename happens in motion.css)
  index.html               (MODIFY — Task 8: wrap a.card children in <div class="card-inner">)
  about.html               (MODIFY — Task 8: same)
  staff.html               (no .card usage; skip)
  services.html            (no a.card usage; skip)
  blog.html                (MODIFY — Task 8: wrap a.card children in <div class="card-inner">)
  contact.html             (no .card usage; skip)
  analytics.html           (no a.card usage; skip)
  privacy.html             (no .card usage; skip)
  test/
    smoke/
      sage-stamp.html      (CREATE — Task 4: browser smoke test for renderSageStamp)
```

Pages confirmed using `<a class="card">` (require `.card-inner` wrap): home (services grid + blog cards + recommended rail + featured staff), about (values grid), blog (post cards). Confirm with `grep -rln 'class="card"' --include='*.html' urbane-ethos/` before editing.

---

## Working pattern for this plan

Each task accumulates working-tree changes and **WIP-commits** at the end. The final task (Task 12) squashes all WIP commits into a single `feat(motion): ...` commit per the spec's "single commit on main" criterion. WIP commits during implementation give the subagent-driven-development reviewer clean checkpoints to compare against.

**WIP commit message format:**
```
wip(motion): <one-line description>
```

**Final squash command (Task 12 only):**
```bash
git reset --soft 0b2c138
git commit -m "feat(motion): paper and ink craft + organic timing rebalance"
```

---

## Task 1: Add 8 motion tokens to `tokens.css`

**Files:**
- Modify: `urbane-ethos/assets/css/tokens.css`

- [ ] **Step 1: Read existing tokens.css to locate the `--dur-*` and `--ease` block**

Run: `cat urbane-ethos/assets/css/tokens.css | sed -n '50,90p'`
Expected: see the existing `--dur-1`, `--dur-2`, `--dur-3`, `--ease`, `--ease-out` lines.

- [ ] **Step 2: Update existing tokens + add 8 new ones**

In `urbane-ethos/assets/css/tokens.css`, find the existing motion block:

```css
    /* Motion */
    --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
    --dur-1: 180ms;
    --dur-2: 320ms;
    --dur-3: 520ms;
```

Replace with:

```css
    /* Motion */
    --ease-paper: cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* slow tail-out */
    --ease-ink: cubic-bezier(0.34, 1.05, 0.64, 1);        /* slight overshoot then settle */
    --ease-press: cubic-bezier(0.2, 0.7, 0.2, 1);         /* tight press/lift */
    --ease: var(--ease-paper);                            /* alias for back-compat */
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
    --dur-1: 240ms;                                       /* was 180ms */
    --dur-2: 420ms;                                       /* was 320ms */
    --dur-3: 520ms;
    --dur-stamp: 520ms;                                   /* save confirmations */
    --dur-draw: 360ms;                                    /* ink underline draw */
    --dur-fold: 420ms;                                    /* chatbot unfurl */
    --scale-press: 0.97;                                  /* button active */
    --scale-lift: 1.02;                                   /* card hover */
```

- [ ] **Step 3: Verify tokens.css still serves at 200**

Run:
```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
curl -s -o /dev/null -w "tokens.css: %{http_code}\n" http://localhost:8080/assets/css/tokens.css
curl -s http://localhost:8080/assets/css/tokens.css | grep -c "ease-paper\|dur-stamp\|scale-press"
kill %1 2>/dev/null
```

Expected: `tokens.css: 200`, grep count ≥ 3.

- [ ] **Step 4: WIP commit**

```bash
cd /Users/deepsight/code/urbane-ethos
git add assets/css/tokens.css
git commit -m "wip(motion): add 8 motion tokens, rebalance --dur-1/-2, alias --ease"
```

---

## Task 2: Verify no literal durations remain in CSS

**Files:**
- Possibly modify: `urbane-ethos/assets/css/components.css`, `urbane-ethos/assets/css/motion.css`, `urbane-ethos/assets/css/base.css`

- [ ] **Step 1: Run grep acceptance check across CSS files**

Run:
```bash
cd /Users/deepsight/code/urbane-ethos
grep -nE '\b(180ms|320ms)\b' assets/css/*.css
```

Expected: no output (no literal old durations remain).

- [ ] **Step 2: If grep returned any hits, replace each with the corresponding token**

For each hit:
- `180ms` → `var(--dur-1)`
- `320ms` → `var(--dur-2)`

Use Edit on each line. Preserve surrounding context exactly.

- [ ] **Step 3: Re-run grep to confirm clean**

Run the same grep from Step 1.
Expected: no output.

- [ ] **Step 4: Also verify no literal `cubic-bezier(0.2, 0.7, 0.2, 1)` ease-press values stayed inline (those should be `var(--ease)` or `var(--ease-paper)` references)**

Run:
```bash
grep -nE 'cubic-bezier\(0\.2, 0\.7, 0\.2, 1\)' assets/css/*.css
```

If grep returns hits in `tokens.css` line for `--ease-press`, that's expected (that's the token definition). Hits in `components.css` or `motion.css` or `base.css` should be replaced with `var(--ease)`.

- [ ] **Step 5: WIP commit (skip if no changes)**

```bash
cd /Users/deepsight/code/urbane-ethos
git status --short
# If files changed:
git add assets/css/components.css assets/css/motion.css assets/css/base.css
git commit -m "wip(motion): replace literal durations/eases with tokens"
# If nothing changed (already clean), skip the commit
```

---

## Task 3: Update `motion.css` keyframes

**Files:**
- Modify: `urbane-ethos/assets/css/motion.css`

- [ ] **Step 1: Read existing motion.css**

Run: `cat urbane-ethos/assets/css/motion.css`

Expected: see existing keyframes including `consent-saved-in`, `panel-in`, `chat-bubble-in`, `chip-settle`, `chatbot-pulse`, `form-shake`, and the `.fade-in-up` class.

- [ ] **Step 2: Delete the `consent-saved-in` keyframe**

Find the block:
```css
@keyframes consent-saved-in { ... }
.consent-saved { animation: consent-saved-in ... }
```

Delete the `@keyframes consent-saved-in` rule entirely. The `.consent-saved` class still exists but its animation reference is removed (the SVG stamp now animates itself via inline `<animate>` SMIL).

If `.consent-saved { animation: ... }` is the only declaration in that ruleset, remove the entire ruleset. If there are other declarations (e.g. `display: flex; gap: var(--space-2)`), keep those but remove the `animation:` line.

- [ ] **Step 3: Rename `panel-in` keyframe to `chatbot-unfurl` and update its values**

Find:
```css
.chatbot-panel { animation: panel-in var(--dur-2) var(--ease) both; }
@keyframes panel-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
```

Replace with:
```css
.chatbot-panel {
  animation: chatbot-unfurl var(--dur-fold) var(--ease-paper) both;
  transform-origin: bottom right;
}
@keyframes chatbot-unfurl {
  from { opacity: 0; transform: scale(0.6) rotate(-1.5deg) translateY(8px); }
  to   { opacity: 1; transform: scale(1) rotate(0deg) translateY(0); }
}
```

- [ ] **Step 4: Add new `page-turn-slide` keyframe**

Inside the `@layer motion { @media (prefers-reduced-motion: no-preference) { ... } }` block, add:

```css
@keyframes page-turn-slide {
  from { opacity: 0; transform: translateX(6px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

- [ ] **Step 5: Verify motion.css still serves at 200 and contains the new keyframes**

Run:
```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
curl -s -o /dev/null -w "motion.css: %{http_code}\n" http://localhost:8080/assets/css/motion.css
echo "consent-saved-in deletions:"
curl -s http://localhost:8080/assets/css/motion.css | grep -c "consent-saved-in"
echo "chatbot-unfurl additions:"
curl -s http://localhost:8080/assets/css/motion.css | grep -c "chatbot-unfurl"
echo "page-turn-slide additions:"
curl -s http://localhost:8080/assets/css/motion.css | grep -c "page-turn-slide"
echo "panel-in remaining (should be 0):"
curl -s http://localhost:8080/assets/css/motion.css | grep -c "panel-in"
kill %1 2>/dev/null
```

Expected: motion.css: 200, consent-saved-in: 0, chatbot-unfurl: 2+, page-turn-slide: 1+, panel-in: 0.

- [ ] **Step 6: WIP commit**

```bash
git add assets/css/motion.css
git commit -m "wip(motion): delete consent-saved-in + panel-in keyframes; add chatbot-unfurl + page-turn-slide"
```

---

## Task 4: Create `sage-stamp.js` shared module + smoke test

**Files:**
- Create: `urbane-ethos/assets/js/sage-stamp.js`
- Create: `urbane-ethos/test/smoke/sage-stamp.html`

- [ ] **Step 1: Write `assets/js/sage-stamp.js`**

Create the file with:

```javascript
const STAMP_SVG = `
<span class="sage-stamp" aria-hidden="true" style="display:inline-block;transform:rotate(-2deg);margin-left:4px;margin-top:-2px;vertical-align:middle">
  <svg viewBox="0 0 32 32" width="22" height="22">
    <circle cx="16" cy="16" r="13" stroke="var(--color-sage-deep)" stroke-width="2" fill="none"
            stroke-dasharray="82" stroke-dashoffset="82">
      <animate attributeName="stroke-dashoffset" from="82" to="0" dur="0.36s" fill="freeze"/>
    </circle>
    <path d="M10 16 L14 20 L22 12" stroke="var(--color-sage-deep)" stroke-width="2" fill="none"
          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="20" stroke-dashoffset="20">
      <animate attributeName="stroke-dashoffset" from="20" to="0" begin="0.32s" dur="0.16s" fill="freeze"/>
    </path>
  </svg>
</span>
`;

/**
 * Render a sage circle + checkmark stamp into the target element.
 * The stamp is prepended (so existing text like "Saved." appears to its right).
 * SVG animations auto-start via inline <animate> elements on attach.
 * Forces a reflow before insertion to make timing deterministic on re-trigger.
 *
 * @param {HTMLElement} targetEl - element to prepend the stamp into
 * @returns {HTMLElement} the inserted stamp span
 */
export function renderSageStamp(targetEl) {
  if (!targetEl) return null;
  // Remove any prior stamp in this target (re-trigger safety)
  targetEl.querySelectorAll(".sage-stamp").forEach(el => el.remove());
  // Insert
  targetEl.insertAdjacentHTML("afterbegin", STAMP_SVG);
  const stamp = targetEl.querySelector(".sage-stamp");
  // Force reflow so the SMIL animations start deterministically
  if (stamp) void stamp.offsetWidth;
  return stamp;
}
```

- [ ] **Step 2: Write `test/smoke/sage-stamp.html`**

Create with:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>sage-stamp smoke</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/motion.css">
</head>
<body>
<main class="wrap">
<h1>Sage stamp smoke</h1>
<p>Click the button to render the sage stamp. Should see a sage-coloured circle drawing in, followed by a checkmark.</p>
<button class="btn btn--primary" id="trigger">Render stamp</button>
<p style="margin-top:1rem"><span id="target"><span aria-live="polite">Saved.</span></span></p>
<ul id="log"></ul>
</main>
<script type="module">
import { renderSageStamp } from "/assets/js/sage-stamp.js";

const log = m => {
  const li = document.createElement("li");
  li.textContent = m;
  document.getElementById("log").append(li);
};

document.getElementById("trigger").addEventListener("click", () => {
  const target = document.getElementById("target");
  const stamp = renderSageStamp(target);
  log(`Rendered. SVG count in target: ${target.querySelectorAll("svg").length}. Has aria-hidden: ${stamp.getAttribute("aria-hidden") === "true"}`);
});
</script>
</body>
</html>
```

- [ ] **Step 3: Verify both files serve at 200**

Run:
```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
curl -s -o /dev/null -w "sage-stamp.js: %{http_code}\n" http://localhost:8080/assets/js/sage-stamp.js
curl -s -o /dev/null -w "sage-stamp smoke: %{http_code}\n" http://localhost:8080/test/smoke/sage-stamp.html
curl -s http://localhost:8080/assets/js/sage-stamp.js | grep -c "renderSageStamp"
kill %1 2>/dev/null
```

Expected: both 200, grep count ≥ 2 (export + the JSDoc reference).

- [ ] **Step 4: WIP commit**

```bash
git add assets/js/sage-stamp.js test/smoke/sage-stamp.html
git commit -m "wip(motion): add sage-stamp.js module + smoke test"
```

---

## Task 5: Wire `consent.js` to use `renderSageStamp` + fade-out CSS

**Files:**
- Modify: `urbane-ethos/assets/js/consent.js`
- Modify: `urbane-ethos/assets/css/components.css`

- [ ] **Step 1: Read current `consent.js`**

Run: `cat urbane-ethos/assets/js/consent.js`

Locate the existing save-success affordance — the block that renders "Saved." text before banner removal. From the prior polish commit (911aba1), this is likely a `.consent-saved` div with text + checkmark.

- [ ] **Step 2: Import `renderSageStamp` into `consent.js`**

At the top of `consent.js`, alongside the existing `import { translatePage } from ...`, add:

```javascript
import { renderSageStamp } from "/assets/js/sage-stamp.js";
```

- [ ] **Step 3: Update the save-success affordance to use the sage stamp**

Find the function that runs after `writeConsent({...})` (likely inside `attachBanner()` or a helper). Replace the block that shows "Saved." with:

```javascript
function showSavedConfirmation(banner) {
  // Clear the banner body and replace with the saved block
  const body = banner.querySelector(".consent-body") || banner;
  const saved = document.createElement("div");
  saved.className = "consent-saved";
  saved.innerHTML = `<span aria-live="polite" class="consent-saved-text">Saved.</span>`;
  body.replaceChildren(saved);
  // Inject the sage stamp before the text
  renderSageStamp(saved);
  // After 720ms (stamp draws over 480ms + 240ms pause), fade out then remove banner
  setTimeout(() => {
    banner.classList.add("is-leaving");
    setTimeout(() => banner.remove(), 200);
  }, 720);
}
```

Then update each `writeConsent({...})` call site (the three action handlers — `all`, `necessary`, `save`) to call `showSavedConfirmation(banner)` instead of `banner.remove()`.

- [ ] **Step 4: Add fade-out CSS to `components.css`**

In `urbane-ethos/assets/css/components.css`, find the `.consent-banner` block (under `@layer components`) and add (after the existing `.consent-banner` declarations):

```css
.consent-banner { transition: opacity 200ms var(--ease-paper); }
.consent-banner.is-leaving { opacity: 0; pointer-events: none; }
.consent-saved {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.consent-saved-text {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  color: var(--color-ink);
}
@media (prefers-reduced-motion: reduce) {
  .consent-banner { transition: none; }
  .sage-stamp svg animate { display: none; }
}
```

- [ ] **Step 5: Verify by manual smoke test**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
# Open the consent smoke test (existing from T12)
open http://localhost:8080/test/smoke/consent.html
```

Manually click "Manage cookies" → click "Accept all" → confirm the sage stamp appears next to "Saved." text, the block stays visible for ~720ms, then fades out over 200ms. Reload, repeat with "Customize" → toggle and "Save my choices" → confirm same behavior. Click "Manage cookies" again → confirm banner reopens.

```bash
kill %1 2>/dev/null
```

- [ ] **Step 6: WIP commit**

```bash
git add assets/js/consent.js assets/css/components.css
git commit -m "wip(motion): wire consent.js to sage-stamp + add fade-out CSS"
```

---

## Task 6: Wire `personalization.js` to use `renderSageStamp`

**Files:**
- Modify: `urbane-ethos/assets/js/personalization.js`

- [ ] **Step 1: Read current `personalization.js`**

Run: `cat urbane-ethos/assets/js/personalization.js`

Find the `attachSurvey(form)` function. It currently does `form.querySelector("[data-personalize-feedback]")?.removeAttribute("hidden");` on submit.

- [ ] **Step 2: Import `renderSageStamp`**

At the top of `personalization.js`, alongside the existing `import { isAllowed } from ...`, add:

```javascript
import { renderSageStamp } from "/assets/js/sage-stamp.js";
```

- [ ] **Step 3: Update `attachSurvey` submit handler to render the stamp + schedule fade**

Find the submit handler:

```javascript
form.addEventListener("submit", e => {
  e.preventDefault();
  const data = new FormData(form);
  write({
    age: data.get("age"),
    concern: data.get("concern"),
    stage: data.get("stage")
  });
  form.querySelector("[data-personalize-feedback]")?.removeAttribute("hidden");
});
```

Replace the last two lines with:

```javascript
  write({
    age: data.get("age"),
    concern: data.get("concern"),
    stage: data.get("stage")
  });
  const feedback = form.querySelector("[data-personalize-feedback]");
  if (feedback) {
    feedback.removeAttribute("hidden");
    // Ensure the text node has "Saved." content (existing markup may already have it)
    if (!feedback.textContent.trim()) feedback.textContent = "Saved.";
    feedback.setAttribute("aria-live", "polite");
    renderSageStamp(feedback);
    // After 720ms, fade out
    setTimeout(() => {
      feedback.style.transition = "opacity 200ms var(--ease-paper)";
      feedback.style.opacity = "0";
      setTimeout(() => {
        feedback.setAttribute("hidden", "");
        feedback.style.opacity = "";
        feedback.style.transition = "";
        feedback.querySelectorAll(".sage-stamp").forEach(el => el.remove());
      }, 200);
    }, 720);
  }
});
```

- [ ] **Step 4: Verify by manual smoke test**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
open http://localhost:8080/test/smoke/personalization.html
```

In the browser: accept personalization consent in the banner first if prompted, then submit the form. Confirm sage stamp appears next to "Saved.", stays visible ~720ms, fades over 200ms.

```bash
kill %1 2>/dev/null
```

- [ ] **Step 5: WIP commit**

```bash
git add assets/js/personalization.js
git commit -m "wip(motion): wire personalization.js to sage-stamp on save"
```

---

## Task 7: Ink-draw underline on links (`base.css`)

**Files:**
- Modify: `urbane-ethos/assets/css/base.css`

- [ ] **Step 1: Read current `base.css` link styling**

Run: `cat urbane-ethos/assets/css/base.css`

Find the existing `a { ... }` ruleset. From the original CSS:

```css
a {
  color: var(--color-terracotta-deep);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
a:hover { text-decoration-thickness: 2px; }
```

- [ ] **Step 2: Replace with the ink-draw background technique**

Replace the existing `a { ... }` and `a:hover { ... }` rules with:

```css
a {
  color: var(--color-terracotta-deep);
  text-decoration: none;
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 100% 1px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: background-size var(--dur-draw) var(--ease-ink);
  padding-bottom: 1px;
}
a:hover { background-size: 100% 2px; }

@media (prefers-reduced-motion: no-preference) {
  /* Reset to 0% then animate to 100% on hover for the draw-in effect on initial-state links */
  main a:not(:hover):not(:focus-visible) { background-size: 0% 1px; }
  main a:hover, main a:focus-visible { background-size: 100% 1px; }
  footer a:not(:hover):not(:focus-visible) { background-size: 0% 1px; }
  footer a:hover, footer a:focus-visible { background-size: 100% 1px; }
}

@media (prefers-reduced-motion: reduce) {
  /* Static underline visible at rest for reduced-motion users */
  a { background-size: 100% 1px; }
}
```

This gives the ink-draw effect on links inside `<main>` and `<footer>` (the body content), while keeping a stable visible underline on links inside the chatbot panel and consent banner (which have their own button-like styling).

- [ ] **Step 3: Verify by manual smoke test**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
open http://localhost:8080/
```

In the browser: hover over any link in the body (e.g., footer nav links, recommended-rail card titles). Confirm the underline draws left-to-right over ~360ms. Move off, confirm it retracts from the right edge. Test on Firefox or with `prefers-reduced-motion` set: confirm underline is statically visible without animation.

```bash
kill %1 2>/dev/null
```

- [ ] **Step 4: WIP commit**

```bash
git add assets/css/base.css
git commit -m "wip(motion): ink-draw link underline via background-image technique"
```

---

## Task 8: Add `<div class="card-inner">` wrappers to HTML pages

**Files:**
- Modify: `urbane-ethos/index.html`
- Modify: `urbane-ethos/about.html`
- Modify: `urbane-ethos/blog.html`

- [ ] **Step 1: Identify which pages render `<a class="card">` dynamically vs statically**

Run:
```bash
cd /Users/deepsight/code/urbane-ethos
grep -rln 'class="card"' --include='*.html' .
grep -rln 'class="card"' --include='*.html' --include='*.js' .
```

The card markup is generated in the page-level inline `<script>` blocks (e.g., in `index.html`'s `renderHome()` function). The wrapping needs to happen in the JS that renders card innerHTML, not the static HTML.

- [ ] **Step 2: Update `index.html`'s card rendering to wrap children in `.card-inner`**

Open `urbane-ethos/index.html` and find the script block. There are several card-rendering loops:

a. **Services grid** (`#home-services`):
```javascript
a.innerHTML = `<h3>${item.title}</h3><p>${item.blurb ?? ""}</p>`;
```
Replace with:
```javascript
a.innerHTML = `<div class="card-inner"><h3>${item.title}</h3><p>${item.blurb ?? ""}</p></div>`;
```

b. **Recommended grid** (`#recommended-grid`) — has two card creations (blog post + staff). Wrap each `a.innerHTML = ...` body in `<div class="card-inner">...</div>`.

c. **Blog teaser** (`#home-blog`):
```javascript
a.innerHTML = `<small>${p.date} · ${p.category}</small><h3>${p.title}</h3><p>${p.excerpt}</p>`;
```
Replace with:
```javascript
a.innerHTML = `<div class="card-inner"><small>${p.date} · ${p.category}</small><h3>${p.title}</h3><p>${p.excerpt}</p></div>`;
```

- [ ] **Step 3: Update `about.html`'s values grid card rendering**

Find the `renderAbout()` function. The values grid creates `<article class="card">` (not `<a>`), so it doesn't strictly need `.card-inner` (hover effect only applies to `a.card`). But for consistency, wrap anyway:

```javascript
c.innerHTML = `<div class="card-inner"><h3>${v.title}</h3><p>${v.body}</p></div>`;
```

- [ ] **Step 4: Update `blog.html`'s post card rendering**

In `renderBlog()`'s `paint()` function:
```javascript
a.innerHTML = `<small>${esc(p.date)} · ${esc(p.category)}</small><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p>`;
```
Replace with:
```javascript
a.innerHTML = `<div class="card-inner"><small>${esc(p.date)} · ${esc(p.category)}</small><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p></div>`;
```

- [ ] **Step 5: Verify by inspecting served HTML**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
# Pages should render and have card-inner in the inline scripts
for path in "" about.html blog.html; do
  echo "=== /$path ==="
  curl -s "http://localhost:8080/$path" | grep -c "card-inner"
done
kill %1 2>/dev/null
```

Expected: each page returns at least 1 `card-inner` match (in the inline script source).

- [ ] **Step 6: WIP commit**

```bash
git add index.html about.html blog.html
git commit -m "wip(motion): wrap a.card children in .card-inner for paper-corner-lift"
```

---

## Task 9: Paper-corner card hover in `components.css`

**Files:**
- Modify: `urbane-ethos/assets/css/components.css`

- [ ] **Step 1: Read current `.card` and `a.card:hover` rules**

Run: `grep -n "\.card" urbane-ethos/assets/css/components.css`

Find the existing card styles (likely `.card { background: ...; padding: ...; }` and `a.card:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); }`).

- [ ] **Step 2: Add `.card-inner` transition + move the hover effect to it**

Find the existing card block. Update to:

```css
.card {
  background: var(--color-cream-soft);
  border-radius: var(--radius-3);
  padding: var(--space-8);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
.card h3 { margin-bottom: var(--space-3); }

a.card {
  text-decoration: none;
  color: inherit;
  display: block;
}
.card-inner {
  display: block;
  transition: transform var(--dur-2) var(--ease-paper),
              box-shadow var(--dur-2) var(--ease-paper);
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  a.card:hover .card-inner {
    transform: translateY(-2px) rotate(-0.4deg);
    box-shadow: -6px 8px 16px -8px rgba(43, 31, 20, 0.18);
  }
}
```

Important: REMOVE the old `a.card:hover { transform: ...; box-shadow: ...; }` rule from elsewhere in the file (it now applies to `.card-inner` instead of the `.card` itself).

- [ ] **Step 3: Verify by manual smoke test**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
open http://localhost:8080/
```

Hover over a service card on the home page. Confirm:
- The card lifts ~2px and rotates slightly counterclockwise.
- Shadow grows toward the top-left corner (suggesting the card is lifted at that corner).
- Neighboring cards in the grid don't shift visibly (because rotation is on `.card-inner`, not `.card`).

```bash
kill %1 2>/dev/null
```

- [ ] **Step 4: WIP commit**

```bash
git add assets/css/components.css
git commit -m "wip(motion): paper-corner card hover via .card-inner wrapper"
```

---

## Task 10: Page-turn-slide for locale toggle in `components.css`

**Files:**
- Modify: `urbane-ethos/assets/css/components.css`

- [ ] **Step 1: Read current locale-toggle styles**

Run: `grep -n "locale-toggle" urbane-ethos/assets/css/components.css`

Find the existing `.locale-toggle button` and `.locale-toggle [aria-pressed="true"]` rules. From the original components.css:

```css
.locale-toggle [aria-pressed="true"] {
  background: var(--color-ink);
  color: var(--color-cream-soft);
  border-radius: var(--radius-pill);
}
.locale-toggle button {
  transition: background var(--dur-1) var(--ease), color var(--dur-1) var(--ease);
}
```

If a `chip-settle` animation reference appears on the locale-toggle buttons (from the polish commit 911aba1), it needs to be removed.

- [ ] **Step 2: Replace the `chip-settle` animation reference on locale-toggle with `page-turn-slide`**

Look for any rule like `.locale-toggle [aria-pressed="true"] { animation: chip-settle ... }`. Replace it with:

```css
@media (prefers-reduced-motion: no-preference) {
  .locale-toggle [aria-pressed="true"] {
    animation: page-turn-slide var(--dur-2) var(--ease-paper) both;
  }
}
```

If no `chip-settle` reference exists on locale-toggle (the polish only added chip-settle to general `.chip-pill`, not to locale toggle buttons), still add the `page-turn-slide` rule above.

- [ ] **Step 3: Verify by manual test**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
open http://localhost:8080/
```

Click the BM toggle in the header. Confirm the newly-pressed button slides in from a slight horizontal offset with a subtle fade. Click EN to switch back. Confirm same on the EN button.

```bash
kill %1 2>/dev/null
```

- [ ] **Step 4: WIP commit**

```bash
git add assets/css/components.css
git commit -m "wip(motion): page-turn-slide on locale toggle aria-pressed state"
```

---

## Task 11: Full verification pass

**No files modified in this task.** This is the gate before squash.

- [ ] **Step 1: All 8 pages return 200**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
for path in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/$path")
  echo "$code  /$path"
done
kill %1 2>/dev/null
```

Expected: all 200.

- [ ] **Step 2: i18n parity check passes (no new strings introduced)**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/check-i18n-parity.rb
```

Expected: `i18n parity OK (9 files)` exit 0.

- [ ] **Step 3: Grep acceptance check — no literal old durations remain**

```bash
cd /Users/deepsight/code/urbane-ethos
grep -nE '\b(180ms|320ms)\b' assets/css/*.css
```

Expected: no output (no literal old durations).

- [ ] **Step 4: Smoke tests for the JS modules still work**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
for path in i18n.html a11y.html consent.html chatbot.html personalization.html sage-stamp.html; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/test/smoke/$path")
  echo "$code  /test/smoke/$path"
done
kill %1 2>/dev/null
```

Expected: all 200.

- [ ] **Step 5: axe-core audit across all 8 production pages**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
mkdir -p /tmp/axe-phase1
for path in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  fname=$(echo "$path" | tr '/' '_' | sed 's/^_//; s/^$/home/')
  echo "=== /$path ==="
  npx -y @axe-core/cli "http://localhost:8080/$path" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -n 20 | tee "/tmp/axe-phase1/$fname.log"
done
kill %1 2>/dev/null
echo
echo "=== Violations summary ==="
grep -h "violation" /tmp/axe-phase1/*.log | grep -i "serious\|critical" | wc -l
```

Expected: zero serious/critical violations across all 8 pages.

If any serious/critical violations appear:
- Read the offending page's log to find the rule.
- Fix the issue (likely something added in this plan introduced it — e.g., a missing aria-hidden or an iframe without title).
- Re-run that page's axe-core to confirm fix.

- [ ] **Step 6: Manual sanity sweep (5 minutes, human eye)**

Run `bin/server` and open `http://localhost:8080/` in a browser. Walk through:
- Home page: hover service cards (paper-corner lift visible, neighbors don't shift), hover footer links (ink-draw underline visible), click EN/BM toggle (page-turn-slide visible).
- Click "Manage cookies" in footer → consent banner reopens → click "Save my choices" → confirm sage stamp appears + fade-out.
- Click chatbot bubble → confirm chatbot-unfurl animation (panel scales from bottom-right corner).
- Open about.html, blog.html → confirm cards have card-inner wrapper and hover behaves the same.
- Open privacy.html → confirm no console errors, page renders.
- Open `test/smoke/sage-stamp.html` → click "Render stamp" → confirm SVG draws.

Toggle `prefers-reduced-motion: reduce` in browser dev tools (Rendering panel in Chrome/Edge, or system settings on Mac). Reload home. Confirm:
- Card hover shows no rotation (static).
- Link underlines are statically visible at rest.
- Consent banner save shows "Saved." text without stamp animation.
- Chatbot panel opens without animation.

- [ ] **Step 7: WIP commit (capture verification state if any fixes were made; skip if nothing changed)**

```bash
cd /Users/deepsight/code/urbane-ethos
git status --short
# If files changed in this verification step (axe fix or similar):
git add -u
git commit -m "wip(motion): a11y/verification fixes during Task 11"
# If clean, skip
```

---

## Task 12: Squash all WIP commits into a single `feat(motion)` commit

**Files:** No file changes. Git history rewrite only.

- [ ] **Step 1: Confirm all Phase 1 WIP commits are present and the base is clean**

```bash
cd /Users/deepsight/code/urbane-ethos
git log --oneline | head -20
```

Expected: ~8-11 `wip(motion):` commits since `0b2c138`. The base commit `0b2c138 docs: add polish pass design doc from /office-hours` should be visible.

- [ ] **Step 2: Confirm working tree is clean (no uncommitted changes)**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 3: Soft-reset to base, keeping all changes staged**

```bash
git reset --soft 0b2c138
git status
```

Expected: status shows all the Phase 1 file changes as staged ("changes to be committed").

- [ ] **Step 4: Create the single squashed commit**

```bash
git commit -m "feat(motion): paper and ink craft + organic timing rebalance"
```

No Anthropic/Claude trailer.

- [ ] **Step 5: Verify the final history is clean**

```bash
git log --oneline | head -5
```

Expected:
```
<new-sha> feat(motion): paper and ink craft + organic timing rebalance
0b2c138 docs: add polish pass design doc from /office-hours
911aba1 feat(polish): discrete consent card + microinteractions
6366169 docs: finalize README with run/structure/status/scope
3f2e9e3 fix(a11y): resolve axe-core findings; document residual gaps
```

No WIP commits remain in the history.

- [ ] **Step 6: Final verification re-run (sanity check after the rewrite)**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/check-i18n-parity.rb
grep -nE '\b(180ms|320ms)\b' assets/css/*.css
bin/server &
sleep 1
curl -s -o /dev/null -w "/: %{http_code}\n" http://localhost:8080/
kill %1 2>/dev/null
```

Expected: parity OK, grep silent, home page 200.

Phase 1 done.

---

## Self-Review

**Spec coverage:**
- ✅ Phase 1 SC #1 (8 motion tokens) → Task 1
- ✅ Phase 1 SC #2 (organic timing rebalance via tokens, grep check) → Task 1 + Task 2
- ✅ Phase 1 SC #3 (6 craft moments):
  - Consent save sage stamp → Tasks 4 + 5
  - Chatbot unfurl → Task 3 (motion.css keyframe)
  - Locale toggle page-turn-slide → Tasks 3 + 10
  - Link hover ink-draw → Task 7
  - Service card paper-corner lift → Tasks 8 + 9
  - Personalization saved stamp → Tasks 4 + 6
- ✅ Phase 1 SC #4 (no new strings, parity check) → Task 11
- ✅ Phase 1 SC #5 (prefers-reduced-motion gates) → distributed across Tasks 5, 7, 9 (each adds explicit reduced-motion handling)
- ✅ Phase 1 SC #6 (a11y additions: aria-hidden on SVG, aria-live on Saved.) → Tasks 4 + 5
- ✅ Phase 1 SC #7 (no axe regression) → Task 11
- ✅ Phase 1 SC #8 (all pages 200) → Task 11
- ✅ Phase 1 SC #9 (single commit on main) → Task 12

**Placeholder scan:** no "TBD", "handle edge cases", "similar to Task N", or open-ended language. Every code block is complete. Every command is exact.

**Type consistency:**
- `renderSageStamp(targetEl)` signature is consistent across Tasks 4 (definition), 5 (consent), 6 (personalization).
- Token names (`--ease-paper`, `--ease-ink`, `--ease-press`, `--dur-stamp`, `--dur-draw`, `--dur-fold`, `--scale-press`, `--scale-lift`) match between Task 1 (definition), Task 3 (motion.css usage), Task 5 (components.css usage), Task 7 (base.css usage), Task 9 (card hover), Task 10 (locale toggle).
- `.card-inner` class is wrapped in Task 8 (HTML) and styled in Task 9 (CSS).
- Keyframe names (`chatbot-unfurl`, `page-turn-slide`) match between definition (Task 3) and usage (Tasks 9, 10 reference them as needed; the locale-toggle activation is in Task 10).

No issues found.

---

## Execution Handoff

Plan complete and saved to `urbane-ethos/docs/superpowers/plans/2026-06-08-polish-pass-phase1-motion.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a 12-task plan with diverse work (CSS tokens, JS module, HTML wrapping, axe verification). Matches the pattern used for the original 23-task build.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Faster if you're confident in the spec and want to ship Phase 1 in one go.

Which approach?
