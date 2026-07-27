# Urbane Ethos — Website Revamp Prototype

A bilingual, no-build HTML/CSS/JS prototype for the urbaneethos.center revamp (a Malaysian early-intervention centre).

Authoritative EN content (multi-source — see below), draft Bahasa Malaysia translations, a mocked-but-interactive chatbot + personalization, a PDPA consent banner + privacy notice, WCAG 2.2 AA accessibility, and three internal design-direction comparison demos (B is the committed direction; A & C are artifacts).

- Live site (current): https://www.urbaneethos.center/
- Spec: [`docs/superpowers/specs/2026-06-08-urbane-ethos-revamp-design.md`](docs/superpowers/specs/2026-06-08-urbane-ethos-revamp-design.md)
- Content-replacement spec/plan: [`docs/superpowers/specs/2026-07-27-authoritative-content-replacement-design.md`](docs/superpowers/specs/2026-07-27-authoritative-content-replacement-design.md) · [`docs/superpowers/plans/2026-07-27-authoritative-content-replacement.md`](docs/superpowers/plans/2026-07-27-authoritative-content-replacement.md)
- A11y notes: [`docs/A11Y_NOTES.md`](docs/A11Y_NOTES.md)

## Status

**Phase 2 prototype. Not production.**

EN copy is now drawn from **authoritative sources** — the live Wix site scrape, the company-profile PDF (2026-05-24), the printed brochure, and co-director Nasirah's WhatsApp corrections. Anything no source covers is deliberately left as a greppable `⟪PLACEHOLDER⟫` Latin-lorem string (see "What's real vs draft vs mocked"). BM is machine-translated and still needs human + legal review before launch (especially `privacy.html`).

```
TODO: Careers page exists at ./careers.html (unlinked from nav/index — direct URL only). Decide placement + real copy before launch.
```

## Run locally

```
bundle install
bin/server         # http://localhost:8080
```

Requires Ruby ≥ 3.1. No Node required at runtime. The a11y audit uses `npx @axe-core/cli` (no install — Node only needed if you want to re-run that audit).

## Structure

```
index.html  about.html  staff.html  services.html  blog.html  contact.html
analytics.html  privacy.html  careers.html  post-year-end-promo.html      10 production pages (+ 404.html)
assets/
  css/          tokens / base / components / motion
  js/           i18n consent chatbot personalization nav a11y sage-stamp
                yt-embed analytics-demo-data page-load parallax cursor icons
  fonts/        Source Serif 4 + Inter (variable WOFF2, latin subset)
  img/scraped   verbatim from live site
  img/anchors   considered-photo placeholders (Picsum-seeded) + YouTube thumbnails
  img/staff-pdf interim low-res headshots extracted from the company-profile PDF
  img/placeholders  [REAL PHOTO REQUIRED] stand-ins
content/
  en/           authoritative + lorem-flagged English content (mirrored to ms/)
  ms/           draft Bahasa Malaysia translations
  blog.json     EN-only blog index (posts carry either localUrl or externalUrl)
  careers.json  EN-only careers copy (root-level, parity-exempt like blog.json)
  glossary.md   EN → BM fixed-term glossary
design/directions/
  v1-quiet      "Quiet & Trustworthy" — comparison artifact
  v2-warm       "Warm & Handcrafted" — committed direction (+ system reference)
  v3-bold       "Bold & Inclusive" — comparison artifact
bin/
  server                       Ruby WEBrick dev server
  check-i18n-parity.rb         EN/MS parity check (stdlib only)
test/
  parity-fixtures/             Fixture-driven tests for the parity script
  smoke/                       Browser-runnable smoke pages for each JS module
docs/
  HANDOVER.md
  A11Y_NOTES.md
  superpowers/specs/...        Design + content specs
  superpowers/plans/...        Implementation plans
```

**Two new pages (2026-07-27):**

- `careers.html` — job-openings / benefits page (content from the PDF). **Unlinked** from nav, index, and footer by client decision — reachable by direct URL only. See the TODO above.
- `post-year-end-promo.html` — the **first local static blog article**. The pattern: a root-level static HTML page, plus a `localUrl` field on its entry in `content/blog.json`. Posts with `localUrl` open in the same tab; posts with `externalUrl` still deep-link to the live site in a new tab.

## What's real vs draft vs mocked

EN content resolves to one of three states:

- **REAL (sourced).** Copy quoted from an authoritative source: the live **Wix** scrape, the **company-profile PDF** (2026-05-24), the printed **brochure**, and **co-director Nasirah's** WhatsApp corrections. This includes: the About-Us paragraph + Vision & Mission band; the 7 service items (screening and assessment are now **separate** services) + the four-programme block; the real staff roster (names, roles, credentials) + the Wix-sourced bios for the first four members; the corrected contact block — real email **urbaneethos@yahoo.com**, full address (`No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor`), and corrected hours (**Mon 12PM–5PM, Tue–Sat 9AM–6PM, closed Sun & public holidays**); the home positioning line + hero headline ("Therapy for every stage of life", distilled from the co-director's all-ages therapy-centre directive); the careers/benefits copy; the year-end promo article; and the upgraded chatbot service answers.

- **⟪PLACEHOLDER⟫ lorem (greppable, never rendered).** Any slot no source covers carries Latin lorem ipsum prefixed by the `⟪PLACEHOLDER⟫` sentinel, with its key in a sibling `_placeholder` map (parity-walked, so mirrored EN↔MS). The sentinel is a **tracking marker, not display copy**: `stripPlaceholder()` in `assets/js/i18n.js` suppresses it at the render layer, so a placeholder slot shows as empty (its block is skipped) instead of "Lorem ipsum". The markers stay in the JSON for the pre-launch swap — find every one:

  ```
  grep -rn "⟪PLACEHOLDER⟫" content/
  ```

  Current lorem slots: 5 staff bios + all 9 staff personal lines; 8 service sub-fields (incl. drafted FAQ pairs); 3 home staff-card personal lines + events blurb; privacy sections §1–§9 bodies; the chatbot pricing answer; two careers slots. (The hero headline is now real — see below.)

- **KEEP-functional scaffold.** Functional UI copy that isn't marketing prose and stays as-is: the PDPA **consent banner** (whole `consent.json`, still `_draft`), the **chatbot** decision-tree structure, contact **form labels** (`contact.json` `form.fields.tellUsMore*` stay `_draft` — functional, unsourced), and **nav / ARIA** strings. The only legitimate `_draft` survivors in the tree are these two files (EN + MS each).

**Draft BM translations:** machine-generated by Claude with the glossary applied first. `_meta.reviewedBy: null` in every MS file. Glossary at `content/glossary.md`. Needs Malaysian native-speaker review before launch.

**Mocked (interactive but not wired to a backend):** chatbot replies (scripted decision tree, no LLM), personalization rules (hard-coded concern→service map in `personalization.js`), staff intro videos (placeholder `<dialog>` / `data-yt-id` slots), analytics data (seeded fake data in `analytics-demo-data.js`), contact form submission (`mailto:` only — no backend).

### Pre-launch flags

- **Interim staff photos.** `assets/img/staff-pdf/` holds 8 low-res headshots extracted from the company-profile PDF. They are placeholders pending a proper shoot **and** parental/staff photo consent. The face↔name mapping was done by eye from the PDF grid and needs a human confirmation. Nur Ain Nabila (Administrator) has **no** PDF photo — her card still shows the initials `[REAL PHOTO REQUIRED]` placeholder.
- **Pricing** is still placeholder — the chatbot's price answer is a `⟪PLACEHOLDER⟫` sentinel (the centre's charges list was never supplied).
- **Privacy notice** §1–§9 bodies are intentional lorem, pending a real, counsel-reviewed notice. §0 ("Who we are") is real.
- **BM** is machine-generated (`reviewedBy: null`) and unreviewed.
- **Blog promo date** (`2025-12-01`) is approximate — promos are undated; confirm with the client.

## Browser support

Modern only — Safari 16+, Chrome 110+, Firefox 110+. The site uses CSS cascade layers, modern custom properties, `clamp()`, `:where()`, native `<dialog>`. No transpile, no polyfills.

## i18n parity check

```
bin/check-i18n-parity.rb
```

Exit 0 = all keys mirrored between `content/en/` and `content/ms/` (9 namespaces). The `_placeholder` maps **are** walked and must mirror key-for-key; only `_meta` / `_draft` / `_correction` are skipped. `blog.json` and `careers.json` are root-level and intentionally EN-only (parity-exempt).

## Blog posts

Blog articles are authored as Markdown in `content/blog/posts/*.md` (YAML frontmatter + body) and generated to static `post-<slug>.html` pages plus the `content/blog.json` `posts[]` index by:

```
ruby bin/build-blog.rb
```

Requires the `kramdown` dev gem (`bundle install`). The generator is authoring-time only — deployment serves the committed `post-*.html` as-is; no build runs in CI. To add a post: drop a new `.md` in `content/blog/posts/`, run the generator, commit the generated files. Bodies render in their source language (EN, plus one BM post) and stay parity-exempt.

## Known a11y gaps

Axe-core 4.11 reports **0 violations** on the production pages. Target: 0 across all **10** pages (`/`, about, staff, services, blog, contact, analytics, privacy, careers, post-year-end-promo). Residual items not covered by the automated sweep:

- **Design-direction comparison pages** (`design/directions/v1-quiet/`, `v2-warm/`, `v3-bold/`) are internal artifacts, not linked from production routing, and intentionally excluded from the AA target.
- **Chatbot panel** is built lazily on launcher click, so the CLI sweep only sees the static snapshot; `bin/axe-chatbot.mjs` (playwright) opens the panel and scopes axe to it (last run: 0 violations).
- **Google Maps iframe** on `/contact.html` carries a parent-level `title`; the iframe's inner DOM is third-party and outside this repo's a11y surface.
- **Manual / VoiceOver checks not yet automated:** chatbot focus trap + `Escape` close, contact form error announcement after submit, skip-link landing on `#main-content`, arrow-key navigation across personalization chips, and `prefers-reduced-motion` short-circuiting in `motion.css`.

Full details in [`docs/A11Y_NOTES.md`](docs/A11Y_NOTES.md).

## Out of scope (Phase 3+)

- Real staff photo shoot + parental/staff consent workflow (interim PDF headshots in place)
- Real service pricing (chatbot answer is a placeholder)
- Counsel-reviewed privacy notice (§1–§9 are lorem)
- BM human + legal review (especially `privacy.html`)
- Careers page placement + real copy (currently unlinked, direct-URL only)
- Turning the concerns checklist / screening-vs-assessment decision tree into real interactive tools (currently prose in the services copy + chatbot script)
- Real chatbot LLM backend (currently a scripted decision tree)
- Real server-side personalization (currently client-side rules-based)
- Real staff intro videos
- Contact form submission backend (currently `mailto:` only)
- Real analytics wiring (currently a demo dashboard with seeded fake data)
- CMS / content authoring workflow
- Standalone Events page (currently a home teaser + contact CTA)

## Credits

Original site: https://www.urbaneethos.center/
Content sources: company-profile PDF (2026-05-24), printed brochure, co-director Nasirah's corrections, live Wix scrape.
Revamp prototype: built 2026-06; authoritative content pass 2026-07-27.
