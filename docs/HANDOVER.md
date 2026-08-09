# Handover — Urbane Ethos prototype

**Last updated:** 2026-08-09 (enquiry capture + contact channels; GitHub target: `Kintsugi-Design/urbane-ethos`)
**HEAD:** on `main`
**Live test:** `bundle install && bin/server` → http://localhost:8080
**Pages deploy (immediate):** push `main` to `git@github.com:Kintsugi-Design/urbane-ethos.git`. GitLab Pages workflow (`.gitlab-ci.yml`) is committed but deferred — instance Pages enablement pending. See Workstream 2.

---

## Enquiry capture, pre-fill, and contact channels — landed 2026-08-09

Spec: `docs/superpowers/specs/2026-08-09-enquiry-capture-and-channels-design.md`.
Plan: `docs/superpowers/plans/2026-08-09-enquiry-capture-and-channels.md` (14 work-units, 4 batches).

### The defect this build closed
`contact.html` submitted **every enquiry** to `mailto:info@urbaneethos.center` — an address that appeared nowhere else in the repo and that the centre does not read. Every other surface said `urbaneethos@yahoo.com`. See "The address gate lesson" below for why the existing gate could not see it.

### Two new modules (neither is a canggih-layer module — no 10-page wiring)
- **`assets/js/storage.js`** — the single consent-aware, exception-safe storage gate. `allowed / get / set / remove / clearAll`. **Imports nothing**, deliberately: it owns `CONSENT_KEY` and `CONSENT_VERSION` and `consent.js` imports *them*, which inverts what would otherwise be an ESM cycle. Every other module migrated onto it, so `set()` returning `false` when consent is absent makes the old ungated-write defect impossible to express.
- **`assets/js/enquiry.js`** — the only place that knows how to reach the centre. `readInterest / composeEnquiry / channels / mailtoUrl / whatsappUrl`. `channels()` derives email + WhatsApp from the already-parity-gated `contact` namespace; the `wa.me` target is **computed** (`+6013-249 0069` → `60132490069`), never stored twice. Transport message copy is intentionally **English-only and hard-coded here** — it is addressed to the centre, not the visitor, which keeps the parity surface small.

### What visitors get
- **Interest capture.** New `<select id="cf-service">` above the concern textarea, options built at render time from the seven-key `services` namespace, so both locales come free and the option set cannot drift from the services page. The message carries the human title (`Enquiry about Speech Language Therapy (SLP)`), not the slug.
- **Pre-fill**, highest-intent first: `?service=` (no consent — user-initiated navigation, no storage read) → chatbot context → personalization survey. The `eip`-vs-adult age gate is inherited from `personalization.js`, not re-implemented. **The concern textarea is never pre-filled** (sensitive child-health free text); survey-derived context surfaces instead as a visible "We've filled some of this in… · Clear" line.
- **A success state.** The form previously had none — a visitor with no mail handler got total silence. Submit now swaps in a `role="status"` panel offering **WhatsApp, email, and copy-to-clipboard**. Nothing navigates until the visitor picks, so no popup blocker can intercept it.
- **WhatsApp is finally a link.** The contact row was `href="tel:"` under a chat icon (tapping "WhatsApp" placed a phone call). It now uses a real `wa.me` deep link and a distinct `whatsapp` brand icon, and WhatsApp also appears in the chatbot panel footer and the `customer.confirm` node.
- **"Clear my data."** A footer control on every page plus an entry inside the consent modal, opening a **native `<dialog>`** (not `window.confirm()`) that enumerates the five things it wipes, then calls `clearAll()` and reloads. Labelled "data", not "cookies" — the site sets zero cookies; all state is local/sessionStorage.

### Consent
`CONSENT_VERSION` 1 → 2, so existing visitors are re-prompted rather than silently re-scoped: pre-filling a form from chat answers exceeds what the old `chatbot` description promised. **G3 rode along here** (see below) rather than becoming a second re-prompt event for the same people.

### Chatbot
`human.*` → `customer.*`; the single `input: "name+phone"` free-text blob split into two sequential capture steps (`customer.name` → `customer.phone`), since regexing a blob is locale-fragile. Context now persists to `urbane-ethos:chat-context` so a visitor who chats then navigates to `/contact.html` carries `{service, age, freq, name, phone}` with them. All response-time promises removed from copy (the centre has no dedicated customer-service line and will not commit to a reply window).

### New CI gate
**`bin/check-contact-channels.rb`** — builds its allowlist **from content, never hard-coded** (`content/en/contact.json`, `content/en/common.json`, `content/careers.json`) and scans every root `*.html` including the 38 generated posts, the blog ERB, and `content/blog/posts/*.md`. Asserts every literal `mailto:` / `tel:` / `wa.me` matches. Template expressions (`mailto:${…}`, `<%= … %>`) are skipped, not failed. Wired into **both** pipelines after the parity gate.

> **The address gate lesson.** `HANDOVER.md` previously claimed the placeholder address "is gone". It was gone *from `content/`* — and the grep gate that verified it (`2026-07-27-authoritative-content-replacement.md:602`) **only scanned `content/`, never the page markup**, so a hard-coded address living in a `contact.html` inline script was structurally invisible to it. A gate that reads only the data source cannot catch a value hard-coded in the consumer. `check-contact-channels.rb` scans the *rendered surfaces* and derives its expectations from the data, which is the direction that actually catches drift.

### CI
Both pipelines now run the same two gates in the same order: `check-i18n-parity.rb` → `check-contact-channels.rb`. The GitLab job was renamed `i18n-parity` → **`content-gates`** (it no longer only checks parity); `pages: needs:` updated to match. **rsync exclusion lists unchanged** — `bin/` is already excluded from the artifact and still available in the test stage.

### Two fixes found during the batch
- **`test/smoke/i18n.html` had been silently broken.** `i18n.js` built its fetch URL relative to the *document*, so from `/test/smoke/` it 404'd; `setLocale()` rejected before the first assertion ran and the page reported **neither PASS nor FAIL** — zero assertions, looking superficially fine. Two agents hit it independently. Fixed by resolving content against **`import.meta.url`** (`assets/js/i18n.js` → `../../content/`), which is *more* robust than document-relative: the module's position relative to `content/` is fixed, so it resolves correctly at the repo root, at a custom-domain root, **and** at a repo subpath like `kintsugi-design.github.io/urbane-ethos/`. All three were verified in a real browser against a subpath-mounted server before committing, plus `/test/smoke/`. No root-absolute literal is introduced, so the relative-path rule still holds. `chatbot.js:33` had the identical defect (breaking `test/smoke/chatbot.html`) and got the identical fix.
- **`contact.form.successNote` was stale copy.** It read "Your default mail app will open with this message ready to send." — true when submit navigated straight to a `mailto:`, false now that the mail app opens only if the visitor picks the email transport. Rewritten in both locales (and the pre-JS fallback in the markup), flagged `_draft` for client review.

### Verified this build
- `bin/check-i18n-parity.rb` → `i18n parity OK (9 files)`, exit 0.
- `bin/check-contact-channels.rb` → `contact channels OK (87 files, 1 email(s), 2 number(s))`, exit 0.
- `ruby bin/build-blog.rb` idempotent — `git diff --quiet` clean on re-run.
- axe-core **0 violations on all 10 production pages** (wcag2a/2aa/22aa) + `bin/axe-chatbot.mjs` 0 violations. The two surfaces the static CLI sweep *cannot* reach were audited live under playwright and are also 0: the `role="status"` success panel (hidden until submit) and the native `<dialog>` (built lazily) — see `docs/A11Y_NOTES.md`.
- All 9 `test/smoke/` pages load clean; `enquiry.html` reports **54 PASS / 0 FAIL**, `i18n.html` 3 PASS / 0 FAIL (it reported *nothing* before this build).
- Canggih import matrix unchanged: `nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3`. `storage.js` and `enquiry.js` are on 1 page each, as intended.
- No `localStorage`/`sessionStorage` call survives outside `storage.js`; no `mailto:`/`tel:`/`wa.me` literal survives in any JS module outside `enquiry.js`; no dependency manifest touched; no root-absolute internal paths.
- Locale round-trip: EN↔BM with a pre-filled form and with the success panel visible — both survive, `{name}`/`{service}` stay substituted, and the submit handler fires **exactly once** after three toggles (it fired once per toggle before).

### Still open / follow-ups
- ~~`content/glossary.md:83` is stale~~ — **fixed.** The "Days/hours stay English" heading was an assertion with nothing under it, which is likely why it drifted. Replaced with the actual rule (day names translate, clock times keep the `12PM` / `9AM – 6PM` form), the nine-term day mapping, and the shipped strings for reference. The note records that the old line was wrong and left BM pages showing "Monday: 12PM – 5PM" until 2026-08-09.
- ~~`content/ms/home.json` `services.items[3].title` is still English~~ — **fixed.** Now `"Terapi Kognitif & Pendidikan Khas"`, matching `ms/services.json` and the short-form convention the other five home-grid titles use. All six BM home service titles are now translated.
- `assets/js/map-embed.js:31` still fetches `./content/…` document-relative — the same pattern fixed in `i18n.js`/`chatbot.js`. Harmless today (its only consumers, index + contact, sit at the deploy root) and it has no smoke page, so it was left alone rather than touched outside this batch's scope. Fix it if a subdirectory page ever imports it.
- The success panel's transport copy and the `clearData.*` set are `_draft` — client review pending, like the rest of the drafted strings.
- Still no backend. Delivery remains `mailto:` / `wa.me` / clipboard by design.

---

## Staff refresh + client photo integration — landed 2026-08-09

Spec: `docs/superpowers/specs/2026-08-09-staff-refresh-and-photo-integration-design.md`.

### Staff
Two practitioners replaced, same array positions, same roles: **Ms. Koh Hui Xuan (Robin)**, Clinical Psychologist (was Liyana Tarmizi) and **Ms. Farwizah**, Special Education Teacher (was Nuraisyah Azman). Client-supplied copy — both got real `personalLine` and `bio` text, which **retired three lorem-ipsum `_placeholder` keys** (`members.2.personalLine`, `members.7.personalLine`, `members.7.bio`) from both locales. BM translated with the glossary applied, `reviewedBy` still `null`.

Their headshots are real client submissions, so they live in a **new `assets/img/staff/`** with `photoInterim: false` — deliberately outside the `staff-pdf/` interim set so the pre-launch swap workflow skips them.

**Renderer bug fixed** in `staff.html` *and* `index.html`: the photo was gated on `m.photo && m.photoInterim`, so a real non-interim photo silently rendered as an initials tile. Now gated on `m.photo`. Nur Ain Nabila's `photo` is `null`, which is how she keeps her intended initials tile.

Touchpoints: `content/{en,ms}/staff.json`, `content/{en,ms}/home.json` (Robin is a featured home-page face), `staff.html`, `index.html`, `assets/js/personalization.js` (`behaviour` → Robin, `learning` → Farwizah).

### Photos — and a live PDPA fix
The client supplied 41 photos (29 unique). Auditing them surfaced **two already-published images that exposed identifiable children**, one of which was flagged `PENDING` in `common.json` `media._note` back in Phase 2 and never actioned:

- `services-hero.jpg` — three identifiable children + two adults, spread across all thirds (not croppable). Replaced with an overhead shot of hands arranging language cards.
- `yt-thumb-centre-tour.jpg` — a boy's face fully visible, lit, in focus. Replaced with a child on the sensory swing shot from behind.

**Governing rule (client decision, 2026-08-09): no identifiable children's faces, no readable personal information.** 11 of the 29 photos were rejected under it — including the compositionally strongest shot in the set, where the whiteboard behind lists real client names and appointment times. A hard crop would make it publishable; it is available on request.

New placements: `about-team.jpg` (about), `contact-reception.jpg` (contact), `service-ot-room.jpg` (OT service block, via a new `ot` entry in the `serviceArt` map), and a new **culture strip on `careers.html`** — 4 images captioned from `content/careers.json` (EN-only, parity-exempt). New `assets/img/culture/` directory. One minimal `.culture-strip` rule added inside `@layer components`.

Adding `ot` to `serviceArt` means `service-mood-3.jpg` is no longer reached. File and keys left in place; the `i < 3` code path is intact.

### Verified this build
axe-core **0 violations** on index, staff, about, services, contact, careers (wcag2a/2aa/22aa, rendered DOM); i18n parity green (9 files); no live references to the departed staff; every image `src` on the 10 production pages resolves; canggih import counts unchanged.

### Still open
- BM copy for Robin and Farwizah is machine-translated — same human-review gate as the rest.
- The other six practitioners still carry low-res interim PDF headshots (`photoInterim: true`), and seven still have lorem-ipsum `personalLine`/`bio`.
- `data-yt-id` values are still `PLACEHOLDER_*`.

---

## Production-readiness review + gate-fix build — landed 2026-08-03

Branch `feat/production-readiness-gate`. A full production-readiness review (8 parallel audit dimensions — a11y, link/asset integrity, i18n, performance, SEO/GEO, security/privacy, JS correctness, deploy/CI — Fable-architected, Opus-executed) produced a **CONDITIONAL-GO** verdict. This build then closed every launch-gate item **except the consent-banner copy (G3), deferred to the launch checklist per client**, and finished the SEO/GEO technical layer.

### Implemented
- **Deploy leak (was LAUNCH-BLOCKER).** `design/directions/` internal comparison pages + `assets/img/scraped/` (~10.7 MB unreferenced) + `content/scraped-raw/` are now excluded in **both** `.github/workflows/pages.yml` and `.gitlab-ci.yml` (they were shipping publicly). `.gitlab/` symmetry added to the GH list.
- **Pre-consent Google Maps (was LAUNCH-BLOCKER ×2).** New `assets/js/map-embed.js` — a click-to-load facade mirroring `yt-embed.js`. The home + contact maps no longer auto-embed; **zero** google/gstatic/googleapis requests fire until the visitor presses "Load map" (verified by headless network capture: 0 pre-click → 39/36 post-click). i18n keys `common.map.load` / `common.map.notice` (EN+MS); facade styles in `components.css` (white ground, AA-safe). Because the map is now user-initiated it no longer needs a consent category.
- **Chatbot placeholder leak (was MEDIUM).** `chatbot.js` runs bot copy through `stripPlaceholder`; the pricing node got real "contact us for current fees" copy (EN+MS) and `_placeholder` is cleared in both `chatbot.json`.
- **SEO/GEO technical layer (finished — this was the "SEO & GEO" pending item's implementation half).**
  - `<head>` metadata on all 11 production pages **+ the blog ERB (→ all 38 posts)**: unique meta description, canonical, Open Graph, Twitter card, `theme-color`, SVG favicon, `og:locale` en_MY + ms_MY. `analytics.html` / `careers.html` / `404.html` are `noindex` (canonical + og:url omitted).
  - JSON-LD: `MedicalBusiness` on index + contact (address/phone/email/opening-hours from `common.json`); `Article` on every blog post (via the ERB).
  - `robots.txt` + `sitemap.xml` (46 URLs) at repo root; sitemap is regenerated by the new **`bin/build-sitemap.rb`** (excludes the analytics demo, the unlinked careers page, and 404). Re-run it after adding pages/posts.
  - **Canonical origin = `https://urbaneethos.center`** — the ONE deliberate exception to the all-relative-path rule (absolute URLs are required in canonical/og:url/sitemap). It lives in the page `<head>` blocks and the `ORIGIN` constant in `bin/build-sitemap.rb`; change it there if the production domain changes.
  - **GEO / no-JS content (was HIGH).** The data-driven grids (home services/staff/blog/hours, services blocks + programmes, staff roster, blog index, privacy notice, about vision/mission) now ship their real content **statically in the served HTML**, mirrored verbatim from the content JSON behind `<!-- SEO static fallback … -->` marker comments. The inline JS overwrites these containers on load (progressive enhancement), so human behaviour is unchanged, but no-JS crawlers / AI fetchers now see real copy instead of empty `<div>`s. **Sync obligation:** the static fallback does NOT auto-regenerate — if the source JSON changes, refresh the fallback (the JS render remains the source of truth for human visitors).
- **Privacy notice drafted (the "editorial" item's privacy half).** `privacy.json` §1–§9 (EN + BM) replaced the lorem bodies with a real, prototype-grade PDPA notice including external links (Google privacy policy; JPDP `pdp.gov.my`). `_placeholder` cleared in both locales; `renderSections()` now renders `innerHTML` so the links show; static fallback added for crawlers. `_meta.reviewedBy` stays `null` and the counsel-review disclaimer remains — **still a hard pre-launch legal gate** (client is engaging an external reviewer). The consent flow links to this notice, so it must be reviewed before collecting real consent.
- **Tooling.** `bin/build-blog.rb:107` `NameError` (`entries` → `parsed`) fixed — the documented authoring command now exits 0.

### Verified this build
axe-core **0 violations across all 11 production pages** (rendered DOM, wcag2a/2aa/22aa — one facade contrast regression was caught and fixed); i18n parity green (9 files); all pages + `sitemap.xml` + `robots.txt` serve 200; `build-blog.rb` idempotent (no drift); map network-silent pre-click.

### Still open after this build
- ~~**G3 — consent-banner copy.**~~ **CLOSED 2026-08-09** by the enquiry-capture build. `consent.banner.heading` / `.body` were rewritten to match actual behaviour, the `personalization` and `chatbot` descriptions widened to cover reuse-for-enquiry, and the `analytics` description no longer implies control it doesn't have. It rode along with the `CONSENT_VERSION` 1 → 2 bump so visitors were re-prompted once, not twice.
- **Deferred umbrellas unchanged:** logo (interim `assets/img/favicon.svg` "UE" monogram flagged for swap; also referenced as the JSON-LD `logo`), remaining EN editorial + **BM human + legal review** (privacy especially), DNS / custom domain, real analytics wiring.
- **Backlog (LOW, not done):** heading-order polish, chatbot focus-restore on close, dead `eipepic.my` links in 2 archival posts, optional CSP `<meta>`, GH Action SHA-pinning. `map-embed.js` is on index + contact only (page-specific like `yt-embed.js`, not an always-on canggih module).
  - ~~try/catch on storage writes~~ — **CLOSED 2026-08-09.** Every storage access now routes through `assets/js/storage.js`, whose `get`/`set`/`remove`/`clearAll` never throw (Safari private mode, quota, parse failure all return a fallback / `false`).
  - ~~`CLAUDE.md` still says "Eleven modules"~~ — **CLOSED 2026-08-09.** The module list is now accurate at **16**.

## Where we are

A bilingual interactive HTML prototype of the urbaneethos.center revamp. ~30 commits on `main`. Eight production pages, three design-direction comparison demos, 6 JS modules, 4 CSS files, EN+MS content (BM is draft, needs human review). PDPA consent flow with sage-stamp save confirmation. Mocked-but-interactive chatbot + personalization. axe-core: 0 serious/critical violations across all 8 pages.

Just landed: **Phase 1 of the polish pass** — paper-and-ink craft microinteractions tied to Direction B's Kenya Hara design language (commit `28c5060`).

Just landed (Phase 4): **canggih layer** — atmospheric depth (A1 page-load ink-bloom, A2 sage ink-dot cursor, A3 paper-grain texture, A5 sage `::selection`) always-on + cinematic pacing (A4 hero parallax, C1 100vh hero, C4 paper-fold reveals via extended `.fade-in-up`). 7 moves, all KEEP after T9 tracer-bullet calibration. Design doc: `/Users/deepsight/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md`. Plan: `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md`. axe-core still: 0 serious/critical across all 8 pages (one regression caught + fixed at T13 — the A1 bloom now uses a `body::before` overlay instead of `opacity` on `<main>`, preserving text contrast during the bloom window).

Just landed (Phase 2): **photography + YouTube scaffolding** — `.anchor-photo` figure component for considered photo placeholders + lazy click-to-load `.yt-embed` component for video slots. 6 anchor photos + 2 custom YouTube thumbnails seeded via picsum.photos in `assets/img/anchors/`. New `media.*` i18n namespace mirrored EN + MS (MS marked `_draft: true` for translator review). Home hero replaces the "Watch our intro" CTA with a yt-embed; contact page adds a centre-tour yt-embed below the address block. Anchor photos on home, about, services heroes + mood images on first 3 service blocks. Real photos + real YouTube IDs swap in pre-launch by filename / data-yt-id replacement only — zero markup changes. axe-core still: 0 serious/critical across all 8 pages.

Just landed (Phase 3 prep): **Pages deployment infrastructure (GitHub + GitLab)** — all absolute paths converted to relative (`/foo` → `./foo`) across 8 HTML files + 5 JS modules so the prototype works identically at root, custom-domain root, OR repo-subpath (e.g. `username.github.io/urbane-ethos/`). Added `.github/workflows/pages.yml` (GitHub Pages) and `.gitlab-ci.yml` (GitLab Pages) — both run an `i18n parity` gate then rsync-stage an artifact with the same exclusion list (no `docs/`, `bin/`, `test/`, `Gemfile*`, internal plans/scrapes, `.DS_Store`). Same content publishes to both targets. Added `.nojekyll` (disable Jekyll on GH), custom `404.html` matching the brand idiom, and `.gitignore` entries for `_brief/`, `_site/`, `public/`, `node_modules/`. axe-core still: 0 serious/critical across all 8 pages + 404. Local `bin/server` workflow unchanged.

## Blog generator + full blog migration — landed 2026-07-28

Branch `feat/blog-generator`. **All 37 live-site blog posts** (enumerated from the Wix `blog-posts-sitemap.xml`) are now **local static pages with their images**, authored from Markdown through one shared template. Previously only 4 were local and the rest `externalUrl`-deep-linked off the prototype.

- **Scale:** 38 local pages total = 37 migrated blog posts + the local-only year-end promo. Content scraped from the live site (Wix server-renders post bodies, so `curl` worked; one JS-only post recovered via the browse daemon), authored into `content/blog/posts/*.md` by a fan-out of 33 subagents (Fable-orchestrated / subagent-driven), each inferring category + language and placing local images.
- **Images:** 51 hero/inline images downloaded from Wix, capped to 1400px into `assets/img/blog/<slug>/` (~7.8 MB total; one 17 MB animated GIF flattened to a 184 KB JPG). Inline images embedded in-body; hero rendered by the template. All have alt text — axe 0 violations on sampled pages.
- **Categories:** `blog.json` expanded to Parenting / Development / Speech & Language / Occupational Therapy / Career / Events / Notices / Promo. Category is inferred per post (not in the source data); a few were hand-corrected in review.
- **Open items:** ~10 posts are dated greetings / expired one-off announcements (Happy Merdeka, Selamat Hari Raya, "Registrations EIP 2020 open", etc.) — migrated faithfully per client request ("all of them"), prune later if desired. `register-now-for-e-coaching` had no server-rendered content; its date (2020-04-03) came from the sitemap `lastmod` and is flagged `date_inferred`. Machine-inferred categories/language on the 33 authored posts still want a human skim.

### Earlier this session (same branch): the generator itself

The 4 live-site blog articles that previously `externalUrl`-deep-linked off the prototype are now **local static pages**, and blog posts are authored from Markdown through one shared template.

- **New generator:** `bin/build-blog.rb` reads `content/blog/posts/*.md` (YAML frontmatter + Markdown body), renders each through `content/blog/_post.html.erb` (chrome identical to the old hand-authored promo page), writes `post-<slug>.html` at the repo root, and rebuilds the `posts[]` array of `content/blog.json` (localUrl, sorted by date desc, preserving `hero`/`categories`/`featured`/`_meta`). Idempotent — re-running produces no diff.
- **kramdown** added as a Gemfile `:development`-group gem (authoring-time only; `bin/server` and the Pages deploy never run the generator — they serve committed static HTML). Plain kramdown parser, not GFM (GFM needs an extra gem and buys us nothing here).
- **5 posts** now local: 4 scraped from the live site (`what-does-sensory-have-to-do-with-my-feelings`, `anak-dah-masuk-sekolah` [BM], `a-fulfilling-career-awaits`, `an-opportunity-to-learn-grow`) + the existing promo migrated into the same Markdown/template pipeline (`post-year-end-promo.html` filename preserved). BM post renders `<html lang="ms">`; bodies stay in source language and parity-exempt.
- **No CI/deploy change.** `blog.html` already routed `localUrl` → same tab, so cards now open locally with zero markup change. New `common.cta.backToBlog` key added to both locales.
- Verified: unit tests green (`ruby test/blog-generator/test_generator.rb`, 4 runs/24 assertions), generator idempotent, i18n parity 0, all 5 posts curl 200, **axe-core 0 violations on all 5 post pages**. Spec: `docs/superpowers/specs/2026-07-28-blog-generator-design.md`; plan: `docs/superpowers/plans/2026-07-28-blog-generator.md`.

## Design pass — therapy-centre positioning — landed 2026-07-27

Branch `design/therapy-centre-positioning`. Design-review pass on top of the existing Lavender design system, driven by co-director Nasirah's positioning ("highlight that we are a therapy center"; ages 0–20 expanding to elderly).

- **FINDING-001 — hero H1 was lorem.** The 72px home headline rendered `⟪PLACEHOLDER⟫ Lorem ipsum` (the single biggest element on the page). Replaced with a real headline distilled from Nasirah's directive: EN **"Therapy for every stage of life"** / MS **"Terapi untuk setiap peringkat kehidupan"** (leads with "Therapy", "every stage of life" = all ages). Reword freely — it's one key in `content/{en,ms}/home.json`.
- **FINDING-002 — the prototype rendered raw lorem to viewers.** Staff cards, events, service fields, careers and the promo post showed literal "Lorem ipsum" to anyone reviewing the site (incl. the co-director). Added `stripPlaceholder()` to `assets/js/i18n.js`, applied at the render layer (data-i18n text + the inline render loops on home/staff/services/privacy/careers; static lorem line dropped from the promo post). Placeholder-flagged copy now renders **empty** (its block skipped), while the `⟪PLACEHOLDER⟫` markers stay in the JSON for the pre-launch swap. Privacy §1–§9 (still lorem) are skipped entirely, leaving §0 + the prototype disclaimer.
- Verified: axe 0 violations on all changed pages; parity green; no `⟪PLACEHOLDER⟫` renders anywhere (grep the JSON, not the DOM, to find remaining slots).
- **Footer + link treatment** (branch `design/footer-and-links`) — footer restyled with the design system: column headings as eyebrow labels, de-bulleted link lists, hairline divider + serif wordmark & `© common.footer.rights` bottom bar; **About** added to every footer Site column; "View all articles" upgraded to the `.link-arrow` component (nudging → arrow via CSS `::after`). All CSS-token-based; axe still 0.
- **All-ages personalization survey** (branch `feat/all-ages-personalization`) — the home micro-survey was children-only ("Tell us a little about your child" / Child's age 0–2…10+). Reworked to cover **any age**: heading "Tell us a little about the person who needs support", 6 age-band slugs (`early-years` 0–3 → `older-adult` 60+, aligned to the real programme age-gates), and an age-inclusive concern set (added `daily-living` for ADL/rehab so adults & elderly see themselves). `age` now does work: `reorderServices` demotes the children-only EIP card for `adult`/`older-adult` bands, and an age-appropriate note (from the real age-gate facts, `_draft`-flagged) renders under the services heading. **Fixed 3 pre-existing personalization defects in the same pass:** stale `concernToStaff` ids (recommended staff card never rendered), phantom `concernToBlogTags` (blog recs always fell back), and a reorder-race (grid reorder never visibly applied — now called inside `renderHome()` after the async grid build). Plan: `docs/superpowers/plans/2026-07-27-all-ages-personalization.md`. Verified live: adult+daily-living → OT first, EIP last, older-adult note; child+speech → Speech first, EIP not demoted, child note; parity green, axe 0, no console errors.
- **Consent-gated personalization placeholder** (branch `feat/personalization-consent-gate`) — with "Necessary only" cookies the survey form is hidden, which left a large empty band on the home page. Added a `[data-personalize-locked]` invite card (`home.personalization.locked.*`, `_draft`) shown when `isAllowed("personalization")` is false: eyebrow + heading + description + a `data-consent-manage` CTA ("Enable personalisation") that reopens the cookie popup. `renderHome()` toggles form vs. invite on `consent:changed`. Full-consent → form; necessary-only → invite. Verified live (both states + CTA reopens popup); parity green, axe 0.
- **Embedded Google Map** (branch `feat/embedded-map`) — replaced the striped `map / location` placeholder on the home "Visit us" section with a real Google Maps iframe pinned to the centre (the business is registered on Maps, so it geocodes exactly). Single source: `common.mapEmbedSrc` (keyless `maps?q=…&output=embed`, same in EN/MS) + `common.a11y.mapTitle`; wired on home (`#home-map`) and on contact (`#map`, which was already built but had a `null` src). Direct `loading="lazy"` iframe, matching the project's existing contact-page map pattern. **Privacy note:** the map loads Google when scrolled into view (before consent) — consistent with contact.html's original design, but if stricter PDPA behaviour is wanted it can be made click-to-load (like `yt-embed.js`) or consent-gated. Verified live on home + contact; axe 0 on both; parity green. (`home.location.mapLabel` is now an unused key, left in place harmlessly.)
- **Still deferred (needs real assets, not fixable in code):** placeholder imagery — the hero "therapy room photo", the map/location tile, blog thumbnails, and per-service mood images are all diagonal-stripe Picsum placeholders. They read as unfinished and need real photography (same shoot + consent workflow as the staff headshots).

## Authoritative content replacement — landed 2026-07-27

Branch `content/authoritative-replacement`. Plan: `docs/superpowers/plans/2026-07-27-authoritative-content-replacement.md`. Spec: `docs/superpowers/specs/2026-07-27-authoritative-content-replacement-design.md`.

Replaced generated/invented EN copy with **authoritative sources** — the live Wix scrape, the company-profile **PDF (2026-05-24)**, the printed **brochure**, and **co-director Nasirah's** WhatsApp corrections. Anything no source covers is now a greppable lorem sentinel rather than a plausible-looking invention.

**Per-namespace REAL upgrades (EN):**

- **about** — invented "values band" replaced by the PDF **Vision & Mission** band; `mission` slot now carries the PDF About-Us paragraph (heading "About us"); `story` enriched with the PDF "Since 2005…" sentence; `about.html` renamed `values.*` → `visionMission.*`.
- **services** — `items` went 6 → **7**: `screening` split into separate **Screening** + **Assessment** services (Nasirah: distinct services). New top-level **`programmes`** block (4 programmes, brochure). Retitles: `Cognitive Therapy & Special Education` (PDF #05), `IEP & Early Intervention Program` (PDF #04). EIP corrected to **ages ≤12** (Beginners 2–5 / Intermediate 6–8 framing removed everywhere). `whoItsFor` columns for OT/Speech/Psych from the brochure concerns checklist. New programmes section rendered in `services.html`.
- **staff** — real roster confirmed against the PDF (8 members) + Nur Ain (Wix-only). Hero gets the PDF "professionally licensed" line. Wix bios kept for the first 4 members.
- **home** — real positioning subtitle (Nasirah), corrected hours/address, service-card retitles (Screening & Assessment / Cognitive Therapy & Special Education / IEP & EIP). Home staff-card **greetings kept real** (controller override); their personal lines lorem'd.
- **contact + common** — real email **urbaneethos@yahoo.com**, full address, corrected hours (**Mon 12PM–5PM, Tue–Sat 9AM–6PM, closed Sun & PH**). Email row added to `contact.html`. (Footer email wired across the 8 contact-bearing pages in a later task — privacy & analytics have no contact block.)
- **privacy** — §0 "Who we are" real (full address + real email/phone); §1–§9 bodies are lorem pending a counsel-reviewed notice. ~~The fake `hello@urbaneethos.center` is gone.~~
  > **Correction (2026-08-09).** That claim was only true of `content/`. The placeholder had been hand-substituted to **`info@urbaneethos.center`** and left hard-coded in a `contact.html` inline script, where it silently received *every* form submission until the enquiry-capture build. The grep gate that "verified" the removal (`2026-07-27-authoritative-content-replacement.md:602`) **scanned `content/` only, never the page markup** — so an address hard-coded in a consumer was structurally outside everything it looked at. A data-source-only gate cannot catch a value hard-coded in the consumer. This is exactly the drift class `bin/check-contact-channels.rb` now scans the rendered surfaces for.
- **chatbot** — screening/specialed/eip `say` answers upgraded from PDF + corrections; pricing answer stays a sentinel.

**The `⟪PLACEHOLDER⟫` / `_placeholder` mechanic:** every generated string resolves to REAL (sourced, `_draft` entry removed), **LOREM** (visible value = Latin lorem prefixed with the `⟪PLACEHOLDER⟫` sentinel, key moved into a sibling top-level `_placeholder` map), or **KEEP** (functional scaffold, untouched). `bin/check-i18n-parity.rb` skips only `_meta`/`_draft`/`_correction` — **`_placeholder` IS walked**, so every MS mirror reproduces each `_placeholder` key exactly. Find every lorem slot:

```bash
grep -rn "⟪PLACEHOLDER⟫" content/ *.html
```

**Legitimate `_draft` survivors (not leaks):** `consent.json` (whole file, EN+MS — KEEP-functional PDPA scaffold) and `contact.json` `form.fields.tellUsMore*` (EN+MS — functional form labels, unsourced). Everything else's `_draft` was resolved.

**Two new pages (now 10 production pages):**

- `careers.html` + `content/careers.json` (root-level, EN-only, parity-exempt like `blog.json`). **Unlinked** from nav/index/footer — direct URL only, pending a client placement decision.
- `post-year-end-promo.html` — the **first local static blog article**. Pattern: root-level static HTML + a `localUrl` field on the blog entry (opens same-tab); `externalUrl` entries still deep-link out in a new tab. `blog.json` gained the `localUrl` field + a "Promo" category.

MS was re-mirrored for all 9 namespaces; parity is green; `reviewedBy` is still `null` (machine MT). Canggih layer wired to all **10** pages.

### Deferred flags (client-facing, from this pass)

- **Real staff photo shoot + parental/staff consent workflow** — interim low-res PDF headshots in `assets/img/staff-pdf/` are placeholders; the face↔name mapping needs a human eyeball; **Nur Ain has no photo** (still an initials `[REAL PHOTO REQUIRED]` placeholder).
- **Real pricing** — chatbot price answer is a `⟪PLACEHOLDER⟫` sentinel (charges list never supplied).
- **Legal/privacy review** — privacy §1–§9 bodies are intentional lorem pending a counsel-reviewed notice.
- **Careers page placement + real copy** — currently unlinked, direct-URL only.
- **Concerns-checklist / screening-vs-assessment decision tree as real interactive tools** — currently prose in the services copy + the chatbot script.
- **BM human + legal review** — carried over; `content/ms/*.json` all `reviewedBy: null`.
- **Blog promo date** (`2025-12-01`) is approximate — confirm with client.

## What's open

### Polish-pass 2026-06-10/11 — CLOSED 2026-06-11

Eight workstreams from `docs/superpowers/specs/2026-06-10-polish-pass-handover-design.md`. Plan as executed: `docs/superpowers/plans/2026-06-10-polish-pass-handover.md`.

**Landed:**

- **W1 — CSS architecture refactor.** Phase 4 canggih cursor / 100vh hero / Phase 2 `.anchor-photo` / `.yt-embed` pulled back inside `@layer components`. Cascade-layer order, not specificity, determines precedence again. (`3d6709c`)
- **W2 — Top-nav underline removed.** `.site-header a` + `.brand` opted out of the global ink-draw underline carry-over from base.css. (`3cc0f30`)
- **W3 — i18n dedup + `videoTitles` consumed.** Removed `common.media.videoUnavailableFallback` (had zero consumers); `yt-embed.js` now reads `data-yt-title-key="common.media.videoTitles.<slug>"` via `i18n.t()` so iframe titles respect locale. (`096a878`, `825e2af`)
- **W4 — Distinct home-hero alts.** Added `common.media.alts.homeHeroIntroVideo` (EN + MS draft); the home yt-embed thumbnail uses the new key while the anchor photo keeps the existing `homeHero`. Screen-reader no longer hears the same alt twice. (`91e6d1d`)
- **W5 — BM personalization fix.** `RULES.concernTo*` re-keyed on locale-agnostic slugs (`speech`, `motor-skills`, etc.); chip `<input value>` rendered from `{value, label}` so BM users get the same services-grid reordering EN users do. `sessionStorage` is now locale-stable across toggles. (`f27ea7e`)
- **W6 — Responsive audit.** `--bp-sm/md/lg` tokens; hamburger nav (`assets/js/nav.js` with focus trap + Escape + click-outside + resize close); mobile-tuned hero typography; mobile grid gap tightening; WCAG 2.5.8 touch-target floor (40px buttons, 32px chips); 3 sweep scripts under `bin/` (responsive-sweep, landscape-sweep, real-viewport-walk) — 32-capture matrix passes with 0 horizontal-scroll violations. Real-viewport walk also caught + fixed a latent 404 bug on `/blog.html` (i18n was building `content/<locale>/blog.json` URLs but blog is intentionally EN-only at `content/blog.json`). (`b844787` → `717e4cd`)
- **W7 — Chatbot a11y closed.** `bin/axe-chatbot.mjs` (playwright + `@axe-core/playwright`) opens the chatbot panel, scopes axe to it. Initial run: 0 violations. Closes the last axe blind spot. (`2d4f182`)
- **W8 — huashu-design 5-dimension review.** 44/50. Report: `docs/superpowers/specs/2026-06-10-huashu-review.md`. Tier-1 fix H-1 applied inline (home hero anchor-photo moved below the lede so H1 leads visually). Tier-2+ in "Deferred items" below. (`075358f`)

**Tooling added (all local-only, not CI-gated):**

```bash
bin/server &
bin/check-i18n-parity.rb            # gate 1: i18n parity
node bin/responsive-sweep.mjs       # 8 × 4 viewports, no horizontal scroll
node bin/landscape-sweep.mjs        # landscape phone + reduced-motion
node bin/real-viewport-walk.mjs     # interaction walk, console-error collector
node bin/axe-chatbot.mjs            # chatbot panel a11y
# Plus the existing axe-core CLI sweep over 8 pages.
```

### Original (pre-polish-pass) workstreams

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

Known tech-debt items closed in polish-pass 2026-06-11 (W1, W3, W4 — see top of file). Anything still open is in "Deferred items" near the bottom.

Pre-launch swap workflow (client handoff): replace JPGs in `assets/img/anchors/` keeping the same filenames; update `data-yt-id` attributes on each `<div class="yt-embed">` (currently `PLACEHOLDER_INTRO` on home hero, `PLACEHOLDER_CENTRE_TOUR` on contact) with real YouTube IDs. The visible captions stay the same wording — the "Placeholder via Picsum" suffix gets edited out as part of the swap.

### 2. Pages activation — GitHub immediate, GitLab deferred (code prep DONE 2026-06-10)

Infrastructure landed for BOTH targets: `.github/workflows/pages.yml` (GitHub Pages, immediate target) and `.gitlab-ci.yml` (GitLab Pages, deferred until instance Pages is enabled). Both publish the same artifact (same exclusion list, same i18n-parity gate). Code is portable to root OR repo-subpath. What's left is manual / config:

**GitHub Pages activation (immediate)**

Target remote: `git@github.com:Kintsugi-Design/urbane-ethos.git`. Public URL after activation: `https://kintsugi-design.github.io/urbane-ethos/`.

1. **Add the GitHub remote alongside the existing `origin` (GitLab).**
   ```bash
   git remote add github git@github.com:Kintsugi-Design/urbane-ethos.git
   git push github main
   ```

2. **Enable Pages in repo settings.** GitHub UI → Settings → Pages → Source: "GitHub Actions" (not "Deploy from branch" — the workflow handles deploy). The first push to `main` after enabling triggers `.github/workflows/pages.yml`. Watch the Actions tab for the first run.

3. **(Optional) Custom domain.** If using `urbaneethos.center` (or e.g. `prototype.urbaneethos.center`):
   - Add a `CNAME` file at repo root containing the bare domain (one line, no protocol).
   - At the DNS provider, point the domain at `kintsugi-design.github.io` via CNAME / ALIAS / ANAME record.
   - GitHub UI → Settings → Pages → Custom domain → set the same value. Enforce HTTPS (defaults on).

**GitLab Pages activation (deferred — instance Pages enablement pending)**

The `origin` remote already points at `git@gitlab.nsfrg.my:urbane-ethos/public-website.git`, and `.gitlab-ci.yml` is committed and ready. The pipeline will run on the next push to `origin/main`, but the `pages` job requires the self-hosted GitLab instance to have Pages enabled (`gitlab_pages['enable'] = true` in the omnibus config). Until the instance admin enables Pages:

- **Avoid pushing to `origin/main`** if you don't want a failed `pages` job to accumulate in the pipeline history, OR
- **Push but accept the failure** — the failed job doesn't block anything else; it just shows red in the pipeline view.

Once instance Pages is enabled, `git push origin main` deploys; URL appears under Project → Settings → Pages. Optional custom domain configured via Project → Settings → Pages → New Domain. If dual-publishing GitHub + GitLab, pick ONE target as canonical (set `<link rel="canonical">` on each page) to avoid SEO duplication.

**Both deploys — shared gates and exclusions**

- Both workflows run `bin/check-i18n-parity.rb` first; deploy is skipped on parity failure.
- Both `rsync`-stage to a target directory (`_site/` for GH, `public/` for GL) using an IDENTICAL exclusion list — `docs/`, `bin/`, `test/`, `Gemfile*`, `_brief/`, `.gstack/`, `.claude/`, internal plans + scrapes, `.DS_Store`. Keep the lists in sync if either is updated.
- axe-core is intentionally NOT gated in CI (heavy headless-browser step). Run locally before merging to `main`: `bin/server` + `npx -y @axe-core/cli` per page. See `docs/A11Y_NOTES.md`.

**First-push smoke check (whichever target):** open the Pages URL → confirm hero photos load → click chatbot launcher → confirm i18n EN/BM toggle works → verify no console errors. Hard-reload (Cmd+Shift+R) to bypass any CDN cache.

### 3. The Assignment (from design doc, never executed)
Open `https://www.urbaneethos.center/` and `http://localhost:8080/` side-by-side. Walk through homepage + contact page on both. Capture three specific moments where the prototype reads as wireframe-vs-real. That feedback should ground Phase 2's photography curation. Do this BEFORE Phase 2 starts.

### 4. Real-browser sweep of Phase 1 motion
axe-core can't grade aesthetics. The 6 craft moments need a human-eye sweep:
- Consent save: sage stamp circle draws (320ms), then checkmark draws (160ms), holds 720ms, fades 200ms. Test all three save paths (Accept all / Necessary only / Customize+Save).
- Personalization save: same stamp on home survey submit.
- Chatbot open: panel unfurls from bottom-right launcher (scale + slight rotate). Verify no clipping on 360px viewport.
- Locale toggle: EN/BM button slides in 6px + fades. Re-test on repeated toggles.
- Link hover: ink underline draws left-to-right on `main`/`footer` links. Hover off → retracts from right.
- Service card hover: **entire card tilts** (translateY -2px + rotate -0.4deg + top-left offset shadow). Per user preference (2026-06-09), the whole card moves as a unit — neighbors in the grid will shift slightly during hover; that's the intended aesthetic. (Was originally on `.card-inner` only; reverted in `b3dccc5`.)
- `prefers-reduced-motion: reduce`: all of the above should appear in static end-state (no animation).

If anything feels off (timing, curve, magnitude), the design doc's "Open Questions" section captures the calibration questions worth iterating on.

### 5. Broader aesthetics + microinteraction review — DONE 2026-06-10

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
- **Production hosting / deploy / domain** — Phase 3 prep landed 2026-06-10 (paths relative, `.github/workflows/pages.yml`, `.nojekyll`, custom `404.html`). Activation steps are Workstream 2 above. Custom domain (`CNAME` + DNS) deferred until client decision.
- **Individual blog article pages** — cards currently deep-link to live site articles.
- **Real chatbot LLM backend** — currently a scripted decision tree.
- **Real personalization** (server-side, cross-session ML) — currently client-side rules table.
- **Real analytics wiring** — currently a demo dashboard with seeded fake data.
- **Standalone Events page** — consolidated into home teaser + contact CTA for now.

### huashu-design review (2026-06-11) — tier-2+ deferred

Full report: `docs/superpowers/specs/2026-06-10-huashu-review.md`. Final score 44/50; tier-1 fix H-1 applied inline. The following surfaced but were intentionally not chased:

- **Header right-side congestion** — locale toggle + fs-toggle + Book Now button compete with the brand for hierarchy. Tier-2: a header redesign, not a small fix. Probably wants a "More" disclosure on mobile-medium.
- **Hero placeholder photography reads too "warm-stock"** for the Hara reference. Tier-2+: client-supplied real photography pre-launch is already on the list above.
- **Eyebrow style overlap** — `.eyebrow` (hero) and `.section-eyebrow` share computed style but live as separate rules. Future CSS pass.
- **One moment of italic-display drop-cap or hand-lettered detail** somewhere significant would push the innovation score from 8 → 9. Worth a design conversation; not appropriate to add without one.
- **Footer link rhythm at desktop** — four columns of similarly-weighted links feel slightly busy. Tier-2 layout cut.

### Real-viewport walk + screenshot reference

`bin/responsive-sweep.mjs` captures 32 screenshots to `docs/responsive-sweep/` (gitignored). `bin/real-viewport-walk.mjs` walks 8 pages at 1440×900, exercises consent / yt-embed / locale-toggle / chatbot / hamburger, and asserts 0 console errors + 0 failed requests. Real-device check on a physical phone is the last remaining manual step before launch; the playwright sweeps cover the same surface for pre-launch QA.

## Canggih layer wiring pattern (for future modules)

Every page-level canggih module (anything in `assets/js/canggih-*.js` or that participates in the always-on layer) must be imported in every one of the 8 HTML pages' `<script type="module">` block. The convention: insert imports immediately after `import "./assets/js/a11y.js";` where present. Pages without a11y.js (`privacy.html`, `analytics.html`) anchor on the next-best stable import (`consent.js` on privacy, `analytics-demo-data.js` on analytics). All module specifiers are relative (`./`) post Phase-3 prep — keep that convention for new modules.

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
# Everything serves 200 (10 production pages)
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html careers.html post-year-end-promo.html; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/$p")  /$p"
done

# i18n parity holds (9 namespaces)
bin/check-i18n-parity.rb

# Placeholder sentinel inventory — every hit must be an intentional lorem slot
grep -rn "⟪PLACEHOLDER⟫" content/ *.html

# Only legitimate _draft survivors are consent.json (whole) + contact.json tellUsMore* (EN+MS)
grep -rln '"_draft"' content/en/ content/ms/

# Canggih layer wired to all 10 pages (pick any always-on module)
grep -l "page-load.js" *.html | wc -l   # must equal 10

# No literal old durations
grep -nE '\b(180ms|320ms)\b' assets/css/components.css assets/css/motion.css assets/css/base.css || echo "(clean)"

# axe-core full sweep (needs npx) — target 0 violations across all 10 pages
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html careers.html post-year-end-promo.html; do
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
