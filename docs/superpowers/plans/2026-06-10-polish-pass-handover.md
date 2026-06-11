# Polish-pass + handover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the polish-pass spec (`docs/superpowers/specs/2026-06-10-polish-pass-handover-design.md`) — eight workstreams that bring the prototype to a clean handover state. No new features.

**Architecture:** Static HTML/CSS/JS prototype. Modifies CSS cascade layers, JS modules, JSON content, and HTML markup. Adds one new JS module (`nav.js`) and one new Node script (`bin/axe-chatbot.mjs`). All work served by existing `bin/server` (Ruby WEBrick). Verification mix: `bin/check-i18n-parity.rb`, axe-core CLI, `@axe-core/playwright`, manual gstack browser sweeps.

**Tech Stack:** No framework. Vanilla ESM JS, modern CSS (cascade layers, custom properties, `clamp()`, `:where()`). Ruby ≥ 3.1 WEBrick for serving. Node + `npx` for axe and playwright. gstack browser for responsive QA.

**Commit policy:** Per workspace `/Users/deepsight/code/CLAUDE.md` — **no `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line**. Conventional-commit-style prefixes.

**Repo conventions to honor:**
- All paths relative (`./foo`, not `/foo`)
- Modern browsers only — no polyfills, no transpile
- Canggih-layer wiring rule: any always-on JS module must be imported in all 8 production pages, anchored after `./assets/js/a11y.js`
- Preserve i18n parity between `content/en/*.json` and `content/ms/*.json`

---

## File map

### Created
- `assets/js/nav.js` — hamburger toggle + focus trap module (always-on)
- `bin/axe-chatbot.mjs` — playwright-driven axe runner for the chatbot panel
- `docs/responsive-sweep/` — screenshot directory (gitignored; documented in HANDOVER)
- `docs/superpowers/specs/2026-06-10-huashu-review.md` — output of W8 review
- `test/smoke/personalization-locale.html` — smoke page exercising W5 fix

### Modified
- `assets/css/tokens.css` — add `--bp-sm/md/lg` breakpoint tokens
- `assets/css/base.css` — possibly use breakpoint tokens
- `assets/css/components.css` — pull canggih + Phase 2 blocks into `@layer components`, add nav-toggle styles, header underline override, mobile media queries, touch-target sizing
- `assets/css/motion.css` — nav panel transition (paper-and-ink idiom)
- `assets/js/yt-embed.js` — read `data-yt-title-key`, resolve via i18n
- `assets/js/personalization.js` — rules keyed on slugs, not EN strings
- `assets/js/i18n.js` — possibly export a helper to resolve key → current locale string (W3 needs this)
- `content/en/common.json` — drop `videoUnavailableFallback`, add `homeHeroIntroVideo` alt, add `nav.menuLabel`
- `content/ms/common.json` — same shape
- `index.html` — chip markup uses slugs; hero `.yt-embed` `data-yt-title-key`; new alt key; nav-toggle markup; `nav.js` import
- `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html` — nav-toggle markup + `nav.js` import
- `contact.html` — yt-embed `data-yt-title-key` and inline title removed
- `.gitignore` — add `docs/responsive-sweep/` (decision: gitignored, single user-visible reference left in HANDOVER)
- `docs/HANDOVER.md` — polish-pass closed section, CSS architecture drift removed, BM perso caveat removed
- `docs/A11Y_NOTES.md` — chatbot playwright runner documented
- `CLAUDE.md` — drop BM perso caveat, drop CSS architecture drift callout

### Removed
- (none — all changes are edits/additions)

---

## Tasks

### Task 1: W1 — Move out-of-layer blocks back inside `@layer components`

**Files:**
- Modify: `assets/css/components.css`

**Pre-check.** Verify the drift before editing.

- [ ] **Step 1: Confirm the layer boundary**

Run:
```bash
awk '/@layer components \{/,/^}$/{n=NR} END{print "components.css @layer components closes at line " n}' assets/css/components.css
grep -nE '^\.canggih-cursor|^\.canggih-cursor|^[[:space:]]*\.anchor-photo \{|^[[:space:]]*\.yt-embed \{' assets/css/components.css
```

Expected: layer closes BEFORE the canggih + anchor-photo + yt-embed blocks; those start at lines ~252, ~330, ~352 respectively.

- [ ] **Step 2: Capture a baseline visual diff target**

Run:
```bash
bin/server &
SERVER_PID=$!
sleep 2
# Note browser-screenshot is optional; the goal is to have a known-good before reference
```

- [ ] **Step 3: Edit `assets/css/components.css`**

Move the closing brace of `@layer components { ... }` from its current position to just before `/* end components */` at the bottom of the file. Concretely:

1. Find the current closing `}` of `@layer components`. Delete it.
2. Add `}` as the final non-blank line of the file.
3. Re-indent the previously out-of-layer blocks (canggih, anchor-photo, yt-embed) one level (two spaces) so they read consistently with the rest of the layer body.

Show the diff intent (illustrative — actual line numbers depend on file state):

```css
/* Before (excerpt) */
@layer components {
  /* ... lots of rules ... */
}  /* <-- this brace moves */

/* A2 canggih cursor ... */
.canggih-cursor { ... }
/* C1 hero ... */
section.hero, header.hero { ... }
.anchor-photo { ... }
.yt-embed { ... }
```

```css
/* After (excerpt) */
@layer components {
  /* ... lots of rules ... */

  /* A2 canggih cursor ... */
  .canggih-cursor { ... }
  /* C1 hero ... */
  section.hero, header.hero { ... }
  .anchor-photo { ... }
  .yt-embed { ... }
}
```

- [ ] **Step 4: Visual verification**

Run:
```bash
# Server already running
curl -s http://localhost:8080/ | grep -c "<title>" && echo "served OK"
```

Open in browser (manually or via gstack):
- `http://localhost:8080/` — hero anchor photo present, yt-embed visible, ink-dot cursor visible on desktop
- `http://localhost:8080/contact.html` — yt-embed visible below address

Expected: zero pixel difference. If anything looks different, the layer order changed something — investigate (a base/components specificity collision is the most likely culprit).

- [ ] **Step 5: i18n parity gate**

Run:
```bash
bin/check-i18n-parity.rb && echo OK
```

Expected: `OK` (W1 doesn't touch i18n but the gate is cheap insurance).

- [ ] **Step 6: axe-core sweep**

Run (one-liner from CLAUDE.md, with server still running):
```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done
```

Expected: each page reports 0 serious/critical violations (the existing baseline). If a new violation appears, fix it before committing — most likely cause is a base-layer rule now winning where it didn't before.

- [ ] **Step 7: Commit**

```bash
git add assets/css/components.css
git commit -m "refactor(css): pull canggih + anchor-photo + yt-embed inside @layer components

Closes architectural drift accumulated across Phase 2 and Phase 4 —
.canggih-cursor, .canggih-cursor--active, .canggih-cursor--fade, the
100vh hero rules, .anchor-photo, and .yt-embed had been authored
outside the layer. Now sit inside @layer components so cascade-layer
order — not specificity — determines precedence."
```

Stop background server:
```bash
kill $SERVER_PID
```

---

### Task 2: W2 — Remove top-nav underline carry-over

**Files:**
- Modify: `assets/css/components.css`

**Context.** `assets/css/base.css:11-21` paints a background-image underline on every `<a>`. `main`/`footer` links toggle to 0% at rest. Header links were never scoped — they keep the static 1px line.

- [ ] **Step 1: Add the override rule**

Edit `assets/css/components.css`. Inside `@layer components`, add a new block near the existing `.site-header` rules (search for `.site-header {` and add directly below the existing nav rules, around line 18):

```css
  /* W2 — opt header links out of the global a underline.
     base.css gives every <a> an ink-draw underline scoped to main/footer
     via :not(:hover):not(:focus-visible). Header links were never
     scoped — they carried the static 1px line. */
  .site-header a,
  .brand {
    background-image: none;
    padding-bottom: 0;
  }
  .site-header a:hover,
  .site-header a:focus-visible {
    background-size: 0% 1px;  /* belt + braces — hover/focus also stays clean */
  }
```

- [ ] **Step 2: Verify the rule applies**

Start server:
```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open `http://localhost:8080/`. Inspect a `.nav-list a` element in devtools.
Expected: `background-image: none` applied, no 1px line at rest, no underline on hover.
Hover the wordmark (`.brand`) — no underline.
Tab to a nav link — focus-visible ring appears (yellow `--color-sun` outline), no extra underline.

- [ ] **Step 3: axe-core sanity (single-page)**

```bash
npx -y @axe-core/cli http://localhost:8080/ --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
```

Expected: 0 violations.

- [ ] **Step 4: Commit**

```bash
git add assets/css/components.css
git commit -m "fix(css): remove residual underline on top-nav + brand links

base.css paints an ink-draw underline on every <a> and only main/footer
links opt into the 0%-at-rest toggle. Header links and the .brand
wordmark were carrying the static 1px line. Adds a scoped opt-out so
they paint cleanly at rest, on hover, and on focus."
kill $SERVER_PID
```

---

### Task 3: W3 part A — Delete duplicate `videoUnavailableFallback` i18n key

**Files:**
- Modify: `content/en/common.json`
- Modify: `content/ms/common.json`

- [ ] **Step 1: Confirm zero consumers**

```bash
grep -rn "videoUnavailableFallback" assets/ *.html content/ docs/
```

Expected: matches only inside `content/{en,ms}/common.json` (the definitions themselves). If any HTML or JS reads it, STOP and route the consumer to `common.a11y.videoUnavailable` first.

- [ ] **Step 2: Remove the key from EN**

Edit `content/en/common.json`. Find the `media.videoUnavailableFallback` entry inside the `media` object and delete the line (and any trailing comma to keep JSON valid).

- [ ] **Step 3: Remove the key from MS**

Edit `content/ms/common.json`. Find the `media.videoUnavailableFallback` entry, delete the line, fix trailing comma.

- [ ] **Step 4: Parity gate**

```bash
bin/check-i18n-parity.rb && echo OK
```

Expected: `OK`. If parity fails, one file removed the key but the other didn't.

- [ ] **Step 5: JSON validity**

```bash
ruby -rjson -e 'JSON.parse(File.read("content/en/common.json"))' && echo EN_OK
ruby -rjson -e 'JSON.parse(File.read("content/ms/common.json"))' && echo MS_OK
```

Expected: `EN_OK` then `MS_OK`. If a trailing-comma slip, fix it now.

- [ ] **Step 6: Commit**

```bash
git add content/en/common.json content/ms/common.json
git commit -m "chore(i18n): drop duplicate common.media.videoUnavailableFallback

Same purpose as common.a11y.videoUnavailable ('Video coming soon').
Had zero consumers and would drift over time. Removed."
```

---

### Task 4: W3 part B — Wire `yt-embed.js` to consume `videoTitles` via i18n

**Files:**
- Modify: `assets/js/i18n.js` (export resolver if not already)
- Modify: `assets/js/yt-embed.js`
- Modify: `index.html`
- Modify: `contact.html`

- [ ] **Step 1: Inspect the i18n module's public API**

```bash
grep -n "^export" assets/js/i18n.js
```

Expected: identifies what's already exported. The module likely has `applyI18n(root)` or similar; we need either a `t(key)` style resolver or a way to read the cached namespace dict.

- [ ] **Step 2: Add (or expose) a resolver helper if missing**

If `assets/js/i18n.js` already exports a function that resolves a `ns.dot.path` to a string in the current locale, skip this step.

Otherwise, add an export. Sketch:

```js
// At the top, alongside other exports
export async function resolveKey(key) {
  // key format: "<namespace>.<dot.path>" — e.g. "media.videoTitles.intro"
  const [ns, ...rest] = key.split(".");
  const dict = await loadNamespace(ns);  // loadNamespace already exists internally
  const value = rest.reduce((o, k) => (o == null ? undefined : o[k]), dict);
  return typeof value === "string" ? value : undefined;
}
```

Match the existing module's pattern (locale handling, fallback to EN if MS key missing). The resolver should respect the same locale-resolution path as `applyI18n`.

- [ ] **Step 3: Update `yt-embed.js`**

Read the current module to find the click handler that spawns the iframe. Replace any usage of inline `data-yt-title` with `data-yt-title-key`. Sketch:

```js
import { resolveKey } from "./i18n.js";

// inside the existing click/play handler, when constructing the iframe:
const titleKey = slot.dataset.ytTitleKey;
let iframeTitle = "";
if (titleKey) {
  iframeTitle = (await resolveKey(titleKey)) || "";
}
iframe.title = iframeTitle;
```

Keep the rest of the lazy-load logic identical.

- [ ] **Step 4: Update `index.html` home hero yt-embed**

Find the home hero `.yt-embed` element (around `index.html:56` per the grep earlier). Replace:

```html
<div class="yt-embed" data-yt-id="PLACEHOLDER_INTRO"
     data-yt-title="Urbane Ethos — introduction (placeholder)">
```

with:

```html
<div class="yt-embed" data-yt-id="PLACEHOLDER_INTRO"
     data-yt-title-key="media.videoTitles.intro">
```

Confirm `common.media.videoTitles.intro` exists in both EN and MS. If a key name doesn't already exist, add it before continuing (and remember parity).

- [ ] **Step 5: Update `contact.html` centre-tour yt-embed**

Same pattern — find the contact `.yt-embed` (around line 55):

```html
<div class="yt-embed" data-yt-id="PLACEHOLDER_CENTRE_TOUR"
     data-yt-title-key="media.videoTitles.centreTour">
```

Use whatever key shape already exists in `common.media.videoTitles` (likely `centreTour`).

- [ ] **Step 6: Verify**

Start server:
```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open `http://localhost:8080/` in browser (or gstack). Click the yt-embed play button. In devtools, inspect the spawned `<iframe>`'s `title` attribute. Expected: matches the EN value of `media.videoTitles.intro`.

Switch locale to MS (`?locale=ms` or via toggle). Reload, click play again on the freshly-rendered slot. Devtools inspect iframe `title` — matches the MS value.

Repeat for `/contact.html`.

- [ ] **Step 7: Parity gate**

```bash
bin/check-i18n-parity.rb && echo OK
```

- [ ] **Step 8: Commit**

```bash
git add assets/js/i18n.js assets/js/yt-embed.js index.html contact.html
git commit -m "feat(i18n): consume media.videoTitles for yt-embed iframe titles

yt-embed slots now carry data-yt-title-key='media.videoTitles.<slug>'
instead of a hardcoded English data-yt-title. yt-embed.js resolves the
key via i18n.resolveKey at iframe-spawn time so the title respects
current locale. Removes the only spot in the prototype where iframe
metadata was English-only."
kill $SERVER_PID
```

---

### Task 5: W4 — Distinct alts for home-hero anchor + yt-embed

**Files:**
- Modify: `content/en/common.json`
- Modify: `content/ms/common.json`
- Modify: `index.html`

- [ ] **Step 1: Add the new alt key**

Edit `content/en/common.json`. Inside `media.alts` (alongside the existing `homeHero` key), add:

```json
"homeHeroIntroVideo": "Centre intro video — sage-toned placeholder thumbnail."
```

Edit `content/ms/common.json`. Add (drafted via existing glossary):

```json
"homeHeroIntroVideo": "Video pengenalan pusat — lakaran kecil bertona hijau lemon (placeholder)."
```

Bump `_draft: true` for the MS key by adding `"media.alts.homeHeroIntroVideo": true` to whatever draft map already exists in `content/ms/common.json` (or follow the file's existing draft-marking convention).

- [ ] **Step 2: Update `index.html`**

Find the home-hero `.yt-embed` block's placeholder `<img>` element (the lazy-thumbnail image, NOT the anchor-photo). Change its `data-i18n-attr` from:

```html
data-i18n-attr="alt:media.alts.homeHero"
```

to:

```html
data-i18n-attr="alt:media.alts.homeHeroIntroVideo"
```

Leave the anchor-photo's alt on `media.alts.homeHero` — that one keeps the existing key.

- [ ] **Step 3: Parity gate**

```bash
bin/check-i18n-parity.rb && echo OK
```

- [ ] **Step 4: Verify via screen-reader spot-check**

Start server:
```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open `http://localhost:8080/` in a browser. Inspect the home hero anchor photo `<img>` — `alt` reads the existing `homeHero` value. Inspect the yt-embed thumbnail `<img>` — `alt` reads the new `homeHeroIntroVideo` value. Two distinct alts.

Optional: VoiceOver pass.

- [ ] **Step 5: axe-core sanity**

```bash
npx -y @axe-core/cli http://localhost:8080/ --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
```

Expected: 0 violations.

- [ ] **Step 6: Commit**

```bash
git add content/en/common.json content/ms/common.json index.html
git commit -m "fix(a11y): distinct alts for home-hero anchor photo + yt-embed thumb

Both media slots on the home hero were reusing media.alts.homeHero so a
screen reader heard the same alt twice in close succession. Adds
media.alts.homeHeroIntroVideo (MS marked _draft) and points the
yt-embed thumbnail at it. Anchor photo keeps the existing key."
kill $SERVER_PID
```

---

### Task 6: W5 — BM personalization wiring (slug refactor)

**Files:**
- Modify: `assets/js/personalization.js`
- Modify: `index.html`
- Create: `test/smoke/personalization-locale.html`

- [ ] **Step 1: Write a failing smoke fixture**

Create `test/smoke/personalization-locale.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Smoke — personalization locale-agnostic</title>
</head>
<body>
  <h1>Smoke test — personalization rules fire across locales</h1>
  <p>
    Open <a href="../../index.html?locale=en">EN home</a> and <a href="../../index.html?locale=ms">MS home</a>
    in two tabs. In each, accept consent if shown, fill the personalization micro-survey
    selecting the first concern chip, submit. Confirm:
  </p>
  <ol>
    <li>"Speech & Language Therapy" (or the BM equivalent) sorts first in the services grid in both tabs.</li>
    <li><code>sessionStorage["urbane-ethos:personalization"]</code> stores <code>concern: "speech"</code>
        (the slug, NOT the English label) in both locales.</li>
    <li>Toggling locale after submitting preserves the reordering (slug is locale-stable).</li>
  </ol>
</body>
</html>
```

This is a manual smoke — but having the file in the repo lets a reviewer find it and CLAUDE.md already mentions `test/smoke/` is the pattern.

- [ ] **Step 2: Refactor `personalization.js` rule tables**

Edit `assets/js/personalization.js`. Update `RULES` (around line 6) to use slug keys:

```js
const RULES = {
  concernToService: {
    "speech": "speech",
    "motor-skills": "ot",
    "behaviour": "psych",
    "learning": "specialed",
    "not-sure": "screening"
  },
  concernToBlogTags: {
    "speech": ["Speech"],
    "motor-skills": ["Motor"],
    "behaviour": ["Behaviour"],
    "learning": ["Speech", "Parenting"],
    "not-sure": ["Parenting"]
  },
  concernToStaff: {
    "speech": "speech-lead",
    "motor-skills": "ot-lead",
    "behaviour": "psych-lead",
    "learning": "specialed-lead",
    "not-sure": "screening-lead"
  }
};
```

(The blog tag values still reference content-side tag names like `"Speech"`, which is fine — those are blog metadata, not user input.)

- [ ] **Step 3: Update `index.html` chip markup**

Find the home micro-survey form (`[data-personalize-form]` or similar). For each concern chip `<input>`, change `value` from the English label to the slug:

```html
<!-- before -->
<input type="radio" name="concern" value="Speech" id="concern-speech">
<label for="concern-speech"><span data-i18n="home.personalization.concern.speech">Speech</span></label>

<!-- after -->
<input type="radio" name="concern" value="speech" id="concern-speech">
<label for="concern-speech"><span data-i18n="home.personalization.concern.speech">Speech</span></label>
```

Repeat for `Motor skills` → `motor-skills`, `Behaviour` → `behaviour`, `Learning` → `learning`, `Not sure` → `not-sure`.

Apply the same change to any other form that uses these chip values (search `value="Speech"`, `value="Motor skills"` etc. across all HTML files — likely only `index.html`).

- [ ] **Step 4: Manual EN test**

```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open `http://localhost:8080/` with consent accepted, fill the micro-survey: concern=Speech (or whatever chip label), submit. Inspect devtools `sessionStorage["urbane-ethos:personalization"]` — should now be `{"concern":"speech","..."}` (slug, not "Speech"). Reload — services grid first card is "Speech & Language Therapy".

- [ ] **Step 5: Manual MS test**

Toggle locale to BM. Reset personalization (the reset button on the form, or clear sessionStorage). Re-fill the survey — the chip labels now read in BM, click the first one (Pertuturan or whatever the BM string is for "Speech"). Submit. Inspect sessionStorage — value should still be `"speech"` (slug). Reload — services grid first card should be the BM-labelled equivalent of the speech service.

Expected: works identically in both locales. **This is the bug fix gate.**

- [ ] **Step 6: axe-core sanity**

```bash
npx -y @axe-core/cli http://localhost:8080/ --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
```

Expected: 0 violations.

- [ ] **Step 7: Commit**

```bash
git add assets/js/personalization.js index.html test/smoke/personalization-locale.html
git commit -m "fix(perso): key concern rules on locale-agnostic slugs

RULES.concernTo* were keyed on English chip labels ('Speech', 'Motor
skills'). In MS locale the chips render BM strings via data-i18n, so
FormData.get('concern') returned the BM label and lookups missed
silently — services grid never reordered for BM users.

Decouples chip <input> value (slug) from chip display text (i18n).
Bonus: persisted sessionStorage is now locale-stable across toggles."
kill $SERVER_PID
```

---

### Task 7: W6.1 — Add responsive breakpoint tokens

**Files:**
- Modify: `assets/css/tokens.css`

- [ ] **Step 1: Add breakpoint tokens**

Edit `assets/css/tokens.css`. Inside the `:root` block (or `@layer tokens` body — match existing structure), add:

```css
/* W6 responsive — mobile-first breakpoints.
   Base styles target ≤640px; rules scale up at sm/md/lg.
   --bp-sm: phone landscape, small tablet
   --bp-md: tablet portrait, hamburger → flex-row threshold
   --bp-lg: tablet landscape, small laptop
*/
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
```

Note: CSS custom properties cannot be used directly inside `@media (min-width: var(--bp-md))` queries — that's a browser limitation. The tokens serve as a documented source of truth; rule sites still write the literal value. Add a comment to that effect inline so future readers don't try.

```css
/* Caveat: @media queries cannot interpolate custom properties.
   The tokens above are documentation; @media rules use literals. */
```

- [ ] **Step 2: Quick visual check**

```bash
bin/server &
SERVER_PID=$!
sleep 2
curl -s http://localhost:8080/ -o /dev/null -w "%{http_code}\n"
```

Expected: 200. No CSS error, no visible regression (these are new properties only).

- [ ] **Step 3: Commit**

```bash
git add assets/css/tokens.css
git commit -m "feat(tokens): add --bp-sm/md/lg responsive breakpoint tokens

Documents the 640/768/1024px breakpoints used by W6 responsive work.
Custom props cannot interpolate inside @media queries — tokens are
documentation, rule sites use the literal value."
kill $SERVER_PID
```

---

### Task 8: W6.2 part A — Add nav-toggle markup + CSS skeleton (no JS yet)

**Files:**
- Modify: `assets/css/components.css`
- Modify: `index.html` (and 7 other pages — done in this task because they share markup)
- Modify: `content/en/common.json`, `content/ms/common.json` (add `nav.menuLabel` keys)

- [ ] **Step 1: Add i18n keys for the toggle label**

Edit `content/en/common.json`. Inside `common.nav` (or top-level `nav` namespace, matching existing structure — confirm via `grep -n '"nav"' content/en/common.json`), add:

```json
"menuLabel": "Open menu",
"menuLabelOpen": "Close menu"
```

Edit `content/ms/common.json`:

```json
"menuLabel": "Buka menu",
"menuLabelOpen": "Tutup menu"
```

Mark MS as `_draft: true` if file convention requires.

Parity check:
```bash
bin/check-i18n-parity.rb && echo OK
```

- [ ] **Step 2: Add nav-toggle CSS**

Edit `assets/css/components.css`, inside `@layer components`. Add near the `.site-header` block:

```css
  /* W6.2 — hamburger toggle (mobile-first).
     Visible below --bp-md (768px); hidden above. */
  .nav-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;          /* 44×44 — generous touch target */
    padding: 0;
    background: transparent;
    border: 0;
    color: var(--color-ink);
    cursor: pointer;
    border-radius: var(--radius-1);
  }
  .nav-toggle:focus-visible { outline-offset: 2px; }
  .nav-toggle svg {
    width: 1.5rem;
    height: 1.5rem;
    stroke: currentColor;
    stroke-width: 1.2;
    stroke-linecap: round;
    fill: none;
  }
  /* Crossfade two strokes into an X when expanded — paper-and-ink idiom */
  .nav-toggle[aria-expanded="true"] svg .line-top {
    transform: translateY(4px) rotate(45deg);
    transform-origin: center;
  }
  .nav-toggle[aria-expanded="true"] svg .line-bot {
    transform: translateY(-4px) rotate(-45deg);
    transform-origin: center;
  }
  .nav-toggle svg .line-top,
  .nav-toggle svg .line-bot {
    transition: transform var(--dur-2) var(--ease-paper);
  }
  @media (prefers-reduced-motion: reduce) {
    .nav-toggle svg .line-top,
    .nav-toggle svg .line-bot { transition: none; }
  }

  /* Nav panel — collapsed default, slides down when open */
  #primary-nav {
    display: none;
  }
  #primary-nav.is-open {
    display: block;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-paper);
    border-bottom: 1px solid var(--color-line);
    padding: var(--space-4) var(--space-6);
    box-shadow: var(--shadow-1);
    z-index: 50;
  }
  #primary-nav.is-open .nav-list {
    flex-direction: column;
    gap: var(--space-3);
  }

  /* Above --bp-md: revert to horizontal layout, hide the toggle */
  @media (min-width: 768px) {
    .nav-toggle { display: none; }
    #primary-nav { display: block; position: static; padding: 0; border: 0; box-shadow: none; background: transparent; }
    #primary-nav .nav-list { flex-direction: row; gap: var(--space-5); }
  }
```

Note: `.site-header` already uses `position: sticky` (verify via grep — `grep -A 3 ".site-header" assets/css/components.css | head -10`). The `#primary-nav.is-open` panel uses `position: absolute` so it overlays the page content — `.site-header` needs `position: relative` (or use a different parent) for the absolute panel to anchor correctly. Add `position: relative` to `.header-row` if needed.

- [ ] **Step 3: Add nav-toggle markup to each of the 8 pages**

For EACH of `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`:

Find the existing `<nav aria-label="Primary">` block inside `<header class="site-header">`. Wrap it with a toggle button and an id on the nav. Concretely:

```html
<!-- before -->
<header class="site-header">
  <div class="header-row wrap">
    <a class="brand" href="./">Urbane Ethos</a>
    <nav aria-label="Primary">
      <ul class="nav-list"> ... </ul>
    </nav>
    <div class="header-tools"> ... </div>
  </div>
</header>

<!-- after -->
<header class="site-header">
  <div class="header-row wrap">
    <a class="brand" href="./">Urbane Ethos</a>
    <button class="nav-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="primary-nav"
            data-i18n-attr="aria-label:common.nav.menuLabel"
            aria-label="Open menu">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line class="line-top" x1="3" y1="9" x2="21" y2="9" />
        <line class="line-bot" x1="3" y1="15" x2="21" y2="15" />
      </svg>
    </button>
    <nav id="primary-nav" aria-label="Primary">
      <ul class="nav-list"> ... </ul>
    </nav>
    <div class="header-tools"> ... </div>
  </div>
</header>
```

Tip: write a sed-style multi-line replacement to apply consistently. Since the existing `<nav aria-label="Primary">` block should be byte-identical across all 8 pages (per the prototype's static design), one find/replace per file should work; double-check via `grep -c 'aria-controls="primary-nav"' *.html` — must equal 8.

- [ ] **Step 4: Visual smoke (no JS yet — just markup + CSS)**

```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open `http://localhost:8080/` at desktop viewport (1200×800). Expected: nav-toggle invisible, nav-list horizontal, looks identical to before.

Open same URL at mobile viewport (375×667, via devtools responsive mode or gstack). Expected: nav-toggle visible, nav panel hidden (`display: none`). Clicking the toggle does nothing yet — JS lands in Task 9.

- [ ] **Step 5: Parity gate**

```bash
bin/check-i18n-parity.rb && echo OK
```

- [ ] **Step 6: Commit**

```bash
git add assets/css/components.css content/en/common.json content/ms/common.json *.html
git commit -m "feat(nav): hamburger toggle markup + responsive CSS skeleton

Adds .nav-toggle button before #primary-nav on all 8 production pages
and the responsive CSS that hides the toggle above --bp-md (768px) and
collapses the panel below. JS module lands in the next task —
this commit alone leaves the panel inert below mobile."
kill $SERVER_PID
```

---

### Task 9: W6.2 part B — Author `nav.js` (test-driven)

**Files:**
- Create: `assets/js/nav.js`
- Create: `test/smoke/nav-toggle.html`

- [ ] **Step 1: Write the smoke fixture**

Create `test/smoke/nav-toggle.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Smoke — nav toggle</title>
  <link rel="stylesheet" href="../../assets/css/tokens.css">
  <link rel="stylesheet" href="../../assets/css/base.css">
  <link rel="stylesheet" href="../../assets/css/components.css">
  <style>
    body { padding: 1rem; }
    .testlog { margin-top: 2rem; font-family: monospace; white-space: pre-wrap; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-row wrap">
      <a class="brand" href="./">Urbane Ethos</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line class="line-top" x1="3" y1="9" x2="21" y2="9" />
          <line class="line-bot" x1="3" y1="15" x2="21" y2="15" />
        </svg>
      </button>
      <nav id="primary-nav" aria-label="Primary">
        <ul class="nav-list">
          <li><a href="#a">Link A</a></li>
          <li><a href="#b">Link B</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <div class="testlog" id="log">Open devtools, narrow viewport &lt; 768px, then:
1. Click .nav-toggle → panel opens, aria-expanded='true', focus stays on toggle.
2. Tab → moves into the nav links (first link focused).
3. Press Escape → panel closes, aria-expanded='false', focus returns to toggle.
4. Open again, click outside the panel → panel closes.
5. Above 768px → toggle hidden, panel always visible.</div>

  <script type="module" src="../../assets/js/nav.js"></script>
</body>
</html>
```

- [ ] **Step 2: Author `assets/js/nav.js`**

Create `assets/js/nav.js`:

```js
// W6.2 — Hamburger nav toggle.
// Wires the .nav-toggle button to #primary-nav.is-open with:
//   - aria-expanded sync
//   - focus trap while open (Tab cycles within the panel)
//   - Escape closes + returns focus to the toggle
//   - click-outside closes
//   - reduced-motion respected via CSS (not JS)

const TOGGLE_SEL = ".nav-toggle";
const PANEL_SEL = "#primary-nav";

function getFocusable(panel) {
  return [...panel.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
}

function open(toggle, panel) {
  toggle.setAttribute("aria-expanded", "true");
  panel.classList.add("is-open");
  // Move focus to the first focusable link in the panel for keyboard users
  // (mouse users keep focus on the toggle implicitly; tabbing then enters the trap)
  const focusables = getFocusable(panel);
  if (focusables[0]) focusables[0].focus({ preventScroll: true });
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onClickOutside, true);
}

function close(toggle, panel, restoreFocus = true) {
  toggle.setAttribute("aria-expanded", "false");
  panel.classList.remove("is-open");
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("click", onClickOutside, true);
  if (restoreFocus) toggle.focus({ preventScroll: true });
}

function onKeydown(event) {
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;

  if (event.key === "Escape") {
    event.preventDefault();
    close(toggle, panel);
    return;
  }
  if (event.key !== "Tab") return;

  // Focus trap
  const focusables = getFocusable(panel);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function onClickOutside(event) {
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;
  if (panel.contains(event.target)) return;
  if (toggle.contains(event.target)) return;  // toggle handles its own click
  close(toggle, panel, false);
}

function init() {
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    if (expanded) close(toggle, panel);
    else open(toggle, panel);
  });
}

document.addEventListener("DOMContentLoaded", init);
```

- [ ] **Step 3: Manual smoke**

```bash
bin/server &
SERVER_PID=$!
sleep 2
open http://localhost:8080/test/smoke/nav-toggle.html
```

In the browser, devtools responsive mode at 375×667:
- Click `.nav-toggle` → panel opens. `aria-expanded="true"`. First link focused.
- Tab → next link focused (and so on through panel focusables, then wraps).
- Shift+Tab from first link → wraps to last.
- Escape → panel closes, focus returns to toggle, `aria-expanded="false"`.
- Open again, click anywhere outside the panel → closes.

Then resize > 768px: toggle hidden, panel always visible. Click links — they navigate.

If anything misbehaves, fix in `nav.js`. Run again.

- [ ] **Step 4: Commit**

```bash
git add assets/js/nav.js test/smoke/nav-toggle.html
git commit -m "feat(nav): nav.js module — hamburger open/close + focus trap

Click .nav-toggle to open #primary-nav (sets aria-expanded=true, adds
.is-open class, focuses first link). Closes on Escape, click-outside,
or re-click of the toggle. Tab/Shift+Tab cycle within the panel while
open. Focus returns to the toggle on Escape close (not on
click-outside, where the user's pointer chose the next focus target).

Reduced-motion respected via CSS, not JS — the module is motion-agnostic."
kill $SERVER_PID
```

---

### Task 10: W6.2 part C — Wire `nav.js` into all 8 production pages

**Files:**
- Modify: `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`

- [ ] **Step 1: Insert imports**

For each of the 8 pages, find the `<script type="module">` block (typically at the end of `<body>`) and insert `import "./assets/js/nav.js";` immediately after `import "./assets/js/a11y.js";` (the canggih wiring convention). On pages without `a11y.js` (per HANDOVER: `privacy.html` anchors on `consent.js`; `analytics.html` anchors on `analytics-demo-data.js`), insert after those anchors instead.

Concrete pattern (illustrative — match exact existing structure per page):

```html
<!-- before -->
<script type="module">
  import "./assets/js/i18n.js";
  import "./assets/js/a11y.js";
  import "./assets/js/consent.js";
  // ...
</script>

<!-- after -->
<script type="module">
  import "./assets/js/i18n.js";
  import "./assets/js/a11y.js";
  import "./assets/js/nav.js";
  import "./assets/js/consent.js";
  // ...
</script>
```

- [ ] **Step 2: Verify the wiring smoke**

```bash
grep -c "nav.js" *.html | awk -F: 'BEGIN{s=0} {s+=$2} END{print "total nav.js mentions:", s, "(expected 8)"}'
```

Expected: total = 8.

If not 8, find the missing pages with `grep -L "nav.js" *.html` and add the import.

- [ ] **Step 3: Per-page smoke**

```bash
bin/server &
SERVER_PID=$!
sleep 2
```

In a browser (responsive mode 375×667), open each of the 8 pages and click the hamburger. Each should open + close cleanly. Smoke check, not a full QA.

- [ ] **Step 4: axe-core sweep**

```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done
```

Expected: 0 serious/critical violations across all 8.

- [ ] **Step 5: Commit**

```bash
git add *.html
git commit -m "feat(nav): wire nav.js into all 8 production pages

Inserted import after a11y.js per the canggih layer convention
(consent.js on privacy.html, analytics-demo-data.js on analytics.html
where a11y.js is absent). All 8 pages now ship the hamburger
interaction below 768px."
kill $SERVER_PID
```

---

### Task 11: W6.3 — Hero typography mobile tuning

**Files:**
- Modify: `assets/css/components.css`

- [ ] **Step 1: Add mobile hero tightening**

Edit `assets/css/components.css`, inside `@layer components`. Find the `.hero` rule (or matching selectors — likely `.hero h1`, `.hero .lede`). Add a small-viewport tighten block:

```css
  @media (max-width: 640px) {
    .hero { padding-block: var(--space-6) var(--space-8); }
    .hero h1 { line-height: 1.1; }
    .hero .lede { font-size: 1.0625rem; max-width: 100%; }
    .cta-row { gap: var(--space-2); }
  }
```

Concrete numbers based on the current rules at desktop — adjust to taste while keeping the hierarchy.

- [ ] **Step 2: Verify**

```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open each of `/`, `/about.html`, `/services.html`, `/contact.html` at 360×640 (the smallest target) and 414×896. Expected: hero stays above-the-fold or near it; lede and CTAs don't crowd; no horizontal scroll.

- [ ] **Step 3: Commit**

```bash
git add assets/css/components.css
git commit -m "feat(css): mobile-tuned hero — tighter line-height, padding, lede

Below 640px the hero collapses to a more vertical-economy layout — h1
line-height drops to 1.1, lede font-size eases, padding reduces. Keeps
the page first-impression intentional on phones."
kill $SERVER_PID
```

---

### Task 12: W6.4 + W6.5 — Grid gap tuning + touch-target sizing

**Files:**
- Modify: `assets/css/components.css`

- [ ] **Step 1: Add grid-gap mobile tightening**

Edit `assets/css/components.css`, inside `@layer components`. Add:

```css
  @media (max-width: 640px) {
    .staff-grid { gap: var(--space-8); }
    .grid-3, .grid-2 { gap: var(--space-5); }
    .site-footer .grid { gap: var(--space-6); }
    .stat-grid { gap: var(--space-3); }
  }
```

- [ ] **Step 2: Add touch-target floor**

Inside `@layer components`. Add (or extend existing rules — search for `.chip-pill`, `.locale-toggle`, `[data-fs-cycle]`, `.chatbot-launcher` to confirm current selectors):

```css
  /* W6.5 — WCAG 2.5.8 AA touch-target floor (24×24 CSS px).
     Bump frequently-tapped controls to a comfortable 40+. */
  .chip-pill,
  .locale-toggle button,
  [data-fs-cycle],
  .chatbot-launcher,
  .consent-banner button,
  .consent-modal-actions button,
  .nav-list a,
  .yt-play {
    min-block-size: 2.5rem;   /* 40px at default rem */
  }
  .chip-pill { min-block-size: 2rem; }  /* chips can stay slightly tighter */
```

If any selector above doesn't exist in the project, replace with the correct one (check via grep). Don't introduce regressions by adding `min-block-size` to wrapper elements.

- [ ] **Step 3: Verify**

```bash
bin/server &
SERVER_PID=$!
sleep 2
```

Open at 375×667 viewport in devtools. Spot-check 5 controls per page (random sample) — measure click target via devtools rect. Expected: ≥ 24×24 (AA), most ≥ 40×40.

- [ ] **Step 4: axe-core sweep**

```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -3
done
```

Expected: 0 serious/critical.

- [ ] **Step 5: Commit**

```bash
git add assets/css/components.css
git commit -m "feat(css): mobile gap tightening + WCAG 2.5.8 touch-target floor

Below 640px: grid gaps shrink for vertical economy. Interactive
controls (.chip-pill, locale-toggle buttons, fs-cycle, chatbot
launcher, nav links, yt play, consent actions) carry a min-block-size
of 2.5rem (40px) so touch targets exceed the WCAG 2.5.8 AA floor of
24×24 CSS pixels."
kill $SERVER_PID
```

---

### Task 13: W6.6 — Per-page mobile sweep (4 viewports × 8 pages)

**Files:**
- Modify: `.gitignore`
- Modify: `docs/HANDOVER.md` (note where screenshots live)
- Create: `docs/responsive-sweep/` (gitignored — for local reference)

- [ ] **Step 1: Gitignore the sweep dir**

Edit `.gitignore`. Add (near other dev-only ignores):

```
docs/responsive-sweep/
```

Reason: 32 PNG screenshots would bloat git history with no marginal value once they've informed the fixes. Document the workflow in HANDOVER instead.

- [ ] **Step 2: Capture sweep via gstack browser**

Open the gstack browser. For each of the 8 production pages × 4 viewports (375×667, 414×896, 768×1024, 1024×768), navigate, screenshot, save to `docs/responsive-sweep/<page>-<wxh>.png`.

If gstack supports a scripted device emulation walk, use it. Otherwise step manually.

Reference command (illustrative — actual gstack invocation may differ):

```bash
mkdir -p docs/responsive-sweep
# Conceptually:
# for page in index.html about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
#   for v in 375x667 414x896 768x1024 1024x768; do
#     gstack screenshot "http://localhost:8080/$page" --viewport "$v" \
#       --out "docs/responsive-sweep/${page%.html}-${v}.png"
#   done
# done
```

The point is to have a 32-image reference set on disk so the next pass (Step 3) is visual.

- [ ] **Step 3: Walk each screenshot, fix what's broken**

For each screenshot, look for:
- Horizontal scroll (right edge of content past viewport)
- Overlapping elements
- Text under the fold that should be above
- Touch targets visibly < 40px
- Broken hero / nav / grid layout

For each issue: fix in CSS (likely `assets/css/components.css` mobile media queries), re-screenshot, confirm fixed.

Commit each batch of fixes:

```bash
git add assets/css/components.css
git commit -m "fix(css): mobile sweep — <one-line summary of issues fixed in this batch>"
```

Typical issues you may catch (none guaranteed — depends on what the sweep finds):
- Locale toggle / fs-cycle wrap awkwardly under brand in narrow viewports
- Hero CTA row wraps to two lines with extra gap
- Footer grid collapses with too-tight columns
- Service block content table needs `overflow-x: auto`

- [ ] **Step 4: Document the sweep in HANDOVER**

Edit `docs/HANDOVER.md`. Add (near the bottom or in a new "Responsive sweep" subsection):

```markdown
### Responsive sweep (2026-06-10 polish-pass)

A 32-image sweep (8 pages × 4 viewports: 375×667, 414×896, 768×1024,
1024×768) was captured locally and used to drive the W6 mobile fixes.
Screenshots live in `docs/responsive-sweep/` (gitignored). To
regenerate, see W6.6 in the polish-pass plan.
```

- [ ] **Step 5: Commit doc**

```bash
git add .gitignore docs/HANDOVER.md
git commit -m "docs: gitignore responsive-sweep screenshots, note workflow

32-image sweep informed the W6 mobile fixes. Screenshots are local
reference, not historical record — gitignored. HANDOVER explains
the workflow for regeneration."
```

---

### Task 14: W6.7 — Landscape + reduced-motion sanity

**Files:**
- Modify: `assets/css/components.css` (only if a fix surfaces)

- [ ] **Step 1: Landscape phone check**

Start server, open `http://localhost:8080/` at 667×375 viewport (landscape iPhone SE). Verify:
- Hero `100vh` (Phase 4 C1) doesn't dominate (already uses `100svh` fallback)
- Sticky header doesn't eat half the visible area
- Nav-toggle is still appropriately sized (44×44)
- Parallax (A4) doesn't jitter on orientation flip

Repeat at 896×414 (landscape iPhone 11+).

If anything wrong: clamp `100vh` lower in landscape via `@media (orientation: landscape) and (max-height: 500px) { .hero { min-height: 80vh; } }`.

- [ ] **Step 2: Reduced-motion check**

In devtools, simulate `prefers-reduced-motion: reduce`. Open each of:
- `/` — hero parallax, page-load ink-bloom, sage cursor should all be static
- `/services.html` — fade-in-up reveals should appear instantly
- The hamburger panel (open at mobile) — instant toggle, no slide

Expected: all motion suppressed. If something still moves, find the rule that lacks a `@media (prefers-reduced-motion: reduce)` companion and fix.

- [ ] **Step 3: Commit if any change was needed**

```bash
git add assets/css/components.css
git commit -m "fix(css): landscape + reduced-motion sanity from W6.7 sweep"
```

If no changes were needed, log via empty-commit (skipped — workspace policy prefers no empty commits) or just note in the next handover update.

---

### Task 15: W6.8 — Real-viewport gstack walk

**Files:**
- Modify: `docs/HANDOVER.md` (note any device-class findings)

- [ ] **Step 1: Run a real-viewport sweep via gstack**

Open the gstack browser at a real viewport (whatever the host display offers). Walk all 8 pages. Click around — open chatbot, fill the personalization form, toggle locale, toggle font-size, open the hamburger at mobile sizes.

- [ ] **Step 2: Document findings**

Edit `docs/HANDOVER.md`. In the new "Responsive sweep" subsection from Task 13, append any device-class observations:

```markdown
**Real-device check (2026-06-10):** walked 8 pages on the host display.
Notes:
- (any issues found — or "no issues observed")
```

- [ ] **Step 3: Commit**

```bash
git add docs/HANDOVER.md
git commit -m "docs: append real-viewport walk findings to responsive-sweep section"
```

---

### Task 16: W7 — Chatbot a11y via playwright

**Files:**
- Create: `bin/axe-chatbot.mjs`
- Modify: `docs/A11Y_NOTES.md`

- [ ] **Step 1: Author `bin/axe-chatbot.mjs`**

Create `bin/axe-chatbot.mjs`:

```js
#!/usr/bin/env node
// W7 — axe-core sweep on the chatbot panel.
//
// The chatbot panel is built lazily on launcher click, so the
// CLI axe sweep over the static page only sees the launcher button.
// This script:
//   1. Launches playwright Chromium against http://localhost:8080/
//   2. Clicks .chatbot-launcher
//   3. Waits for .chatbot-panel to render
//   4. Runs axe-core on the panel
//   5. Prints violations; exits 1 if any serious/critical found
//
// Usage:
//   bin/server &
//   node bin/axe-chatbot.mjs
//
// Not gated in CI — runs locally before handover.

import { chromium } from "playwright";
import { default: AxeBuilder } from "@axe-core/playwright";

const URL = process.env.URL || "http://localhost:8080/";

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(URL, { waitUntil: "domcontentloaded" });

// Dismiss consent if present (otherwise it may overlay the launcher)
const acceptAll = page.locator('button:has-text("Accept all")');
if (await acceptAll.count()) await acceptAll.first().click();

await page.locator(".chatbot-launcher").click();
await page.locator(".chatbot-panel").waitFor({ state: "visible", timeout: 5000 });

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
  }
}

const critical = violations.filter(v => v.impact === "critical" || v.impact === "serious");
process.exit(critical.length > 0 ? 1 : 0);
```

`chmod +x bin/axe-chatbot.mjs`.

- [ ] **Step 2: Install playwright + @axe-core/playwright if not present**

```bash
# Note: project has no package.json at root. This adds one if needed.
# If a package.json already exists, append instead.
test -f package.json || npm init -y
npm install --save-dev playwright @axe-core/playwright
npx playwright install chromium  # downloads the browser binary (one-time, ~150MB)
```

Add `node_modules/`, `package-lock.json`, `package.json` to git if they don't already exist (the existing `.gitignore` should cover `node_modules/`). The presence of `package.json` for a single dev dep is acceptable; `bin/axe-chatbot.mjs` documents the rationale.

- [ ] **Step 3: Run it**

```bash
bin/server &
SERVER_PID=$!
sleep 2
node bin/axe-chatbot.mjs
```

Expected: `axe-chatbot: 0 violations ✓` or a small list.

If violations surface — fix them in `assets/js/chatbot.js` (or whichever module owns the panel structure). Common likely fixes:
- Missing `aria-label` on a button (e.g. the "send" arrow)
- `role="log"` already present per CLAUDE.md; verify
- Color contrast on the message-log if the chatbot uses a different palette than the page

Re-run after each fix.

- [ ] **Step 4: Document the runner in A11Y_NOTES**

Edit `docs/A11Y_NOTES.md`. In the "Tooling" or equivalent section, add:

```markdown
### Chatbot panel — playwright runner

The chatbot panel is built lazily on launcher click and isn't reached by
the static axe-core CLI sweep. Run the panel-specific sweep with:

    bin/server &
    node bin/axe-chatbot.mjs

Exits 1 if serious/critical violations surface. Not gated in CI
(matches the existing local-run axe convention). Source: `bin/axe-chatbot.mjs`.
```

Also remove or update any prior text in A11Y_NOTES that flagged chatbot as a known-gap.

- [ ] **Step 5: Commit**

```bash
git add bin/axe-chatbot.mjs docs/A11Y_NOTES.md package.json package-lock.json
git commit -m "feat(a11y): playwright-driven axe runner for the chatbot panel

bin/axe-chatbot.mjs launches Chromium, clicks .chatbot-launcher, waits
for .chatbot-panel, then runs axe-core scoped to the panel. Closes the
last remaining axe blind spot in the prototype (the panel is built
lazily and was unreachable from the CLI sweep). Not gated in CI — runs
locally before handover."
kill $SERVER_PID
```

---

### Task 17: W8 — huashu-design 5-dimension review

**Files:**
- Create: `docs/superpowers/specs/2026-06-10-huashu-review.md`

- [ ] **Step 1: Invoke huashu-design in review mode**

Use the Skill tool: `huashu-design` with an instruction along the lines of:

> Run the 5-dimension expert review on the live prototype at `http://localhost:8080/` across all 8 production pages (index, about, staff, services, blog, contact, analytics, privacy). Score each dimension /10 with specific observations and a tier-1 / tier-2 fix list:
>
> 1. Philosophy consistency (paper-and-ink Direction B coherence vs. web-trope drift)
> 2. Visual hierarchy (primary leads / secondary supports)
> 3. Detail execution (typography weight + tracking, spacing rhythm, colour use, motion timing)
> 4. Functionality (interactions intentional, surprises minimal)
> 5. Innovation (distinctive within the early-intervention-centre category)
>
> Save the report at `docs/superpowers/specs/2026-06-10-huashu-review.md`.

- [ ] **Step 2: Triage the fix list**

Read the report. Categorize each surfaced fix:
- **Tier 1** — small, isolated, no architectural impact, < 1 hour
- **Tier 2+** — larger, multi-file, design-decision-laden, > 1 hour

- [ ] **Step 3: Apply tier-1 fixes**

For each tier-1: edit, verify in browser, axe-core sanity, commit individually with a short prefix-style message (`fix(<area>): huashu — <one-line>`).

- [ ] **Step 4: Document tier-2+ in HANDOVER**

Edit `docs/HANDOVER.md`. In "Deferred items", add:

```markdown
### huashu-design review (2026-06-10) — deferred tier-2+ items

Out of scope for the polish pass per spec cap. Full report:
`docs/superpowers/specs/2026-06-10-huashu-review.md`.

- (each tier-2 item with one-line rationale of why it's deferred)
```

- [ ] **Step 5: Commit the review + HANDOVER update**

```bash
git add docs/superpowers/specs/2026-06-10-huashu-review.md docs/HANDOVER.md
git commit -m "docs: huashu-design 5-dimension review + tier-1 fixes applied

Full report committed. Tier-1 fixes applied inline in prior commits.
Tier-2+ items captured in HANDOVER 'Deferred items' for next session."
```

(The tier-1 fix commits in Step 3 are separate per fix; that's fine — frequent commits per project convention.)

---

### Task 18: Handover updates — close-out edits to docs

**Files:**
- Modify: `docs/HANDOVER.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update HANDOVER "What's open"**

Edit `docs/HANDOVER.md`. Add a new top-level subsection (just under "Where we are") titled:

```markdown
### Polish-pass 2026-06-10 closed

Eight workstreams from `docs/superpowers/specs/2026-06-10-polish-pass-handover-design.md`:

- W1 CSS architecture refactor — Phase 2 + Phase 4 blocks back inside `@layer components`
- W2 Top-nav underline removed (carry-over from base `<a>` rule)
- W3 i18n dedup + `videoTitles` consumed via i18n on iframe titles
- W4 Distinct home-hero alts (anchor photo vs. yt-embed thumb)
- W5 BM personalization wired via locale-agnostic slugs — rules now fire in MS locale
- W6 Full responsive audit — `--bp-sm/md/lg` tokens, hamburger nav with focus trap, mobile typography + grid + touch-target tuning, 4-viewport × 8-page sweep, real-device walk
- W7 Chatbot a11y via playwright (`bin/axe-chatbot.mjs`) — last axe blind spot closed
- W8 huashu-design 5-dimension review — tier-1 fixes applied inline; tier-2+ documented in deferred items
```

In the existing "Known tech-debt items" lists from Phase 2 and Phase 4, remove the lines that the polish-pass closed:

- Remove the "Phase 4 canggih CSS blocks + Phase 2 `.anchor-photo` + `.yt-embed` blocks all live OUTSIDE `@layer components`" bullet (W1 closed)
- Remove the `common.media.videoUnavailableFallback` duplication bullet (W3 closed)
- Remove the home hero alt-duplication bullet (W4 closed)
- Remove the `videoTitles` "unused namespace" bullet (W3 closed)

- [ ] **Step 2: Update CLAUDE.md**

Edit `/Users/deepsight/code/urbane-ethos/CLAUDE.md`. Remove (or update past-tense):

- The line in "JS modules" describing personalization as "Rules only fire reliably when locale is EN" — now reads consistently in both locales.
- The "Known architectural drift" callout under "CSS architecture" (W1 closed).

Add `nav.js` to the JS modules list with a one-line description:

```markdown
- `nav.js` — hamburger toggle for the primary nav below 768px. Focus trap + Escape close + click-outside close. Wired on all 8 production pages via the canggih layer convention.
```

- [ ] **Step 3: Commit**

```bash
git add docs/HANDOVER.md CLAUDE.md
git commit -m "docs: close polish-pass items, document nav.js, drop stale caveats

- HANDOVER 'What's open' summarized polish-pass close-out
- HANDOVER tech-debt bullets resolved by W1/W3/W4 removed
- CLAUDE.md drops BM-personalization caveat (W5 fix) and CSS layer-drift
  callout (W1 fix); adds nav.js to the JS modules list."
```

---

### Task 19: Final verification — all acceptance gates

**Files:** None modified (read-only verification).

- [ ] **Step 1: Automated gates**

```bash
bin/server &
SERVER_PID=$!
sleep 2

# Parity
bin/check-i18n-parity.rb && echo PARITY_OK || echo PARITY_FAIL

# All pages serve 200
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/$p")
  echo "$code  /$p"
done

# axe-core full sweep
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done

# Chatbot playwright axe
node bin/axe-chatbot.mjs

# Module wiring
echo "nav.js mentions: $(grep -c "nav.js" *.html | awk -F: 'BEGIN{s=0}{s+=$2}END{print s}') (expected 8)"
```

Expected:
- `PARITY_OK`
- 8× `200` codes
- 0 serious/critical from every axe run
- `axe-chatbot: 0 violations ✓`
- `nav.js mentions: 8`

If any FAIL: investigate before declaring complete.

- [ ] **Step 2: Manual smoke (the gates that automation can't see)**

In a browser at desktop viewport:
- Toggle locale EN↔MS on `/`. Confirm chip labels translate.
- Submit personalization survey in EN with concern=Speech — services grid reorders. Reset.
- Toggle to MS, re-submit with first chip — services grid reorders again. Same `sessionStorage.concern = "speech"`.
- Click yt-embed on `/` — iframe `title` is English. Toggle to MS, reload, click again — `title` is BM.
- Click yt-embed on `/contact.html` — same.
- Tab through `.site-header` on `/` — no underline at rest, focus-visible ring appears.

Mobile viewport (375×667):
- Hamburger opens on click, closes on Escape, focus returns to toggle.
- Tab from open hamburger stays trapped within panel.
- Click outside the panel closes it (no focus restore).
- Each of 8 pages: no horizontal scroll, layout intact.

- [ ] **Step 3: Final commit if anything fell out**

If the verification surfaced anything, fix in-place and commit individually. Otherwise no commit.

```bash
kill $SERVER_PID
```

- [ ] **Step 4: Report completion**

Print a summary to the user listing:
- Commits landed in this polish-pass (`git log --oneline 28c5060..HEAD` from the Phase 1 anchor, or `git log --oneline <merge-base>..HEAD`)
- The acceptance gates each passed
- Path to the huashu-design review
- The deferred items recorded in HANDOVER
- Anything that visibly didn't go as planned (so the next session has clean inputs)

---

## Self-review

After writing the plan I scanned it against the spec:

- **Spec W1 → Task 1.** ✓ Mechanical refactor, axe gate, commit.
- **Spec W2 → Task 2.** ✓ Header underline removed via scoped CSS, includes `.brand`.
- **Spec W3 → Tasks 3, 4.** ✓ Dupe deletion (Task 3) + `videoTitles` wiring (Task 4) split as suggested.
- **Spec W4 → Task 5.** ✓ Distinct alts; MS draft-marked.
- **Spec W5 → Task 6.** ✓ Slug refactor in JS + HTML; smoke fixture added.
- **Spec W6.1 (tokens) → Task 7.** ✓
- **Spec W6.2 (hamburger) → Tasks 8, 9, 10.** ✓ Split markup+CSS, JS module, wiring.
- **Spec W6.3 (hero typo) → Task 11.** ✓
- **Spec W6.4 + W6.5 (grids + touch) → Task 12.** ✓ Merged (one CSS change).
- **Spec W6.6 (mobile sweep) → Task 13.** ✓
- **Spec W6.7 (landscape/RM) → Task 14.** ✓
- **Spec W6.8 (real-viewport) → Task 15.** ✓
- **Spec W7 (chatbot playwright) → Task 16.** ✓
- **Spec W8 (huashu review) → Task 17.** ✓
- **Handover updates → Task 18.** ✓ All 3 spec'd doc files touched.
- **Final verification → Task 19.** ✓ Both automated + manual gates covered.

Placeholder scan: no "TBD" / "TODO" / "implement later" found. The closest is Task 4 Step 2 "Add (or expose) a resolver helper if missing" — that's a defensive branch (might already exist), not a placeholder.

Type consistency: `data-yt-title-key` used consistently across Tasks 4 and elsewhere. `slug` values (`speech`, `motor-skills`, etc.) match between Task 6 Step 2 (JS rules) and Task 6 Step 3 (HTML chip values).

Plan is comprehensive and ready for execution.
