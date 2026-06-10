# Polish-pass + handover design

**Date:** 2026-06-10
**Author:** brainstorming session, urbane-ethos prototype
**Status:** approved, ready for implementation plan
**Predecessors:**
- `docs/superpowers/specs/2026-06-08-urbane-ethos-revamp-design.md` (original revamp)
- `docs/superpowers/specs/2026-06-08-polish-pass-design.md` (Phase 1+2 polish)
- `~/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md` (Phase 4 canggih)

---

## Goal

Get the prototype to a clean handover state. **No new features.** Close known tech-debt from the Phase 1 → Phase 4 line, wire deferred i18n, fix one latent locale bug, add proper mobile responsiveness, remove the top-nav underline carry-over, and capture a final expert review pass.

Success = a reviewer picking this repo up after handover finds: no architectural drift in `assets/css/`, no unused i18n namespaces, BM personalization that actually fires in BM locale, a header that works on a 360px screen, a chatbot panel that grades clean under axe, and a documented huashu-design 5-dimension assessment of the finished state.

## Non-goals

- No new pages, no individual blog articles, no new canggih moves.
- No "Assignment" live-vs-prototype walkthrough (deferred to a future session).
- No GitHub/GitLab Pages activation (manual config — not code).
- No client-decision items (real photos, real videos, BM legal review, LLM backend).
- No work inside `design/directions/v{1-quiet,2-warm,3-bold}/` — they're internal comparison artifacts, not production.

## Workstreams

Ordered for least collision and fastest gate-passing.

### W1 — CSS architecture refactor (mechanical)

**Problem.** `@layer components` opens at `assets/css/components.css:1` and closes before line 252. Three blocks live *outside* the layer:
- Phase 4 canggih A2 cursor (`.canggih-cursor*`, ~lines 252–284)
- Phase 4 canggih C1 hero (`min-height` 100vh rules, ~lines 286–322)
- Phase 2 `.anchor-photo` (~lines 330–349)
- Phase 2 `.yt-embed` (~lines 352–415)

This was architectural drift across phases. Outside the layer, these rules win over base-layer styles by default specificity rules instead of by cascade-layer order, which is fragile and inconsistent with the rest of the system.

**Fix.** Move all four blocks back inside `@layer components { … }`. Pure brace + indent change — no rule edits, no selector changes.

**Verification.**
- Visual diff: open `index.html`, `about.html`, `services.html`, `contact.html` in `bin/server` before and after; confirm zero pixel difference at desktop viewport.
- `bin/check-i18n-parity.rb` exits 0 (sanity — should be unaffected).
- axe-core sweep across all 8 production pages: still 0 serious/critical violations.

**Risk.** Low. Mechanical refactor.

### W2 — Top-nav underline removal

**Problem.** `assets/css/base.css:11-21` gives every `<a>` a `background-image: linear-gradient(currentColor, currentColor)` with `background-size: 100% 1px`. For `main`/`footer` it's toggled to `0%` by default + `100%` on hover (the Phase 1 ink-draw underline). But `nav` links were never scoped — they keep the static 1px line.

**Fix.** Add a scoped override:

```css
/* In components.css, inside @layer components */
.site-header a,
.site-footer .footer-meta a,  /* if needed — confirm in implementation */
.brand {
  background-image: none;
  padding-bottom: 0;
}
```

The `.site-header a` rule covers `.nav-list a`, the locale toggle, font-size cycle, and any other header links. The `.brand` rule explicitly drops the underline from the wordmark.

**Caveat to confirm during implementation.** If the spec discovers the footer's primary links should also lose the underline (current behavior is ink-draw on hover, which may or may not feel right in the footer's quieter type), that's a separate decision — flag and ask. Default: footer behavior stays as-is.

**Verification.** Cmd+F5 reload, hover and tab through the header on `index.html` — no underline, focus-visible ring still appears. axe-core: 0 violations.

**Risk.** Trivial.

### W3 — i18n dedup + consume `videoTitles`

**Problem A — duplicate strings.**
- `common.a11y.videoUnavailable` = "Video coming soon" (EN), "Video akan datang tidak lama lagi" (MS)
- `common.media.videoUnavailableFallback` = "Video coming soon" (EN), "Video akan datang" (MS)

Same purpose. Currently `videoUnavailableFallback` has zero consumers (confirmed via grep). The two strings will drift over time.

**Fix A.** Delete `common.media.videoUnavailableFallback` from both `content/en/common.json` and `content/ms/common.json`. Any future fallback uses `common.a11y.videoUnavailable`.

**Problem B — unused `videoTitles` namespace.**
`common.media.videoTitles.*` (EN+MS) is fully populated but no JS or HTML reads it. Iframe `title` attributes are hardcoded English via inline `data-yt-title` on each `.yt-embed`. Will drift, can't be translated.

**Fix B.** Wire `yt-embed.js` to read titles from i18n:
1. Each `.yt-embed` slot adds a new attribute `data-yt-title-key="media.videoTitles.<slug>"` (e.g. `media.videoTitles.intro`, `media.videoTitles.centreTour`).
2. `yt-embed.js` resolves the key via the i18n module at render time (or click time — whichever matches existing patterns in the module). The resolved string is set as the `title` attribute on the spawned `<iframe>`.
3. Existing inline `data-yt-title="..."` is **removed**. The `data-yt-title-key` attribute is the single source of truth. If the key resolves to undefined (key typo, namespace missing), `yt-embed.js` leaves the iframe `title` blank — surfaced loudly via axe, which is the right failure mode.
4. Re-render path: if the user toggles locale after the iframe spawns, the iframe `title` does NOT re-update — acceptable for prototype.

**Touches.** `content/{en,ms}/common.json`, `assets/js/yt-embed.js`, `index.html` (home hero), `contact.html` (centre tour).

**Verification.** `bin/check-i18n-parity.rb` exits 0. Click both yt-embed slots in EN and BM locales — devtools confirms iframe `title` matches the current locale.

**Risk.** Low. i18n module already supports `data-i18n-attr` style lookup; this just adds one more.

### W4 — Distinct alts for home hero

**Problem.** The home page has two media slots stacked: an `.anchor-photo` (Picsum placeholder) and a `.yt-embed` (intro video). Both currently reuse `common.media.alts.homeHero`. A screen reader user hears the same alt twice in close succession.

**Fix.**
1. Add `common.media.alts.homeHeroIntroVideo` to both `content/en/common.json` and `content/ms/common.json`. EN: "Centre intro video — sage-toned placeholder thumbnail." MS: drafted via existing glossary, `_draft: true`.
2. Update `index.html` home-hero `.yt-embed` `<img>` `data-i18n-attr` to point at the new key.
3. Anchor photo's alt stays on `common.media.alts.homeHero`.

**Verification.** VoiceOver pass on `index.html` — hero photo reads "Considered photograph — sage-toned placeholder image" (or whatever the current value is), video thumbnail reads the new distinct alt. axe still 0 violations.

**Risk.** Trivial.

### W5 — BM personalization wiring

**Problem.** `assets/js/personalization.js:6-28` declares `RULES.concernToService`, `concernToBlogTags`, `concernToStaff` keyed on **English chip labels** (`"Speech"`, `"Motor skills"`, `"Behaviour"`, `"Learning"`, `"Not sure"`). The home micro-survey chips render their labels via `data-i18n` — in MS locale, the chip displays the BM string. `FormData.get("concern")` reads the `<input>` `value` attribute, which currently *also* uses the EN string. So in BM locale, the rule-table lookup misses silently, and the services grid does not reorder.

This is the bug `CLAUDE.md` flags: *"Rules only fire reliably when locale is EN."*

**Fix.** Decouple chip `value` from chip display text. Use locale-agnostic slugs.

1. In `index.html` (and wherever else personalization chips live), each chip:
   ```html
   <!-- before -->
   <input type="radio" name="concern" value="Speech" />
   <span data-i18n="home.personalization.concern.speech">Speech</span>

   <!-- after -->
   <input type="radio" name="concern" value="speech" />
   <span data-i18n="home.personalization.concern.speech">Speech</span>
   ```
2. In `personalization.js`, change `RULES.*` keys from EN strings to the same slugs:
   ```js
   const RULES = {
     concernToService: {
       "speech": "speech",
       "motor-skills": "ot",
       "behaviour": "psych",
       "learning": "specialed",
       "not-sure": "screening"
     },
     // ...same shape for concernToBlogTags, concernToStaff
   };
   ```
3. Sessions saved before this change carry the old EN values. Acceptable — prototype scope. (If wanted, add a small migration in `read()` that maps known EN strings to slugs; lean toward "skip, sessionStorage is short-lived.")

**Bonus.** Persisted data becomes locale-stable — if a user toggles locale after saving, recommendations still apply.

**Verification.**
- `test/smoke/personalization.html` (or similar) — open in EN, set concern=Speech, confirm "Speech & Language Therapy" sorts first. Re-open in MS via `?locale=ms`, set concern=Pertuturan (or whatever the BM label is), confirm BM services grid reorders too.
- axe still 0 violations.

**Risk.** Low. The `value` attribute change is mechanical; the rule-table change matches.

### W6 — Full responsive audit

The single largest workstream. Mobile-first polish + tablet + landscape + real-device test via gstack browser.

#### W6.1 — Breakpoint plan

Add three named breakpoints in `assets/css/tokens.css`:

```css
--bp-sm: 640px;   /* phone landscape / small tablet */
--bp-md: 768px;   /* tablet portrait */
--bp-lg: 1024px;  /* tablet landscape / small laptop */
```

Use as `@media (min-width: var(--bp-md))` style — mobile-first. (CSS custom properties in `@media` queries are now baseline modern; matches the project's "modern browsers only" stance.)

Existing two breakpoints (`base.css:61` 768px, `components.css:179` 640px) get adjusted to use the new tokens for consistency.

#### W6.2 — Header / nav (hamburger pattern)

Below `--bp-md` (768px), the `.nav-list` flex row becomes a slide-down panel triggered by a `.nav-toggle` button.

**Markup.**

```html
<header class="site-header">
  <div class="header-row wrap">
    <a class="brand" href="./">Urbane Ethos</a>

    <button class="nav-toggle"
            aria-expanded="false"
            aria-controls="primary-nav"
            data-i18n-attr="aria-label:common.nav.menuLabel"
            aria-label="Open menu">
      <svg class="nav-toggle-icon" aria-hidden="true" viewBox="0 0 24 24">
        <!-- two hand-drawn sage lines — paper-and-ink idiom, not generic hamburger -->
        <path d="M3 8h18" />
        <path d="M3 16h18" />
      </svg>
    </button>

    <nav id="primary-nav" aria-label="Primary">
      <ul class="nav-list"> … </ul>
    </nav>

    <div class="header-tools"> … </div>
  </div>
</header>
```

**CSS.**

```css
@layer components {
  .nav-toggle { display: inline-flex; /* mobile-default */ }
  #primary-nav { display: none; }
  #primary-nav.is-open { display: block; /* + animation */ }

  @media (min-width: 768px) {
    .nav-toggle { display: none; }
    #primary-nav { display: block; }
  }
}
```

**JS.** New module `assets/js/nav.js`:
- `aria-expanded` toggle on click
- `Escape` closes the panel and returns focus to `.nav-toggle`
- Click outside the panel closes it
- Focus trap while open (using existing focus-trap pattern from `chatbot.js` if reusable, otherwise inline)
- `prefers-reduced-motion: reduce` — show/hide instantly, no transition

Wire `nav.js` in **all 8 production pages** per the canggih layer wiring rule. Smoke check: `grep -c "nav.js" *.html | paste -sd+ | bc` → 8.

**Icon idiom.** Two hand-drawn sage strokes (SVG `<path>` with `stroke="currentColor"` `stroke-width="1.2"` `stroke-linecap="round"`). Avoid the generic 3-line "hamburger" — matches Direction B's paper-and-ink language. The "X" close state is a transform on the same two lines, not a separate icon.

#### W6.3 — Hero / typography

- Verify hero font-size at 360px viewport: `clamp()`-based scales should already collapse — confirm in browser.
- Tighten hero `line-height` from default ~1.15 to ~1.1 below `--bp-sm`.
- Reduce hero padding-bottom by ~30% below `--bp-sm` to prevent the lede + CTAs falling below the fold.
- Verify `100vh` hero (Phase 4 C1) on landscape phones: `100svh` fallback already in place; confirm no jank.

#### W6.4 — Grids

Confirm graceful 1-col collapse for each:
- `.staff-grid` — `repeat(auto-fit, minmax(280px, 1fr))`. At 360px viewport, `minmax(280px, 1fr)` → 1-col. ✓ Consider reducing `gap: var(--space-12)` to `var(--space-8)` below `--bp-sm` to avoid scroll fatigue.
- `.services-grid` (a.k.a. `.grid-3`, `.grid-2`) — same pattern. ✓
- `.blog-cards` — verify; likely fine.
- Footer `.grid` — `minmax(180px, 1fr)`. ✓
- `.stat-grid` (analytics) — `minmax(180px, 1fr)`. ✓

Anchor photos and yt-embed thumbnails should maintain aspect ratio (already declared `aspect-ratio` if used; otherwise add `aspect-ratio: 16 / 10` to `.yt-embed img`).

#### W6.5 — Touch targets (WCAG 2.5.8 AA)

All interactive controls ≥ 24×24 CSS pixels at all viewports. Pad as needed:
- `.chip-pill` (personalization, services FAQ)
- `.locale-toggle` buttons
- Font-size cycle button (`[data-fs-cycle]`)
- `.chatbot-launcher`
- Consent banner buttons (Accept/Necessary/Customize)
- Nav links
- YT play button overlay

Apply min-height via `min-block-size: 2.5rem` on buttons; min-block-size: 2rem on chips.

#### W6.6 — Per-page mobile sweep

Each of the 8 production pages walked at 4 viewports via gstack browser:
- 375×667 (iPhone SE / 8 / mini)
- 414×896 (iPhone Pro Max / Plus)
- 768×1024 (iPad portrait)
- 1024×768 (iPad landscape)

For each: capture screenshot, look for horizontal scroll, overflowing content, illegible text, broken layout. Fix anything found, re-screenshot. Save before/after pairs as `docs/responsive-sweep/<page>-<viewport>.png` for the handover record.

#### W6.7 — Landscape + reduced-motion sanity

- Landscape phone (e.g. 667×375): hero `100vh` doesn't trap, parallax (Phase 4 A4) doesn't jitter, sticky header doesn't eat too much vertical space.
- `prefers-reduced-motion: reduce` honored on every new W6 interaction (hamburger open/close especially).

#### W6.8 — Real-device check via gstack browser

After all above fixes land, open gstack browser at multiple device emulations AND at a real viewport. Walk all 8 pages. Document anything device-class-specific in the implementation handover.

**Verification (W6 aggregate).**
- No horizontal scroll at any of {320px, 375px, 414px, 768px} on any of 8 pages.
- Hamburger: opens on click + Enter, closes on Escape, focus trapped while open, focus returns to toggle on close.
- All interactive controls ≥ 24×24 CSS px at every breakpoint.
- 8-page × 4-viewport screenshot grid present in spec/handover.
- axe-core sweep on 8 pages at desktop viewport still 0 serious/critical.

**Risk.** Moderate. The hamburger is a real component with its own focus-trap surface; needs test-first authoring. Mobile typography tuning is judgment work — be ready to iterate.

### W7 — Chatbot a11y via playwright

**Problem.** axe-core in `docs/A11Y_NOTES.md` only sees the static page snapshot. The chatbot panel is built lazily on launcher click. Static structure was hand-inspected, but not axe-audited.

**Fix.** New one-off Node script `bin/axe-chatbot.mjs` using `@axe-core/playwright`:
1. Launch headless Chromium, navigate to `http://localhost:8080/`.
2. Wait for `.chatbot-launcher`, click it.
3. Wait for `.chatbot-panel` to render.
4. Run axe on the panel element (`page.locator(".chatbot-panel")`).
5. Print any violations; exit 1 if serious/critical found.

Not gated in CI (matches existing axe convention — local-run heavy step). Document the runner in `docs/A11Y_NOTES.md`. Fix anything it surfaces inline.

**Verification.** `bin/axe-chatbot.mjs` reports 0 serious/critical violations on the chatbot panel.

**Risk.** Low. New script, isolated. The W6 hamburger panel can be added to the same runner if convenient.

### W8 — huashu-design 5-dimension review (final)

After W1–W7 land, invoke `huashu-design` in review mode. Pass: production prototype at `http://localhost:8080`, all 8 pages. Ask for the standard 5-dimension assessment:

1. **Philosophy consistency** — does the paper-and-ink Direction B carry through, or are there points where the prototype reads as default-y or web-design-trope?
2. **Visual hierarchy** — does each page's primary message lead, with secondary content supporting, not competing?
3. **Detail execution** — typography weight/tracking, spacing rhythm, color use, motion timing — calibrated or approximate?
4. **Functionality** — interactions feel intentional, surprises minimized?
5. **Innovation** — is the prototype distinctive within the early-intervention-centre category? Or could any other centre's site replace it without anyone noticing?

Each dimension scored /10 with specific observations + a fix list.

**Scope cap.** Apply only tier-1 fixes (small-cost, isolated, no architectural impact) inline. Document tier-2+ in `docs/HANDOVER.md` "Deferred items" with rationale, so the next session/client can pick them up.

**Verification.** Review report committed alongside the handover update.

**Risk.** Output is unknown. The tier-1-cap guards against the review opening a new design phase.

## Acceptance gates

All gates must pass before declaring handover complete.

**Automated.**
- `bin/check-i18n-parity.rb` → exits 0
- All 8 production pages serve 200 via `bin/server`
- axe-core sweep across 8 production pages → 0 serious/critical violations (desktop viewport)
- `bin/axe-chatbot.mjs` → 0 serious/critical violations
- `grep -c "nav.js" *.html | paste -sd+ | bc` → 8 (new canggih-layer module)

**Manual.**
- EN ↔ BM locale toggle on home: personalization micro-survey records value, services grid reorders, regardless of locale.
- yt-embed iframe `title` matches current locale on both home (intro) and contact (centre tour).
- Top-nav links have no underline at rest, focus-visible ring still appears.
- All 8 pages at 320/375/414/768 viewports: no horizontal scroll, layout intact.
- Hamburger: opens on click + Enter, closes on Escape, focus trapped, focus returns to toggle.
- All interactive controls ≥ 24×24 CSS px at every viewport (manual spot-check 5–8 critical controls per page).
- Chatbot panel reads cleanly under VoiceOver: launcher → panel → first message bubble → input.
- huashu-design 5-dimension report committed; tier-1 fixes applied; tier-2+ documented in HANDOVER.

## Handover artifacts

After all workstreams pass:

- Updated `docs/HANDOVER.md`: "What's open" reduced to just future-session items + deferred client-decision items. Add a "Polish-pass 2026-06-10 closed" subsection summarizing what landed.
- Updated `docs/A11Y_NOTES.md`: chatbot playwright runner documented, residual gaps updated.
- Updated `CLAUDE.md` (project, not user): drop the "Rules only fire reliably when locale is EN" caveat from the personalization paragraph; drop the "tech-debt: blocks outside @layer components" callout from the CSS architecture section.
- Mobile-sweep screenshots in `docs/responsive-sweep/`.
- huashu-design review report at `docs/superpowers/specs/2026-06-10-huashu-review.md`.
- Spec self-review of this design doc completed.

## Open questions deferred to implementation plan

- Should `footer` links also lose the ink-draw underline (currently the spec preserves W2 footer behavior)? Default: preserve. Re-ask if huashu review flags it.
- Hamburger animation curve — match the chatbot-unfurl `var(--ease-paper)` or use a flatter slide? Default: match chatbot's idiom.
- Whether to add a migration path for pre-fix `sessionStorage` personalization values (EN strings). Default: skip — sessionStorage is short-lived.

## Commit policy

Per workspace policy (`/Users/deepsight/code/CLAUDE.md`): **no `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line**. Workstreams committed as separate logical units, conventional-commit-style prefixes (`refactor(css):`, `fix(i18n):`, `feat(nav):`, `chore(a11y):`, `docs(handover):`).

## Out-of-scope reminder

If during implementation a new feature, page, or canggih move is tempting, **stop and flag**. The user's brief was explicit: polish + close tech-debt + huashu review. No scope creep.
