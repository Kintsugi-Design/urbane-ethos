# A11y notes — Urbane Ethos prototype

Audit run on **2026-06-08** against axe-core 4.11.4 (`@axe-core/cli`) with WCAG tags `wcag2a,wcag2aa,wcag22aa`.

Target: WCAG 2.2 AA. AAA contrast applied where it falls out of the palette.

## Tooling

```bash
bin/server &  # http://localhost:8080
npx @axe-core/cli "http://localhost:8080/<path>" \
  --tags wcag2a,wcag2aa,wcag22aa \
  --chromedriver-path <matching-chromedriver>
```

Note: axe-core CLI requires a ChromeDriver binary matching the locally installed
Chrome major version. On this machine Chrome 148 was paired with
`~/.cache/selenium/chromedriver/mac-arm64/148.0.7778.167/chromedriver`.
Automated install via `browser-driver-manager` may be needed on fresh
checkouts.

### Chatbot panel — playwright runner (W7, 2026-06-11)

The chatbot panel is built lazily on launcher click and isn't reached by
the static axe-core CLI sweep. The panel-specific sweep:

```bash
bin/server &
node bin/axe-chatbot.mjs
```

`bin/axe-chatbot.mjs` launches Chromium via playwright, dismisses the
consent banner, clicks `.chatbot-launcher`, waits for `.chatbot-panel`,
then runs axe-core scoped to the panel. Exits 1 on serious/critical
violations. Not gated in CI — local-run convention matches the main
axe-core sweep. Initial run: **0 violations**.

### Enquiry-capture re-audit (U13, 2026-08-09)

Full re-sweep after the enquiry-capture build. **0 violations on all 10 production pages** (`wcag2a,wcag2aa,wcag22aa`, axe-core 4.11.4), plus `bin/axe-chatbot.mjs` **0 violations**. The ratchet holds.

**ChromeDriver note — read this before the next sweep.** `@axe-core/cli` does **not** drive the system Chrome. It drives the `browser-driver-manager`-managed *Chrome for Testing* under `~/.browser-driver-manager/chrome/`. On this machine that is **148.0.7778.178**, while system Chrome is 151 — so pairing the driver to system Chrome fails with `session not created: This version of ChromeDriver only supports Chrome version 151 / Current browser version is 148`. Match the driver to the **managed** browser, not the system one:

```bash
~/.cache/selenium/chromedriver/mac-arm64/148.0.7778.178/chromedriver --version  # must match ~/.browser-driver-manager/chrome/
npx -y @axe-core/cli "http://localhost:8080/contact.html" \
  --tags wcag2a,wcag2aa,wcag22aa \
  --chromedriver-path ~/.cache/selenium/chromedriver/mac-arm64/148.0.7778.178/chromedriver
```

**Three new surfaces on `contact.html`:**

1. **`<select id="cf-service">`** (interest capture, above the concern textarea) — static in the DOM, so the CLI sweep covers it. Has an explicit `<label for="cf-service">`; the leading "Not sure yet" `<option>` is the no-JS fallback and the remaining seven are appended from the `services` namespace at render time, so option text is translated, never duplicated.
2. **`.enquiry-success`** — `role="status"`, `tabindex="-1"`, `aria-labelledby="enquiry-success-title"`, `hidden` until a valid submit. Focus moves to the panel on swap so keyboard and SR users are not stranded on the submit button.
3. **`.clear-data-dialog`** — a **native `<dialog>` opened with `.showModal()`**, built lazily on first use. Native top layer, native focus trap, native Escape. Deliberately *not* `window.confirm()` (blocks the page) and deliberately *not* the hand-rolled `trapFocus` used elsewhere.

**Surfaces 2 and 3 are invisible to the static CLI sweep** — one is `hidden` until submit, the other does not exist in the DOM until clicked. They were audited **live under playwright** (same approach as `bin/axe-chatbot.mjs`): drive the page, reach the surface, then run axe scoped to it with `.include()`. Both report **0 violations**. Also confirmed in that run:

- `?service=speech` selects the human title "Speech Language Therapy (SLP)", not the slug.
- Success heading renders `Thanks, Aisyah` and `document.activeElement` is the panel.
- The dialog is a real `<dialog>`, `:modal` is true, and it enumerates 5 items.
- **Escape cancels without wiping** — a seeded `urbane-ethos:*` key survives.
- Invalid email `bob@bob` shows "That email doesn't look right." and focus lands on `#cf-email` (previously it wrongly claimed no email was supplied, and focus never moved).

If you add another surface that is hidden-until-interaction, audit it this way — the CLI sweep reporting 0 does **not** mean it was checked.

**Also fixed here (a11y-adjacent):** the submit handler was being re-registered on every `i18n:changed`, so a visitor who toggled language twice fired the handler three times. Now registered once; verified as exactly 1 after three toggles.

### Responsive + interaction sweeps (W6, 2026-06-11)

Three additional local sweeps land in `bin/`:

- `bin/responsive-sweep.mjs` — 8 pages × 4 viewports, screenshots + horizontal-scroll assertion
- `bin/landscape-sweep.mjs` — landscape phone + prefers-reduced-motion sanity
- `bin/real-viewport-walk.mjs` — 1440×900 interaction walk, console-error + failed-request collector

Each exits non-zero on regression. All pass at handover time.

## Pages covered

The original 2026-06-08 audit covered 8 production pages. The set is now **10**
(`careers.html` and `post-year-end-promo.html` were added later) and the
0-violation ratchet applies to all of them:

- `/` (home)
- `/about.html`
- `/staff.html`
- `/services.html`
- `/blog.html`
- `/contact.html`
- `/analytics.html`
- `/privacy.html`
- `/careers.html` (direct-URL only — unlinked from nav/index/footer)
- `/post-year-end-promo.html` (also a generated blog page)

Plus two interaction-only sweeps that the CLI cannot reach: the chatbot panel
(`bin/axe-chatbot.mjs`) and the `contact.html` success panel + clear-data
dialog (see "Enquiry-capture re-audit" above).

The other 37 generated `post-*.html` blog pages are **not** part of the
10-page accounting; they share one ERB template, so auditing
`post-year-end-promo.html` exercises that template.

Final state: **0 axe-core violations on every page** (serious / critical /
moderate / minor — all clear). Last verified 2026-08-09.

## Resolved violations

Initial run surfaced three distinct rule failures across the 8 pages.

### 1. `color-contrast` — consent banner "Read full privacy notice" link

- **Severity**: serious
- **Rule**: <https://dequeuniversity.com/rules/axe/4.11/color-contrast>
- **Pages**: all 8 (link lives in the global consent banner template)
- **Measured ratio**: 3.07:1 (foreground `#A05A3D` `--color-terracotta-deep`
  on background `#2B1F14` `--color-ink`) — below WCAG AA 4.5:1.
- **Fix**: scoped override in `assets/css/components.css` to recolour the
  link inside the dark consent banner.
  ```css
  .consent-banner a { color: var(--color-cream-soft); text-decoration-thickness: 1px; }
  .consent-banner a:hover { color: var(--color-sun); }
  ```
  Cream-soft (`#FBF6EC`) on ink (`#2B1F14`) is ≈ 14.5:1 — AAA pass.
- **Files**: `assets/css/components.css:134-135`

### 2. `color-contrast` — staff photo placeholder initials

- **Severity**: serious
- **Rule**: <https://dequeuniversity.com/rules/axe/4.11/color-contrast>
- **Pages**: home (3 featured staff cards), staff (9 staff cards)
- **Measured ratio**: 3.55:1 (foreground `#7A6A5C` `--color-ink-muted`
  on background `#E2D4BD` `--color-line`) — below WCAG AA 4.5:1 for
  small text (12px sans).
- **Fix**: switched `.staff-photo` text colour from `--color-ink-muted`
  to `--color-ink-soft` (`#4A372A`). Resulting ratio against `#E2D4BD`
  is ≈ 7.4:1 — AAA pass.
- **Files**: `assets/css/components.css:144`
- **Note**: these placeholder initials disappear once real staff
  headshots replace the `.staff-photo` divs, so the rule will no longer
  apply in production.

### 3. `scrollable-region-focusable` — analytics "session events" `<pre>`

- **Severity**: serious
- **Rule**: <https://dequeuniversity.com/rules/axe/4.11/scrollable-region-focusable>
- **Pages**: analytics
- **Issue**: `<pre id="session-events" style="overflow:auto">` is a
  scrollable region with no keyboard-focusable child, so Safari /
  screen-reader users can't scroll it.
- **Fix**: added `tabindex="0"` and an `aria-label="Live session events"`
  to the `<pre>`.
- **Files**: `analytics.html:44`

## Preventive hardening (not flagged by axe, fixed anyway)

- **Contact form errors**: `.form-error` paragraphs gained `role="alert"`
  and `aria-live="polite"`, and each input now has
  `aria-describedby="cf-*-err"` pointing at its inline error so screen
  readers announce validation failures on submit. Existing
  `aria-invalid` toggling in `contact.html:172` continues to work.
  Files: `contact.html:60-75`.

## Known minor / deferred

- **Design-direction comparison pages** (`design/directions/v1-quiet/`,
  `design/directions/v2-warm-modern/`, `design/directions/v3-bold/`) are
  internal design-process artifacts, not part of the production routing
  and not linked from any page in the audit set. They were intentionally
  excluded from the AA target; T22 did not audit them.
- **Chatbot panel** axe gap CLOSED 2026-06-11 via `bin/axe-chatbot.mjs`
  (see "Tooling → Chatbot panel — playwright runner" above). The panel
  is now audited live (post-click). Initial run: 0 violations. Static
  structure already covered the basics: `data-tts`, `data-mic`,
  `data-close` buttons carry `aria-label` from `flow.ui.*`
  (chatbot.js:119, 120, 126); `.chatbot-log` has
  `role="log" aria-live="polite" aria-relevant="additions"` so bot
  replies are announced. Focus trap + Escape close exercised in
  the script's interaction walk.

## Third-party / out of scope

- **Google Maps `<iframe>`** on `/contact.html`: the iframe element has
  `title="Map of Urbane Ethos centre"` (contact.html:52), which is what
  the parent page can control. The map's *internal* DOM is rendered by
  Google and is outside this repo's a11y surface. axe-core flags inner
  Google content as third-party in some configurations; none surfaced
  in the current run, but treat any future findings against
  `iframe#map > *` as third-party-only.

## Manual / VoiceOver checks (not automated)

These need a real screen reader and were not part of T22's automated
sweep; they are listed here so T23 / future production launch can
re-verify them:

- Chatbot focus trap, `Escape` close, message announcements.
- Contact form error announcement after `submit` (the new
  `role="alert"` + `aria-live="polite"` on `.form-error` should cover
  this; verify with VoiceOver).
- Skip-link target — `a11y.js` programmatically focuses the
  `#main-content` landmark and sets `tabindex="-1"` on click; confirm
  focus actually lands there on first Tab.
- Personalization chip group on the home page uses
  `role="radiogroup"`-style chips built from native `<input
  type="radio">` wrapped in `<label>`; verify arrow-key navigation
  between chips works as users expect.
- Reduced-motion preference: confirm that the CSS in `motion.css`
  short-circuits animations under `prefers-reduced-motion: reduce`.

## Re-running the audit

```bash
cd urbane-ethos
bin/server &
# match your local Chrome major version:
CHROMEDRIVER=~/.cache/selenium/chromedriver/mac-arm64/148.0.7778.167/chromedriver
for path in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=========== /$path ==========="
  npx -y @axe-core/cli "http://localhost:8080/$path" \
    --tags wcag2a,wcag2aa,wcag22aa \
    --chromedriver-path "$CHROMEDRIVER" 2>&1 | tail -10
done
kill %1
```

Expected output for every page: `0 violations found!`.
