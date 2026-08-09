# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **static, no-build, bilingual HTML/CSS/JS prototype** for the urbaneethos.center revamp (a Malaysian early-intervention centre). Ten production pages, three internal design-direction comparison demos, EN content scraped verbatim from the live site, draft Bahasa Malaysia translations. No framework, no transpile, no bundler — every `.html` and `assets/*` file is served exactly as it is on disk.

**Status: Phase 2 prototype, not production.** Several items are deliberately mocked: chatbot replies (scripted decision tree, no LLM), personalization rules (hard-coded `concern → service` map), staff videos, analytics data, contact form submission (`mailto:` only). See `README.md` § "What's real vs draft vs mocked" before changing anything that looks production-shaped.

Primary reference docs (read these before non-trivial work):

1. `docs/HANDOVER.md` — current state, what just landed, what's open, deferred items.
2. `README.md` — project overview, run instructions, real-vs-draft inventory.
3. `docs/A11Y_NOTES.md` — axe-core audit results, fixed violations, manual checks still owed.
4. `docs/superpowers/specs/` and `docs/superpowers/plans/` — design specs and executed implementation plans (Phase 1 motion, Phase 2 media, Phase 4 canggih layer).

## Run / test commands

```bash
bundle install               # one-time; installs WEBrick gem
bin/server                   # http://localhost:8080 (Ruby WEBrick, serves repo root)
bin/check-i18n-parity.rb     # exits non-zero if any key in content/en/*.json is missing in content/ms/*.json (or vice versa)
ruby bin/check-contact-channels.rb  # exits non-zero if any mailto:/tel:/wa.me literal in the shipped pages disagrees with content/
```

`bin/check-contact-channels.rb` builds its allowlist **from content, never hard-coded** (`content/en/contact.json` `email`/`phones[]`, `content/en/common.json` `footer.*`, `content/careers.json` `outro.email`), derives the `wa.me` E.164 target by the same rule `enquiry.js` uses, then scans every root `*.html` (including the 38 generated `post-*.html`), `content/blog/_post.html.erb`, and `content/blog/posts/*.md`. Template expressions (`mailto:${…}`, `<%= … %>`) are skipped, not failed. It exists because a `content/`-only grep gate cannot see an address hard-coded in a page's inline script — which is how `info@urbaneethos.center` silently received every form submission for weeks.

`bin/server` requires **Ruby ≥ 3.1**. No Node required at runtime.

axe-core a11y sweep (manual; not gated in CI — heavy):

```bash
bin/server &
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html careers.html post-year-end-promo.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done
```

axe-core CLI needs a ChromeDriver matching the locally installed Chrome major version — see `docs/A11Y_NOTES.md` § "Tooling" for the exact incantation. **Target: 0 violations on all 10 production pages.**

There is no `npm test` / `bundle exec rspec`. The automated checks are `bin/check-i18n-parity.rb` and `bin/check-contact-channels.rb` — both gated, **in that order**, in `.github/workflows/pages.yml` (job `ci`) and `.gitlab-ci.yml` (job `content-gates`). Keep the two pipelines identical: same gates, same order. `test/parity-fixtures/` are inputs for the parity script; `test/smoke/` are browser-runnable smoke pages — open them in `bin/server` and click around. `test/smoke/enquiry.html` is the one that self-asserts (54 assertions; every line must read PASS).

## Architecture

### Pages and routing

Ten HTML files at the repo root are the production pages: `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`, `careers.html`, `post-year-end-promo.html`, plus `404.html`. Each `<body>` carries a page-class (`home` / `about` / `services` / etc.) used by CSS and JS for contextual targeting.

`careers.html` is deliberately **direct-URL only** — unlinked from nav, index, and footer (client decision on placement pending). `post-year-end-promo.html` is the **first local static blog article**.

Blog article pages (`post-*.html`) are **generated** from `content/blog/posts/*.md` by `bin/build-blog.rb` (kramdown, dev-group gem) through `content/blog/_post.html.erb`. Do not hand-edit `post-*.html` or the `posts[]` array in `content/blog.json` — edit the Markdown source and re-run the generator (`ruby bin/build-blog.rb`). All **38** blog pages are local (37 posts migrated from the live Wix site + the year-end promo); the blog cards in `blog.html` route `localUrl` posts to the same tab. Post images live in `assets/img/blog/<slug>/` (hero via the `hero_image` frontmatter key, inline images embedded in the Markdown body). Blog bodies are single-language per source (mostly EN, some BM) and remain parity-exempt. `content/blog.json` `categories` is the filter set; category is stored per post in frontmatter. Blog article pages are **not** part of the "10 production pages" canggih/axe accounting (the promo page never was either).

`design/directions/v{1-quiet,2-warm,3-bold}/` are **internal design-direction comparison artifacts**, not linked from production routing. v2-warm is the committed direction; v1 and v3 are kept as comparison material. They're intentionally excluded from the WCAG AA target and from the Pages deploy.

### CSS architecture

Four files loaded in order on every page: `tokens.css` → `base.css` → `components.css` → `motion.css`. Uses CSS cascade layers, modern custom properties, `clamp()`, `:where()`, native `<dialog>`. **Modern browsers only (Safari 16+, Chrome 110+, Firefox 110+).** No transpile, no polyfills, no autoprefixer.

Design tokens (palette, type scale, motion durations, "canggih" atmospheric tokens) live in `tokens.css`. Per the design doc, cut these tokens when calibrating — don't raise them.

All component blocks live inside `@layer components`. The earlier architectural drift across Phase 2 + Phase 4 was closed in the polish pass (W1 — commit `3d6709c`).

### JS modules

ESM only, loaded via `<script type="module">` in each HTML page. **Sixteen** modules in `assets/js/` (this count was stale at "eleven" for several builds — it omitted `icons.js`, `map-embed.js`, `sage-stamp.js` and `yt-embed.js`; verify with `ls -1 assets/js/*.js | wc -l` before trusting it):

- `storage.js` — **the single storage gate.** Consent-aware and exception-safe: `allowed / get / set / remove / clearAll`. **Imports nothing, deliberately** — it owns `CONSENT_KEY` and `CONSENT_VERSION` and `consent.js` imports them, inverting what would otherwise be an ESM cycle (`consent → storage → consent`). `set()` returns `false` without writing when consent for the category is absent, so an ungated write is impossible to express. Nothing throws: private mode, quota and parse failures all degrade to a fallback. **Not a canggih-layer module** — no 10-page wiring. **No `localStorage`/`sessionStorage` call may exist anywhere else in `assets/js/`.**
- `enquiry.js` — **the single contact-channel source.** `readInterest / composeEnquiry / channels / mailtoUrl / whatsappUrl`. `channels()` derives email + WhatsApp from the parity-gated `contact` namespace; the `wa.me` target is computed, never stored twice. `channels().email === null` means *cannot send* — callers must surface the copy fallback and must **never** substitute a hard-coded address. The transport message copy is intentionally English-only and hard-coded here (it is addressed to the centre, not the visitor), so do **not** add `contact.enquiry.*` i18n keys. **Not a canggih-layer module.**
- `i18n.js` — locale resolution (EN/MS), `data-i18n="ns.path"` text and `data-i18n-attr="alt:ns.path"` attribute substitution, falls back to EN when a MS key is missing. Caches namespace fetches. Content URLs resolve against **`import.meta.url`** (`assets/js/` → `../../content/`), not the document, so they work from any page depth and at any deploy root — see the gotcha below.
- `consent.js` — PDPA consent banner, three save paths (Accept all / Necessary only / Customize+Save).
- `sage-stamp.js` — sage-ink stamp+checkmark microinteraction used by consent save and personalization save (Phase 1 craft moment).
- `personalization.js` — home micro-survey reorders the services grid via a rules table keyed off locale-agnostic slugs (`speech`, `motor-skills`, `behaviour`, `learning`, `not-sure`). Chip `<input value>` carries the slug; the chip's label translates via i18n. Rules fire identically in EN and BM; `sessionStorage` is locale-stable across toggles.
- `nav.js` — hamburger toggle for the primary nav below 768px. Click opens, Escape / click-outside / re-click closes; focus trap while open; viewport-resize past 768px auto-closes. `aria-label` syncs to `common.nav.menu` / `menuClose` via i18n.t. Wired on all 10 production pages via the canggih layer convention. No-ops on pages without a `.nav-toggle` (analytics + privacy have no primary nav).
- `chatbot.js` — scripted decision tree (no LLM), bilingual, lazy-builds the panel on launcher click. Voice in via Web Speech API + TTS via SpeechSynthesis where available.
- `a11y.js` — skip-link focus management, font-size cycle (`data-fs-cycle` button → `<html data-fs="N">`), focus-visible polishing.
- `analytics-demo-data.js` — seeds the `/analytics.html` demo dashboard with fake data. Not real telemetry.
- `yt-embed.js` — lazy click-to-load YouTube via `youtube-nocookie.com`, autoplay on click, iframe `title` from `data-yt-title`. Slots have `data-yt-id="PLACEHOLDER_*"` until real IDs swap in pre-launch.
- `page-load.js`, `parallax.js`, `cursor.js` — Phase 4 canggih layer modules (page-load ink-bloom, hero parallax, sage ink-dot cursor).
- `icons.js` — inline SVG sprite map (`data-icon="name"` → Heroicons outline, plus a filled `whatsapp` brand mark). All entries carry `aria-hidden="true"`.
- `map-embed.js` — click-to-load Google Maps facade (index + contact only, page-specific like `yt-embed.js`). Zero google/gstatic requests fire before the visitor presses "Load map".

### Canggih layer wiring rule (Phase 4)

Any module that participates in the always-on canggih layer **must be imported in every one of the 10 HTML pages**. The convention: insert the import immediately after `./assets/js/a11y.js`. Pages without a11y.js (`privacy.html`, `analytics.html`) anchor on the next stable import (`consent.js` on privacy, `analytics-demo-data.js` on analytics).

If a new canggih module ships without wiring to all 10 pages, it silently appears only where it was added. Smoke check after wiring changes:

**Scope these greps to the 10 production pages.** A bare `*.html` glob also matches the 37 generated `post-*.html` blog pages, which carry the same imports — you'll get 47/46/45 instead of 10/9/8 and think something is wrong.

```bash
# note: literal file list, not a shell variable — zsh does not word-split unquoted vars
grep -l "<module-name>.js" index.html about.html staff.html services.html blog.html \
  contact.html analytics.html privacy.html careers.html post-year-end-promo.html | wc -l   # must equal 10
```

Not every module is on all 10 pages — only the always-on canggih modules are. Expected per-module import counts (verify after wiring changes):

```bash
for m in nav icons page-load cursor i18n consent a11y chatbot parallax; do printf "%-14s" $m; \
  grep -l "assets/js/$m.js" index.html about.html staff.html services.html blog.html \
  contact.html analytics.html privacy.html careers.html post-year-end-promo.html | wc -l; done
# nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3
```

`i18n`/`consent` skip one page each, `a11y`/`chatbot` skip two (analytics + privacy have no primary nav/skip-link surface), and `parallax` is hero-only (3 pages).

### Content / i18n

```
content/
  en/   ms/      9 mirrored JSON files: home, about, staff, services, contact, privacy, common, consent, chatbot
  blog.json      EN-only (blog cards deep-link out to live-site articles)
  careers.json   EN-only (root-level, parity-exempt like blog.json — feeds the unlinked careers.html)
  glossary.md    EN → BM fixed-term glossary (apply before translating)
  scraped-raw/   gitignored cache of HTML scraped from urbaneethos.center
```

Root-level `content/*.json` (`blog.json`, `careers.json`) are EN-only and **exempt** from the parity gate — the parity script only globs `content/en/` against `content/ms/`.

i18n key shape is `<namespace>.<dot.path>`, where `<namespace>` is the JSON filename. `content/{en,ms}/<namespace>.json` must have identical key trees (excluding `_meta`, `_draft`, `_correction` markers) — enforced by `bin/check-i18n-parity.rb`. CI gates on this.

Special metadata keys — `_meta.*`, `_draft`, and `_correction` are **stripped** from i18n parity checks and never rendered; `_placeholder` is **not stripped** (it is walked like any other key — see below):
- `_meta.scrapedAt`, `_meta.reviewedBy`, `_meta._note` — provenance.
- `_draft: true` (or a map of `{ "dot.path": true }`) — flags strings drafted to fill live-site gaps; needs client review and replacement before launch.
- `_correction` — translation reviewer notes.
- `_placeholder` — a sibling top-level map `{ "dot.path": true }` marking strings whose visible value is Latin lorem ipsum prefixed with the sentinel `⟪PLACEHOLDER⟫ ` (greppable for `⟪PLACEHOLDER⟫`), pending a real source. **Unlike `_meta`/`_draft`/`_correction`, `bin/check-i18n-parity.rb` DOES walk `_placeholder`** — so each EN `_placeholder` map must be reproduced key-identical in its MS mirror, or parity fails. Keys use the same dot-path convention as `_draft`. Do not modify the parity script to exempt it.

`content/ms/*.json` currently all carry `_meta.reviewedBy: null` — Bahasa Malaysia translations are machine-generated with the glossary applied. **`privacy.html` MS especially needs human + legal review before launch.**

### Image placeholders

Every photo that needs a real shot pre-launch is flagged in two ways:

1. `aria-label="[REAL PHOTO REQUIRED] <subject>"` on the placeholder element — greppable for `[REAL PHOTO REQUIRED]`.
2. `assets/img/anchors/` — the considered-photo `<figure class="anchor-photo">` slots and YouTube thumbnails. These now hold **real client photos** (face-hidden centre shots) plus bespoke illustrations, not the original picsum seeds.
3. `assets/img/staff-pdf/` — 6 **low-res interim headshots** extracted from the company-profile PDF, flagged `"photoInterim": true`.
4. `assets/img/staff/` — **real, client-submitted headshots**, flagged `"photoInterim": false`. These are finished: do NOT include them in the pre-launch photo swap.
5. `assets/img/culture/` — team/culture photos for the `careers.html` culture strip, captioned from `content/careers.json` (EN-only, parity-exempt).

Nur Ain Nabila (Administrator) has `"photo": null` and renders an initials tile — that is intentional, not a missing file.

**Photo governance rule (client decision, 2026-08-09):** no identifiable children's faces, and no photo where personal information is readable (client names, appointment schedules, name tags). Audit any new photo against this before wiring it in — several supplied photos were rejected for exactly these reasons. See `docs/superpowers/specs/2026-08-09-staff-refresh-and-photo-integration-design.md` § 2.4.

**Gotcha:** the staff-card renderers in `staff.html` and `index.html` gate the `<img>` on `m.photo` alone. They previously gated on `m.photo && m.photoInterim`, which silently rendered a real (non-interim) photo as an initials tile. Don't reintroduce that.

**Pre-launch swap workflow:** replace JPGs in `assets/img/anchors/` and `assets/img/staff-pdf/` keeping the same filenames (staff-pdf swaps also warrant clearing the `photoInterim` flags after a proper shoot + consent); update `data-yt-id` on each `<div class="yt-embed">` with real YouTube IDs. No markup changes needed.

## Conventions and gotchas

- **All paths are relative (`./foo`, not `/foo`)** so the prototype works identically at root, custom-domain root, or repo-subpath (e.g. `username.github.io/urbane-ethos/`). Keep this convention for any new module specifier, asset, or link.
- **Fetching `content/` from a JS module: resolve against `import.meta.url`, not the document.** A bare `fetch("content/x.json")` is *document*-relative, so it only works for pages sitting at the deploy root. Every production page does, which is why this hid for months — but it silently 404s from any subdirectory, and that is precisely what broke `test/smoke/i18n.html` and `test/smoke/chatbot.html` into rendering **zero assertions** (the loader rejected before the first assertion ran, so the page reported neither PASS nor FAIL — it looked fine). Use `new URL("../../content/…", import.meta.url)` as `i18n.js` and `chatbot.js` do: the module's position relative to `content/` is fixed, so it is correct at the repo root, at a custom-domain root, and at a repo subpath, and it introduces no root-absolute literal. `map-embed.js` is the one remaining document-relative fetch (harmless — root-only consumers).
- **Modern-browser only.** Don't add polyfills or transpile steps. If a feature can't be expressed in raw modern CSS/JS, raise it rather than adding tooling.
- **No build step.** Everything is served as-is. There is no `dist/` or `_site/` to commit — `_site/` and `public/` are deploy-time artifacts and are gitignored.
- **Don't generalize aggressively.** Phase 1 motion, Phase 2 media, and Phase 4 canggih landed via deliberate plans; each phase has its own design doc. Read the relevant plan in `docs/superpowers/plans/` before touching the systems it shipped.
- **axe-core ratchet: 0 violations on all 10 production pages.** Any change that risks regressing this should be re-audited locally before pushing. CI does not gate on axe.

## Deployment

Two parallel Pages targets share an identical artifact (same exclusion list, same two content gates):

- **GitHub Pages** (immediate target): `.github/workflows/pages.yml` deploys on push to `main`. Target remote `git@github.com:Kintsugi-Design/urbane-ethos.git`, public URL `https://kintsugi-design.github.io/urbane-ethos/`. First-run Pages enablement is automated via `actions/configure-pages@v5` with `enablement: true`.
- **GitLab Pages** (deferred): `.gitlab-ci.yml` is committed and ready; the `pages` job requires the self-hosted GitLab instance to have Pages enabled. Until then, expect a red pipeline if pushing to `origin/main` (`origin` = GitLab). Doesn't block anything else.

Both pipelines run `bin/check-i18n-parity.rb` then `bin/check-contact-channels.rb` — same gates, same order — before rsync-staging to `_site/` (GH job `ci`) or `public/` (GL job `content-gates`). If you add a new dev-only directory, mirror the exclusion in **both** workflow files; if you add a gate, add it to both in the same position.

## Commit messages

Per workspace policy (see `/Users/deepsight/code/CLAUDE.md`): **do not add `Co-Authored-By: Claude` trailers or "Generated with Claude Code" lines** to commits in this repo.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
