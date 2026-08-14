# Defer BM — English-only until translations are reviewed

**Date:** 2026-08-14
**Status:** Approved, pending implementation
**Reversal marker:** `BM-DEFERRED`

## Problem

The prototype ships an EN/BM locale toggle in the header of 46 pages. Every
`content/ms/*.json` file carries `_meta.reviewedBy: null` — the Bahasa Malaysia
strings are machine-generated with the glossary applied and have had no human
or legal review. `privacy.html` MS in particular is a legal surface.

Shipping a visible BM toggle invites visitors into unreviewed copy. BM should
come back only when the translation work is properly done.

## Goal

The site serves English only, with no user-visible path to BM, while BM content
and its CI guardrail stay intact so translation work continues.

Reversal must be cheap: one boolean and one CSS rule.

## Non-goals

- Deleting or degrading `content/ms/*.json`.
- Removing the i18n machinery, the `data-i18n` attributes, or the `ms` branch
  of `resolve()`'s fallback.
- Removing the `bin/check-i18n-parity.rb` gate from CI.
- Editing any of the 46 HTML pages or `content/blog/_post.html.erb`.

## Why the lock belongs in `getLocale()`, not in CSS alone

Locale resolution happens in JS, in three layers. The **inline render script in
all 46 pages** that carry the toggle imports `getLocale()` to choose
`content/<locale>/`. Three modules import it directly. Three more reach it via
the `t()` / `translatePage()` default argument:

| Consumer | How it reads the locale | Use |
|---|---|---|
| inline render script, ×46 pages | imports `getLocale` | fetches `content/<locale>/` for the page's own render |
| `chatbot.js` | imports `getLocale` | fetches `content/<locale>/chatbot.json`; sets `ms-MY` on TTS and speech recognition |
| `map-embed.js` | imports `getLocale` | fetches `content/<locale>/common.json` for facade labels |
| `enquiry.js` | imports `getLocale` | reports `locale` in the composed enquiry payload |
| `nav.js` | `t()` default arg | re-syncs the hamburger `aria-label` on `i18n:changed` |
| `consent.js` | `translatePage()` / `t()` defaults | rebuilds the consent panel on `i18n:changed` |
| `yt-embed.js` | `t()` default arg | localises the iframe `title` |

The locale is persisted in `localStorage` under `urbane-ethos:locale`. A visitor
who selected BM on an earlier visit therefore keeps it. Hiding only the toggle
would strand that visitor on a fully-BM site — copy, chatbot, map labels — with
no visible way back to English. The lock has to sit where the locale is
resolved.

## Design

### 1. Single switch in `assets/js/i18n.js`

```js
// BM-DEFERRED — BM ships once translations are reviewed. Flip to true to restore.
export const LOCALES_ENABLED = false;

const SUPPORTED = new Set(["en", "ms"]);

function activeLocales() {
  return LOCALES_ENABLED ? SUPPORTED : new Set([DEFAULT_LOCALE]);
}
```

`getLocale()` and `setLocale()` test membership against `activeLocales()`
instead of `SUPPORTED`. Everything else falls out of that one substitution:

- A stored `"ms"` no longer validates, so `getLocale()` returns `"en"`. Every
  consumer in the table above follows automatically.
- `setLocale("ms")` early-returns, so there is no programmatic path to BM
  either.
- `translatePage()` sets `document.documentElement.lang` from `getLocale()`,
  so the document language attribute stays `en`.

`SUPPORTED` keeps both locales. The BM path is described, not deleted.

`initLocaleToggle()` early-returns when the flag is off rather than binding
click handlers to buttons that are not rendered.

**Deliberately not done:** the stored `urbane-ethos:locale` key is not cleared.
It is inert while the flag is off, and it restores a visitor's preference when
BM ships.

### 2. One CSS rule in `assets/css/components.css`

```css
/* BM-DEFERRED — see LOCALES_ENABLED in assets/js/i18n.js */
.locale-toggle { display: none; }
```

Inside `@layer components`, adjacent to the existing `.locale-toggle` block.

CSS rather than a JS-applied `hidden` attribute, for three reasons:

1. No flash of the toggle before the ES module executes.
2. It covers all 46 pages that carry the toggle — 8 non-blog production pages
   (`index`, `about`, `staff`, `services`, `blog`, `contact`, `privacy`,
   `careers`) plus all 38 generated `post-*.html` — and
   `content/blog/_post.html.erb`, without editing markup. `analytics.html` and
   `404.html` have no toggle to begin with.
3. `display: none` removes both buttons from the tab order and from the
   accessibility tree, so the axe-core 0-violation ratchet is unaffected.

The `.locale-toggle [aria-pressed="true"]` animation in `motion.css` becomes
dead but harmless. It stays for the flip back.

### 3. Two smoke assertions gated, not deleted

Both import `LOCALES_ENABLED` from `i18n.js` and branch on it, so they report
SKIP now and re-arm automatically when the flag flips.

- **`test/smoke/i18n.html`** — the `setLocale("ms")` block. Under the flag it
  reports SKIP with the reason.
- **`test/smoke/enquiry.html` Ex3.8** — currently writes `"ms"` to
  `urbane-ethos:locale` and asserts `readInterest().locale === "ms"`. It is
  rewritten to assert that a stored `"ms"` still reports `"en"` while BM is
  deferred. That is a direct test of the shipped guarantee. It converts one
  existing check rather than adding one, so the page's assertion count is
  unchanged and every line still reads PASS.

  (Counting note, verified in-browser: the page renders **54** assertions from
  **48** `await check(` call sites — several checks sit inside `for` loops, so
  call sites do not equal assertions. `CLAUDE.md`'s long-standing "54" was the
  runtime figure and was correct; an earlier revision of this spec wrongly
  called it stale.)

### 4. Untouched

`content/ms/*.json`, `content/en/*.json`, `bin/check-i18n-parity.rb`,
`.github/workflows/pages.yml`, and `.gitlab-ci.yml` are unchanged. Translation
work continues against a live parity gate.

No HTML file and no content file is edited.

## Files changed

| File | Change |
|---|---|
| `assets/js/i18n.js` | `LOCALES_ENABLED` flag, `activeLocales()` helper, two call-site swaps, `initLocaleToggle()` early return |
| `assets/css/components.css` | one `.locale-toggle { display: none }` rule |
| `test/smoke/i18n.html` | gate the BM block on the flag |
| `test/smoke/enquiry.html` | Ex3.8 re-pointed at the deferral guarantee |
| `README.md` | note under "What's real vs draft vs mocked" |
| `CLAUDE.md` | note in the Content / i18n section |
| `docs/HANDOVER.md` | current-state entry |

## Verification

1. `bin/check-i18n-parity.rb` exits 0.
2. `ruby bin/check-contact-channels.rb` exits 0.
3. `test/smoke/enquiry.html` — summary line in its `ok` state, zero failures,
   zero uncaught errors, every line PASS.
4. `test/smoke/i18n.html` — renders assertions (non-zero), EN assertions PASS,
   BM block SKIP.
5. Manual, in `bin/server`: on `index.html`, `localStorage.setItem(
   "urbane-ethos:locale", "ms")` then reload. Expected: page renders EN,
   `document.documentElement.lang === "en"`, no toggle visible anywhere in the
   header, chatbot opens in EN, map facade label in EN.
6. `grep -rn "BM-DEFERRED"` returns exactly the intended sites.
7. Toggle absent on a generated blog page (`post-year-end-promo.html`) as well
   as on `privacy.html`, which carries its own header variant.
8. axe-core spot-check on `index.html` and `privacy.html` — still 0 violations.

## Restoring BM

1. `grep -rn "BM-DEFERRED"` to find both sites.
2. Set `LOCALES_ENABLED = true` in `assets/js/i18n.js`.
3. Delete the `.locale-toggle { display: none }` rule from
   `assets/css/components.css`.
4. Re-run the two smoke pages; the gated assertions re-arm on their own.

Precondition for the flip: `content/ms/*.json` carry a non-null
`_meta.reviewedBy`, and `privacy.html` MS has had legal review.
