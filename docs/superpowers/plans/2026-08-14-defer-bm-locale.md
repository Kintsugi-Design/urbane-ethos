# Defer BM — English-Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve English only — no user-visible or programmatic path to Bahasa Malaysia — while `content/ms/*.json` and the CI parity gate stay untouched so translation work continues.

**Architecture:** One exported boolean in `assets/js/i18n.js` (`LOCALES_ENABLED = false`) narrows the set of accepted locales to `{en}`, which makes `getLocale()` reject a stored `"ms"` and `setLocale("ms")` a no-op. One CSS rule in `assets/css/components.css` hides `.locale-toggle` across all 46 pages that carry it without editing markup. Two browser smoke assertions branch on the exported flag so they stay green now and re-arm when it flips. Both edit sites are tagged `BM-DEFERRED`.

**Tech Stack:** Static HTML/CSS/JS, no build step. ES modules loaded via `<script type="module">`. CSS cascade layers. Ruby WEBrick dev server (`bin/server`). Verification is browser smoke pages plus two Ruby gate scripts — **this repo has no `npm test` and no `rspec`; do not invent one.**

**Spec:** `docs/superpowers/specs/2026-08-14-defer-bm-locale-design.md`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `assets/js/i18n.js` | Locale resolution — the single place that decides which locale is active | Add `LOCALES_ENABLED` + `activeLocales()`; swap two `SUPPORTED` call sites; guard `initLocaleToggle()` |
| `assets/css/components.css` | Component presentation | Add one `.locale-toggle { display: none }` rule |
| `test/smoke/i18n.html` | Browser smoke page for i18n | Branch the BM block on the flag; add three deferral assertions |
| `test/smoke/enquiry.html` | Browser smoke page, 48 self-asserting `check()` calls | Re-point Ex3.8 at the deferral guarantee |
| `README.md` | Project overview, real-vs-draft inventory | Note BM is deferred |
| `CLAUDE.md` | Agent guidance | Note the flag in the Content / i18n section |
| `docs/HANDOVER.md` | Current state | New dated entry |

**Not touched, deliberately:** any of the 46 `*.html` pages, `content/blog/_post.html.erb`, `content/ms/*.json`, `content/en/*.json`, `bin/check-i18n-parity.rb`, `.github/workflows/pages.yml`, `.gitlab-ci.yml`, `assets/css/motion.css`.

---

### Task 1: Lock locale resolution to English in `i18n.js`

**Files:**
- Modify: `assets/js/i18n.js:3-5` (constants), `:93-96` (`getLocale`), `:98-104` (`setLocale`), `:116-126` (`initLocaleToggle`)

- [ ] **Step 1: Add the flag and the `activeLocales()` helper**

In `assets/js/i18n.js`, find this block near the top of the file:

```js
const STORAGE_KEY = "urbane-ethos:locale";
const DEFAULT_LOCALE = "en";
const SUPPORTED = new Set(["en", "ms"]);
```

Replace it with:

```js
const STORAGE_KEY = "urbane-ethos:locale";
const DEFAULT_LOCALE = "en";
const SUPPORTED = new Set(["en", "ms"]);

// BM-DEFERRED — Bahasa Malaysia is drafted but unreviewed. Every content/ms/*.json
// carries `_meta.reviewedBy: null`, and privacy.html MS is a legal surface. Until
// that review lands, the site serves English only.
//
// The lock sits HERE rather than in CSS because locale resolution happens in JS,
// in three layers: the inline render script in all 46 pages that carry the toggle
// imports getLocale() to pick content/<locale>/; chatbot.js, map-embed.js and
// enquiry.js import it directly; and nav.js, consent.js and yt-embed.js reach it
// through the t() / translatePage() default argument. The locale persists in
// localStorage under STORAGE_KEY, so hiding the toggle alone would strand a
// visitor who picked BM on an earlier visit on a fully-BM site (copy, chatbot,
// map labels) with no visible way back to English.
//
// SUPPORTED keeps both locales on purpose: the BM path is described, not deleted.
// Note this means t(key, "ms") and translatePage("ms") still resolve BM when
// passed an EXPLICIT locale — the gate is on the stored/default locale, not on
// the arguments. No shipped call site passes one; don't add one.
//
// To ship BM: flip this to true and delete the matching `.locale-toggle` rule in
// assets/css/components.css. `grep -rn BM-DEFERRED` finds both sites.
export const LOCALES_ENABLED = false;

function activeLocales() {
  return LOCALES_ENABLED ? SUPPORTED : new Set([DEFAULT_LOCALE]);
}
```

- [ ] **Step 2: Point `getLocale()` at `activeLocales()`**

Find:

```js
export function getLocale() {
  const stored = get(STORAGE_KEY, { raw: true });
  return SUPPORTED.has(stored) ? stored : DEFAULT_LOCALE;
}
```

Replace with:

```js
export function getLocale() {
  const stored = get(STORAGE_KEY, { raw: true });
  return activeLocales().has(stored) ? stored : DEFAULT_LOCALE;
}
```

Leave the existing `raw: true` comment above the function exactly as it is — it documents a separate, still-live concern.

- [ ] **Step 3: Point `setLocale()` at `activeLocales()`**

Find:

```js
export async function setLocale(locale) {
  if (!SUPPORTED.has(locale)) return;
```

Replace with:

```js
export async function setLocale(locale) {
  if (!activeLocales().has(locale)) return;
```

Everything below that line in `setLocale` is unchanged.

- [ ] **Step 4: Guard `initLocaleToggle()`**

Find:

```js
export function initLocaleToggle(root = document) {
  const buttons = root.querySelectorAll("[data-locale-set]");
```

Replace with:

```js
export function initLocaleToggle(root = document) {
  // BM-DEFERRED: nothing to wire while EN is the only active locale. The toggle is
  // hidden in components.css, so its buttons are out of the tab order and the a11y
  // tree; binding click handlers to them would be dead code.
  if (!LOCALES_ENABLED) return;
  const buttons = root.querySelectorAll("[data-locale-set]");
```

Everything below is unchanged.

- [ ] **Step 5: Verify the file statically**

Run:

```bash
cd /Users/deepsight/code/urbane-ethos
grep -n "BM-DEFERRED\|LOCALES_ENABLED\|activeLocales\|SUPPORTED" assets/js/i18n.js
```

Expected: `SUPPORTED` appears exactly **twice** — its `const` declaration and the `activeLocales()` return. If it appears a third time, a call site was missed.

Then confirm no `localStorage`/`sessionStorage` leaked in (project invariant — `storage.js` is the only gate):

```bash
grep -n "localStorage\|sessionStorage" assets/js/i18n.js
```

Expected: **no output.**

- [ ] **Step 6: Commit**

```bash
cd /Users/deepsight/code/urbane-ethos
git add assets/js/i18n.js
git commit -m "feat(i18n): lock locale resolution to EN while BM is deferred"
```

---

### Task 2: Hide the locale toggle in CSS

**Files:**
- Modify: `assets/css/components.css` (immediately after the `.locale-toggle [aria-pressed="true"]` block, around line 196)

- [ ] **Step 1: Add the rule**

In `assets/css/components.css`, find this block:

```css
  .locale-toggle [aria-pressed="true"] {
    background: var(--color-primary-deep);
    color: var(--color-cream-soft);
  }
```

Insert immediately **after** it (before the `/* Book a session in header-tools matches the toggle height. */` comment):

```css

  /* BM-DEFERRED — Bahasa Malaysia is drafted but unreviewed, so the site serves
     English only and the EN/BM toggle is not offered.

     Hidden in CSS rather than removed from markup for three reasons: it covers all
     46 pages that carry the toggle (8 non-blog production pages + all 38 generated
     post-*.html) plus content/blog/_post.html.erb without a single markup edit;
     there is no flash of the toggle before the ES module executes; and display:none
     takes both buttons out of the tab order AND the accessibility tree, so the
     axe-core 0-violation ratchet is unaffected.

     Placement matters: this must stay AFTER the `.locale-toggle, .fs-toggle`
     display:inline-flex rule above, which has the same specificity.

     To ship BM: delete this rule and flip LOCALES_ENABLED in assets/js/i18n.js. */
  .locale-toggle { display: none; }
  /* The desktop copy needs the two-class form: the @media (min-width: 880px)
     block above sets `.header-tools .locale-toggle` to display inline-flex at
     specificity (0,2,0), which outranks the (0,1,0) rule regardless of source
     order. A media query adds no specificity, so this later (0,2,0) rule wins at
     every width. Delete it alongside the rule above when BM ships. */
  .header-tools .locale-toggle { display: none; }
```

> **AMENDED DURING EXECUTION — plan defect.** This task originally specified only
> the single-class `.locale-toggle { display: none }` rule. That is **not
> sufficient**: `components.css:136` sets `.header-tools .locale-toggle,
> .header-tools .fs-toggle { display: inline-flex }` inside
> `@media (min-width: 880px)` at specificity (0,2,0). A media query contributes no
> specificity, so the (0,1,0) rule loses at every width ≥880px and the **desktop
> toggle would have stayed visible** — while this task's own verification step
> (which only compared source order against the same-specificity rule at line 160)
> passed. Both rules are required, and both are load-bearing:
>
> | Toggle copy | Covered by |
> |---|---|
> | `.header-tools` (desktop, ≥880px) | `.header-tools .locale-toggle` (0,2,0) |
> | `#primary-nav .nav-tools` (mobile menu) | `.locale-toggle` (0,1,0) |
> | `privacy.html:34` — bare, in `.header-row`, no `.header-tools` ancestor | `.locale-toggle` (0,1,0) |
>
> The third copy exists because `privacy.html` has a reduced header with no
> primary nav. The two-class rule alone would have missed it.
>
> Consequence for Step 2's brace check: expect **440**, not 439 — two rules, two
> pairs.

Do **not** touch `assets/css/motion.css`. Its `.locale-toggle [aria-pressed="true"]` animation becomes inert but stays for the flip back.

- [ ] **Step 2: Verify placement and layer**

Run:

```bash
cd /Users/deepsight/code/urbane-ethos
grep -n "locale-toggle" assets/css/components.css
```

Expected: the new `.locale-toggle { display: none; }` line number is **greater than** the line number of `.locale-toggle, .fs-toggle {` and greater than `.locale-toggle [aria-pressed="true"] {`. If it is not, the `display: inline-flex` above would win.

Confirm it landed inside `@layer components` (the whole block is one layer — check no stray closing brace was introduced):

```bash
ruby -e 'src = File.read("assets/css/components.css"); abort("unbalanced braces: #{src.count("{")} open vs #{src.count("}")} close") unless src.count("{") == src.count("}"); puts "braces balanced: #{src.count("{")}"'
```

Expected: `braces balanced: 440` and exit 0 (438 before this task, plus one pair per added rule — see the amendment note above).

- [ ] **Step 3: Commit**

```bash
cd /Users/deepsight/code/urbane-ethos
git add assets/css/components.css
git commit -m "style(header): hide EN/BM toggle while BM is deferred"
```

---

### Task 3: Gate the two BM-dependent smoke assertions

Both smoke pages are browser-runnable and self-asserting. They must not be deleted — they are gated on the exported flag so they re-arm automatically when BM ships.

**Files:**
- Modify: `test/smoke/i18n.html:27-59` (the whole `<script type="module">` block)
- Modify: `test/smoke/enquiry.html:51` (import) and `:396-402` (Ex3.8)

- [ ] **Step 1: Rewrite the `test/smoke/i18n.html` script block**

Replace the entire block from `<script type="module">` (line 27) through `</script>` (line 59) with:

```html
<script type="module">
import { LOCALES_ENABLED, getLocale, setLocale, t } from "/assets/js/i18n.js";

async function check(name, fn) {
  const li = document.createElement("li");
  try {
    await fn();
    li.textContent = `PASS — ${name}`;
    li.style.color = "var(--color-success)";
  } catch (e) {
    li.textContent = `FAIL — ${name}: ${e.message}`;
    li.style.color = "var(--color-error)";
  }
  document.getElementById("assertions").append(li);
}

function skip(name, why) {
  const li = document.createElement("li");
  li.textContent = `SKIP — ${name}: ${why}`;
  li.style.color = "var(--color-ink-muted)";
  document.getElementById("assertions").append(li);
}

(async () => {
  await setLocale("en");
  await check("EN hero title is a non-empty string", async () => {
    const v = await t("home.hero.title");
    if (typeof v !== "string" || !v.length) throw new Error(`got ${JSON.stringify(v)}`);
  });

  if (LOCALES_ENABLED) {
    await setLocale("ms");
    await check("BM hero title differs from EN", async () => {
      const en = await t("home.hero.title", "en");
      const ms = await t("home.hero.title", "ms");
      if (en === ms) throw new Error("EN == MS — translation missing?");
    });
    await check("html lang attribute updates", async () => {
      if (document.documentElement.lang !== "ms") throw new Error(document.documentElement.lang);
    });
  } else {
    skip("BM hero title differs from EN", "LOCALES_ENABLED is false (BM-DEFERRED)");
    skip("html lang attribute updates", "LOCALES_ENABLED is false (BM-DEFERRED)");

    // These three assert the deferral itself. They are the inverse of the block
    // above and are skipped once BM ships.
    await check("BM-DEFERRED: a stored 'ms' still resolves to en", async () => {
      localStorage.setItem("urbane-ethos:locale", "ms");
      try {
        if (getLocale() !== "en") throw new Error(`getLocale()=${getLocale()}`);
      } finally {
        localStorage.removeItem("urbane-ethos:locale");
      }
    });
    await check("BM-DEFERRED: setLocale('ms') is a no-op", async () => {
      await setLocale("ms");
      if (getLocale() !== "en") throw new Error(`getLocale()=${getLocale()}`);
      if (document.documentElement.lang !== "en") throw new Error(document.documentElement.lang);
    });
    await check("BM-DEFERRED: the toggle is not displayed", async () => {
      const el = document.querySelector(".locale-toggle");
      if (!el) throw new Error("no .locale-toggle in the fixture");
      const display = getComputedStyle(el).display;
      if (display !== "none") throw new Error(`display=${display}`);
    });
  }
})();
</script>
```

Note: `localStorage` is written directly here on purpose. This is a smoke fixture asserting against the raw storage key, and `test/smoke/enquiry.html` already does the same — the `storage.js`-only rule governs `assets/js/`, not `test/`.

- [ ] **Step 2: Add the flag to the `test/smoke/enquiry.html` imports**

Find line 51:

```js
import { t } from "/assets/js/i18n.js";
```

Replace with:

```js
import { t, LOCALES_ENABLED } from "/assets/js/i18n.js";
```

- [ ] **Step 3: Re-point Ex3.8 at the deferral guarantee**

Find:

```js
    await check("Ex3.8 locale is reported and defaults to en", () => {
      seedSources({});
      eq(readInterest().locale, "en", "locale with no stored preference");
      localStorage.setItem("urbane-ethos:locale", "ms");
      eq(readInterest().locale, "ms", "locale after setting ms");
      return 'en → ms, read raw (no JSON decode)';
    });
```

Replace with:

```js
    await check("Ex3.8 locale is reported and defaults to en", () => {
      seedSources({});
      eq(readInterest().locale, "en", "locale with no stored preference");
      localStorage.setItem("urbane-ethos:locale", "ms");
      if (LOCALES_ENABLED) {
        eq(readInterest().locale, "ms", "locale after setting ms");
        return 'en → ms, read raw (no JSON decode)';
      }
      // BM-DEFERRED: getLocale() rejects every non-EN locale while BM is deferred,
      // so a stored "ms" must not reach the enquiry payload. This is a direct test
      // of the shipped guarantee; it inverts automatically when the flag flips.
      eq(readInterest().locale, "en", "stored ms is ignored while BM is deferred");
      return 'en; stored "ms" ignored (BM-DEFERRED)';
    });
```

This stays a single `check()` call, so the page's assertion count is unchanged. (Note: the page has **48** `await check(` calls. `CLAUDE.md:43` says "54 assertions" — that figure is stale and predates this plan. Do not "correct" the code to match it; Task 4 Step 3b corrects the doc instead.)

- [ ] **Step 4: Verify statically**

Run:

```bash
cd /Users/deepsight/code/urbane-ethos
grep -c "await check(" test/smoke/enquiry.html
```

Expected: `48` — unchanged from before this task. The edit converts one check's body; it must not add or remove a check.

```bash
grep -n "LOCALES_ENABLED" test/smoke/i18n.html test/smoke/enquiry.html
```

Expected: 2 hits in `i18n.html` (import + `if`), 2 hits in `enquiry.html` (import + `if`).

- [ ] **Step 5: Commit**

```bash
cd /Users/deepsight/code/urbane-ethos
git add test/smoke/i18n.html test/smoke/enquiry.html
git commit -m "test(smoke): gate BM assertions on LOCALES_ENABLED"
```

---

### Task 4: Update the docs

**Files:**
- Modify: `README.md:112` (Pre-launch flags bullet) and `README.md:158` (Out of scope bullet)
- Modify: `CLAUDE.md` (Content / i18n section)
- Modify: `docs/HANDOVER.md` (header date + new entry)

- [ ] **Step 1: `README.md` — Pre-launch flags**

Find this bullet under `### Pre-launch flags`:

```markdown
- **BM** is machine-generated (`reviewedBy: null`) and unreviewed.
```

Replace with:

```markdown
- **BM is deferred and not served.** The translations are machine-generated (`reviewedBy: null`) and unreviewed, so as of 2026-08-14 the site is **English-only**: `LOCALES_ENABLED = false` in `assets/js/i18n.js` narrows the accepted locale set to `{en}` (a stored `"ms"` no longer validates, and `setLocale("ms")` is a no-op), and one rule in `assets/css/components.css` hides the EN/BM toggle on all 46 pages that carry it. `content/ms/*.json` and the `bin/check-i18n-parity.rb` CI gate are untouched, so translation work continues against a live guardrail. Reversal: `grep -rn BM-DEFERRED` → flip one boolean, delete one CSS rule. See `docs/superpowers/specs/2026-08-14-defer-bm-locale-design.md`.
```

- [ ] **Step 2: `README.md` — Out of scope**

Find:

```markdown
- BM human + legal review (especially `privacy.html`)
```

Replace with:

```markdown
- BM human + legal review (especially `privacy.html`) — **prerequisite for flipping `LOCALES_ENABLED` back on**
```

- [ ] **Step 3: `CLAUDE.md` — Content / i18n section**

Find this paragraph in the `### Content / i18n` section:

```markdown
`content/ms/*.json` currently all carry `_meta.reviewedBy: null` — Bahasa Malaysia translations are machine-generated with the glossary applied. **`privacy.html` MS especially needs human + legal review before launch.**
```

Replace with:

```markdown
`content/ms/*.json` currently all carry `_meta.reviewedBy: null` — Bahasa Malaysia translations are machine-generated with the glossary applied. **`privacy.html` MS especially needs human + legal review before launch.**

**BM is deferred — the site is English-only (2026-08-14).** `assets/js/i18n.js` exports `LOCALES_ENABLED = false`; `activeLocales()` narrows the accepted set to `{en}`, so `getLocale()` rejects a stored `"ms"`, `setLocale("ms")` early-returns, and `initLocaleToggle()` does not bind. `assets/css/components.css` hides `.locale-toggle` (covering all 46 pages that carry it plus `content/blog/_post.html.erb` without a markup edit). Both sites are tagged `BM-DEFERRED` — `grep -rn BM-DEFERRED` finds them.

Consequences to keep in mind: **do not "fix" a BM string not rendering** — that is the flag, not a bug. `test/smoke/i18n.html` reports its two BM assertions as SKIP and runs three deferral assertions instead; `test/smoke/enquiry.html` Ex3.8 asserts a stored `"ms"` still reports `"en"`. Both branch on the exported flag and re-arm on flip. `content/ms/*.json` and the parity gate are deliberately untouched — **keep translating and keep the gate green.**
```

- [ ] **Step 3b: `CLAUDE.md` — correct the stale assertion count**

`CLAUDE.md:43` states `test/smoke/enquiry.html` has "54 assertions". The file
actually has **48** `await check(` calls; the figure predates this work and would
mislead a future agent into thinking the suite regressed. Approved as an in-scope
fix since this task already edits the file.

Find, on line 43:

```markdown
`test/smoke/enquiry.html` is the one that self-asserts (54 assertions; every line must read PASS).
```

Replace with:

```markdown
`test/smoke/enquiry.html` is the one that self-asserts (48 `check()` calls; every line must read PASS and the summary must render in its `ok` state). Verify the count with `grep -c 'await check(' test/smoke/enquiry.html` rather than trusting this number — it was stated as 54 for several builds and was wrong.
```

Do **not** change any assertion in `test/smoke/enquiry.html` to match either number.

- [ ] **Step 3c: `assets/js/i18n.js` — correct the singular "rule"**

The Task 1 comment says "delete the matching `.locale-toggle` rule in
assets/css/components.css" — singular. Task 2 shipped **two** rules (see its
amendment note). Find, in the `BM-DEFERRED` block near the top of
`assets/js/i18n.js`:

```js
// To ship BM: flip this to true and delete the matching `.locale-toggle` rule in
// assets/css/components.css. `grep -rn BM-DEFERRED` finds both sites.
```

Replace with:

```js
// To ship BM: flip this to true and delete the two matching `.locale-toggle`
// rules in assets/css/components.css (a single-class rule plus a
// `.header-tools` two-class rule — both are load-bearing; that file's comment
// explains why). `grep -rn BM-DEFERRED` finds both sites.
```

Change nothing else in `i18n.js`.

- [ ] **Step 4: `docs/HANDOVER.md` — header date**

Find line 3:

```markdown
**Last updated:** 2026-08-09 (enquiry capture + contact channels; GitHub target: `Kintsugi-Design/urbane-ethos`)
```

Replace with:

```markdown
**Last updated:** 2026-08-14 (BM deferred — site is English-only; GitHub target: `Kintsugi-Design/urbane-ethos`)
```

- [ ] **Step 5: `docs/HANDOVER.md` — new entry**

Insert this section immediately after the `---` that follows the header block (i.e. **above** the `## Enquiry capture, pre-fill, and contact channels — landed 2026-08-09` heading), so the newest entry is first:

```markdown
## BM deferred — English-only — landed 2026-08-14

Spec: `docs/superpowers/specs/2026-08-14-defer-bm-locale-design.md`.
Plan: `docs/superpowers/plans/2026-08-14-defer-bm-locale.md`.

**Why.** Every `content/ms/*.json` carries `_meta.reviewedBy: null` — the BM strings are machine-generated with the glossary applied and have had no human or legal review. `privacy.html` MS is a legal surface. A visible EN/BM toggle was inviting visitors into unreviewed copy. BM ships when the translation work is properly done.

**What changed — two lines and their comments.**
- `assets/js/i18n.js` exports `LOCALES_ENABLED = false`. A new `activeLocales()` helper returns `{en}` while the flag is off, and `getLocale()` / `setLocale()` test against it instead of `SUPPORTED`. `SUPPORTED` still lists both locales — the BM path is described, not deleted. `initLocaleToggle()` early-returns.
- `assets/css/components.css` hides `.locale-toggle`.

**Why the lock is in `getLocale()`, not only in CSS.** Locale resolution happens in JS, in three layers: the **inline render script in all 46 pages** that carry the toggle imports `getLocale()` to choose `content/<locale>/`; `chatbot.js`, `map-embed.js` and `enquiry.js` import it directly; and `nav.js`, `consent.js`, `yt-embed.js` reach it through the `t()` / `translatePage()` default argument. The locale persists in `localStorage` under `urbane-ethos:locale`. Hiding the toggle alone would have stranded any visitor who picked BM on an earlier visit on a fully-BM site (copy, chatbot script, map facade labels) with **no visible way back to English**. The stored key is deliberately *not* cleared: it is inert while the flag is off, and it restores the visitor's preference when BM ships.

**Why CSS, not a markup edit.** The toggle appears in 46 files — 8 non-blog production pages plus all 38 generated `post-*.html` — and in `content/blog/_post.html.erb`. One rule covers all of them with no flash before the module executes, and `display: none` removes both buttons from the tab order and the accessibility tree, so the axe-core 0-violation ratchet is unaffected.

**Tests are gated, not deleted.** `test/smoke/i18n.html` reports its two BM assertions as SKIP and adds three assertions that the deferral holds (stored `"ms"` → `"en"`; `setLocale("ms")` is a no-op; the toggle computes to `display: none`). `test/smoke/enquiry.html` Ex3.8 now asserts a stored `"ms"` still reports `"en"` — a direct test of the shipped guarantee — and the page stays at 54 assertions. Both branch on the exported flag, so they invert automatically on flip.

**Untouched on purpose.** `content/ms/*.json`, `content/en/*.json`, `bin/check-i18n-parity.rb`, both CI pipelines, all 46 HTML pages, the blog ERB, and `assets/css/motion.css`. Translation work continues against a live parity gate.

**To ship BM.** Precondition: `content/ms/*.json` carry a non-null `_meta.reviewedBy`, and `privacy.html` MS has had legal review. Then `grep -rn BM-DEFERRED` → set `LOCALES_ENABLED = true`, delete the `.locale-toggle { display: none }` rule. The gated smoke assertions re-arm on their own.

---
```

- [ ] **Step 6: Verify the docs**

Run:

```bash
cd /Users/deepsight/code/urbane-ethos
grep -rn "BM-DEFERRED" --include="*.md" --include="*.js" --include="*.css" --include="*.html" .
```

Expected: at least one hit in **each** of `assets/js/i18n.js`, `assets/css/components.css`, `test/smoke/i18n.html`, `test/smoke/enquiry.html`, `CLAUDE.md`, `README.md`, `docs/HANDOVER.md`, plus the spec and this plan under `docs/superpowers/`.

Expected: **zero** hits under `content/` and **zero** hits in any root `*.html` page — the marker documents code we changed, and we changed no page markup and no content. Verify that explicitly:

```bash
grep -rln "BM-DEFERRED" content/ *.html 2>/dev/null; echo "leak check exit=$?"
```

Expected: no filenames printed (`exit=1`).

- [ ] **Step 7: Commit**

```bash
cd /Users/deepsight/code/urbane-ethos
git add README.md CLAUDE.md docs/HANDOVER.md
git commit -m "docs: record BM deferral and the LOCALES_ENABLED reversal path"
```

---

### Task 5: Full verification sweep

This task runs the real gates and the browser smoke pages. **Do not mark the work complete until every expected output below is observed.** Report actual output, not a summary.

**Files:** none modified (unless a check fails).

- [ ] **Step 1: Run both CI gates, in pipeline order**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/check-i18n-parity.rb; echo "parity exit=$?"
ruby bin/check-contact-channels.rb; echo "channels exit=$?"
```

Expected: `parity exit=0` and `channels exit=0`. Neither should have been affected — if parity fails, `content/` was touched and must be reverted.

- [ ] **Step 2: Confirm no page markup or content changed**

```bash
cd /Users/deepsight/code/urbane-ethos
git diff --name-only HEAD~4 HEAD
```

Expected file list, exactly: `README.md`, `CLAUDE.md`, `assets/css/components.css`, `assets/js/i18n.js`, `docs/HANDOVER.md`, `test/smoke/enquiry.html`, `test/smoke/i18n.html`. **No root `*.html`, no `content/**`, no workflow file.**

- [ ] **Step 3: Confirm the toggle markup is still intact (we hid it, we did not remove it)**

```bash
cd /Users/deepsight/code/urbane-ethos
grep -l "data-locale-set" *.html | wc -l
grep -c "locale-toggle" content/blog/_post.html.erb
```

Expected: `46` and `2`.

- [ ] **Step 4: Start the dev server**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server
```

Expected: serving on http://localhost:8080. Leave it running for the browser steps.

- [ ] **Step 5: Browser — `test/smoke/i18n.html`**

Open `http://localhost:8080/test/smoke/i18n.html`.

Expected, in order:
1. `PASS — EN hero title is a non-empty string`
2. `SKIP — BM hero title differs from EN: LOCALES_ENABLED is false (BM-DEFERRED)`
3. `SKIP — html lang attribute updates: LOCALES_ENABLED is false (BM-DEFERRED)`
4. `PASS — BM-DEFERRED: a stored 'ms' still resolves to en`
5. `PASS — BM-DEFERRED: setLocale('ms') is a no-op`
6. `PASS — BM-DEFERRED: the toggle is not displayed`

**Six list items must render.** Zero rendered items means the module import threw — that is the known failure mode this repo has been bitten by before (see CLAUDE.md § content fetch gotcha). Check the browser console before concluding anything.

- [ ] **Step 6: Browser — `test/smoke/enquiry.html`**

Open `http://localhost:8080/test/smoke/enquiry.html`.

Expected: the `#summary` line renders in its **`ok`** (green) state with **zero** failures and zero uncaught errors — i.e. it must NOT read `N FAILURE(S) — …`. Every assertion line reads PASS. Ex3.8 should read `PASS — Ex3.8 locale is reported and defaults to en` with the detail `en; stored "ms" ignored (BM-DEFERRED)`.

Record the pass count the summary reports. It must match the count from a pre-change run — the edit converts one check's body and adds none.

- [ ] **Step 7: Browser — the stored-`ms` visitor scenario (the whole point of the change)**

Open `http://localhost:8080/index.html`. In the console:

```js
localStorage.setItem("urbane-ethos:locale", "ms");
location.reload();
```

After reload, verify in the console:

```js
document.documentElement.lang                                        // "en"
document.querySelectorAll(".locale-toggle").length                   // 2 (present in DOM)
getComputedStyle(document.querySelector(".locale-toggle")).display   // "none"
document.querySelector("[data-locale-set]").offsetParent             // null (not rendered)
```

Then visually confirm: hero copy is English, **no EN/BM control anywhere in the header** (desktop *and* below 768px — the toggle exists in both `.nav-tools` and `.header-tools`), the chatbot opens in English, and the map facade's "Load map" button is English.

- [ ] **Step 8: Browser — the other header variants**

With `urbane-ethos:locale` still set to `ms`, confirm no toggle and English copy on:
- `http://localhost:8080/privacy.html` — carries its own reduced header variant
- `http://localhost:8080/post-year-end-promo.html` — a generated blog page
- `http://localhost:8080/careers.html` — direct-URL only, still has the toggle markup

Then clean up: `localStorage.removeItem("urbane-ethos:locale")`.

- [ ] **Step 9: Tab-order check**

On `http://localhost:8080/index.html`, press Tab from the address bar and walk the header. Expected: focus goes skip-link → brand → nav links → **text-size button** → Book Now. The EN and BM buttons must **never** receive focus.

- [ ] **Step 10: axe-core spot-check**

```bash
cd /Users/deepsight/code/urbane-ethos
npx -y @axe-core/cli "http://localhost:8080/index.html" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
npx -y @axe-core/cli "http://localhost:8080/privacy.html" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
```

Expected: **0 violations** on both. If ChromeDriver errors, see `docs/A11Y_NOTES.md` § "Tooling" — a driver mismatch is a tooling failure, not a result; do not report it as a pass.

- [ ] **Step 11: Stop the server and report**

Stop `bin/server`. Report the actual observed output of every step above — the two gate exit codes, the six i18n smoke lines, the enquiry PASS count, and the four console values from Step 7.

---

## Rollback

The change is four commits touching seven files. To revert entirely:

```bash
cd /Users/deepsight/code/urbane-ethos
git revert --no-commit HEAD~4..HEAD
git commit -m "revert: restore EN/BM toggle"
```

To keep the work but re-enable BM (the intended future path), do **not** revert — follow "To ship BM" in `docs/HANDOVER.md`.
