# Handover — Urbane Ethos prototype

**Last updated:** 2026-06-10 (after Phase 2 photography + YouTube scaffolding landed)
**HEAD:** `363fe6c` on `feat/polish-pass-phase2` (Phase 2 photography + YouTube scaffolding; to be merged to `main`)
**Live test:** `bundle install && bin/server` → http://localhost:8080

---

## Where we are

A bilingual interactive HTML prototype of the urbaneethos.center revamp. ~30 commits on `main`. Eight production pages, three design-direction comparison demos, 6 JS modules, 4 CSS files, EN+MS content (BM is draft, needs human review). PDPA consent flow with sage-stamp save confirmation. Mocked-but-interactive chatbot + personalization. axe-core: 0 serious/critical violations across all 8 pages.

Just landed: **Phase 1 of the polish pass** — paper-and-ink craft microinteractions tied to Direction B's Kenya Hara design language (commit `28c5060`).

Just landed (Phase 4): **canggih layer** — atmospheric depth (A1 page-load ink-bloom, A2 sage ink-dot cursor, A3 paper-grain texture, A5 sage `::selection`) always-on + cinematic pacing (A4 hero parallax, C1 100vh hero, C4 paper-fold reveals via extended `.fade-in-up`). 7 moves, all KEEP after T9 tracer-bullet calibration. Design doc: `/Users/deepsight/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md`. Plan: `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md`. axe-core still: 0 serious/critical across all 8 pages (one regression caught + fixed at T13 — the A1 bloom now uses a `body::before` overlay instead of `opacity` on `<main>`, preserving text contrast during the bloom window).

Just landed (Phase 2): **photography + YouTube scaffolding** — `.anchor-photo` figure component for considered photo placeholders + lazy click-to-load `.yt-embed` component for video slots. 6 anchor photos + 2 custom YouTube thumbnails seeded via picsum.photos in `assets/img/anchors/`. New `media.*` i18n namespace mirrored EN + MS (MS marked `_draft: true` for translator review). Home hero replaces the "Watch our intro" CTA with a yt-embed; contact page adds a centre-tour yt-embed below the address block. Anchor photos on home, about, services heroes + mood images on first 3 service blocks. Real photos + real YouTube IDs swap in pre-launch by filename / data-yt-id replacement only — zero markup changes. axe-core still: 0 serious/critical across all 8 pages.

## What's open

Three named workstreams, in priority order:

### 1. Phase 2 — photography + YouTube scaffolding — DONE 2026-06-10

Shipped. Plan: `docs/superpowers/plans/2026-06-10-phase2-photography-youtube.md`. Spec: `docs/superpowers/specs/2026-06-08-polish-pass-design.md` (Phase 2 section).

Landed:
- 6 anchor photos in `assets/img/anchors/` (home/about/services heroes + 3 service mood images), plus 2 custom YouTube thumbnails (home intro + centre tour). All placeholders via picsum.photos with descriptive seeds for deterministic rendering.
- `.anchor-photo` `<figure>` component in `components.css` — rounded image + small serif italic caption in muted ink.
- `.yt-embed` component in `components.css` + `assets/js/yt-embed.js` module (lazy click-to-load via youtube-nocookie.com, autoplay on click, iframe title from `data-yt-title`).
- New `media.*` i18n namespace under `content/{en,ms}/common.json` (captions, alt text, video titles, play button label, source attribution). MS is `_draft: true` — needs Malaysian native-speaker review. Known stiff strings flagged for review: `serviceMood1` alt ("Detail dalaman yang tenang" — prefer "Perincian dalaman"), `serviceMood3` alt ("Kajian cahaya yang dipertimbangkan" — prefer "Kajian cahaya yang teliti"), `servicesHero` alt ("tiada wajah dapat dikenali" — prefer "tiada wajah kelihatan" for marketing tone).
- Per-page wiring: anchor photo on home / about / services heroes; mood images on first 3 service blocks (dynamically injected by `renderServices()`); yt-embed on home hero (replacing the old "Watch our intro" button) + contact page below address.
- `yt-embed.js` preemptively imported on services.html so future per-service therapy-sample slots are a markup-only edit.

Known tech-debt items (non-blocking, for future passes):
- The Phase 4 canggih CSS blocks + Phase 2 `.anchor-photo` + `.yt-embed` blocks all live OUTSIDE `@layer components` (architectural drift from Phase 4). A future refactor should move them inside the layer.
- `common.media.videoTitles.*` namespace exists but is unused — `data-yt-title` is set inline (English-only) on each `.yt-embed`. Future i18n iframe-title pass can consume videoTitles.
- `common.media.videoUnavailableFallback` duplicates `common.a11y.videoUnavailable` ("Video coming soon"). Either remove or alias before the strings drift.
- The home hero anchor and yt-embed thumbnail both reuse `common.media.alts.homeHero` (screen reader hears the alt twice). Acceptable for prototype; consider distinct alts at launch.

Pre-launch swap workflow (client handoff): replace JPGs in `assets/img/anchors/` keeping the same filenames; update `data-yt-id` attributes on each `<div class="yt-embed">` (currently `PLACEHOLDER_INTRO` on home hero, `PLACEHOLDER_CENTRE_TOUR` on contact) with real YouTube IDs. The visible captions stay the same wording — the "Placeholder via Picsum" suffix gets edited out as part of the swap.

### 2. The Assignment (from design doc, never executed)
Open `https://www.urbaneethos.center/` and `http://localhost:8080/` side-by-side. Walk through homepage + contact page on both. Capture three specific moments where the prototype reads as wireframe-vs-real. That feedback should ground Phase 2's photography curation. Do this BEFORE Phase 2 starts.

### 3. Real-browser sweep of Phase 1 motion
axe-core can't grade aesthetics. The 6 craft moments need a human-eye sweep:
- Consent save: sage stamp circle draws (320ms), then checkmark draws (160ms), holds 720ms, fades 200ms. Test all three save paths (Accept all / Necessary only / Customize+Save).
- Personalization save: same stamp on home survey submit.
- Chatbot open: panel unfurls from bottom-right launcher (scale + slight rotate). Verify no clipping on 360px viewport.
- Locale toggle: EN/BM button slides in 6px + fades. Re-test on repeated toggles.
- Link hover: ink underline draws left-to-right on `main`/`footer` links. Hover off → retracts from right.
- Service card hover: **entire card tilts** (translateY -2px + rotate -0.4deg + top-left offset shadow). Per user preference (2026-06-09), the whole card moves as a unit — neighbors in the grid will shift slightly during hover; that's the intended aesthetic. (Was originally on `.card-inner` only; reverted in `b3dccc5`.)
- `prefers-reduced-motion: reduce`: all of the above should appear in static end-state (no animation).

If anything feels off (timing, curve, magnitude), the design doc's "Open Questions" section captures the calibration questions worth iterating on.

### 4. Broader aesthetics + microinteraction review — DONE 2026-06-10

Shipped as Phase 4. Design doc: `/Users/deepsight/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md`. Plan: `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md`. T9 tracer-bullet calibration outcomes:

- **A1 page-load ink-bloom:** KEEP, dialed up at T9 (opacity 0.7 → 1, saturate 125% → 100%, 2000ms). At T13, regression caught — `opacity:<1` on `<main>` failed axe contrast. Refactored to `body::before` cream overlay + body saturate filter — visual effect preserved, contrast restored.
- **A2 sage ink-dot cursor:** KEEP, dialed up at T9 (rest opacity 0.55 → 0.7, active 0.8 → 0.9). Hidden on touch + `prefers-reduced-motion: reduce`.
- **A3 paper-grain texture:** KEEP at designed quietness (0.03 opacity radial-dots).
- **A5 sage `::selection`:** KEEP. Phase 1's sun `::selection` rule retired (housekeeping commit `c9154a1`).
- **A4 hero parallax:** KEEP. Applied on home/about/services heros (per P3 placement). Capped at 4px via clamp; reaches cap at ~100px scroll, then static.
- **C1 100vh hero:** KEEP. Bleed past sticky header fixed at T9 calibration (subtract `--canggih-header-h: 72px`). Hero on every page; trust-beat blocks also fill viewport on home (values), about (ethos), services (first service-block via JS).
- **C4 paper-fold reveals:** KEEP at designed 2deg rotateX. Extended existing `.fade-in-up` class so all current usages (`index.html` personalization-card + values band, `services.html` dynamic service-blocks) automatically inherit; no new convention introduced.

9 canggih tokens live in `tokens.css` for future calibration (cut, don't raise per design doc P1).

## Deferred items (out of scope for now, flagged for client)

From design doc + earlier scrape findings:
- **BM translations need Malaysian native-speaker + legal review** — `content/ms/*.json` all carry `_meta.reviewedBy: null`. Privacy notice especially.
- **Real-photo consent workflow** — parental signoff process for staff/children/families. Client conversation needed.
- **Drafted English copy** — `_draft: true` markers on every drafted string across `content/en/*.json` (hero subtitles, values, service whatItIs/whoItsFor/whatToExpect, FAQs, staff personal lines + 5 of 9 bios, events teaser). Client should review and replace with their own copy.
- **Real staff photos** — placeholders flagged `[REAL PHOTO REQUIRED]` in `alt`.
- **Real video content** — staff intros, centre tour, parent testimonial.
- **Production hosting / deploy / domain** — Phase 3, unscoped.
- **Individual blog article pages** — cards currently deep-link to live site articles.
- **Real chatbot LLM backend** — currently a scripted decision tree.
- **Real personalization** (server-side, cross-session ML) — currently client-side rules table.
- **Real analytics wiring** — currently a demo dashboard with seeded fake data.
- **Standalone Events page** — consolidated into home teaser + contact CTA for now.

## Canggih layer wiring pattern (for future modules)

Every page-level canggih module (anything in `assets/js/canggih-*.js` or that participates in the always-on layer) must be imported in every one of the 8 HTML pages' `<script type="module">` block. The convention: insert imports immediately after `import "/assets/js/a11y.js";` where present. Pages without a11y.js (`privacy.html`, `analytics.html`) anchor on the next-best stable import (`consent.js` on privacy, `analytics-demo-data.js` on analytics).

Pages to wire (all 8): `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `analytics.html`, `privacy.html`.

If a new canggih module is added without wiring to all 8 pages, it silently ships only to the pages it was added to. This is the most common Phase 4 maintenance trap. Use a `grep -c "<module-name>.js" *.html | paste -sd+ | bc` smoke-check after any wiring change — total must equal 8.

Body classes used for contextual placement: `class="home"` (index), `class="about"`, `class="services"`, `class="staff"`, `class="blog"`, `class="contact"`, `class="analytics"`, `class="privacy"`. Trust-beat attributes: `data-trust-beat="values"` (home values band), `data-trust-beat="ethos"` (about mission/story), `data-trust-beat="service-intro"` (services.html sets `dataset.trustBeat` on first rendered service-block via JS).

## How to pick up

```bash
cd /Users/deepsight/code/urbane-ethos
git log --oneline | head -10
bundle install
bin/server
# open http://localhost:8080
```

Read in order to refresh context:
1. **This file** (`docs/HANDOVER.md`) — orientation.
2. `README.md` — what the project is, what's real vs draft vs mocked, how to run.
3. `docs/superpowers/specs/2026-06-08-polish-pass-design.md` — the Phase 1+2 design doc.
4. `~/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md` — the Phase 4 canggih design doc.
5. `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md` — Phase 4 plan as executed.
6. `docs/superpowers/plans/2026-06-10-phase2-photography-youtube.md` — Phase 2 plan as executed.
7. `docs/superpowers/plans/2026-06-08-polish-pass-phase1-motion.md` — Phase 1 motion plan (pattern reference).
8. `docs/A11Y_NOTES.md` — known a11y items and how to re-run axe-core.

### To start Phase 2

```
/writing-plans
```

(Then point it at the Phase 2 section of the design doc. It will produce a plan file at `docs/superpowers/plans/2026-06-08-polish-pass-phase2-media.md`. Then `/superpowers:subagent-driven-development` to execute.)

### To run the assignment instead first

Open both URLs in side-by-side browser windows. Take notes (markdown is fine) on:
- What does the live site signal that the prototype doesn't?
- Where does placeholder-ness leak through?
- Three specific wireframe-vs-real moments.

Feed those notes into the Phase 2 planning conversation so photography curation aims at the right pain points.

## Repo state summary

```
urbane-ethos/
  README.md                                              project intro + run
  Gemfile, Gemfile.lock                                  ruby webrick dep
  bin/server, bin/check-i18n-parity.rb                   tooling
  index.html  about.html  staff.html  services.html      8 production pages
  blog.html  contact.html  analytics.html  privacy.html
  assets/
    css/{tokens,base,components,motion}.css              4 CSS files (post-motion-polish)
    js/{i18n,a11y,consent,chatbot,personalization,
        sage-stamp,analytics-demo-data}.js               7 JS modules
    fonts/                                               Source Serif 4 + Inter WOFF2
    img/scraped/  img/placeholders/                      verbatim + flagged
  content/
    en/  ms/                                             9 mirrored JSON files each
    blog.json                                            EN-only
    glossary.md                                          EN→BM glossary
    scraped-raw/                                         gitignored cache
  design/directions/v1-quiet/  v2-warm/  v3-bold/        3 direction demos
  test/
    parity-fixtures/                                     TDD fixtures for parity script
    smoke/                                               6 browser-runnable smoke pages
  docs/
    HANDOVER.md                                          this file
    A11Y_NOTES.md                                        a11y findings + re-run cmd
    superpowers/
      specs/
        2026-06-08-urbane-ethos-revamp-design.md         original revamp spec
        2026-06-08-polish-pass-design.md                 polish pass spec (Phase 1+2)
      plans/
        2026-06-08-urbane-ethos-revamp.md                original 23-task plan (done)
        2026-06-08-polish-pass-phase1-motion.md          Phase 1 plan (done)
```

## Verification one-liners

```bash
# Everything serves 200
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/$p")  /$p"
done

# i18n parity holds
bin/check-i18n-parity.rb

# No literal old durations
grep -nE '\b(180ms|320ms)\b' assets/css/components.css assets/css/motion.css assets/css/base.css || echo "(clean)"

# axe-core full sweep (needs npx)
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -n 5
done
```

## Open questions for the next session

1. Does the user want to do "The Assignment" (live-vs-prototype walkthrough) before Phase 2 planning, or jump straight to Phase 2?
2. For Phase 2 photography sourcing: which curation tone? Subdued/contemplative (heavier Kenya Hara reference) vs warm-family (more typical centre imagery)? Plan to surface 6-8 candidates together before committing.
3. For YouTube embed thumbnails: custom anchor-photo derived (warmer, more curated) vs YouTube auto-generated (faster, less tone control)?
4. Is the gstack upgrade pending (1.56.0.0 → 1.57.3.0) worth handling before more work, or defer?
5. Run order for the next session: Phase 2 media first, or the broader aesthetics review (item 4 above) first? Aesthetics review may inform Phase 2's photography placements (e.g., if hero gets `min-height: 100vh`, the hero anchor photo's composition matters differently).
6. For the custom-mouse-pointer experiment: does the user want a single bespoke cursor across the whole site, or only inside specific zones (e.g., hover over cards/CTAs)?
7. Trailing mouse effect: is the goal pure decoration (ambient warmth) or should it carry information (e.g., reveal hover affordances ahead of click)? Decoration-only is the safer first cut.
