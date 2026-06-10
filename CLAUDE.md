# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **static, no-build, bilingual HTML/CSS/JS prototype** for the urbaneethos.center revamp (a Malaysian early-intervention centre). Eight production pages, three internal design-direction comparison demos, EN content scraped verbatim from the live site, draft Bahasa Malaysia translations. No framework, no transpile, no bundler — every `.html` and `assets/*` file is served exactly as it is on disk.

**Status: Phase 2 prototype, not production.** Several items are deliberately mocked: chatbot replies (scripted decision tree, no LLM), personalization rules (hard-coded `concern → service` map), staff videos, analytics data, contact form submission (`mailto:` only). See `README.md` § "What's real vs draft vs mocked" before changing anything that looks production-shaped.

Primary reference docs (read these before non-trivial work):

1. `docs/HANDOVER.md` — current state, what just landed, what's open, deferred items.
2. `README.md` — project overview, run instructions, real-vs-draft inventory.
3. `docs/A11Y_NOTES.md` — axe-core audit results, fixed violations, manual checks still owed.
4. `docs/superpowers/specs/` and `docs/superpowers/plans/` — design specs and executed implementation plans (Phase 1 motion, Phase 2 media, Phase 4 canggih layer).

## Run / test commands

```bash
bundle install          # one-time; installs WEBrick gem
bin/server              # http://localhost:8080 (Ruby WEBrick, serves repo root)
bin/check-i18n-parity.rb # exits non-zero if any key in content/en/*.json is missing in content/ms/*.json (or vice versa)
```

`bin/server` requires **Ruby ≥ 3.1**. No Node required at runtime.

axe-core a11y sweep (manual; not gated in CI — heavy):

```bash
bin/server &
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done
```

axe-core CLI needs a ChromeDriver matching the locally installed Chrome major version — see `docs/A11Y_NOTES.md` § "Tooling" for the exact incantation. **Target: 0 violations on all 8 production pages.**

There is no `npm test` / `bundle exec rspec` — the only automated check is `bin/check-i18n-parity.rb` (gated in both `.github/workflows/pages.yml` and `.gitlab-ci.yml`). `test/parity-fixtures/` are inputs for that script; `test/smoke/` are browser-runnable smoke pages — open them in `bin/server` and click around.

## Architecture

### Pages and routing

Eight HTML files at the repo root are the production pages: `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`, plus `404.html`. Each `<body>` carries a page-class (`home` / `about` / `services` / etc.) used by CSS and JS for contextual targeting.

`design/directions/v{1-quiet,2-warm,3-bold}/` are **internal design-direction comparison artifacts**, not linked from production routing. v2-warm is the committed direction; v1 and v3 are kept as comparison material. They're intentionally excluded from the WCAG AA target and from the Pages deploy.

### CSS architecture

Four files loaded in order on every page: `tokens.css` → `base.css` → `components.css` → `motion.css`. Uses CSS cascade layers, modern custom properties, `clamp()`, `:where()`, native `<dialog>`. **Modern browsers only (Safari 16+, Chrome 110+, Firefox 110+).** No transpile, no polyfills, no autoprefixer.

Design tokens (palette, type scale, motion durations, "canggih" atmospheric tokens) live in `tokens.css`. Per the design doc, cut these tokens when calibrating — don't raise them.

Known architectural drift (from `docs/HANDOVER.md`): Phase 4 canggih CSS blocks and Phase 2 `.anchor-photo` / `.yt-embed` blocks currently live **outside** `@layer components`. A future refactor should move them inside the layer.

### JS modules

ESM only, loaded via `<script type="module">` in each HTML page. Eleven modules in `assets/js/`:

- `i18n.js` — locale resolution (EN/MS), `data-i18n="ns.path"` text and `data-i18n-attr="alt:ns.path"` attribute substitution, falls back to EN when a MS key is missing. Caches namespace fetches.
- `consent.js` — PDPA consent banner, three save paths (Accept all / Necessary only / Customize+Save).
- `sage-stamp.js` — sage-ink stamp+checkmark microinteraction used by consent save and personalization save (Phase 1 craft moment).
- `personalization.js` — home micro-survey reorders the services grid via a rules table keyed off canonical EN strings (`"Speech"`, `"Motor skills"`, …). **Rules only fire reliably when locale is EN** — survey still records but matching may miss in BM. Acceptable for prototype.
- `chatbot.js` — scripted decision tree (no LLM), bilingual, lazy-builds the panel on launcher click. Voice in via Web Speech API + TTS via SpeechSynthesis where available.
- `a11y.js` — skip-link focus management, font-size cycle (`data-fs-cycle` button → `<html data-fs="N">`), focus-visible polishing.
- `analytics-demo-data.js` — seeds the `/analytics.html` demo dashboard with fake data. Not real telemetry.
- `yt-embed.js` — lazy click-to-load YouTube via `youtube-nocookie.com`, autoplay on click, iframe `title` from `data-yt-title`. Slots have `data-yt-id="PLACEHOLDER_*"` until real IDs swap in pre-launch.
- `page-load.js`, `parallax.js`, `cursor.js` — Phase 4 canggih layer modules (page-load ink-bloom, hero parallax, sage ink-dot cursor).

### Canggih layer wiring rule (Phase 4)

Any module that participates in the always-on canggih layer **must be imported in every one of the 8 HTML pages**. The convention: insert the import immediately after `./assets/js/a11y.js`. Pages without a11y.js (`privacy.html`, `analytics.html`) anchor on the next stable import (`consent.js` on privacy, `analytics-demo-data.js` on analytics).

If a new canggih module ships without wiring to all 8 pages, it silently appears only where it was added. Smoke check after wiring changes:

```bash
grep -c "<module-name>.js" *.html | paste -sd+ | bc   # must equal 8
```

### Content / i18n

```
content/
  en/   ms/      9 mirrored JSON files: home, about, staff, services, contact, privacy, common, consent, chatbot
  blog.json      EN-only (blog cards deep-link out to live-site articles)
  glossary.md    EN → BM fixed-term glossary (apply before translating)
  scraped-raw/   gitignored cache of HTML scraped from urbaneethos.center
```

i18n key shape is `<namespace>.<dot.path>`, where `<namespace>` is the JSON filename. `content/{en,ms}/<namespace>.json` must have identical key trees (excluding `_meta`, `_draft`, `_correction` markers) — enforced by `bin/check-i18n-parity.rb`. CI gates on this.

Special metadata keys (stripped from i18n parity checks, never rendered):
- `_meta.scrapedAt`, `_meta.reviewedBy`, `_meta._note` — provenance.
- `_draft: true` (or a map of `{ "dot.path": true }`) — flags strings drafted to fill live-site gaps; needs client review and replacement before launch.
- `_correction` — translation reviewer notes.

`content/ms/*.json` currently all carry `_meta.reviewedBy: null` — Bahasa Malaysia translations are machine-generated with the glossary applied. **`privacy.html` MS especially needs human + legal review before launch.**

### Image placeholders

Every photo that needs a real shot pre-launch is flagged in two ways:

1. `aria-label="[REAL PHOTO REQUIRED] <subject>"` on the placeholder element — greppable for `[REAL PHOTO REQUIRED]`.
2. Picsum-derived seeded JPGs in `assets/img/anchors/` for the considered-photo `<figure class="anchor-photo">` slots and YouTube thumbnails.

**Pre-launch swap workflow:** replace JPGs in `assets/img/anchors/` keeping the same filenames; update `data-yt-id` on each `<div class="yt-embed">` with real YouTube IDs. No markup changes needed.

## Conventions and gotchas

- **All paths are relative (`./foo`, not `/foo`)** so the prototype works identically at root, custom-domain root, or repo-subpath (e.g. `username.github.io/urbane-ethos/`). Keep this convention for any new module specifier, asset, or link.
- **Modern-browser only.** Don't add polyfills or transpile steps. If a feature can't be expressed in raw modern CSS/JS, raise it rather than adding tooling.
- **No build step.** Everything is served as-is. There is no `dist/` or `_site/` to commit — `_site/` and `public/` are deploy-time artifacts and are gitignored.
- **Don't generalize aggressively.** Phase 1 motion, Phase 2 media, and Phase 4 canggih landed via deliberate plans; each phase has its own design doc. Read the relevant plan in `docs/superpowers/plans/` before touching the systems it shipped.
- **axe-core ratchet: 0 violations on all 8 production pages.** Any change that risks regressing this should be re-audited locally before pushing. CI does not gate on axe.

## Deployment

Two parallel Pages targets share an identical artifact (same exclusion list, same i18n-parity gate):

- **GitHub Pages** (immediate target): `.github/workflows/pages.yml` deploys on push to `main`. Target remote `git@github.com:Kintsugi-Design/urbane-ethos.git`, public URL `https://kintsugi-design.github.io/urbane-ethos/`. First-run Pages enablement is automated via `actions/configure-pages@v5` with `enablement: true`.
- **GitLab Pages** (deferred): `.gitlab-ci.yml` is committed and ready; the `pages` job requires the self-hosted GitLab instance to have Pages enabled. Until then, expect a red pipeline if pushing to `origin/main` (`origin` = GitLab). Doesn't block anything else.

Both pipelines run `bin/check-i18n-parity.rb` first, then rsync-stage to `_site/` (GH) or `public/` (GL). If you add a new dev-only directory, mirror the exclusion in **both** workflow files.

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
