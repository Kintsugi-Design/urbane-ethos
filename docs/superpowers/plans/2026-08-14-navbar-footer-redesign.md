# Navbar & Footer Redesign — Implementation Plan (2026-08-14)

## Context

The Claude Design canvas "Navbar & Footer.dc.html" (frames: 1a Mobile 390, 1b Tablet 834, 1c Desktop 1440) redesigns the site chrome: the real Urbane Ethos logo mark enters the header brand and a new footer brand block, the footer gains icon contact rows, restructured hours, raised contrast, bigger link targets, and loses the "Analytics demo" link. The mark is already on disk at `assets/img/ue-logo.png` (117×111 RGBA PNG — never redraw/recolour it).

Verified current state (read during planning, 2026-08-14):

- **Full chrome** (hamburger header + 4-column footer grid) exists in 7 hand-edited pages — `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `careers.html` — plus `content/blog/_post.html.erb`, which generates all 38 `post-*.html` (including `post-year-end-promo.html`). **Never hand-edit `post-*.html`.**
- **Reduced chrome**: `privacy.html` (brand + locale-toggle header; 3-link footer, no grid/hours), `analytics.html` (brand-only header, **no footer**), `404.html` (brand + static nav header, script-free 2-line footer). The research claim "header identical in all 48 pages" is **wrong** for these three — their headers are cut-down variants; only the brand block inside them is in scope.
- The brand `<small>` in the 7 full pages + ERB carries `data-i18n="home.hero.title"` (renders "Urbane Ethos Early Intervention Center" — the defect). `privacy.html`'s brand small carries `data-i18n="common.nav.about"` — a second, worse instance of the same defect (translates to "About").
- Footer hours are rendered by near-identical inline script in 8 places (`index.html` via a `fmtUl` helper at lines 393–398; `about.html` lines 183–192; `staff.html` 242–243; `services.html` 246–247; `blog.html` 185–186; `contact.html` 485–486; `careers.html` 157–158; ERB 158–161). In every one of these scripts the fetched `common` object is used **only** for footer hours (verified by grep), so the fetch goes away with the inline renderer.
- `common.footer.analyticsDemo` is consumed only by the footer `<li>` in those 8 places (45 files counting generated posts). No test, JS module, or gate references it.
- Relevant existing CSS verified in `assets/css/components.css`: header bar background/blur/border (lines 3–8) **already match** the spec (`--color-cream-soft` is `#FFFFFF`, so `color-mix(... 92%, transparent)` = `rgba(255,255,255,0.92)`); `.header-row` horizontal padding comes from `.wrap` (24px → 32px at 768px — already matches); desktop `.nav-list` gap/padding/min-block-size and the `.fs-toggle` pill (lines 160–179) **already match** the spec. `.btn--primary` already carries the exact violet shadow `0 10px 26px -10px var(--color-primary)` (line 239). None of these need edits.
- Token names verified in `assets/css/tokens.css`: `--space-1..32` (8px ramp; **no token for 10px, 14px, 18px, 28px**), `--radius-pill: 999px`, `--color-cream: #F4F0FB`, `--color-cream-soft: #FFFFFF`, `--color-ink`, `--color-ink-muted`, `--color-primary`, `--color-primary-deep`, `--color-line`, `--font-serif`, `--font-sans`, `--type-small: 0.875rem`, `--tracking-loose: 0.15em`, `--bp-md: 768px`, `--bp-lg: 1024px` (bp tokens are documentation only — media queries use literals).
- Working tree note: `index.html` and `content/en/home.json` already carry uncommitted edits. Work on top of them; do not revert anything you didn't change.

## Goal

Ship the redesigned header brand (logo mark + corrected tagline key + responsive CTA label) and the redesigned footer (brand block with logo plate, icon contact rows with a `tel:` link, label/value hours, i18n'd column headings, no Analytics-demo link, raised contrast, explicit responsive grids) across all 11 edit sites, with the duplicated footer-hours inline script replaced by one shared ESM module — all gates green, axe ratchet intact, BM still deferred.

## Non-goals

- No change to the hamburger toggle (spec §9: stays exactly as-is), nav panel behaviour, `nav.js`, `a11y.js`, `i18n.js`, `consent.js`, `enquiry.js`, `storage.js`.
- No unhiding of `.locale-toggle` (both BM-DEFERRED rules stay byte-identical).
- No edits to `design/directions/**`, `test/**`, `bin/check-*.rb`, deploy workflows.
- No new tokens in `tokens.css` (decision below). No restructuring of `content/*/common.json` `footer.hours` (decision below).
- `analytics.html` and the reduced footers of `privacy.html`/`404.html` keep their reduced structure — only their brand blocks (and inherited footer CSS) change.
- The article-body "Book Now" button in the ERB (line 101) keeps its existing key — only the *header* CTA changes.

## Decisions (delegated judgment calls — resolved)

1. **CSS strategy: new BEM-ish footer classes, replacing the generic rules in place.** The footer restructure introduces `.footer-grid`, `.footer-col`, `.footer-col--brand`, `.footer-col--hours`, `.footer-brand`, `.footer-brand-plate`, `.footer-brand-name`, `.footer-contact`, `.footer-line`, `.footer-line--address`, `.footer-hours`(+`-day`/`-time`/`-note`), `.footer-links`, `.footer-links--site`. The old generic `.site-footer .grid` / `.site-footer ul` / `.site-footer li` / `.footer-wordmark` rules are **deleted** (grep-verified: nothing else in `assets/`, `test/`, or `base.css` consumes them). Generic `.site-footer p/a/h4` rules stay (privacy/404 reduced footers depend on them) with updated values. Everything stays inside the existing `/* Footer */` region of `@layer components` — one region, no drift.
2. **Hours: split in JS, in a new shared module `assets/js/footer-hours.js`.** Content JSON stays verbatim flat strings. Justification: (a) `index.html` already splits `home.location.hours` on `": "` into `hour-label`/`hour-value` rows — this is the established repo pattern, not an invention; (b) both locales share the shape (`"Monday: 12PM – 5PM"` / `"Isnin: 12PM – 5PM"`), and both no-colon closed lines (`"Closed Sunday & Public Holidays"` / `"Tutup pada hari Ahad & Cuti Umum"`) fall out naturally as the muted note; (c) restructuring JSON would touch 2 content files + the parity fixtures' mental model for zero benefit and would break the scraped-verbatim provenance of the EN strings. The module is the **single** implementation, closing the 8-way duplication defect. Exported API: `renderFooterHours()` (async, no args — resolves hours via `i18n.t("common.footer.hours")`, which is cached, locale-aware, and `import.meta.url`-safe). Self-boots at module load and re-renders on `i18n:changed`. **Import anchor: insert `import "./assets/js/footer-hours.js";` immediately after the `import "./assets/js/a11y.js";` line** — all 8 importing scripts (7 pages + ERB) have a11y.js, so the canggih anchor convention applies unmodified. It is **not** a canggih module: expected import count is **8 of the 10 production pages** (analytics/privacy have no `#footer-hours`; the module no-ops defensively anyway).
3. **No new tokens.** The footer tints are `color-mix(in srgb, var(--color-cream) N%, transparent)` — `--color-cream` is exactly `#F4F0FB` = `rgb(244,240,251)`, so the canvas's `rgba(244,240,251,0.92/0.72/0.62/0.16)` map 1:1 to mixes at 92/72/62/16%, matching the *existing* footer idiom (currently 82/58/16%). These are static values, never animated — the color-mix perf rule (never animate a color-mix'd paint property) is not triggered; the only transitioning footer property is link `color`, whose endpoints are the plain tokens `--color-cream` → `--color-cream-soft` (`#F4F0FB` → `#FFFFFF`, exactly the canvas hover pair). Values with no token match stay as literals: `0.625rem` (10px), `0.875rem` (14px), `1.125rem` (18px CTA padding), `1.75rem` (28px mobile stack gap), `2px`, logo/plate pixel sizes, `ch` clamps. Each appears in one place; a token would be noise.
4. **Responsive CTA label: two sibling `<span>`s toggled by `display:none`.** `display:none` removes the hidden span from the accessibility tree, so screen readers announce exactly one label; no JS, no `aria-hidden` juggling, no `::before` content (which would break i18n textContent swaps). Swap point 768px (see breakpoint mapping).
5. **`common.footer.analyticsDemo` is DELETED from both `content/en/common.json` and `content/ms/common.json`.** After the redesign it has zero consumers (grep-verified — only historical plan docs and a dated TSV export mention it, neither is executable), and an orphan key is an invitation to re-add the link. Symmetric deletion keeps parity green. `analytics.html` itself stays on disk, reachable by direct URL (same treatment as `careers.html`).
6. **New i18n keys** (all in the `common` namespace; MS per `content/glossary.md` — "Center/Centre → Pusat", "Early Intervention → Intervensi Awal"):
   - `common.brand.tagline` — EN `"Early Intervention Center"`, MS `"Pusat Intervensi Awal"`. Fixes the header-brand defect *and* privacy.html's wrong `common.nav.about` binding.
   - `common.footer.siteLabel` — EN `"Site"`, MS `"Laman"`.
   - `common.footer.privacyLabel` — EN `"Privacy"`, MS `"Privasi"` (consistent with existing `footer.privacy` MS "Notis Privasi").
   No `_draft` flags: every `content/ms/*.json` already carries `_meta.reviewedBy: null` (whole-file unreviewed), and these three are glossary-fixed/trivial.
7. **Breakpoint mapping** (canvas frames → repo breakpoints — canvas widths are frame sizes, not breakpoints):
   - 390 frame → **base styles** (mobile-first).
   - 834 frame → **`@media (min-width: 768px)`** (`--bp-md`; the 834 frame is "tablet, still hamburger" — 768 is the repo's tablet tier, and the header's own 880px hamburger threshold stays authoritative for nav layout). Tablet-tier values: logo 40px, brand subtitle visible, CTA long label + 20px padding, footer 3-col grid, 36px link targets, hours as stacked pairs.
   - 1440 frame → **`@media (min-width: 880px)`** for header desktop-tier values (logo 44px, brand gap 14px — tied to the existing hamburger threshold) and **`@media (min-width: 1024px)`** (`--bp-lg`) for the footer 4-col grid and desktop contact-row values.
8. **`tel:` link number is fixed: `tel:+60377343044`.** Derivation, so no implementer invents another: `content/en/contact.json` `phones[0]` is `{"label":"Reception","number":"+603-7734 3044"}`; the E.164 rule (strip non-digits; a leading 0 would get prefix 60 — not needed here) yields `60377343044`; `bin/check-contact-channels.rb` allowlists exactly `tel:+60377343044`. `common.footer.phone1` has the same number, so the visible text and the href agree.
9. **Task split**: content → module → CSS run first (independently); the 11 HTML/ERB edit sites are split into six non-overlapping tasks (Tasks 4–9); docs last. **No two tasks touch the same file.** Task 9 exclusively owns the ERB *and* all 38 generated `post-*.html` (via regeneration).

## Shared traps (repeated inside every task that needs them)

- **`data-i18n` sets `textContent` and destroys child elements.** Any element that now contains an icon span or the logo must NOT carry `data-i18n` itself — the key moves to an inner text-only `<span>`. This is why the new footer address line is `<p><span data-icon>…</span><span data-i18n>…</span></p>`, not `<p data-i18n>`.
- **All paths relative** (`./assets/img/ue-logo.png`), never `/assets/...`.
- Do not touch the two BM-DEFERRED `.locale-toggle` rules (components.css lines ~212 and ~218) or the `#primary-nav`/`.header-tools` locale-toggle markup.
- Preserve `aria-current="page"` on each page's own nav link — brand/CTA/footer replacements must not swallow the `<ul class="nav-list">`.

---

## Task 1 — Content: new keys, delete analyticsDemo

**Files**: `content/en/common.json`, `content/ms/common.json` (ONLY these).

**What to do**:

1. In `content/en/common.json`:
   - Add a new top-level object immediately after the `"locale"` object:
     ```json
     "brand": {
       "tagline": "Early Intervention Center"
     },
     ```
   - Inside the existing `"footer"` object, add (after `"hoursLabel": "Hours",`):
     ```json
     "siteLabel": "Site",
     "privacyLabel": "Privacy",
     ```
   - Delete the line `"analyticsDemo": "Analytics demo"` from `"footer"` (and the trailing comma on the previous line if it becomes last).
2. In `content/ms/common.json`, mirror exactly:
   - After its `"locale"` object:
     ```json
     "brand": {
       "tagline": "Pusat Intervensi Awal"
     },
     ```
   - Inside `"footer"` (after `"hoursLabel": "Waktu operasi",`):
     ```json
     "siteLabel": "Laman",
     "privacyLabel": "Privasi",
     ```
   - Delete `"analyticsDemo": "Demo analitik"`.
3. Do NOT touch `footer.hours`, `_meta`, `_draft`, or anything else. Do not add `_draft` flags for the new MS strings.

**Verification**:
```bash
bin/check-i18n-parity.rb              # exit 0
ruby -rjson -e 'JSON.parse(File.read("content/en/common.json")); JSON.parse(File.read("content/ms/common.json")); puts "json ok"'
grep -rn analyticsDemo content/       # no output
grep -c '"tagline"' content/en/common.json content/ms/common.json   # 1 and 1
```

**Done when**: parity exits 0, both files parse, `analyticsDemo` is gone from `content/`, and `brand.tagline`/`footer.siteLabel`/`footer.privacyLabel` exist in both locales.

---

## Task 2 — New module `assets/js/footer-hours.js`

**Files**: `assets/js/footer-hours.js` (new file; ONLY this).

**What to do**: Create the file with exactly this content:

```js
// Footer opening-hours renderer — the single implementation that replaces the
// near-identical inline scripts previously duplicated across 8 page scripts.
//
// content/{en,ms}/common.json footer.hours is a flat array of verbatim strings.
// Each row splits on the FIRST ": " into a day label + time value (both locales
// share the shape: "Monday: 12PM – 5PM" / "Isnin: 12PM – 5PM"). A string with
// no ": " ("Closed Sunday & Public Holidays" / "Tutup pada hari Ahad & Cuti
// Umum") renders as a full-width muted note. Do NOT restructure the content
// JSON into label/value objects — the strings are scraped verbatim and the
// split-in-JS pattern matches index.html's home.location.hours rendering.
//
// t() resolves through i18n.js: cached per namespace, locale-aware, and URL-
// resolved against import.meta.url — safe at any deploy root.
import { t } from "./i18n.js";

export async function renderFooterHours() {
  const el = document.getElementById("footer-hours");
  if (!el) return; // pages without the full footer (analytics, privacy, 404)
  const hours = (await t("common.footer.hours")) || [];
  el.replaceChildren(...hours.flatMap(s => {
    const i = s.indexOf(": ");
    if (i === -1) {
      const note = document.createElement("span");
      note.className = "footer-hours-note";
      note.textContent = s;
      return [note];
    }
    const day = document.createElement("span");
    day.className = "footer-hours-day";
    day.textContent = s.slice(0, i);
    const time = document.createElement("span");
    time.className = "footer-hours-time";
    time.textContent = s.slice(i + 2);
    return [day, time];
  }));
}

// Module scripts execute after the document is parsed, so #footer-hours exists.
renderFooterHours();
document.addEventListener("i18n:changed", () => renderFooterHours());
```

Notes: no `localStorage` (storage gate untouched); no `fetch` (goes through `i18n.t`, so `grep -rn 'fetch(' assets/js/ | grep -v import.meta.url` stays clean); ESM only.

**Verification**:
```bash
node --input-type=module -e "await import('./assets/js/footer-hours.js').catch(e=>{ if(!/document|window/.test(String(e))) throw e; })" 2>&1 | head -3   # syntax parses (a DOM ReferenceError is acceptable, a SyntaxError is not)
grep -n "localStorage\|sessionStorage" assets/js/footer-hours.js   # no output
ls -1 assets/js/*.js | wc -l   # 17
```

**Done when**: the file exists with the exact renderer + note-splitting semantics above, contains no storage or fetch calls, and `assets/js/` counts 17 modules.

---

## Task 3 — CSS: header brand + CTA, footer overhaul (`components.css`)

**Files**: `assets/css/components.css` (ONLY this).

All edits stay inside `@layer components`. Do NOT touch: the `.site-header` block (lines 3–8, already matches spec), the `.nav-toggle` block (spec: hamburger unchanged), the `.brand { margin-inline-end: auto; }` rule (~line 125) and its 880px reset (~line 135), the two BM-DEFERRED `.locale-toggle` display:none rules (~212, ~218) and their comments, the `.locale-toggle, .fs-toggle` shared pill block (~160–179, already matches spec), or the W2 header-underline opt-out block (~21–35).

**Edit 1 — brand.** Replace the two lines (currently 14–15):
```css
.brand { font-family: var(--font-serif); font-size: 1.125rem; color: var(--color-ink); text-decoration: none; line-height: 1.1; }
.brand small { color: var(--color-ink-muted); font-size: 0.75rem; display: block; }
```
with:
```css
.brand {
  display: flex; align-items: center; gap: 0.625rem;   /* 10px; no --space token */
  font-family: var(--font-serif); font-size: 1.125rem; color: var(--color-ink);
  text-decoration: none; line-height: 1.1; letter-spacing: 0.01em;
}
.brand-mark { width: 34px; height: auto; flex: none; }
.brand-text { display: flex; flex-direction: column; }
.brand-name { white-space: nowrap; }
/* Subtitle hidden on phones (canvas 1a omits it); appears from the tablet tier. */
.brand small { display: none; color: var(--color-ink-muted); font-size: 0.75rem; line-height: 1.4; }
@media (min-width: 768px) {
  .brand { gap: var(--space-3); }        /* 12px */
  .brand-mark { width: 40px; }
  .brand small { display: block; }
}
@media (min-width: 880px) {
  .brand { gap: 0.875rem; }              /* 14px; no --space token */
  .brand-mark { width: 44px; }
}
```

**Edit 2 — header CTA.** Replace the block (currently ~221–225):
```css
.header-tools .btn--primary {
  height: 2.5rem;
  padding: 0 var(--space-5);
  font-size: 0.875rem;
}
```
with:
```css
.header-tools .btn--primary {
  height: 2.5rem;
  padding: 0 1.125rem;      /* 18px on phones; no --space token */
  font-size: 0.875rem;
  white-space: nowrap;
  flex: none;
}
@media (min-width: 768px) {
  .header-tools .btn--primary { padding: 0 var(--space-5); }   /* 20px */
}
/* Responsive CTA label — short "Book Now" on phones, "Book a session" from
   768px. display:none removes the hidden span from the accessibility tree,
   so screen readers announce exactly one label. No JS involved. */
.header-cta .header-cta-label--long { display: none; }
@media (min-width: 768px) {
  .header-cta .header-cta-label--short { display: none; }
  .header-cta .header-cta-label--long { display: inline; }
}
```
(`.btn--primary` already supplies the pill radius, `--color-primary-deep` background, white text, 600 weight, and the `0 10px 26px -10px var(--color-primary)` shadow — add nothing.)

**Edit 3 — delete the stale mobile footer-grid override.** In the `@media (max-width: 640px)` W6.4 block (~line 556–562), delete only this line:
```css
    .site-footer .grid { gap: var(--space-6); }
```

**Edit 4 — footer overhaul.** Replace the whole `/* Footer */` region — from the line `.site-footer { background: var(--color-ink); ...` through the `.site-footer .footer-wordmark { ... }` line inclusive (currently lines ~611–631) — with:

```css
  /* Footer — navbar+footer redesign (2026-08-14 plan).
     Mobile-first: single stacked column with hairline separators.
     ≥768px: 3-col grid; the brand block spans the first row and splits
     internally into brand | contact. ≥1024px: explicit 4-col grid.
     Tints are STATIC color-mix over --color-cream (#F4F0FB = the canvas's
     rgba(244,240,251,…) alphas) — never animated, so the "no animated
     color-mix" perf rule is not in play. Link hover transitions plain
     tokens only (--color-cream → --color-cream-soft). */
  .site-footer { background: var(--color-ink); color: var(--color-cream); padding: var(--space-16) 0 var(--space-8); }
  .site-footer .footer-grid { display: flex; flex-direction: column; gap: 1.75rem; }   /* 28px; no token */
  .footer-col + .footer-col {
    border-top: 1px solid color-mix(in srgb, var(--color-cream) 16%, transparent);
    padding-top: var(--space-6);
  }
  .site-footer h4 {
    font: 600 0.8125rem var(--font-sans);
    letter-spacing: var(--tracking-loose);
    text-transform: uppercase;
    color: color-mix(in srgb, var(--color-cream) 72%, transparent);
    margin: 0 0 var(--space-3);
  }
  .footer-col--hours h4 { margin-bottom: var(--space-4); }
  .site-footer p { margin: 0 0 var(--space-3); line-height: 1.6; color: color-mix(in srgb, var(--color-cream) 92%, transparent); }
  .site-footer a { color: var(--color-cream); }
  .site-footer a:hover { color: var(--color-cream-soft); }

  /* Column 1 — brand block */
  .footer-brand { display: flex; align-items: center; gap: var(--space-3); margin: 0 0 var(--space-4); }
  .footer-brand-plate {
    display: inline-flex; align-items: center; justify-content: center;
    width: 48px; height: 48px; flex: none;
    border-radius: var(--radius-pill); background: var(--color-cream-soft);
  }
  .footer-brand-plate img { width: 30px; height: auto; }
  .footer-brand-name {
    font-family: var(--font-serif); font-size: 1.25rem;
    line-height: 1.15; letter-spacing: 0.01em; color: var(--color-cream);
  }
  .footer-contact { display: flex; flex-direction: column; gap: var(--space-2); }
  .footer-line { display: flex; align-items: center; gap: 0.625rem; margin: 0; }
  .footer-line--address { align-items: flex-start; }
  .footer-line--address [data-icon] { margin-top: 0.2em; }
  .footer-line [data-icon] {
    width: 1.25em; height: 1.25em; flex: none;
    color: color-mix(in srgb, var(--color-cream) 62%, transparent);
  }
  .footer-line a { display: inline-flex; align-items: center; min-block-size: 2.5rem; word-break: break-word; }

  /* Hours — spans injected by assets/js/footer-hours.js */
  .footer-hours { display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-4); align-items: baseline; }
  .footer-hours-day { color: color-mix(in srgb, var(--color-cream) 72%, transparent); }
  .footer-hours-time { color: var(--color-cream); white-space: nowrap; }
  .footer-hours-note { grid-column: 1 / -1; color: color-mix(in srgb, var(--color-cream) 72%, transparent); }

  /* Link columns */
  .footer-links { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
  .footer-links li { margin: 0; }
  .footer-links a { display: inline-flex; align-items: center; min-block-size: 2.5rem; }
  .footer-links--site { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-1) var(--space-4); }

  /* Copyright bar (wordmark removed — it now lives in the brand block) */
  .site-footer .footer-base {
    margin-top: var(--space-12); padding-top: var(--space-6);
    border-top: 1px solid color-mix(in srgb, var(--color-cream) 16%, transparent);
  }
  .site-footer .footer-base p { margin: 0; font-size: var(--type-small); color: color-mix(in srgb, var(--color-cream) 72%, transparent); }

  /* Tablet tier (canvas 834 frame → repo bp-md) */
  @media (min-width: 768px) {
    .site-footer .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-10) var(--space-12); }
    .footer-col + .footer-col { border-top: 0; padding-top: 0; }
    .footer-col--brand {
      grid-column: 1 / -1;
      display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      gap: var(--space-10) var(--space-12); align-items: start;
    }
    .footer-brand { margin: 0; gap: 0.875rem; }
    .footer-brand-plate { width: 56px; height: 56px; }
    .footer-brand-plate img { width: 34px; }
    .footer-brand-name { font-size: 1.375rem; }
    .footer-line--address [data-i18n] { max-width: 34ch; }
    .footer-line a, .footer-links a { min-block-size: 2.25rem; }
    .footer-links { gap: 2px; }
    .footer-links--site { display: flex; flex-direction: column; }
    /* Hours become stacked label-over-value pairs, 12px between pairs
       (2px flex gap + 10px margin). Cross-row column alignment (the canvas's
       auto/1fr grid) is mobile-only: subgrid would be needed to keep li-level
       semantics AND aligned columns, and Chrome's floor here is 110 (<117). */
    .footer-hours { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
    .footer-hours-day:not(:first-child), .footer-hours-note:not(:first-child) { margin-top: 0.625rem; }
  }

  /* Desktop tier (canvas 1440 frame → repo bp-lg) */
  @media (min-width: 1024px) {
    .site-footer .footer-grid { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.9fr); }
    .footer-col--brand { grid-column: auto; display: block; }
    .footer-brand { margin: 0 0 var(--space-4); }
    .footer-brand-plate { width: 60px; height: 60px; }
    .footer-brand-plate img { width: 36px; }
    .footer-brand-name { font-size: 1.5rem; }
    .footer-line { gap: var(--space-3); }
    .footer-line--address [data-i18n] { max-width: 32ch; }
  }
```

**Verification**:
```bash
grep -c "BM-DEFERRED" assets/css/components.css                     # 1 (comment intact)
grep -c "locale-toggle { display: none; }" assets/css/components.css # 2 (both deferral rules intact)
grep -n "footer-wordmark\|site-footer .grid" assets/css/components.css   # no output
grep -c "footer-brand-plate" assets/css/components.css               # >= 4
grep -n "nav-toggle" assets/css/components.css | head -1             # unchanged region still present
```
Also visually confirm no rule was moved outside `@layer components` (the file's single closing `}` count is unchanged: `grep -c "^}" assets/css/components.css` returns 1).

**Done when**: all five greps match, the old `.site-footer .grid`/`.site-footer ul`/`.footer-wordmark` rules are gone, and the hamburger/locale-toggle/BM regions are byte-identical to before.

---

## Canonical markup for Tasks 4–9 (repeat verbatim in each page)

Every full-chrome page task below performs the same four edits. The exact blocks:

**(A) Brand** — replace the existing
```html
    <a class="brand" href="./">
      <span>Urbane Ethos</span>
      <small data-i18n="home.hero.title">Early Intervention Center</small>
    </a>
```
with:
```html
    <a class="brand" href="./">
      <img class="brand-mark" src="./assets/img/ue-logo.png" alt="" width="117" height="111">
      <span class="brand-text">
        <span class="brand-name">Urbane Ethos</span>
        <small data-i18n="common.brand.tagline">Early Intervention Center</small>
      </span>
    </a>
```
(Empty `alt` is intentional — the mark is decorative; the adjacent wordmark names the centre. `width`/`height` are the intrinsic 117×111 to prevent CLS; CSS sizes it down.)

**(B) Header CTA** — replace the existing
```html
      <a class="btn btn--primary" href="./contact.html" data-i18n="common.cta.bookSession">Book Now</a>
```
with:
```html
      <a class="btn btn--primary header-cta" href="./contact.html"><span class="header-cta-label--short" data-i18n="common.nav.bookNow">Book Now</span><span class="header-cta-label--long" data-i18n="common.cta.bookSession">Book a session</span></a>
```
(`data-i18n` moved off the `<a>` onto the two spans — an `<a>`-level key would wipe both spans via textContent.)

**(C) Footer** — replace the entire `<footer class="site-footer">…</footer>` element with:
```html
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-col footer-col--brand">
      <p class="footer-brand">
        <span class="footer-brand-plate"><img src="./assets/img/ue-logo.png" alt="" width="117" height="111"></span>
        <span class="footer-brand-name">Urbane Ethos</span>
      </p>
      <div class="footer-contact">
        <p class="footer-line footer-line--address"><span data-icon="map-pin"></span><span data-i18n="common.footer.address">No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor</span></p>
        <p class="footer-line"><span data-icon="phone"></span><a href="tel:+60377343044" data-i18n="common.footer.phone1">+603-7734 3044</a></p>
        <p class="footer-line"><span data-icon="envelope"></span><a href="mailto:urbaneethos@yahoo.com" data-i18n="common.footer.email">urbaneethos@yahoo.com</a></p>
      </div>
    </div>
    <div class="footer-col footer-col--hours">
      <h4 data-i18n="common.footer.hoursLabel">Hours</h4>
      <div id="footer-hours" class="footer-hours"></div>
    </div>
    <div class="footer-col">
      <h4 data-i18n="common.footer.siteLabel">Site</h4>
      <ul class="footer-links footer-links--site">
        <li><a href="./about.html" data-i18n="common.nav.about">About</a></li>
        <li><a href="./services.html" data-i18n="common.nav.services">Services</a></li>
        <li><a href="./staff.html" data-i18n="common.nav.staff">Staff</a></li>
        <li><a href="./blog.html" data-i18n="common.nav.blog">Blog</a></li>
        <li><a href="./contact.html" data-i18n="common.nav.contact">Contact</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4 data-i18n="common.footer.privacyLabel">Privacy</h4>
      <ul class="footer-links">
        <li><a href="./privacy.html" data-i18n="common.footer.privacy">Privacy notice</a></li>
        <li><a href="#" data-consent-manage data-i18n="common.footer.manageCookies">Manage cookies</a></li>
        <li><a href="#" data-consent-clear data-i18n="common.footer.clearData">Clear my data</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-base">
    <p data-i18n="common.footer.rights">© Urbane Ethos Early Intervention Center</p>
  </div>
</footer>
```
Notes: `#footer-hours` changed from `<ul>` to `<div>` (the renderer injects paired `<span>`s, not `<li>`s — a `dl`/`ul` would trip axe's list-structure rules with the module's span children). The Analytics-demo `<li>` and the `.footer-wordmark` are gone by construction. The icons `map-pin`/`phone`/`envelope` all exist in `assets/js/icons.js` (verified) and are injected `aria-hidden="true"`; `icons.js` is already imported on every page in scope. Static English fallback text is included (footer previously shipped empty `<p>`s; the fallback improves the no-JS/SEO view and translatePage overwrites it).

**(D) Script** — two changes to the page-bottom `<script type="module">`:
1. Insert `import "./assets/js/footer-hours.js";` **immediately after** the `import "./assets/js/a11y.js";` line (repo anchor convention).
2. Delete the page's inline footer-hours rendering AND the now-unused `common` fetch (per-page specifics in each task — grep-verified that `common` has no other use in any of these scripts).

---

## Task 4 — index.html

**Files**: `index.html` (ONLY this).

**What to do**:
1. Apply canonical edits (A), (B), (C) exactly as written in "Canonical markup" above. (A) replaces the brand at ~line 33-region of the header; (B) the CTA in `.header-tools`; (C) the whole footer (~lines 315–353). Preserve `aria-current="page"` if present on the Home/nav links — do not touch the `<ul class="nav-list">`.
2. Script edits:
   - Insert `import "./assets/js/footer-hours.js";` immediately after `import "./assets/js/a11y.js";` (currently line 359).
   - In `renderHome()` change the `Promise.all` destructure from `const [home, common, blog, staff]` to `const [home, blog, staff]` and delete the line `fetchJson(\`./content/${locale}/common.json\`),`.
   - Delete the `fmtUl` helper and its call (currently lines 392–398): the comment line `// Footer hours stay a plain list; visit-us hours render as label/value rows.`, the whole `const fmtUl = (sel, items) => { ... };` block, and `fmtUl("#footer-hours", common.footer?.hours);`.
   - Do NOT touch the `home-hours` / `hour-row` rendering just below it (that is the *visit-us* section, driven by `home.location.hours`).

**Verification**:
```bash
ruby bin/check-contact-channels.rb                      # exit 0 (tel:+60377343044 is allowlisted)
grep -c 'ue-logo.png' index.html                        # 2 (header + footer plate)
grep -c 'analyticsDemo\|footer-wordmark\|fmtUl' index.html   # 0
grep -c 'data-i18n="home.hero.title"' index.html        # 0
grep -c 'footer-hours.js' index.html                    # 1
grep -c 'common.json' index.html                        # 0
```
Then load `http://localhost:8080/` via `bin/server`: footer shows day/time pairs + muted closed line; no console errors.

**Done when**: all greps match and the page renders hours via the module.

---

## Task 5 — about.html + staff.html

**Files**: `about.html`, `staff.html` (ONLY these).

**What to do** (both files):
1. Apply canonical edits (A), (B), (C) from "Canonical markup". Keep `aria-current="page"` on About (about.html line 50) / Staff (staff.html) nav links untouched.
2. Script edits:
   - Both: insert `import "./assets/js/footer-hours.js";` immediately after `import "./assets/js/a11y.js";`.
   - `about.html`: delete lines 183–192 — the comment `// Footer hours from common.json (same as index.html)`, `const common = await (await fetch(\`./content/${locale}/common.json\`)).json();`, `const footerHours = document.getElementById("footer-hours");`, and the whole `if (footerHours && ...) { ... }` block. (`common` has no other use in this script — verified.)
   - `staff.html`: change `const [staff, common] = await Promise.all([...])` to `const [staff] = await Promise.all([...])` deleting the `fetch(\`./content/${locale}/common.json\`).then(r => r.json())` element (and trailing comma), then delete the two lines (currently 241–243): the comment `// Footer hours (mirror what about.html does)`, `const fhrs = document.getElementById("footer-hours");` and the `if (fhrs) fhrs.replaceChildren(...)` line.

**Verification**:
```bash
ruby bin/check-contact-channels.rb                                   # exit 0
for f in about.html staff.html; do echo $f; \
  grep -c 'ue-logo.png' $f; \
  grep -c 'analyticsDemo\|footer-wordmark\|footer?.hours' $f; \
  grep -c 'data-i18n="home.hero.title"' $f; \
  grep -c 'footer-hours.js' $f; done
# each file: 2 / 0 / 0 / 1
grep -c 'common.json' about.html staff.html                          # 0 and 0
```

**Done when**: both pages match the grep table and render footer hours from the module in `bin/server`.

---

## Task 6 — services.html + blog.html

**Files**: `services.html`, `blog.html` (ONLY these).

**What to do** (both files):
1. Apply canonical edits (A), (B), (C) from "Canonical markup". Preserve each page's `aria-current="page"` nav link.
2. Script edits:
   - Both: insert `import "./assets/js/footer-hours.js";` immediately after `import "./assets/js/a11y.js";`.
   - `services.html`: change `const [services, common] = await Promise.all([...])` to `const [services] = await Promise.all([...])`, deleting the common.json fetch element; delete the two `fhrs` lines (currently 246–247).
   - `blog.html`: change `const [data, common] = await Promise.all([...])` to `const [data] = await Promise.all([...])`, deleting the common.json fetch element; delete the two `fhrs` lines (currently 185–186). Do NOT touch the `locale-notice` line below them.

**Verification**:
```bash
ruby bin/check-contact-channels.rb          # exit 0
for f in services.html blog.html; do echo $f; \
  grep -c 'ue-logo.png' $f; \
  grep -c 'analyticsDemo\|footer-wordmark\|footer?.hours' $f; \
  grep -c 'data-i18n="home.hero.title"' $f; \
  grep -c 'footer-hours.js' $f; done
# each file: 2 / 0 / 0 / 1
grep -c 'common.json' services.html blog.html   # 0 and 0
```

**Done when**: both pages match the grep table and render footer hours from the module in `bin/server`.

---

## Task 7 — contact.html + careers.html

**Files**: `contact.html`, `careers.html` (ONLY these).

**What to do** (both files):
1. Apply canonical edits (A), (B), (C) from "Canonical markup". `contact.html`'s header CTA points at the page itself — that is current behaviour, keep it. Preserve `aria-current="page"` on Contact's nav link. `careers.html` stays unlinked from nav (deliberate) — the canonical footer/header contains no careers link; do not add one.
2. Script edits:
   - Both: insert `import "./assets/js/footer-hours.js";` immediately after `import "./assets/js/a11y.js";`.
   - `contact.html`: change `const [data, common, services, ch] = await Promise.all([...])` to `const [data, services, ch] = await Promise.all([...])`, deleting the `fetch(\`./content/${locale}/common.json\`).then(r => r.json()),` element; delete the two `fhrs` lines (currently 485–486). Touch nothing else in this large script (enquiry flow, channels, contact-hours `#contact-hours` rendering all stay).
   - `careers.html`: change `const [data, common] = await Promise.all([...])` to `const [data] = await Promise.all([...])`, deleting the common.json fetch element; delete the two `fhrs` lines (currently 157–158).

**Verification**:
```bash
ruby bin/check-contact-channels.rb          # exit 0 — this page also carries the enquiry mailto/wa.me flows; they derive from enquiry.js and are untouched
for f in contact.html careers.html; do echo $f; \
  grep -c 'ue-logo.png' $f; \
  grep -c 'analyticsDemo\|footer-wordmark\|footer?.hours' $f; \
  grep -c 'data-i18n="home.hero.title"' $f; \
  grep -c 'footer-hours.js' $f; done
# each file: 2 / 0 / 0 / 1
grep -c 'common.json' contact.html careers.html   # 0 and 0
```
Then in `bin/server`, submit the contact form once and confirm the success panel still offers WhatsApp/email/copy (enquiry flow untouched).

**Done when**: both pages match the grep table, the enquiry flow still works, and footer hours render from the module.

---

## Task 8 — Reduced-chrome pages: privacy.html, analytics.html, 404.html

**Files**: `privacy.html`, `analytics.html`, `404.html` (ONLY these).

These pages get ONLY the brand-block update. No CTA (they have none), no footer markup change (privacy/404 keep their reduced footers, which inherit the updated generic `.site-footer p/a` CSS; analytics has no footer), no `footer-hours.js` import (no `#footer-hours`).

**What to do**:
1. `privacy.html` — replace (currently line ~33):
   ```html
   <a class="brand" href="./">Urbane Ethos<small data-i18n="common.nav.about">Early Intervention Center</small></a>
   ```
   with:
   ```html
   <a class="brand" href="./"><img class="brand-mark" src="./assets/img/ue-logo.png" alt="" width="117" height="111"><span class="brand-text"><span class="brand-name">Urbane Ethos</span><small data-i18n="common.brand.tagline">Early Intervention Center</small></span></a>
   ```
   (This also fixes the pre-existing defect where the tagline was bound to `common.nav.about` and rendered "About" after translation.) Leave the bare `.locale-toggle` beside it untouched — it is hidden by the single-class BM-DEFERRED rule.
2. `analytics.html` — replace (line 28):
   ```html
   <a class="brand" href="./">Urbane Ethos<small>Analytics demo</small></a>
   ```
   with:
   ```html
   <a class="brand" href="./"><img class="brand-mark" src="./assets/img/ue-logo.png" alt="" width="117" height="111"><span class="brand-text"><span class="brand-name">Urbane Ethos</span><small>Analytics demo</small></span></a>
   ```
   (No `data-i18n` — this page's label is intentionally untranslated.)
3. `404.html` — replace (line 52):
   ```html
   <a class="brand" href="./">Urbane Ethos<br><small>Early Intervention Center</small></a>
   ```
   with:
   ```html
   <a class="brand" href="./"><img class="brand-mark" src="./assets/img/ue-logo.png" alt="" width="117" height="111"><span class="brand-text"><span class="brand-name">Urbane Ethos</span><small>Early Intervention Center</small></span></a>
   ```
   (No `data-i18n` — 404 is deliberately script-free. The `./assets/img/...` path is correct here too: 404's injected `<base>` re-anchors relative URLs to the deploy root.)

**Verification**:
```bash
grep -c 'ue-logo.png' privacy.html analytics.html 404.html    # 1 each
grep -c 'common.nav.about"' privacy.html                       # header binding gone; nav links: privacy has no nav, so 0
grep -c 'footer-hours' privacy.html analytics.html 404.html   # 0 each
grep -c '<br>' 404.html                                        # 0 (brand's <br> removed)
```
In `bin/server`, load `/privacy.html`, `/analytics.html`, and a bogus URL (`/nope.html` → 404 page): each shows logo + stacked wordmark/subtitle; the locale toggle stays invisible on privacy.

**Done when**: all three brands show the mark; privacy's tagline key is `common.brand.tagline`; nothing else in these files changed.

---## Task 9 — ERB template + regenerate all 38 blog pages

**Files**: `content/blog/_post.html.erb`, plus ALL `post-*.html` (generated — owned exclusively by this task; nothing here is hand-edited).

**What to do**:
1. In `content/blog/_post.html.erb`, apply canonical edits (A), (B), (C) from "Canonical markup" (brand at lines 58–61, CTA at line 84, footer at lines 106–142). Do NOT touch the article-body buttons at line 101.
2. Script edits in the ERB (lines 146–167):
   - Insert `import "./assets/js/footer-hours.js";` immediately after `import "./assets/js/a11y.js";` (line 149).
   - Delete the common.json fetch and the fhrs lines, so `renderChrome()` becomes:
     ```js
     async function renderChrome() {
       await translatePage(getLocale());
     }
     ```
     Keep the `import { getLocale, translatePage } ...` line, the `renderChrome();` call and the `i18n:changed` listener as-is.
3. Regenerate: from the repo root run `ruby bin/build-blog.rb` (if kramdown is missing, `bundle install` then `bundle exec ruby bin/build-blog.rb`). This rewrites all 38 `post-*.html`. Do not hand-edit any of them.

**Verification**:
```bash
ruby bin/check-contact-channels.rb            # exit 0 — scans the ERB and every post-*.html
ls -1 post-*.html | wc -l                     # 38
grep -l 'footer-hours.js' post-*.html | wc -l # 38
grep -l 'ue-logo.png' post-*.html | wc -l     # 38
grep -l 'analyticsDemo\|footer-wordmark\|home.hero.title' post-*.html content/blog/_post.html.erb | wc -l   # 0
grep -c 'common.json' content/blog/_post.html.erb   # 0
```
In `bin/server`, open `/post-year-end-promo.html`: header logo, "Book a session" label at desktop width, footer hours pairs render.

**Done when**: the ERB matches the canonical blocks, all 38 posts are regenerated with the new chrome, and every grep above matches.

---

## Task 10 — Documentation sync

**Files**: `CLAUDE.md` (repo root), `docs/HANDOVER.md` (ONLY these).

**What to do**:
1. `CLAUDE.md` § "JS modules": change "**Sixteen** modules" to "**Seventeen** modules" (and the stale-count parenthetical accordingly), and add a bullet after `a11y.js` (alphabetical-ish placement is fine):
   ```
   - `footer-hours.js` — the single footer opening-hours renderer (replaces the inline per-page scripts). Splits `common.footer.hours` strings on the first `": "` into day/time span pairs; a no-colon string renders as a full-width muted note. Resolves content through `i18n.t` (cached, locale-aware). Imported on the 8 pages with a full footer (all except analytics + privacy) + the blog ERB — **not** a canggih module.
   ```
2. `CLAUDE.md` § "Canggih layer wiring rule": in the expected per-module import-count block, append `footer-hours 8` to the comment line listing counts, and add `footer-hours` to the `for m in ...` list so the check covers it (`# nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · footer-hours 8 · parallax 3`).
3. `CLAUDE.md`: in the architecture section describing pages, no header/footer markup is quoted — nothing else to change. Do NOT touch the BM-DEFERRED section, gates, or photo sections.
4. `docs/HANDOVER.md`: add a dated entry (2026-08-14) summarising: navbar+footer redesign landed (logo mark in header + footer brand plate, `common.brand.tagline` replaces the wrong `home.hero.title`/`common.nav.about` brand bindings, responsive CTA label, footer contrast raised to 92/72/62/16% cream mixes, tel: link added, Analytics-demo footer link removed and `common.footer.analyticsDemo` deleted from both locales, footer hours unified into `assets/js/footer-hours.js`, all 38 blog pages regenerated). Note analytics.html remains direct-URL-only like careers.html.

**Verification**:
```bash
grep -c "footer-hours" CLAUDE.md          # >= 2
grep -n "Seventeen" CLAUDE.md             # 1 hit in the JS modules intro
grep -n "2026-08-14" docs/HANDOVER.md | head -1
```

**Done when**: CLAUDE.md's module count, module list, and import-count table include `footer-hours.js`, and HANDOVER has the dated entry.

---

## Final verification (run after all tasks; any failure blocks completion)

1. **Gates, in CI order**:
   ```bash
   bin/check-i18n-parity.rb            # exit 0
   ruby bin/check-contact-channels.rb  # exit 0
   ```
2. **Import-count table** (10 production pages; literal file list — zsh does not word-split unquoted vars):
   ```bash
   for m in nav icons page-load cursor i18n consent a11y chatbot footer-hours parallax; do printf "%-14s" $m; \
     grep -l "assets/js/$m.js" index.html about.html staff.html services.html blog.html \
     contact.html analytics.html privacy.html careers.html post-year-end-promo.html | wc -l; done
   # nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · footer-hours 8 · parallax 3
   ```
3. **Redesign sweeps** (root pages only; 48 = 10 hand + 38 generated):
   ```bash
   grep -l 'ue-logo.png' *.html | wc -l                                  # 48
   grep -l 'analyticsDemo\|footer-wordmark' *.html | wc -l               # 0
   grep -rl 'data-i18n="home.hero.title"' *.html | wc -l                 # 0
   grep -rn analyticsDemo content/ | wc -l                               # 0
   grep -c "locale-toggle { display: none; }" assets/css/components.css  # 2  (BM still deferred)
   grep -rn 'fetch(' assets/js/ | grep -v import.meta.url                # only i18n.js's CONTENT_BASE fetch
   grep -rn "localStorage\|sessionStorage" assets/js/ | grep -v storage.js   # no output
   ```
4. **axe-core ratchet** — 0 violations on all 10 production pages:
   ```bash
   bin/server &
   for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html careers.html post-year-end-promo.html; do
     echo "=== /$p ==="
     npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
   done
   ```
   (ChromeDriver must match local Chrome — see `docs/A11Y_NOTES.md` § Tooling.)
5. **Manual visual checks** in `bin/server` at three widths:
   - **390**: header = hamburger | logo(34px)+wordmark (no subtitle, no wrap) | "Book Now" pill; footer = single stack with hairline separators, brand plate 48px, hours as 2-col day/time grid with full-width closed note, Site links in 2 columns, copyright last with its own rule; phone is tappable (`tel:`), targets ≥40px.
   - **834**: header still hamburger; subtitle visible; CTA reads "Book a session"; footer = brand row spanning full width (brand left, contact right), 3 columns below, hours as stacked label/value pairs, Site links single column, no separators.
   - **1440**: header = brand | nav | tools with logo 44px; locale toggle NOT visible anywhere; fs-toggle pill intact; footer = 4 columns (1.5/1/0.8/0.9fr), plate 60px, address wraps at 32ch.
   - On any page: toggle text-size cycle and open/close the hamburger at 390 to confirm nav.js is unaffected; on `/privacy.html` confirm the tagline reads "Early Intervention Center" (not "About").
