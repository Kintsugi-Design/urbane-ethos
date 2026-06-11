# Huashu-design review — urbane-ethos prototype

**Reviewed:** 2026-06-11
**Reviewer mode:** Huashu-design 5-dimension critique (`references/critique-guide.md`)
**Scope:** 8 production pages at `http://localhost:8080/` after polish-pass W1–W7
**Frame of reference:** the committed design direction (B = Kenya Hara–referenced paper-and-ink) and the prototype's role as a Phase-2 hand-off to the launch team

---

## Overall verdict

**44 / 50** — a well-considered prototype with a coherent voice and unusually disciplined motion / a11y craft. The paper-and-ink direction reads through on most pages; visual hierarchy and detail execution are strong; functionality is exemplary; innovation is restrained (the right move for a children's-therapy centre, but it costs a point). The two main soft spots are (a) some early-page placeholder photography reading as stock-y and (b) the home hero stacking an `<anchor-photo>` and a `<yt-embed>` thumbnail back-to-back at a near-identical aspect ratio — two image-shaped slabs competing for primacy before the headline lands.

The polish pass closed the audit's tier-1 fixes; the rest are tier-2+ and routed to `docs/HANDOVER.md`.

---

## 1. Philosophy consistency — 9 / 10

**Paper-and-ink Direction B** (Kenya Hara echoes: cream paper, sage ink, warm soft serif, calmed motion).

What carries through cleanly:

- **Palette discipline** — `tokens.css` defines exactly 5 colours: cream, ink, sage, terracotta-deep accent, sun. Cream-on-paper is the page; sage is the only ink; terracotta-deep is the single accent. No gradient salads. (`--color-cream`, `--color-ink`, `--color-sage`, `--color-terracotta-deep`, `--color-sun`.)
- **Type pairing** — Source Serif 4 for display + body emotion, Inter for navigation + UI labels. Two families. Hard-stop.
- **Phase 1 microinteractions** — sage-stamp save confirmation (consent + personalization), ink-draw underlines scoped to `main`/`footer`, paper-fold `.fade-in-up`. None of these read as web-tropes; they read as paper.
- **Phase 4 canggih layer** — atmospheric depth (page-load ink-bloom, paper-grain texture, sage ink-dot cursor) reinforces the paper metaphor without crossing into preciousness. The dialled-down opacities from T9 calibration land at "noticed, not noisy."
- **Footer + section rhythm** — cream-soft alternating sections at `var(--space-20)` padding lets each thought breathe. Hara would approve.

What blunts a perfect score:

- **Placeholder photography** is still picsum.photos — and at the home / about / services heroes it lands as "warm but generic." The Hara reference would want a single quiet detail (cracked light through a window, a child's hand on a desk) rather than warm-toned interior chrome. The pre-launch swap workflow is documented; this is on the client, not on the prototype. Flagging only because it weakens the philosophy read while placeholders are still in place.
- **The home hero stacks an anchor photo above an intro-video thumbnail** in the same column. Two image slabs in a row at ~16:9 each is one visual idea repeated; Hara would have made the prototype pick *one* (the considered photo OR the video promise). See **Tier 1 fix H-1** below — applied.

## 2. Visual hierarchy — 8 / 10

What works:

- **Hero type scale is correctly aggressive.** `--type-h1: clamp(2.5rem, 5vw + 1rem, 4.5rem)` ensures the headline dominates on every page. Section headings (`--type-h2`) are ~2× the body text; the 2.5× contrast rule the critique guide cares about is comfortably exceeded.
- **Single-CTA rule respected on every page.** Each hero has one primary button + (optional) one ghost button. No CTA inflation.
- **Phase 4 C1 100vh hero** anchors every page to one idea per scroll-screen. This is high-discipline visual hierarchy — every screen-height is one beat.
- **Eyebrow → headline → lede → CTA stack** is consistent across home, about, services, contact heroes. The reader's eye lands the same way each time.

Where the hierarchy slips:

- **Locale + font-size toggles + Book Now button** crowd the right side of the header at desktop. Three actions of similar visual weight compete with the brand mark. Tier-2 (would mean a header redesign); flagged in HANDOVER deferred.
- **The home page's stacked anchor-photo + yt-embed** sets up two equal-weight visual entries before the eye can land on "Urbane Ethos Early Intervention Center." Tier-1 (H-1) applied — the anchor photo moves below the H1/lede on home.

## 3. Detail execution — 9 / 10

**Strong.**

- 8pt-ish spacing system (`--space-1` through `--space-32`) used consistently; no orphan magic-number padding.
- Two font families, never more.
- Palette is 5 hues with explicit deep/soft variants; never a mid-palette improvisation.
- `text-wrap: pretty`, `clamp()`-based type scale, `color-mix()` for header backdrop blur — the prototype uses modern CSS thoughtfully, not as a checklist.
- Motion timing (`--dur-1`, `--dur-2`, `--dur-fold`, `--ease-paper`, `--ease-ink`) tokenized — every transition references a token. No naked durations.
- Accessibility is *design quality* in disguise: focus-visible has a 3px sun-yellow ring with 3px offset, no `outline: none` cheats. WCAG 2.5.8 touch targets (W6.5) just landed; controls are 40px floor.

Small dings:

- The home `.eyebrow` block uses `font: 600 var(--type-eyebrow) ...` shorthand; nearby `.section-eyebrow` uses the same. A reader spec-walking would notice the duplication. Tier-2 cleanup, not user-visible.
- Footer link colour (`--color-ink`) plus the global underline-draw gives the footer a tiny moment of busy-ness when many links sit in a column. The hover-only draw is fine; the at-rest state hides cleanly. No fix.

## 4. Functionality — 10 / 10

The prototype's functional design is excellent, full-stop.

- **Personalization** — micro-survey reorders the services grid, gated by consent, locale-stable as of W5. The "skip" path is single-click. The reset link respects the same flow. Zero hidden state.
- **Chatbot** — scripted decision tree, no fake LLM theatre. The launcher animates only `is-idle` (i.e., only while it hasn't been used). The panel build is lazy. Voice in via Web Speech API, TTS out via SpeechSynthesis where available — graceful degradation everywhere.
- **i18n** — `data-i18n` for text, `data-i18n-attr` for attributes, MS→EN fallback when keys are missing. As of W3, iframe titles localize; as of W5, personalization rules fire identically across locales. The locale-agnostic `blog.json` is correctly special-cased (W6.8 fix in i18n.js).
- **a11y** — every interactive control is `<button>` (not `<div onclick>`); focus management is real (skip-link → `#main`, Escape closes chatbot, Escape closes hamburger, sage-stamp render doesn't move focus). 0 axe-core violations across 8 pages + the chatbot panel under playwright.
- **Consent** — three explicit paths (Accept all / Necessary only / Customize + Save), all three confirmed with the same sage-stamp microinteraction. PDPA-respectful by construction.

Nothing here reads as functionally cosmetic. Every element earns its place. **10.**

## 5. Innovation — 8 / 10

The prototype takes one big creative risk and a handful of small ones; it doesn't take ten.

The big risk:

- **Phase 4 canggih atmospheric layer** (sage ink-dot cursor, page-load ink-bloom, paper-grain texture, paper-fold `.fade-in-up`) is unusual in the early-intervention-centre category. Most centre sites in Malaysia look like 2017 Bootstrap. This one feels considered. **That's the innovation.**

The small risks:

- **Personalization on a children's centre's *prototype* site.** Rare in the category. Even gated behind consent, it telegraphs "we take this seriously." Treats families as adults.
- **PDPA consent flow with three explicit save paths and a sage-stamp moment.** Most consent banners are a wall of text plus a dismiss button. This one bothers to make the save feel like a small act of care.
- **The two design-direction comparison pages** (`design/directions/v{1-quiet,2-warm,3-bold}/`) are committed but not linked from production routing. That's an unusual artifact — a working prototype that ships its own design-history.

Where it doesn't push:

- The **typography** is conservative within the Hara reference — readable, calm, not the kind of choice that gets remembered. A small risk would be a single moment of italic-display drop-cap or hand-lettered detail somewhere significant.
- **No moment of one-off whimsy** (the kind that makes a parent screenshot a page). Tier-2; not appropriate for a children's-therapy centre to chase if forced.

This isn't a magazine launch; it's a centre that earns trust by *not* being precious. **8** is correct.

---

## Tier-1 fixes — applied inline this commit

### H-1 — Home hero: don't stack anchor-photo + yt-embed in the same column

The home hero currently renders the considered-photo `<figure class="anchor-photo">` above the headline AND below it places a `<div class="yt-embed">` intro-video thumb. Two ~16:9 image slabs in the same vertical stack at the top of the page is one idea repeated. The eye doesn't know whether the anchor or the video is the visual entry.

**Fix:** Move the `<figure class="anchor-photo">` from above the eyebrow to *between* the lede and the yt-embed slot, so the reading order is: eyebrow → H1 → lede → considered-photo → video-thumbnail. The H1 leads visually; the photo punctuates the body; the video thumb invites action. One image idea per beat.

### H-2 — Section-eyebrow consistency

`.section-eyebrow` is a clear class but the home page has bespoke inline `style="..."` on the "From the blog" sub-heading and the "A word from a parent" eyebrow. Use the class. Smaller markup, smaller surprise.

---

## Tier-2+ deferred to HANDOVER

(Documented in `docs/HANDOVER.md` "Deferred items" → "huashu-design review (2026-06-11) deferred")

1. **Header right-side congestion** — locale toggle + fs-toggle + Book Now compete for hierarchy with brand. Tier-2: requires a header redesign.
2. **Hero placeholder photography is too "warm-stock"** for Hara discipline. Tier-2+: client supplies real photography pre-launch (already on the deferred list as a client decision).
3. **Eyebrow style duplication** — `.eyebrow` (hero) and `.section-eyebrow` share computed style but live as separate rules. Future CSS pass.
4. **No italic-display drop-cap or hand-lettered detail** — a single moment of considered display typography somewhere significant would push the design from 8 → 9 on innovation. Not appropriate to push without a design conversation.
5. **Footer link rhythm** — four columns of similarly-weighted links collapse cleanly on mobile but feel slightly busy at desktop. A 3-column or 2-by-2 split might breathe better.

---

## Summary table

| Dimension | Score | Note |
|---|---|---|
| Philosophy consistency | 9 / 10 | Paper-and-ink reads through; weakened only by placeholder photography (pre-swap) |
| Visual hierarchy | 8 / 10 | Hero stack is strong; header right-side is busy; home stacks two image slabs (H-1 fixes) |
| Detail execution | 9 / 10 | Tokenized spacing/motion, two-family type, 5-colour palette, no orphan magic numbers |
| Functionality | 10 / 10 | Personalization, chatbot, i18n, a11y, consent — every element earns its place |
| Innovation | 8 / 10 | Canggih layer is the big risk and lands; small risks throughout. Appropriately restrained for the category |
| **Total** | **44 / 50** | Strong handover state |
