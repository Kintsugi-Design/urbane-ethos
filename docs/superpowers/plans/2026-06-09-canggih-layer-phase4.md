# Canggih Layer (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a layered "canggih" (sophisticated) brand pass on the Urbane Ethos prototype — atmospheric depth (A1 page-load ink-bloom, A2 ink-dot cursor, A3 paper-grain, A5 ::selection) always-on + cinematic pacing (C1 100vh hero, A4 parallax, C4 paper-fold reveals) applied contextually per the design doc's P3 placement rule.

**Architecture:** Tracer-bullet sequencing per Approach A — tokens + always-on layer ship globally first, then contextual layer lands on home hero only, real-browser review calibrates magnitudes via token edits, then contextual layer propagates per P3. Reuses the existing `.fade-in-up` + `.is-in` scroll-reveal infrastructure for C4 (additive `rotateX`, no new convention), and the existing `prefers-reduced-motion: reduce` gate in `motion.css` + `a11y.js`.

**Tech Stack:** Plain CSS (custom properties + cascade layers), vanilla JS (ES modules, IntersectionObserver, `pointermove`), no new dependencies. Ruby WEBrick via `bin/server` for review at `http://localhost:8080`.

**Design doc:** `/Users/deepsight/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md` (Status: APPROVED).

**Plan deviation from design doc — productive simplification:** The design doc prescribed introducing a new `.reveal-on-scroll` + `.in-view` convention for C4 paper-fold reveals. This plan **extends the existing `.fade-in-up` + `.is-in` class** (already wired through `assets/css/motion.css` and `assets/js/a11y.js` `initScrollReveal`) by adding `rotateX(var(--canggih-fold-deg))` to its transform. Outcome: all existing `.fade-in-up` usages (index.html:66, index.html:113, services.html dynamically-rendered service blocks) automatically inherit the paper-fold; zero markup changes; zero new JS; zero new IntersectionObserver. Design intent preserved (paper-fold reveals on text-content blocks); implementation strictly simpler. The design doc's `transform-style: preserve-3d` requirement on parents (`main`, `section`, `.hero`) still applies.

**Calibration cut clause from design doc P1:** during the tracer-bullet review (Task 9), any of the 7 moves may be CUT — not raised — if it reads "techy" or "novelty." Cutting is the calibration tool; magnitude-raising is not. Worst case Phase 4 ships 4 moves; Phase 5 picks up the cut ones.

**Pre-plan note — The Assignment:** the design doc's "The Assignment" recommends a 20-minute side-by-side reference walk (live urbaneethos.center + localhost:8080 + bimnovate localhost:4567) to ground starting magnitudes. If you've run it, update the seven token values in Task 1 from your calibration notes BEFORE running Task 1. If you haven't, use the working numbers in Task 1 as-is — they're conservative starting points and the review checkpoint at Task 9 is where they get calibrated either way.

---

## File Structure

**Create:**
- `assets/js/page-load.js` — A1 sessionStorage-gated ink-bloom on `main`. ~25 lines.
- `assets/js/cursor.js` — A2 pointer tracking + selector-based hover state. ~55 lines.
- `assets/js/parallax.js` — A4 rAF-throttled scroll-Y → CSS custom property. ~25 lines.

**Modify:**
- `assets/css/tokens.css:74-87` — append 7 `--canggih-*` tokens (between Motion and Layout sections).
- `assets/css/base.css` — add paper-grain `background-image` on `body`; add `::selection`; add `html { cursor: auto }`.
- `assets/css/components.css` — add `.canggih-cursor` styles; add `transform-style: preserve-3d` on `main`/`section`/`.hero`; add C1 100vh hero rules.
- `assets/css/motion.css:3-5` — extend `.fade-in-up` keyframe with `rotateX(var(--canggih-fold-deg))`. Add A1 bloom keyframe. Add A4 hero parallax transform rule (driven by `--scroll-y` CSS variable).
- `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html` — append `import "/assets/js/page-load.js"; import "/assets/js/cursor.js";` to each page's `<script type="module">` block (8 pages).
- `index.html`, `about.html`, `services.html` — append `import "/assets/js/parallax.js";` only on these three pages (per P3 A4 placement).
- `docs/HANDOVER.md` — append Phase 4 landing notes (Task 14).

**Test (inline grep + smoke):**
- Each task includes inline `grep`/`curl` assertions instead of a separate test file. The existing `bin/check-i18n-parity.rb` is unaffected. Real-browser review is the human gate at Task 9 and Task 13.

---

## Task 1: Add 7 canggih magnitude tokens to tokens.css

**Files:**
- Modify: `assets/css/tokens.css` (insert after the `Motion` block at line 87, before `Layout` at line 89)

- [ ] **Step 1: Write the failing check**

```bash
grep -cE '^[[:space:]]+--canggih-' assets/css/tokens.css
```

Expected: `0` (no canggih tokens exist yet).

- [ ] **Step 2: Add the 7 tokens to tokens.css**

In `assets/css/tokens.css`, between the `--scale-lift: 1.02;` line and the `/* Layout */` comment, insert:

```css

    /* Canggih (Phase 4) — magnitudes for atmospheric depth + cinematic pacing.
       Calibrate during Task 9 tracer-bullet review; cut, don't raise. */
    --canggih-cursor-rest: 6px;
    --canggih-cursor-active: 12px;
    --canggih-cursor-opacity-rest: 0.55;
    --canggih-parallax-depth: 4px;
    --canggih-grain-opacity: 0.03;
    --canggih-fold-deg: 2deg;
    --canggih-load-duration: 1200ms;
```

- [ ] **Step 3: Run the check, verify passes**

```bash
grep -cE '^[[:space:]]+--canggih-' assets/css/tokens.css
```

Expected: `7`.

- [ ] **Step 4: Commit**

```bash
git add assets/css/tokens.css
git commit -m "feat(canggih): add 7 magnitude tokens for Phase 4"
```

---

## Task 2: A3 paper-grain texture + A5 ::selection (CSS-only)

**Files:**
- Modify: `assets/css/base.css`

- [ ] **Step 1: Write the failing checks**

```bash
grep -c 'canggih-grain-opacity' assets/css/base.css
grep -c '::selection' assets/css/base.css
```

Expected: `0` for both.

- [ ] **Step 2: Read base.css to find body declaration**

```bash
grep -n '^body\|^body ' assets/css/base.css
```

Expected: locates the `body` rule (likely sets background, color, font).

- [ ] **Step 3: Append A3 + A5 to base.css**

Append at the end of `assets/css/base.css` (inside any existing `@layer base { ... }` block):

```css

  /* A3 — paper-grain texture (Phase 4 canggih layer).
     Recipe matches _brief/urbane-ethos-revamp-brief.html. Opacity is via
     rgba in each radial-gradient; the token sets the contribution scale. */
  body {
    background-image:
      radial-gradient(circle at 12% 22%, rgba(120,80,40,calc(var(--canggih-grain-opacity) * 0.85)) 0, transparent 0.7px),
      radial-gradient(circle at 78% 64%, rgba(120,80,40,calc(var(--canggih-grain-opacity) * 0.85)) 0, transparent 0.7px),
      radial-gradient(circle at 44% 88%, rgba(120,80,40,calc(var(--canggih-grain-opacity) * 0.65)) 0, transparent 0.7px);
    background-size: 7px 7px, 11px 11px, 5px 5px;
  }

  /* A5 — sage ::selection. Uses color-mix to derive a soft sage from the
     existing palette tokens — no new color tokens introduced. */
  ::selection {
    background: color-mix(in srgb, var(--color-sage) 35%, var(--color-cream));
    color: var(--color-ink);
  }
  ::selection:window-inactive {
    background: var(--color-line);
  }

  /* A2 cursor scaffold — the canggih cursor is decorative; the OS cursor
     stays visible. The cursor.js module adds .canggih-cursor element to the
     body in Task 4. */
  html { cursor: auto; }
```

- [ ] **Step 4: Run checks, verify pass**

```bash
grep -c 'canggih-grain-opacity' assets/css/base.css
grep -c '::selection' assets/css/base.css
```

Expected: `1` and `2` (selection has two rules — active and window-inactive).

- [ ] **Step 5: Smoke-check in browser**

```bash
bundle install >/dev/null && bin/server &
SERVER_PID=$!
sleep 1
curl -s http://localhost:8080/assets/css/base.css | grep -c 'canggih-grain-opacity'
kill $SERVER_PID 2>/dev/null
```

Expected: `1`. (Confirms the file is served correctly.)

- [ ] **Step 6: Commit**

```bash
git add assets/css/base.css
git commit -m "feat(canggih): A3 paper-grain + A5 sage selection"
```

---

## Task 3: A1 page-load ink-bloom (JS + CSS keyframe)

**Files:**
- Create: `assets/js/page-load.js`
- Modify: `assets/css/motion.css`

- [ ] **Step 1: Write the failing check**

```bash
test -f assets/js/page-load.js && echo "EXISTS" || echo "MISSING"
grep -c 'canggih-bloom' assets/css/motion.css
```

Expected: `MISSING` and `0`.

- [ ] **Step 2: Create assets/js/page-load.js**

```javascript
// A1 page-load ink-bloom — sessionStorage-gated, runs once per tab session.
// Cross-tab limitation acknowledged: opening urbane-ethos in two tabs in the
// same browser session blooms both — sessionStorage is per-tab. Acceptable
// for prototype; swap to localStorage with TTL if it bothers in review.

const FLAG = "urbane-ethos:bloomed";

function shouldBloom() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try { return !sessionStorage.getItem(FLAG); } catch { return false; }
}

function markBloomed() {
  try { sessionStorage.setItem(FLAG, "1"); } catch { /* private mode */ }
}

export function initPageLoadBloom() {
  if (!shouldBloom()) return;
  const main = document.querySelector("main");
  if (!main) return;
  main.classList.add("canggih-bloom-in");
  // After the bloom completes, remove the class and persist the flag.
  setTimeout(() => {
    main.classList.remove("canggih-bloom-in");
    markBloomed();
  }, 1300); // canggih-load-duration (1200ms) + safety margin
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageLoadBloom, { once: true });
} else {
  initPageLoadBloom();
}
```

- [ ] **Step 3: Add the bloom keyframe to motion.css**

In `assets/css/motion.css`, inside the existing `@media (prefers-reduced-motion: no-preference)` block (after the `.fade-in-up` rules), append:

```css

    /* A1 — page-load ink-bloom. Scoped to main (NOT body) to avoid tinting
       <img> placeholders / Phase 2 photography. Tone + opacity settle only
       (no movement) — uses --ease-out, NOT --ease-paper. */
    @keyframes canggih-bloom {
      from { opacity: 0.85; filter: saturate(108%); }
      to   { opacity: 1;    filter: saturate(100%); }
    }
    main.canggih-bloom-in {
      animation: canggih-bloom var(--canggih-load-duration) var(--ease-out) both;
    }
```

- [ ] **Step 4: Run checks, verify pass**

```bash
test -f assets/js/page-load.js && echo "EXISTS"
grep -c 'canggih-bloom' assets/css/motion.css
grep -c 'canggih-load-duration' assets/css/motion.css
```

Expected: `EXISTS`, `2` (one keyframe name + one usage), `1`.

- [ ] **Step 5: Commit**

```bash
git add assets/js/page-load.js assets/css/motion.css
git commit -m "feat(canggih): A1 page-load ink-bloom (sessionStorage-gated)"
```

---

## Task 4: A2 custom cursor (CSS + JS module)

**Files:**
- Create: `assets/js/cursor.js`
- Modify: `assets/css/components.css`

- [ ] **Step 1: Write the failing checks**

```bash
test -f assets/js/cursor.js && echo "EXISTS" || echo "MISSING"
grep -c '\.canggih-cursor' assets/css/components.css
```

Expected: `MISSING` and `0`.

- [ ] **Step 2: Create assets/js/cursor.js**

```javascript
// A2 custom cursor — small sage ink-dot at rest, scales on interactive
// elements. Hidden on touch and prefers-reduced-motion. The OS cursor stays
// visible underneath; this dot is decorative.

const INTERACTIVE_SEL = "a, button, [role=\"button\"], input, textarea, select, label, summary";
const TEXT_INPUT_SEL = "input[type=\"text\"], input[type=\"email\"], input[type=\"tel\"], input[type=\"search\"], input[type=\"url\"], input:not([type]), textarea";

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initCanggihCursor() {
  if (isTouchDevice() || reducedMotion()) return;

  const dot = document.createElement("div");
  dot.className = "canggih-cursor";
  dot.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);

  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let rafId = 0;

  function render() {
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    rafId = 0;
  }

  document.addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(render);
  }, { passive: true });

  document.addEventListener("pointerover", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.matches(TEXT_INPUT_SEL)) {
      dot.classList.add("canggih-cursor--fade");
      dot.classList.remove("canggih-cursor--active");
    } else if (t.matches(INTERACTIVE_SEL) || t.closest(INTERACTIVE_SEL)) {
      dot.classList.add("canggih-cursor--active");
      dot.classList.remove("canggih-cursor--fade");
    } else {
      dot.classList.remove("canggih-cursor--active", "canggih-cursor--fade");
    }
  }, { passive: true });

  document.addEventListener("pointerout", () => {
    dot.classList.remove("canggih-cursor--active", "canggih-cursor--fade");
  }, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCanggihCursor, { once: true });
} else {
  initCanggihCursor();
}
```

- [ ] **Step 3: Add cursor CSS to components.css**

Append to `assets/css/components.css`:

```css

/* A2 canggih cursor — sage ink-dot, decorative (OS cursor visible underneath).
   pointer-events: none is critical so the dot never intercepts clicks/hovers. */
.canggih-cursor {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--canggih-cursor-rest);
  height: var(--canggih-cursor-rest);
  border-radius: 50%;
  background: var(--color-sage);
  opacity: var(--canggih-cursor-opacity-rest);
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: multiply;
  will-change: transform, width, height, opacity;
  transition: width var(--dur-1) var(--ease-out),
              height var(--dur-1) var(--ease-out),
              opacity var(--dur-1) var(--ease-out);
}
.canggih-cursor--active {
  width: var(--canggih-cursor-active);
  height: var(--canggih-cursor-active);
  opacity: 0.8;
}
.canggih-cursor--fade {
  opacity: 0;
}
@media (pointer: coarse) {
  .canggih-cursor { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .canggih-cursor { display: none; }
}
```

- [ ] **Step 4: Run checks, verify pass**

```bash
test -f assets/js/cursor.js && echo "EXISTS"
grep -c '\.canggih-cursor' assets/css/components.css
grep -c 'pointer-events: none' assets/css/components.css
grep -c '(pointer: coarse)' assets/css/components.css
grep -c '(prefers-reduced-motion: reduce)' assets/css/components.css
```

Expected: `EXISTS`, ≥4 (cursor + 2 modifier classes + 2 media queries), `1`, `1`, `1`.

- [ ] **Step 5: Commit**

```bash
git add assets/js/cursor.js assets/css/components.css
git commit -m "feat(canggih): A2 sage ink-dot cursor (touch + reduced-motion gated)"
```

---

## Task 5: Wire page-load.js + cursor.js into all 8 pages

**Files:**
- Modify: `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`

- [ ] **Step 1: Write the failing check**

```bash
for p in index about staff services blog contact analytics privacy; do
  grep -c 'page-load.js' "$p.html"
done | paste -sd+ | bc
```

Expected: `0`.

- [ ] **Step 2: Inspect a representative script block to find insertion point**

```bash
grep -n 'consent.js\|a11y.js' index.html
```

Expected: locates lines like `import "/assets/js/consent.js";`. The canggih imports go alongside these.

- [ ] **Step 3: Add imports to each page**

For each of `index.html about.html staff.html services.html blog.html contact.html analytics.html privacy.html`, find the line `import "/assets/js/a11y.js";` (or `import "/assets/js/consent.js";`) inside the `<script type="module">` block, and add immediately after it:

```javascript
import "/assets/js/page-load.js";
import "/assets/js/cursor.js";
```

This can be scripted to avoid drift:

```bash
for p in index about staff services blog contact analytics privacy; do
  if grep -q 'page-load.js' "$p.html"; then
    echo "$p.html: already wired"
    continue
  fi
  if ! grep -q 'a11y.js' "$p.html"; then
    echo "$p.html: NO a11y.js import found — ABORT, inspect manually"
    continue
  fi
  # Insert two import lines after the a11y.js import.
  sed -i.bak '/import "\/assets\/js\/a11y\.js";/a\
import "/assets/js/page-load.js";\
import "/assets/js/cursor.js";
' "$p.html"
  rm -f "$p.html.bak"
  echo "$p.html: wired"
done
```

- [ ] **Step 4: Run check, verify all 8 wired**

```bash
for p in index about staff services blog contact analytics privacy; do
  grep -c 'page-load.js' "$p.html"
done | paste -sd+ | bc
for p in index about staff services blog contact analytics privacy; do
  grep -c '/assets/js/cursor.js' "$p.html"
done | paste -sd+ | bc
```

Expected: `8` and `8`.

- [ ] **Step 5: Smoke-check in browser**

```bash
bin/server &
SERVER_PID=$!
sleep 1
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo -n "/$p: "
  curl -s "http://localhost:8080/$p" | grep -c 'page-load.js'
done
kill $SERVER_PID 2>/dev/null
```

Expected: each line ends in `1`.

- [ ] **Step 6: Commit**

```bash
git add index.html about.html staff.html services.html blog.html contact.html analytics.html privacy.html
git commit -m "feat(canggih): wire always-on layer (page-load + cursor) into all 8 pages"
```

---

## Task 6: C1 — 100vh hero on home (tracer-bullet)

**Files:**
- Modify: `assets/css/components.css`

- [ ] **Step 1: Write the failing check**

```bash
grep -c '100svh\|100vh' assets/css/components.css
```

Expected: `0` (or current value — note it).

- [ ] **Step 2: Inspect existing .hero rule**

```bash
grep -n '\.hero' assets/css/components.css
```

Expected: locates existing hero styling (padding, color, etc.).

- [ ] **Step 3: Extend the .hero rule**

In `assets/css/components.css`, find the existing `.hero` rule and append the following declarations (or add a new rule scoped to home if `.hero` is shared across pages — verify by inspecting `home_only` scoping: `index.html`'s `<body>` likely has a class or data attribute; if not, scope the 100vh to `body.home .hero` and add `class="home"` to `<body>` of `index.html`).

Simplest approach (no body-class needed) — gate the 100vh to the first `.hero` only, which works because every page has exactly one hero. But to honor the design doc's P3 ("hero only on home for Phase 4 tracer-bullet"), use a body class:

In `index.html`, change `<body>` to `<body class="home">` (verify with `grep -n '<body' index.html`).

Then in `assets/css/components.css`, append:

```css

/* C1 — 100vh hero. Explicit cascade so older Safari falls back to 100vh and
   modern browsers override with 100svh (small viewport unit avoids
   mobile-chrome-eating-hero issue). Phase 4 tracer-bullet: home only. */
body.home .hero {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Required by C4 paper-fold: parent containers need preserve-3d to avoid
   rotateX flicker, and overflow: visible to avoid clipping during the fold. */
main, section, .hero {
  transform-style: preserve-3d;
}
main { overflow: visible; }
```

- [ ] **Step 4: Run check, verify pass**

```bash
grep -c '100vh' assets/css/components.css
grep -c '100svh' assets/css/components.css
grep -c 'preserve-3d' assets/css/components.css
grep -c '<body class="home"' index.html
```

Expected: ≥1, ≥1, `1`, `1`.

- [ ] **Step 5: Smoke-check in browser**

```bash
bin/server &
SERVER_PID=$!
sleep 1
curl -s http://localhost:8080/ | grep -c 'body class="home"'
kill $SERVER_PID 2>/dev/null
```

Expected: `1`.

- [ ] **Step 6: Commit**

```bash
git add assets/css/components.css index.html
git commit -m "feat(canggih): C1 100vh hero on home (tracer-bullet, body.home scoped)"
```

---

## Task 7: A4 parallax on home hero (tracer-bullet)

**Files:**
- Create: `assets/js/parallax.js`
- Modify: `assets/css/motion.css`
- Modify: `index.html` (add parallax.js import — home only for Phase 4)

- [ ] **Step 1: Write the failing checks**

```bash
test -f assets/js/parallax.js && echo "EXISTS" || echo "MISSING"
grep -c 'canggih-parallax' assets/css/motion.css
grep -c '/assets/js/parallax.js' index.html
```

Expected: `MISSING`, `0`, `0`.

- [ ] **Step 2: Create assets/js/parallax.js**

```javascript
// A4 parallax — rAF-throttled scroll-Y → CSS custom property on :root.
// Capped at --canggih-parallax-depth via clamp() in CSS, NOT here. Disabled
// on reduced-motion (no listener registered, no GPU layer activated).

let rafId = 0;

function update() {
  document.documentElement.style.setProperty("--scroll-y", String(window.scrollY));
  rafId = 0;
}

function onScroll() {
  if (!rafId) rafId = requestAnimationFrame(update);
}

export function initCanggihParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCanggihParallax, { once: true });
} else {
  initCanggihParallax();
}
```

- [ ] **Step 3: Add parallax CSS to motion.css**

In `assets/css/motion.css`, inside the existing `@media (prefers-reduced-motion: no-preference)` block, append:

```css

    /* A4 — hero parallax. translate3d forces a compositor layer; clamp caps
       the depth at --canggih-parallax-depth so a wild scroll-Y can't exceed
       the calm budget. Reduced-motion: the JS module doesn't register a
       listener, so --scroll-y stays at 0 → transform is the identity. */
    body.home .hero,
    body.about .hero,
    body.services .hero {
      transform: translate3d(
        0,
        clamp(
          calc(var(--canggih-parallax-depth) * -1),
          calc(var(--scroll-y, 0) * -0.04px),
          0px
        ),
        0
      );
      will-change: transform;
    }
```

(The `body.about` and `body.services` selectors are pre-wired here so propagation in Task 10 only needs to add the body class + script import, not edit motion.css again.)

- [ ] **Step 4: Add parallax.js import to index.html only**

In `index.html`, inside the `<script type="module">` block, add after the cursor.js import:

```javascript
import "/assets/js/parallax.js";
```

- [ ] **Step 5: Run checks, verify pass**

```bash
test -f assets/js/parallax.js && echo "EXISTS"
grep -c 'canggih-parallax-depth' assets/css/motion.css
grep -c '/assets/js/parallax.js' index.html
```

Expected: `EXISTS`, ≥1, `1`.

- [ ] **Step 6: Smoke-check that other pages do NOT import parallax**

```bash
for p in about staff services blog contact analytics privacy; do
  grep -c '/assets/js/parallax.js' "$p.html"
done | paste -sd+ | bc
```

Expected: `0`. (Propagation to about/services happens in Task 10.)

- [ ] **Step 7: Commit**

```bash
git add assets/js/parallax.js assets/css/motion.css index.html
git commit -m "feat(canggih): A4 hero parallax (home tracer-bullet, capped at depth token)"
```

---

## Task 8: C4 paper-fold (extend .fade-in-up to include rotateX)

**Files:**
- Modify: `assets/css/motion.css`

- [ ] **Step 1: Write the failing check**

```bash
grep -n 'fade-in-up' assets/css/motion.css | head -3
grep -c 'rotateX' assets/css/motion.css
```

Expected: locate the existing `.fade-in-up` rule (around line 3-4), and `0` for rotateX.

- [ ] **Step 2: Replace the existing .fade-in-up rule**

In `assets/css/motion.css`, the existing rules are:

```css
    .fade-in-up { opacity: 0; transform: translateY(12px); transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out); }
    .fade-in-up.is-in { opacity: 1; transform: none; }
```

Replace with:

```css
    /* C4 paper-fold — extends the existing fade-in-up with a small rotateX
       so revealed text blocks "lay down" from the top edge. transform-origin
       is set on the element; transform-style: preserve-3d on parents
       (main, section, .hero) is set in components.css to prevent flicker. */
    .fade-in-up {
      opacity: 0;
      transform: translateY(12px) rotateX(var(--canggih-fold-deg));
      transform-origin: top center;
      transition: opacity var(--dur-1) var(--ease-paper),
                  transform var(--dur-2) var(--ease-paper);
    }
    .fade-in-up.is-in { opacity: 1; transform: none; }
```

Note: ease curve changes from `--ease-out` to `--ease-paper` to match the Phase 1 craft motion vocabulary (paper-and-ink tail-out); duration on opacity tightens from `--dur-2` to `--dur-1` so the rotateX leads the fade slightly (organic).

- [ ] **Step 3: Run check, verify pass**

```bash
grep -c 'rotateX' assets/css/motion.css
grep -c 'canggih-fold-deg' assets/css/motion.css
grep -c 'transform-origin: top center' assets/css/motion.css
```

Expected: `1`, `1`, `1`.

- [ ] **Step 4: Smoke-check existing fade-in-up usages still resolve**

```bash
grep -rn 'fade-in-up' *.html assets/js/ | wc -l
```

Expected: ≥7 (3 in HTML + 4 in a11y.js — unchanged from pre-Phase-4 baseline).

- [ ] **Step 5: Commit**

```bash
git add assets/css/motion.css
git commit -m "feat(canggih): C4 paper-fold via .fade-in-up rotateX extension"
```

---

## Task 9: TRACER-BULLET REVIEW CHECKPOINT — home only

**Files:** none (manual review).

This is the calibration gate from design doc P1. Do NOT propagate to other pages until this review passes.

- [ ] **Step 1: Start the server and prepare review**

```bash
bin/server &
SERVER_PID=$!
sleep 1
open http://localhost:8080/
```

- [ ] **Step 2: First-visit review (open in a fresh incognito window)**

In a fresh **incognito** browser window (or after running `sessionStorage.clear()` in DevTools console for the urbane-ethos origin), navigate to http://localhost:8080/. Observe:

- [ ] A1 page-load ink-bloom fires (subtle tone-and-opacity settle over ~1.2s on `main`). Reads "calm settling," not "fade-in trick."
- [ ] A2 cursor appears as a small sage dot at rest (~6px, 55% opacity). Reads "ambient detail," not "novelty cursor."
- [ ] A3 paper-grain texture is visible at extreme zoom but invisible at normal scroll. Reads "considered paper," not "noisy background."
- [ ] A5 selection: drag-select a paragraph. Background is sage-toned. Readable.
- [ ] C1 hero takes the full viewport height. Content vertically centered. No scrollbar jump.
- [ ] A4 hero parallax: scroll down 100-200px. Hero block lags slightly (max 4px). Reads "depth," not "broken layout."
- [ ] C4 paper-fold reveal: scroll until the `.section.fade-in-up` enters viewport. Block "lays down" from the top edge with small rotateX. Reads "paper unfolding," not "tilt glitch."

- [ ] **Step 3: Repeat-visit check (refresh the tab)**

Refresh the same tab. A1 bloom should NOT fire again (sessionStorage flag set).

- [ ] A1 does not re-fire on refresh.

- [ ] **Step 4: Reduced-motion test**

In DevTools → Rendering panel → "Emulate CSS prefers-reduced-motion: reduce." Refresh.

- [ ] A1 shows static end-state (no animation).
- [ ] A2 cursor element is hidden (system cursor only).
- [ ] A4 parallax does not move on scroll (transform stays identity).
- [ ] C4 elements appear in end-state without animation.
- [ ] All Phase 1 craft moments still work (consent stamp, link hover, card tilt — verify).

- [ ] **Step 5: Touch device test**

DevTools → Toggle device toolbar → iPhone 14 (or any mobile preset).

- [ ] Canggih cursor element NOT in DOM (or has `display: none`).
- [ ] Standard tap targets unchanged.
- [ ] A1 bloom still works on first visit (touch ≠ reduced-motion).
- [ ] C1 hero uses `100svh` correctly — no mobile-chrome-eating-hero.

- [ ] **Step 6: Focus-ring overlap test**

In a desktop window with the canggih cursor active, Tab through interactive elements on home: consent banner buttons, locale toggle, primary CTA, secondary CTA, personalization chips (if visible), chatbot launcher. Verify:

- [ ] Focus ring is fully visible on each element.
- [ ] Canggih cursor does NOT visually overlap the focus ring at >50% opacity during keyboard-only nav.

If overlap occurs, mitigation: reduce `.canggih-cursor--active` opacity from 0.8 to 0.5 in components.css.

- [ ] **Step 7: Run axe-core sweep on home**

```bash
npx -y @axe-core/cli "http://localhost:8080/" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -n 10
```

Expected: 0 serious/critical violations. (Note: there may be warnings — those are acceptable; only serious/critical block.)

- [ ] **Step 8: Calibration cut decision**

For each of the 7 moves (A1, A2, A3, A4, A5, C1, C4), explicitly decide one of:

- **KEEP** — reads canggih, ship as-is.
- **DIAL DOWN** — reads slightly too visible; reduce the relevant token (e.g. cursor opacity 0.55 → 0.4, parallax depth 4px → 2px, fold-deg 2deg → 1.5deg). Edit `assets/css/tokens.css`, re-review.
- **CUT** — reads techy / novelty; remove the move entirely. Per design doc P1: cutting is the calibration tool, not magnitude-raising. Document which move(s) cut and why.

Record decisions in this checklist:

- [ ] A1 page-load bloom: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_
- [ ] A2 cursor: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_
- [ ] A3 paper-grain: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_
- [ ] A5 selection: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_
- [ ] A4 parallax: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_
- [ ] C1 100vh hero: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_
- [ ] C4 paper-fold: KEEP / DIAL DOWN / CUT — \_\_\_\_\_\_

- [ ] **Step 9: Apply any cuts**

If any move is CUT, revert the relevant commit(s) using `git revert <sha>` (or surgically remove the wiring — token + JS + CSS for that move). If any move is DIAL DOWN, edit `assets/css/tokens.css` to the new magnitudes. Re-run steps 2-7 to verify the cuts/dials hold.

- [ ] **Step 10: Stop the server**

```bash
kill $SERVER_PID 2>/dev/null
```

- [ ] **Step 11: Commit calibration changes (if any)**

```bash
git add assets/css/tokens.css  # or whichever files cuts touched
git commit -m "feat(canggih): calibrate Phase 4 magnitudes after tracer-bullet review"
```

If no calibration changes were needed, skip the commit.

---

## Task 10: Propagate A4 parallax to about + services heros

**Files:**
- Modify: `about.html` (add body.about class, parallax.js import)
- Modify: `services.html` (add body.services class, parallax.js import)

- [ ] **Step 1: Write the failing checks**

```bash
grep -c 'body class="about"' about.html
grep -c 'body class="services"' services.html
grep -c '/assets/js/parallax.js' about.html
grep -c '/assets/js/parallax.js' services.html
```

Expected: `0` for all four.

(Skip this task if A4 was CUT in Task 9.)

- [ ] **Step 2: Add body class to about.html**

In `about.html`, find `<body` and change to `<body class="about"`.

- [ ] **Step 3: Add body class to services.html**

In `services.html`, find `<body` and change to `<body class="services"`.

- [ ] **Step 4: Add parallax.js import to both pages**

For each of `about.html` and `services.html`, inside the `<script type="module">` block, add after `import "/assets/js/cursor.js";`:

```javascript
import "/assets/js/parallax.js";
```

- [ ] **Step 5: Run checks, verify pass**

```bash
grep -c 'body class="about"' about.html
grep -c 'body class="services"' services.html
grep -c '/assets/js/parallax.js' about.html
grep -c '/assets/js/parallax.js' services.html
```

Expected: `1` for all four.

- [ ] **Step 6: Verify A4 still scoped per P3 — NOT on other pages**

```bash
for p in staff blog contact analytics privacy; do
  grep -c '/assets/js/parallax.js' "$p.html"
done | paste -sd+ | bc
```

Expected: `0`.

- [ ] **Step 7: Real-browser check**

```bash
bin/server &
SERVER_PID=$!
sleep 1
open http://localhost:8080/about.html
# Scroll about hero — verify parallax (max 4px lag)
open http://localhost:8080/services.html
# Scroll services hero — verify parallax
kill $SERVER_PID 2>/dev/null
```

Confirm both heros parallax with the same magnitude as home.

- [ ] **Step 8: Commit**

```bash
git add about.html services.html
git commit -m "feat(canggih): propagate A4 parallax to about + services"
```

---

## Task 11: Propagate C1 100vh to about + services + per-P3

**Files:**
- Modify: `assets/css/components.css`

(Skip this task if C1 was CUT in Task 9.)

- [ ] **Step 1: Write the failing check**

```bash
grep -c 'body.about .hero' assets/css/components.css
grep -c 'body.services .hero' assets/css/components.css
```

Expected: `0` for both.

- [ ] **Step 2: Extend the C1 rule per P3 placement**

In `assets/css/components.css`, find the existing `body.home .hero { min-height: 100vh; ... }` rule and replace with:

```css
/* C1 — 100vh hero, per-P3 contextual placement.
   Pages with hero only: home, contact, staff, blog, analytics, privacy.
   Pages with hero + one trust-beat block (added below): about (ethos),
   services (per-service intro). */
body.home .hero,
body.about .hero,
body.services .hero,
body.contact .hero,
body.staff .hero,
body.blog .hero,
body.analytics .hero,
body.privacy .hero {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Trust-beat blocks — one per page, per design doc P3.
   Home: values band (data-trust-beat="values").
   About: ethos block (data-trust-beat="ethos").
   Services: per-service intro (data-trust-beat="service-intro"). */
body.home [data-trust-beat="values"],
body.about [data-trust-beat="ethos"],
body.services [data-trust-beat="service-intro"] {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

- [ ] **Step 3: Add body classes to remaining pages**

For each of `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`, change `<body` to `<body class="<pagename>"` (e.g. `<body class="about">`). If the page already has a body class from Task 10 (about, services), update those instead of adding a second.

Scripted:

```bash
for p in about staff services blog contact analytics privacy; do
  if grep -q '<body class="' "$p.html"; then
    # Page already has a body class — verify it matches expected name.
    actual=$(grep -oE '<body class="[^"]*"' "$p.html" | head -1)
    echo "$p.html has: $actual"
  else
    sed -i.bak "s|<body>|<body class=\"$p\">|" "$p.html"
    rm -f "$p.html.bak"
    echo "$p.html: added class=\"$p\""
  fi
done
```

- [ ] **Step 4: Add data-trust-beat attribute to the values band on home**

In `index.html`, find the values band section (likely `<section class="section">` near line 113 — the same one that already has `fade-in-up`). Add `data-trust-beat="values"` to it. Find by content if needed:

```bash
grep -n 'data-i18n="home.values' index.html
```

Then edit the matching `<section>` opener to include `data-trust-beat="values"`. (Manual surgical edit — verify the line first.)

- [ ] **Step 5: Add data-trust-beat to about.html ethos block**

In `about.html`, identify the ethos block (likely a section with `data-i18n="about.ethos.*"`). Add `data-trust-beat="ethos"` to its opener.

```bash
grep -n 'about\.ethos\|data-i18n="about\.' about.html | head
```

- [ ] **Step 6: Add data-trust-beat to services.html per-service intro**

In `services.html`, identify the per-service intro block (the first descriptive block per service). Add `data-trust-beat="service-intro"` to the first one.

```bash
grep -n 'service-block\|whatItIs\|data-i18n="services\.' services.html | head
```

- [ ] **Step 7: Run checks, verify pass**

```bash
grep -c 'body.about .hero' assets/css/components.css
grep -c 'data-trust-beat="values"' index.html
grep -c 'data-trust-beat="ethos"' about.html
grep -c 'data-trust-beat="service-intro"' services.html
for p in about staff services blog contact analytics privacy; do
  grep -cE "<body class=\"$p\"" "$p.html"
done | paste -sd+ | bc
```

Expected: ≥1, `1`, `1`, `1`, and `7`.

- [ ] **Step 8: Real-browser verification**

```bash
bin/server &
SERVER_PID=$!
sleep 1
for p in "" about.html services.html contact.html staff.html blog.html analytics.html privacy.html; do
  echo "--- $p ---"
  echo "  scroll past hero; verify hero filled viewport + (where applicable) trust-beat block fills viewport too"
done
# Manual: open each in browser, scroll, verify.
open "http://localhost:8080/"
open "http://localhost:8080/about.html"
open "http://localhost:8080/services.html"
kill $SERVER_PID 2>/dev/null
```

- [ ] **Step 9: Commit**

```bash
git add assets/css/components.css index.html about.html services.html staff.html blog.html contact.html analytics.html privacy.html
git commit -m "feat(canggih): propagate C1 100vh per P3 placement rule"
```

---

## Task 12: Verify C4 propagation (no-op verification)

C4 propagates automatically because the `.fade-in-up` rule edited in Task 8 is global. This task just verifies that.

(Skip this task if C4 was CUT in Task 9 — and if cut, the rotateX needs to be removed from `.fade-in-up`.)

- [ ] **Step 1: Verify .fade-in-up usages still resolve to the extended rule**

```bash
grep -rn 'fade-in-up' *.html assets/js/ | wc -l
```

Expected: ≥7 (3 HTML + 4 a11y.js).

- [ ] **Step 2: Real-browser verification across pages**

```bash
bin/server &
SERVER_PID=$!
sleep 1
for p in "" services.html; do
  open "http://localhost:8080/$p"
  echo "  scroll past first .fade-in-up — verify paper-fold reveal (rotateX 2deg, top-down)"
done
kill $SERVER_PID 2>/dev/null
```

- [ ] **Step 3: Verify reveal does NOT apply to .card blocks**

The design doc says C4 must not double-animate cards (Phase 1 tilt owns card hover). Confirm:

```bash
# Service cards on home use a.card class, NOT fade-in-up
grep -n 'class=".*card.*fade-in-up\|class=".*fade-in-up.*card' *.html
```

Expected: no output. (If output appears, the matching card is double-animated — remove `fade-in-up` from its class list.)

- [ ] **Step 4: Decide if more fade-in-up applications are warranted**

Per design doc P3, C4 applies to text-content blocks on all pages. Currently only 2 blocks on home + 1 dynamic block on services use `.fade-in-up`. The plan does NOT add new fade-in-up applications here — that's editorial work for a follow-up commit if review at Task 13 surfaces specific blocks that would benefit. Add `.fade-in-up` to:

- about.html — ethos block, history/mission paragraphs (only if review identifies these as canggih-worthy reveals).
- staff.html — staff intro paragraphs.
- contact.html — hours/address blocks.

Hold this until Task 13 final review identifies the candidates. Do NOT add reveals to every block — the design doc P2 quietness clause forbids busyness.

- [ ] **Step 5: No commit needed** unless additional `.fade-in-up` applications were made in Step 4. If so:

```bash
git add about.html staff.html contact.html  # whichever pages got reveals
git commit -m "feat(canggih): apply C4 paper-fold to selected text blocks per P3"
```

---

## Task 13: Full propagation acceptance — a11y + reduced-motion + touch sweep

**Files:** none (verification).

- [ ] **Step 1: Start the server**

```bash
bin/server &
SERVER_PID=$!
sleep 1
```

- [ ] **Step 2: axe-core full sweep — all 8 pages**

```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -n 5
done
```

Expected: every page reports 0 serious/critical violations. If any new violations appear (e.g. cursor element with missing aria-hidden), surgically fix in components.css / cursor.js before continuing.

- [ ] **Step 3: i18n parity still holds**

```bash
bin/check-i18n-parity.rb
```

Expected: pass (Phase 4 added no new content keys).

- [ ] **Step 4: No stale literal durations introduced**

The Phase 1 acceptance grep (clean state) — verify Phase 4 didn't reintroduce literals:

```bash
grep -nE '\b(180ms|320ms)\b' assets/css/components.css assets/css/motion.css assets/css/base.css || echo "(clean)"
```

Expected: `(clean)`.

- [ ] **Step 5: Reduced-motion full sweep**

In DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce." Visit each page:

```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  open "http://localhost:8080/$p"
  echo "  Verify: A1 no animation, cursor hidden, A4 hero static, C4 elements in end-state"
done
```

- [ ] All 8 pages: A1 page-load shows static end-state.
- [ ] All 8 pages: canggih cursor element hidden (or display: none); system cursor only.
- [ ] Pages with A4 (home, about, services): hero does NOT parallax on scroll.
- [ ] Pages with `.fade-in-up`: reveal in end-state immediately.
- [ ] Phase 1 craft moments still visible in static end-state (consent saved, link underline drawn, card tilt absent — correct for reduced-motion).

- [ ] **Step 6: Touch full sweep**

DevTools → Toggle device toolbar → iPhone 14. Visit each page:

- [ ] All 8 pages: canggih cursor element NOT in DOM.
- [ ] Standard tap targets unchanged.
- [ ] A1 bloom still works on first visit per session.
- [ ] C1 hero uses `100svh` correctly across all pages with C1.

- [ ] **Step 7: Cursor over text-input fade-test**

On contact.html and the home personalization survey, hover over text inputs:

- [ ] Cursor fades to opacity 0 over text inputs (`.canggih-cursor--fade` class applied).
- [ ] OS I-beam cursor remains visible.

- [ ] **Step 8: Stop the server**

```bash
kill $SERVER_PID 2>/dev/null
```

- [ ] **Step 9: Decision gate**

If all checks pass → continue to Task 14 (HANDOVER update).
If any check fails → surgical fix in the relevant module, re-run the failed check, commit the fix as `fix(canggih): <specific>`.

---

## Task 14: Update HANDOVER.md with Phase 4 landing notes

**Files:**
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Inspect current HANDOVER structure**

```bash
head -50 docs/HANDOVER.md
```

The file has a "Where we are" section + "What's open" workstream list + "Deferred items" + run instructions. Phase 4 closes workstream item 4 ("Broader aesthetics + microinteraction review").

- [ ] **Step 2: Update the file**

Edit `docs/HANDOVER.md`:

1. At top, update the `**Last updated:**` line to today's date and the latest commit SHA (run `git log -1 --format=%h` for the SHA).

2. In the "Where we are" section, add a sentence:
   > Phase 4 of the polish pass landed: the canggih layer (atmospheric depth + cinematic pacing) — 7 moves per the 2026-06-09 design doc (or fewer, if calibration cut any).

3. In the "What's open" workstream list, replace the "### 4. Broader aesthetics + microinteraction review" subsection with a one-line "completed" note pointing to the design doc + this plan:
   > **### 4. Broader aesthetics + microinteraction review — DONE 2026-06-09.** Design doc: `/Users/deepsight/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md`. Plan: `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md`. Calibration outcomes recorded in plan Task 9.

4. Renumber remaining workstreams accordingly (or leave the section heading numbers — your call; the plan-level matters more than numbering).

5. If any moves were CUT in Task 9, add a "### Phase 5 candidates" subsection listing them with one-line rationale each:
   > **A2 cursor (cut Task 9):** read as novelty. Phase 5 revisit only after Phase 2 photography lands — real photos may absorb the dot better than placeholder boxes.

6. In "How to pick up", update the read-in-order list to include the new design doc + plan.

- [ ] **Step 3: Verify HANDOVER reads clean**

```bash
head -100 docs/HANDOVER.md
```

Expected: above edits applied, no broken references.

- [ ] **Step 4: Commit**

```bash
git add docs/HANDOVER.md
git commit -m "docs(handover): Phase 4 canggih layer landing notes"
```

---

## Self-Review (post-write check, before handoff)

**1. Spec coverage:**
- A1 page-load ink-bloom → Tasks 3, 9 (review).
- A2 cursor → Tasks 4, 5 (wiring), 9 (review), 13 (touch + fade).
- A3 paper-grain → Task 2.
- A5 ::selection → Task 2.
- A4 hero parallax → Tasks 7, 10 (propagate), 9 (review).
- C1 100vh hero → Tasks 6, 11 (propagate), 9 (review).
- C4 paper-fold → Tasks 8 (extend fade-in-up), 12 (verify propagation), 9 (review).
- Tokens → Task 1.
- Acceptance (Phase 4 home tracer-bullet) → Task 9.
- Acceptance (full propagation) → Task 13.
- HANDOVER update → Task 14.

All 7 moves + tokens + acceptance + docs are covered. No spec requirement missing.

**2. Placeholder scan:** Every code step has actual code. No "TBD," no "add appropriate error handling," no "similar to Task N." Every grep, sed, and commit message is concrete.

**3. Type consistency:**
- `--canggih-*` tokens used in Tasks 1, 2, 3, 4, 6, 7, 8 — names match throughout.
- `.fade-in-up` + `.is-in` reused (not invented as `.reveal-on-scroll` + `.in-view`) — matches existing a11y.js wiring.
- `.canggih-cursor` + `.canggih-cursor--active` + `.canggih-cursor--fade` — used in cursor.js (Task 4) and components.css (Task 4) consistently.
- `body.home`, `body.about`, `body.services` etc. — body class convention used in Tasks 6, 7, 10, 11 consistently.
- `data-trust-beat` attribute — introduced in Task 11; values are `"values"`, `"ethos"`, `"service-intro"` (kebab-case, consistent).
- `urbane-ethos:bloomed` sessionStorage key — used only in page-load.js, no collision with other modules (existing `urbane-ethos:font-size` in a11y.js is the convention).

No type drift detected.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Calibration gate at Task 9 stays human-in-the-loop.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Slower but keeps full context.

**Which approach?**
