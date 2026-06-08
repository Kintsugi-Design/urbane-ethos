# Urbane Ethos — Website Revamp Design Spec

**Date:** 2026-06-08
**Live site:** https://www.urbaneethos.center/
**Target output:** Interactive HTML prototype (Phase 2). Production conversion deferred to Phase 3.
**Repo:** `urbane-ethos/`

---

## 1. Context

Urbane Ethos is an Early Intervention Center for children based in Shah Alam, Malaysia. Services include Screening/Assessment, Occupational Therapy, Speech Therapy, Special Education, Early Intervention Program, and Clinical Psychology. The audience is parents of young children with developmental concerns — a high-stress, high-trust decision space.

The live site is functional but dated. This revamp targets a prototype that demonstrates four contemporary website principles in this context:

1. **Personalization of content** — AI-style prediction of relevant content based on visitor interaction.
2. **Conversational design** — chatbot for enquiry and price indication, reducing friction for the 61% of buyers who prefer not to talk to sales.
3. **More personal** — real humans (staff photos and video) front and center, pushing back against generic AI-generated imagery.
4. **Accessibility** — WCAG 2.2 AA throughout, with AAA contrast where cheap.

Brand scope: **name and logo preserved**; everything else redesigned.

---

## 2. Goals & Non-Goals

### Goals
- Ship a runnable, interactive HTML prototype to `urbane-ethos/` that any reviewer can open locally with `python3 -m http.server 8080`.
- Preserve all real copy from the live site verbatim (EN), so the prototype is faithful for client review.
- Bilingual EN/BM toggle on every page except blog articles, with mirrored content trees.
- Demonstrate all four design principles in working (mocked) form.
- Comply with PDPA (Malaysia, 2010) at prototype-grade — consent banner + privacy notice, gated data collection.
- Provide design comparison artifacts (one-page demos in Directions A and C) alongside the committed Direction B.

### Non-goals
- Real LLM-backed chatbot (decision-tree only).
- Server-side personalization or cross-session learning (client-side rules only).
- Individual blog article pages (cards deep-link to live site).
- Real staff intro videos (placeholders with honest labeling).
- Hosting, domain, CDN, build pipeline (Phase 3).
- Human review of BM translations (Phase 3).
- Form submission backend (`mailto:` and `wa.me` only in prototype).
- Automated image optimization pipeline.

---

## 3. Phased Workflow

| Phase | Output | Notes |
|---|---|---|
| 0a — Scrape | `content/en/*.json`, `content/scraped-raw/` | Full crawl of public pages, structured per section. Verbatim copy. |
| 0b — Translate | `content/ms/*.json`, `content/glossary.md` | Claude-translated EN→BM, glossary applied first. `_meta.reviewedBy: null` flag on every file. |
| 1 — Direction | `design/directions/v1..v3/` | Direction B committed for main build. A & C as one-page demos. B also gets a `system.html` reference page. |
| 2 — Build | 8 HTML pages in `urbane-ethos/` root | Real scraped content, i18n, chatbot, personalization, consent, a11y. |
| 3 — Productionize | — | Out of scope for this spec. README captures the punch list. |

---

## 4. Repo Layout

```
urbane-ethos/
  README.md
  .gitignore
  index.html
  about.html
  staff.html
  services.html
  blog.html
  contact.html
  analytics.html         (footer link only)
  privacy.html           (footer link + consent banner link)
  assets/
    css/
      tokens.css         (design tokens from Direction B)
      base.css           (reset + element defaults)
      components.css     (header, nav, cards, buttons, forms, chatbot, footer)
      motion.css         (keyframes + transitions, prefers-reduced-motion gated)
    js/
      i18n.js
      chatbot.js
      personalization.js
      consent.js
      a11y.js
      analytics-demo-data.js
    img/
      scraped/           (verbatim from live site)
      placeholders/      (alt="[REAL PHOTO REQUIRED] ...")
    fonts/               (self-hosted WOFF2)
  content/
    en/
      common.json        (nav, footer, CTAs, a11y labels)
      home.json
      about.json
      staff.json
      services.json
      contact.json
      privacy.json
      consent.json
      chatbot.json       (decision tree, EN strings)
    ms/                  (mirrored keys)
      common.json
      home.json
      about.json
      staff.json
      services.json
      contact.json
      privacy.json
      consent.json
      chatbot.json
    blog.json            (EN-only, shared)
    glossary.md          (EN→BM fixed-term glossary)
    scraped-raw/         (HTML cache from Phase 0a, gitignored optional)
  design/
    directions/
      v1-quiet/index.html
      v2-warm/index.html
      v2-warm/system.html
      v3-bold/index.html
  bin/
    server                 (Ruby; serves repo root via WEBrick on :8080)
    check-i18n-parity.rb   (Ruby stdlib only; fails if EN/MS keys diverge)
  Gemfile
  Gemfile.lock
  docs/
    superpowers/specs/2026-06-08-urbane-ethos-revamp-design.md  (this file)
```

---

## 5. Page-by-Page Spec

### 5.1 `index.html` (Home)

Sections in order:
1. Header — logo (left), nav (center), i18n toggle + font-size toggle + Book Now (right). Skip-to-content link before header.
2. Hero — center logo wordmark, headline + sub, primary CTA, secondary "Watch intro" (placeholder).
3. **Personalization micro-survey** — three chip-based questions (age, concern, stage). Skippable. Gated by `consent.personalization`. Hidden entirely if consent denied.
4. Location & hours strip.
5. Services grid (6 cards). Reorderable by personalization.
6. Testimonial — single, verbatim from live site, anonymized to first-name + age band.
7. "What can we do for you?" — verbatim copy block.
8. Staff highlights (3 cards) — large photos, "Hi, I'm…" treatment.
9. Events teaser — single card linking to contact.
10. "Recommended for you" rail — appears above blog if personalization data present. 2 articles + 1 staff.
11. Blog (3 latest, EN-only; if locale=MS, show small inline notice).
12. Footer.
13. Floating chatbot bubble (bottom-right, fixed).

Content source: `content/{locale}/home.json` + `content/{locale}/common.json` + `content/blog.json`.

### 5.2 `about.html`
Hero, mission/story, values list, photo strip, dual CTA (Services / Contact). Source: `content/{locale}/about.json`.

### 5.3 `staff.html`
Hero, full staff grid. Each card: photo, "Hi, I'm [Name]", role, credentials, one personal sentence, video-intro slot (placeholder `<dialog>` modal). Source: `content/{locale}/staff.json`. Staff names + credentials are NOT translated; surrounding labels are.

### 5.4 `services.html`
Hero, 6 service blocks (icon, title, what-it-is, who-it's-for, what-to-expect, FAQ accordion), per-service CTA to contact. Source: `content/{locale}/services.json`.

### 5.5 `blog.html`
Hero, category filter chips, article list (thumb + title + date + excerpt). Each card links externally to the live-site article. EN-only — locale toggle remains visible, with an inline notice when MS is active: "Site navigation translates; articles remain in English." Notice itself is bilingual via `common.json`.

### 5.6 `contact.html`
Hero, address/phone/hours block, embedded map (Google Maps `iframe`), contact form (`mailto:` action), social links, "Or chat with us" CTA opening the chatbot with a pre-seeded message. Source: `content/{locale}/contact.json`.

### 5.7 `analytics.html` (internal-facing demo)
Not in main nav — footer link only. EN-only. Shows mock dashboard:
- Total visits (last 30 days) — seeded fake data.
- Top pages.
- Chatbot open rate, intent breakdown.
- Micro-survey completion rate + concern distribution.
- Locale split (EN/MS).
- Conversion funnel (visit → survey → chatbot → contact submit).

All charts inline SVG, no external chart lib. Data from `assets/js/analytics-demo-data.js` (seeded) + live session data from `sessionStorage` if `consent.analytics === true`.

Top banner on the page: "Demo dashboard — illustrates what data we'd collect once analytics is wired in production. No real telemetry runs."

### 5.8 `privacy.html` (PDPA notice)
Bilingual. Source: `content/{locale}/privacy.json`. Sections:
1. Who we are + contact (from scrape).
2. Data categories collected (visitor metadata, micro-survey, chatbot transcripts, contact-form submissions).
3. Purpose of each collection.
4. Sensitive personal data callout — child health/developmental info; explicit-consent only.
5. Retention periods (prototype values; flagged for legal review).
6. Disclosure to third parties — none in prototype.
7. Data subject rights (access, correction, withdrawal of consent).
8. How to withdraw consent + how to file complaint with JPDP (Jabatan Perlindungan Data Peribadi).
9. Cookie/storage inventory (locale, font-size, consent, personalization, chatbot history).
10. Version + last-updated.

Header callout: "Prototype-grade notice authored 2026-06-08. Must be reviewed by Malaysian counsel before production launch."

**Note:** the "Events" page exists in the live site nav. In the prototype it's consolidated into the home teaser + contact CTA. Documented in README as a deliberate reduction; restoration is one-file work.

---

## 6. Design Principle Realization

### 6.1 Personalization
- Micro-survey on home hero. Three chip rows. Skippable.
- On answer, writes `{age, concern, stage, ts}` to `sessionStorage["urbane-ethos:personalization"]`, gated by `consent.personalization`.
- Rules table in `personalization.js`:
  - Concern → primary service surfaced first in services grid.
  - Concern → recommended blog tags + recommended staff member.
  - Age + Stage → hero CTA copy rewrite.
  - Stage=Ready to book → chatbot bubble pulses gently after 5s idle.
- Returning state: subtle banner "Showing recommendations based on your earlier answers · [Reset]". Reset clears the key.
- All rules are JSON-driven (`personalization.js` exports `RULES` object), no LLM dependency.

### 6.2 Conversational design
- Floating bubble bottom-right, every page. 56×56 button, 380×560 panel when open.
- Scripted decision tree in `content/{locale}/chatbot.json`. Tree shape:
  ```
  greeting → intent picker
    ├─ Book a session
    ├─ Ask about a service
    ├─ Pricing indication
    └─ Talk to a human
  ```
- Pricing branch: 3 qualifying questions → price *range* + "Confirm with our team" CTA. Hardcoded ranges in prototype, marked `[VERIFY WITH CENTER]` in chatbot.json.
- Talk-to-human branch: collects name + phone, then `wa.me` deep-link prepared. No real submission in prototype.
- Voice input: mic icon, Web Speech API. Hidden if unsupported or permission denied.
- TTS output: speaker icon to read bot responses aloud (SpeechSynthesis).
- Honors current i18n locale (Web Speech recognition language switches with toggle).
- Persists transcripts only if `consent.chatbot === true`; otherwise session-only.
- A11y: focus trapped when open, `Esc` closes, ARIA live region for new messages, button has descriptive `aria-label`.

### 6.3 More personal (real humans)
- Staff page: large warm photographs, "Hi, I'm [Name]" headline, one personal sentence beyond credentials.
- Home: 3 featured staff with the same treatment.
- Video-intro slots per staff: `<dialog>` modal opens, shows "Video coming soon" with a play-icon thumbnail. Honestly labeled — no fake video.
- Testimonial: anonymized first-name + child-age-band card.
- **Anti-AI-slop guardrail:** every image placeholder uses `alt="[REAL PHOTO REQUIRED] description of what should be here"`. README cites Mark Cuban's "backlash against generic AI content" as rationale.

### 6.4 Accessibility (WCAG 2.2 AA target, AAA where cheap)
- Semantic HTML5 throughout; one `<h1>` per page; heading levels contiguous.
- Color contrast: body text ≥ 7:1 (AAA); large text ≥ 4.5:1 (AAA). Tokens validated.
- Focus visible: 3px custom ring, never removed.
- Keyboard: full reachability, logical tab order, skip-to-content link first focusable.
- Motion: `prefers-reduced-motion: reduce` gates all animation.
- i18n labels: every `aria-label`, `alt`, `<label>`, and form error message lives in `common.json` and translates with the toggle.
- Forms: programmatic labels, `aria-describedby` hints, `aria-live="polite"` for async feedback.
- VUI: voice input + TTS output on chatbot (see 6.2).
- Font-size toggle in nav: cycles 100%/112%/125%, persisted in `localStorage["urbane-ethos:font-size"]`.
- Testing: `axe-core` CLI run (npm one-off, not a dep), keyboard sweep, VoiceOver smoke test.

---

## 7. Internationalization (i18n)

### 7.1 Locale support
- **EN** (default) and **BM** (Bahasa Malaysia).
- Toggle in header: `EN | BM` buttons, current locale marked with `aria-current="true"`.
- Persisted in `localStorage["urbane-ethos:locale"]`.
- `<html lang>` updates with toggle.
- No page reload — `i18n.js` runs swap on load and on toggle.

### 7.2 Mechanism
- Each translatable node: `data-i18n="namespace.key.path"` (e.g., `data-i18n="home.hero.title"`).
- Attributes via `data-i18n-attr="aria-label:common.nav.menu"` (colon-separated `attr:key`).
- `i18n.js` fetches `content/{locale}/{namespace}.json` (cached after first fetch), walks the dotted path, writes `textContent` or attribute value.
- Missing key → leaves existing markup, logs `console.warn` in development, falls back to EN.

### 7.3 Parity check
- `bin/check-i18n-parity.rb` walks `content/en/` and `content/ms/`, asserts every key path exists in both (ignoring `_meta`). Exits non-zero if not. Ruby stdlib only (`json`, `find`). Documented in README as `bin/check-i18n-parity.rb` (executable shebang `#!/usr/bin/env ruby`).
- `chatbot.json` is in scope for parity (decision-tree strings exist bilingual).
- `blog.json` is NOT in scope (intentionally EN-only).

### 7.4 Translation generation
- Phase 0b: Claude translates EN files to MS, file-by-file, applying `content/glossary.md` first.
- Glossary covers fixed terms: service names ("Speech Therapy" → "Terapi Pertuturan"), role titles, "Early Intervention" → "Intervensi Awal", legal terms in privacy notice.
- Every `ms/*.json` carries `_meta: { translatedBy: "claude-opus-4-7", reviewedBy: null, date: "2026-06-08" }`.

### 7.5 Blog
- EN-only. Toggle remains visible on `blog.html`. When MS is active, an inline notice (bilingual itself, in `common.json`) reads: "Site navigation translates; blog articles remain in English."

---

## 8. PDPA Compliance (Prototype-grade)

### 8.1 Consent banner
- First-visit bottom-anchored banner (not modal). Width = viewport. Buttons: **Accept all** / **Necessary only** / **Customize**.
- "Customize" expands an inline panel with four granular toggles:
  | Toggle | Locked | Covers |
  |---|---|---|
  | Necessary | yes | locale, font-size, consent state |
  | Analytics | no | page views, click events, analytics-demo data |
  | Personalization | no | micro-survey answers, sensitive PD |
  | Chatbot history | no | persisted transcripts |
- Each toggle has a short plain-language description, bilingual.
- Persisted: `localStorage["urbane-ethos:consent"] = {necessary, analytics, personalization, chatbot, ts, version}`.
- Version bump re-prompts.
- Footer link "Manage cookies" reopens panel.
- A11y: focus-trapped when open, `Esc` = "Necessary only" + close, `aria-live="polite"` announces appearance, never auto-dismisses.

### 8.2 Gating
- `personalization.js` reads consent before render and before read/write of sessionStorage. If `personalization === false`, micro-survey doesn't render at all.
- `chatbot.js` always renders. Persists transcripts only if `chatbot === true`; otherwise session-only.
- Analytics-demo logs to dashboard only if `analytics === true`.

### 8.3 Privacy notice (`privacy.html`)
- Bilingual via `content/{locale}/privacy.json`.
- Covers: data categories, purposes, sensitive PD callout, retention, third parties (none in prototype), data subject rights, withdrawal/complaint paths (JPDP), cookie/storage inventory, version, last-updated.
- DPO contact uses center's existing email/phone from scrape.
- Header callout: "Prototype-grade notice. Must be reviewed by Malaysian counsel before production launch."

---

## 9. Design Direction

### 9.1 Committed direction — B "Warm & Handcrafted"
Kenya Hara influence: tactile textures, considered whitespace, hand-drawn iconography, editorial typography pairing (warm humanist serif headings + clean humanist sans body). Slightly playful but never childish. Strong on human warmth — large photographs, soft palette anchored in warm neutrals with one earthy accent. Chatbot reads as a friendly receptionist, not a tech feature.

Tokens (final values fixed during build, ranges given here):
- Palette: warm cream base, deep warm brown ink, soft sage and terracotta secondaries, one bright accent for CTAs.
- Type scale: fluid, `clamp()`-based, 1.250 ratio.
- Spacing: 8-step ramp.
- Radii: generous, asymmetric where it earns it.
- Motion: gentle, ease-out, 200–400ms. All gated.

System reference: `design/directions/v2-warm/system.html` — tokens + every component, doubles as design-handoff doc.

### 9.2 Comparison artifacts (one-page each)
- `design/directions/v1-quiet/index.html` — "Quiet & Trustworthy", Pentagram-style information architecture, restrained palette, photography-led.
- `design/directions/v3-bold/index.html` — "Bold & Inclusive", high-contrast, big type, motion-forward, accessibility as a visible feature.

Each is a single long-scroll page: hero + services grid + staff card + chatbot widget in that direction's style. Pure visual comparison; no full content. **EN-only** — no i18n toggle, no chatbot logic, no consent banner. These are static comparison artifacts.

---

## 10. Tech Stack & Conventions

### 10.1 Stack (prototype)
- Pure HTML/CSS/JS. No build, no bundler, no framework.
- CSS: cascade layers (`@layer reset, tokens, base, components, utilities`), CSS custom properties for tokens, `:where()`, `clamp()`. No Tailwind, no Sass.
- JS: ES modules, no transpile.
- Browser targets: Safari 16+, Chrome 110+, Firefox 110+. Documented in README.
- Fonts: self-hosted WOFF2, two families max, `font-display: swap`, subsetted.
- Images: WebP + AVIF + JPEG fallback via `<picture>`. One-time manual optim during Phase 0 (`cwebp`/`avifenc`).
- Local dev: Ruby with a tiny WEBrick wrapper.
  - `Gemfile`: single dependency `gem "webrick"` (WEBrick was removed from Ruby stdlib in 3.0).
  - `bin/server`: 5-line Ruby script that runs `WEBrick::HTTPServer.new(Port: 8080, DocumentRoot: __dir__/"..").start`. Executable shebang `#!/usr/bin/env ruby`.
  - Run: `bundle install` once, then `bin/server` → http://localhost:8080.
  - Matches workspace `bin/setup` / `bin/dev` ergonomics from sibling Rails apps.

### 10.2 File conventions
- HTML: complete document per page; header/footer markup duplicated (acceptable for 8 pages).
- CSS modules: `tokens.css`, `base.css`, `components.css`, `motion.css` — loaded in that order.
- JS modules: `i18n.js`, `chatbot.js`, `personalization.js`, `consent.js`, `a11y.js`, `analytics-demo-data.js`. Loaded as `<script type="module">`.
- Content JSON: strict mirrored keys between `en/` and `ms/`. Parity script enforces.
- No `package.json`. No `node_modules/`. Node not required at any point.
- `Gemfile` present (single dep: `webrick`). `Gemfile.lock` checked in.
- `.gitignore`: `.DS_Store`, `*.log`, `.vscode/`, `vendor/bundle/`, `.bundle/`, `content/scraped-raw/`.

---

## 11. Open Items / Phase 3 Punch List

Captured in README under "Out of scope":
1. Domain & hosting setup.
2. Individual blog article pages (currently deep-link to live site).
3. BM human review (Malaysian native speaker + legal review of privacy notice).
4. Real chatbot LLM backend.
5. Real personalization (server-side, cross-session, with explicit ML).
6. Restoring standalone Events page.
7. Real staff intro videos.
8. Form submission backend (replacing `mailto:` and `wa.me`).
9. Image optimization automation (replacing one-time manual step).
10. Real analytics wiring (replacing the demo dashboard).
11. CMS / content authoring workflow.
12. Consent banner schema version bump strategy beyond v1.

---

## 12. Acceptance Criteria

The prototype is done when:

1. All 8 HTML pages render with verbatim scraped content (where applicable) and load without console errors.
2. `bundle install && bin/server` is sufficient to run locally — no build, no Node, no compiler.
3. EN/BM toggle works on every page that supports it, persists across pages, updates `<html lang>`.
4. `bin/check-i18n-parity.rb` exits 0.
5. Chatbot opens/closes, walks at least 4 decision-tree paths (Book / Service / Pricing / Human), respects locale, persists transcripts only when consented.
6. Micro-survey writes to sessionStorage only when consented, reorders services grid, surfaces "Recommended for you" rail.
7. Consent banner appears on first visit, persists choices, granular toggles work, "Manage cookies" footer link reopens panel.
8. `privacy.html` renders bilingual with all 10 sections.
9. `analytics.html` renders mock dashboard with inline SVG charts.
10. axe-core CLI run reports zero serious/critical violations on every page; any minor violations or documented exceptions (e.g. third-party Google Maps `iframe` lacking title) are listed in README under "Known a11y gaps".
11. VoiceOver smoke test confirms readable order on at least Home and Contact.
12. Direction B's `system.html` documents every component in use.
13. Directions A and C have a runnable one-page demo each.
14. README is complete and accurate.
15. Initial git history exists with a meaningful initial commit (no Anthropic/Claude trailer).

---

## 13. References

- Live site: https://www.urbaneethos.center/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- PDPA Malaysia 2010: https://www.pdp.gov.my/
- Workspace conventions: `/Users/deepsight/code/CLAUDE.md`
- Sibling project pattern (plain HTML prototype): `/Users/deepsight/code/bimnovate/`
