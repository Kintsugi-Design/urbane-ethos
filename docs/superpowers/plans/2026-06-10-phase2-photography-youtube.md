# Phase 2 — Photography + YouTube Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Phase 2 of the polish pass — considered anchor-photo placeholders + lazy-loaded YouTube embed scaffolding on the Urbane Ethos prototype, per the design doc's Phase 2 success criteria. Real photos / real videos slot into the same captioned positions at launch with zero layout changes.

**Architecture:** Static HTML pages plus one new ES module (`yt-embed.js`, ~50 lines). Photos sourced via picsum.photos with descriptive seeds (deterministic, free, license-clean) so the prototype renders end-to-end without external curation; real photos swap in pre-launch by file replacement in `assets/img/anchors/`. YouTube embeds use placeholder video IDs that render the custom thumbnail correctly even before real IDs land — click-to-play attempts a real iframe load that gracefully shows "Video unavailable" until swapped. New CSS components (`.anchor-photo`, `.yt-embed`) live alongside the Phase 1 motion + Phase 4 canggih layers in `components.css`. New i18n strings under a `media.*` namespace mirrored in EN + MS common.json with `_draft` markers on the MS side for translator review.

**Tech Stack:** Plain CSS (cascade layers), vanilla JS (ES module + IntersectionObserver-less click-to-load pattern), Ruby WEBrick dev server, axe-core a11y testing.

**Design doc:** `docs/superpowers/specs/2026-06-08-polish-pass-design.md` (Phase 2 section, success criteria 1-9).

**HANDOVER reference:** Workstream 1 of `docs/HANDOVER.md`.

**Builds on:** Phase 1 motion polish (commit `28c5060`) + Phase 4 canggih layer (commit `73737b5`). Phase 2 does NOT modify any Phase 1 / Phase 4 code paths — it adds new files and surgical hero markup additions.

---

## File Structure

**Create:**
- `assets/img/anchors/home-hero.jpg` — warm interior, natural light (home hero anchor)
- `assets/img/anchors/about-hero.jpg` — family or parent in soft light (about hero anchor)
- `assets/img/anchors/services-hero.jpg` — gentle therapy moment without identifiable faces (services hero anchor)
- `assets/img/anchors/service-mood-1.jpg` — mood image for first service block
- `assets/img/anchors/service-mood-2.jpg` — mood image for second service block
- `assets/img/anchors/service-mood-3.jpg` — mood image for third service block
- `assets/img/anchors/yt-thumb-home-intro.jpg` — custom thumbnail for the home "intro" YouTube embed (reuses home-hero.jpg composition; separate file so future client swap doesn't disturb the hero)
- `assets/img/anchors/yt-thumb-centre-tour.jpg` — custom thumbnail for the contact page centre-tour YouTube embed
- `assets/js/yt-embed.js` — lazy click-to-load YouTube module (~50 lines)

**Modify:**
- `assets/css/components.css` — append `.anchor-photo` figure rules + `.yt-embed` rules + `.yt-play` button styles
- `content/en/common.json` — add `media.*` namespace (captions, alt text, source attribution, video titles, play-button labels)
- `content/ms/common.json` — mirror `media.*` namespace with draft Malay translations (marked `_draft: true` for translator review)
- `index.html` — add `<figure class="anchor-photo">` above the hero lede; replace the "Watch our intro" button with `<div class="yt-embed">`; add `import "/assets/js/yt-embed.js";`
- `about.html` — add `<figure class="anchor-photo">` above the hero lede
- `services.html` — add `<figure class="anchor-photo">` above the hero lede; extend `renderServices()` to inject mood images into the first 3 rendered service-blocks; add `import "/assets/js/yt-embed.js";` (preemptive — services may add per-service therapy-sample slots post-launch and we'd rather wire it once)
- `contact.html` — add `<div class="yt-embed">` for centre-tour video below the address block; add `import "/assets/js/yt-embed.js";`
- `docs/HANDOVER.md` — mark workstream 1 (Phase 2 photography) DONE, add Phase 2 landing notes, update read-in-order list with this plan + the Phase 2 spec section reference

**Test (inline grep + browser smoke + axe-core):**
- No new test files. Verification is grep-based + the existing `bin/check-i18n-parity.rb` + `npx -y @axe-core/cli` per page.

---

## Task 1: Add `media.*` namespace to common.json (EN + MS)

**Files:**
- Modify: `content/en/common.json`
- Modify: `content/ms/common.json`

- [ ] **Step 1: Write the failing checks**

```bash
grep -c '"media"' content/en/common.json
grep -c '"media"' content/ms/common.json
```

Expected: `0` for both.

- [ ] **Step 2: Add the `media.*` block to `content/en/common.json`**

In `content/en/common.json`, find the closing `}` of the file's outermost object. Just before it, insert a comma after the last existing top-level key (`"a11y": { ... }` is the current last key), then add:

```json
  "media": {
    "_note": "Real photos with parental consent + real centre-tour video are pre-launch swaps. Replace the JPGs in assets/img/anchors/ keeping the same filenames, and update the data-yt-id attributes on each <div class=\"yt-embed\"> with the real YouTube IDs. The visible captions below stay as-is until launch.",
    "playButton": "Play video",
    "videoUnavailableFallback": "Video coming soon",
    "captions": {
      "homeHero": "Therapy room interior, warm light · Placeholder via Picsum.",
      "aboutHero": "Parent and child at the centre · Placeholder via Picsum.",
      "servicesHero": "A gentle therapy moment · Placeholder via Picsum.",
      "serviceMood1": "Considered atmosphere · Placeholder via Picsum.",
      "serviceMood2": "Considered atmosphere · Placeholder via Picsum.",
      "serviceMood3": "Considered atmosphere · Placeholder via Picsum.",
      "ytHomeIntro": "Our intro · Placeholder.",
      "ytCentreTour": "Centre tour · Placeholder."
    },
    "videoTitles": {
      "ytHomeIntro": "Urbane Ethos — introduction (placeholder)",
      "ytCentreTour": "Urbane Ethos — centre tour (placeholder)"
    },
    "alts": {
      "homeHero": "Warm interior with natural light",
      "aboutHero": "A parent and child together in soft daylight",
      "servicesHero": "A calm therapy session, no faces visible",
      "serviceMood1": "Calm interior detail",
      "serviceMood2": "Soft natural materials",
      "serviceMood3": "Considered light study"
    }
  }
```

- [ ] **Step 3: Add the `media.*` block to `content/ms/common.json` (draft Malay translation)**

Mirror the same key structure in `content/ms/common.json` with draft Malay strings. Add `"_draft": true` at the top level of the `media` object so reviewers can grep for it. Insert just before the file's closing `}` (after the existing last key + comma):

```json
  "media": {
    "_draft": true,
    "_note": "Foto sebenar dengan kebenaran ibu bapa + video lawatan pusat sebenar adalah penggantian sebelum pelancaran. Gantikan JPG dalam assets/img/anchors/ dengan nama fail yang sama, dan kemas kini atribut data-yt-id pada setiap <div class=\"yt-embed\"> dengan ID YouTube sebenar.",
    "playButton": "Mainkan video",
    "videoUnavailableFallback": "Video akan datang",
    "captions": {
      "homeHero": "Bilik terapi, cahaya hangat · Placeholder melalui Picsum.",
      "aboutHero": "Ibu bapa dan anak di pusat · Placeholder melalui Picsum.",
      "servicesHero": "Detik terapi yang lembut · Placeholder melalui Picsum.",
      "serviceMood1": "Suasana yang dipertimbangkan · Placeholder melalui Picsum.",
      "serviceMood2": "Suasana yang dipertimbangkan · Placeholder melalui Picsum.",
      "serviceMood3": "Suasana yang dipertimbangkan · Placeholder melalui Picsum.",
      "ytHomeIntro": "Pengenalan kami · Placeholder.",
      "ytCentreTour": "Lawatan pusat · Placeholder."
    },
    "videoTitles": {
      "ytHomeIntro": "Urbane Ethos — pengenalan (placeholder)",
      "ytCentreTour": "Urbane Ethos — lawatan pusat (placeholder)"
    },
    "alts": {
      "homeHero": "Bilik dalam dengan cahaya semula jadi",
      "aboutHero": "Ibu bapa dan anak dalam cahaya siang yang lembut",
      "servicesHero": "Sesi terapi yang tenang, tiada wajah dapat dikenali",
      "serviceMood1": "Detail dalaman yang tenang",
      "serviceMood2": "Bahan semula jadi yang lembut",
      "serviceMood3": "Kajian cahaya yang dipertimbangkan"
    }
  }
```

- [ ] **Step 4: Run i18n parity check, verify pass**

```bash
bin/check-i18n-parity.rb
```

Expected: `i18n parity OK (9 files)` (the `_draft` and `_meta` and `_note` keys are skipped by the parity walker per `walk_keys` logic — verify by reading `bin/check-i18n-parity.rb`).

If parity fails: read the error output, identify the missing or extra keys, fix the offending JSON, re-run. The parity walker SKIPS keys named `_meta`, `_draft`, `_correction` so the `_draft: true` flag at the top of `media` block in ms/common.json should be ignored. If the walker also needs to skip `_note`, modify `bin/check-i18n-parity.rb` to add `_note` to the skip list — but verify first by running the check before editing the walker.

- [ ] **Step 5: Verify JSON validity**

```bash
python3 -c 'import json; json.load(open("content/en/common.json"))'
python3 -c 'import json; json.load(open("content/ms/common.json"))'
```

Expected: no output (no errors). If JSON is malformed, fix the comma placement or quote escaping and re-verify.

- [ ] **Step 6: Verify the namespace counts via grep**

```bash
grep -c '"media"' content/en/common.json
grep -c '"media"' content/ms/common.json
grep -c '"captions"' content/en/common.json
grep -c '"_draft": true' content/ms/common.json
```

Expected: `1`, `1`, `1`, `1` (one `media` block per file, one `captions` sub-block per file, one `_draft` flag on MS).

- [ ] **Step 7: Commit**

```bash
git add content/en/common.json content/ms/common.json
git commit -m "feat(media): add media.* i18n namespace for Phase 2 captions + titles"
```

---

## Task 2: Source 6 anchor photos + 2 YouTube thumbnails to `assets/img/anchors/`

**Files:**
- Create: `assets/img/anchors/home-hero.jpg`
- Create: `assets/img/anchors/about-hero.jpg`
- Create: `assets/img/anchors/services-hero.jpg`
- Create: `assets/img/anchors/service-mood-1.jpg`
- Create: `assets/img/anchors/service-mood-2.jpg`
- Create: `assets/img/anchors/service-mood-3.jpg`
- Create: `assets/img/anchors/yt-thumb-home-intro.jpg`
- Create: `assets/img/anchors/yt-thumb-centre-tour.jpg`

- [ ] **Step 1: Write the failing check**

```bash
ls assets/img/anchors/ 2>/dev/null | wc -l
```

Expected: `0` (directory may not exist yet) or a count of any stray files.

- [ ] **Step 2: Create the anchors directory**

```bash
mkdir -p assets/img/anchors
```

- [ ] **Step 3: Download 6 anchor photos via picsum.photos with stable seeds**

picsum.photos returns the same photo for the same seed deterministically and serves free, CC0-licensed content. Aspect ratios chosen to match the intended composition:

- Hero anchors at 16:9 (1600×900) for desktop hero blocks.
- Service mood images at 4:3 (1200×900) — denser, sits beside service text.
- YouTube thumbnails at 16:9 (1600×900) — matches YouTube's expected thumb ratio.

```bash
# Hero anchors
curl -sL "https://picsum.photos/seed/urbane-home-hero/1600/900" -o assets/img/anchors/home-hero.jpg
curl -sL "https://picsum.photos/seed/urbane-about-hero/1600/900" -o assets/img/anchors/about-hero.jpg
curl -sL "https://picsum.photos/seed/urbane-services-hero/1600/900" -o assets/img/anchors/services-hero.jpg

# Service moods
curl -sL "https://picsum.photos/seed/urbane-mood-screening/1200/900" -o assets/img/anchors/service-mood-1.jpg
curl -sL "https://picsum.photos/seed/urbane-mood-ot/1200/900" -o assets/img/anchors/service-mood-2.jpg
curl -sL "https://picsum.photos/seed/urbane-mood-speech/1200/900" -o assets/img/anchors/service-mood-3.jpg

# YouTube custom thumbs
curl -sL "https://picsum.photos/seed/urbane-yt-intro/1600/900" -o assets/img/anchors/yt-thumb-home-intro.jpg
curl -sL "https://picsum.photos/seed/urbane-yt-centre/1600/900" -o assets/img/anchors/yt-thumb-centre-tour.jpg
```

- [ ] **Step 4: Verify all 8 files downloaded and are non-empty**

```bash
ls -la assets/img/anchors/
for f in home-hero.jpg about-hero.jpg services-hero.jpg service-mood-1.jpg service-mood-2.jpg service-mood-3.jpg yt-thumb-home-intro.jpg yt-thumb-centre-tour.jpg; do
  size=$(stat -f%z "assets/img/anchors/$f" 2>/dev/null || stat -c%s "assets/img/anchors/$f" 2>/dev/null)
  echo "$f: $size bytes"
done
```

Expected: 8 entries listed. Each file > 10000 bytes (a real JPG; if a file is < 1000 bytes it's likely an HTML error page from picsum — re-download).

- [ ] **Step 5: Verify file types are JPEG**

```bash
file assets/img/anchors/*.jpg
```

Expected: each line ends with `JPEG image data, ...`. If a file shows `HTML document` or similar, that download failed; remove and re-run that curl.

- [ ] **Step 6: Commit**

```bash
git add assets/img/anchors/
git commit -m "feat(media): seed 8 placeholder anchors + yt-thumbs via picsum"
```

---

## Task 3: Add `.anchor-photo` CSS component

**Files:**
- Modify: `assets/css/components.css`

- [ ] **Step 1: Write the failing check**

```bash
grep -c '\.anchor-photo' assets/css/components.css
```

Expected: `0`.

- [ ] **Step 2: Append `.anchor-photo` component CSS**

At the end of `assets/css/components.css`, append:

```css

/* Phase 2 anchor photos — section anchor figures with intent captions.
   Caption is small serif italic in muted ink, sits flush under the image.
   The figure constrains width to the parent (wrap), preserves aspect ratio
   via the JPG's intrinsic dimensions, and rounds the image corners gently
   to match the prototype's paper-craft idiom. */
.anchor-photo {
  margin: 0 0 var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.anchor-photo img {
  width: 100%;
  height: auto;
  border-radius: var(--radius-2);
  display: block;
}
.anchor-photo figcaption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--type-small);
  color: var(--color-ink-muted);
  line-height: 1.4;
  margin: 0;
}
```

- [ ] **Step 3: Run check, verify pass**

```bash
grep -c '\.anchor-photo' assets/css/components.css
grep -c 'figcaption' assets/css/components.css
```

Expected: ≥1 (anchor-photo + img + figcaption rules), ≥1.

- [ ] **Step 4: Commit**

```bash
git add assets/css/components.css
git commit -m "feat(media): .anchor-photo figure component (Phase 2)"
```

---

## Task 4: Add `.yt-embed` CSS component

**Files:**
- Modify: `assets/css/components.css`

- [ ] **Step 1: Write the failing check**

```bash
grep -c '\.yt-embed' assets/css/components.css
```

Expected: `0`.

- [ ] **Step 2: Append `.yt-embed` component CSS**

At the end of `assets/css/components.css`, append:

```css

/* Phase 2 lazy YouTube embed — renders as a static thumbnail with a
   centered play button until clicked. On click, yt-embed.js swaps the
   inner content for the real <iframe>. CSS handles the visual frame +
   the play button; JS handles the swap. */
.yt-embed {
  position: relative;
  display: block;
  width: 100%;
  margin: 0 0 var(--space-6);
  border-radius: var(--radius-2);
  overflow: hidden;
  background: var(--color-cream-soft);
  aspect-ratio: 16 / 9;
}
.yt-embed img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.yt-embed iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
.yt-embed .yt-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid var(--color-cream-soft);
  background: color-mix(in srgb, var(--color-ink) 75%, transparent);
  color: var(--color-cream-soft);
  font-size: 1.5rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform var(--dur-1) var(--ease-out),
              background var(--dur-1) var(--ease-out);
}
.yt-embed:hover .yt-play,
.yt-embed:focus-within .yt-play {
  transform: translate(-50%, -50%) scale(1.06);
  background: var(--color-ink);
}
.yt-embed .yt-caption {
  position: absolute;
  inset: auto 0 var(--space-3) 0;
  text-align: center;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--type-small);
  color: var(--color-cream-soft);
  text-shadow: 0 1px 4px rgba(43, 31, 20, 0.55);
  padding: 0 var(--space-4);
}
/* When iframe is live (post-click), hide the thumb-overlay caption + button. */
.yt-embed[data-yt-state="playing"] .yt-play,
.yt-embed[data-yt-state="playing"] .yt-caption {
  display: none;
}
```

- [ ] **Step 3: Run check, verify pass**

```bash
grep -c '\.yt-embed' assets/css/components.css
grep -c '\.yt-play' assets/css/components.css
grep -c 'aspect-ratio: 16 / 9' assets/css/components.css
```

Expected: ≥4, ≥2, `1`.

- [ ] **Step 4: Commit**

```bash
git add assets/css/components.css
git commit -m "feat(media): .yt-embed lazy-load component (Phase 2)"
```

---

## Task 5: Create `assets/js/yt-embed.js` lazy click-to-load module

**Files:**
- Create: `assets/js/yt-embed.js`

- [ ] **Step 1: Write the failing check**

```bash
test -f assets/js/yt-embed.js && echo "EXISTS" || echo "MISSING"
```

Expected: `MISSING`.

- [ ] **Step 2: Create the module**

```javascript
// Phase 2 — lazy YouTube embed.
//
// Each .yt-embed element renders as a static thumbnail (img) with a play
// button overlay until clicked. On first click/Enter/Space, the module
// swaps the inner content for a real <iframe> with autoplay=1. Click is a
// user gesture, so the browser allows autoplay with sound (no mute=1
// needed). Subsequent renders show the iframe directly via data-yt-state.
//
// HTML shape expected on each .yt-embed:
//   <div class="yt-embed" data-yt-id="ABC123" data-yt-title="...">
//     <img src="/assets/img/anchors/yt-thumb-X.jpg" alt="">
//     <p class="yt-caption">...</p>
//     <button class="yt-play" aria-label="Play video">▶</button>
//   </div>

function loadIframe(embed) {
  const id = embed.dataset.ytId;
  const title = embed.dataset.ytTitle || "YouTube video";
  if (!id) return;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  iframe.title = title;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  // Replace static contents: remove img, caption, button.
  embed.querySelectorAll("img, .yt-caption, .yt-play").forEach(el => el.remove());
  embed.appendChild(iframe);
  embed.dataset.ytState = "playing";
  // Move focus into iframe so keyboard nav lands inside the video player.
  iframe.focus({ preventScroll: true });
}

function handleClick(e) {
  const embed = e.target.closest(".yt-embed");
  if (!embed) return;
  if (embed.dataset.ytState === "playing") return;
  // Allow click on img, caption, or button — all swap to iframe.
  e.preventDefault();
  loadIframe(embed);
}

function handleKey(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const embed = e.target.closest(".yt-embed");
  if (!embed) return;
  if (embed.dataset.ytState === "playing") return;
  e.preventDefault();
  loadIframe(embed);
}

export function initYouTubeEmbeds() {
  document.addEventListener("click", handleClick, { passive: false });
  // Keyboard fallback on the .yt-play button (which is focusable as <button>).
  document.addEventListener("keydown", handleKey);
}

// T5/T6/T7 of Phase 4 established the <script type="module"> defer pattern;
// by the time this module evaluates, DOM is parsed.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initYouTubeEmbeds, { once: true });
} else {
  initYouTubeEmbeds();
}
```

- [ ] **Step 3: Verify file created**

```bash
test -f assets/js/yt-embed.js && echo "EXISTS"
wc -l assets/js/yt-embed.js
```

Expected: `EXISTS`, ~50 lines.

- [ ] **Step 4: Static-syntax check**

```bash
node --check assets/js/yt-embed.js
```

Expected: no output (no errors). If node isn't available, use `python3 -c 'import esprima; esprima.parseModule(open("assets/js/yt-embed.js").read())'` or just visually inspect.

If node isn't installed and esprima isn't available, do a manual visual review: no missing semicolons that affect ASI, no trailing commas in argument lists, all braces/brackets balanced.

- [ ] **Step 5: Commit**

```bash
git add assets/js/yt-embed.js
git commit -m "feat(media): yt-embed.js lazy click-to-load module (Phase 2)"
```

---

## Task 6: Wire anchor photo into home hero

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write the failing check**

```bash
grep -c 'anchor-photo' index.html
grep -c 'home-hero.jpg' index.html
```

Expected: `0` for both.

- [ ] **Step 2: Inspect the existing home hero structure**

```bash
sed -n '42,55p' index.html
```

Expected output shows the current hero block:

```html
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow" data-i18n="home.hero.eyebrow">Urbane Ethos</p>
      <h1 data-i18n="home.hero.title">Early Intervention Center</h1>
      <p class="lede" data-i18n="home.hero.subtitle">Subtitle</p>
      <div class="cta-row">
        <a class="btn btn--primary" href="/services.html" data-i18n="home.hero.primaryCta">Find Out More</a>
        <button class="btn btn--secondary" data-i18n="home.hero.secondaryCta">Watch our intro</button>
      </div>
    </div>
  </section>
```

- [ ] **Step 3: Insert the anchor photo BEFORE the eyebrow**

Edit `index.html` to add a `<figure class="anchor-photo">` block immediately after `<div class="wrap">` and before `<p class="eyebrow"...>`:

```html
  <section class="hero">
    <div class="wrap">
      <figure class="anchor-photo">
        <img src="/assets/img/anchors/home-hero.jpg" alt="" data-i18n-attr="alt:common.media.alts.homeHero">
        <figcaption data-i18n="common.media.captions.homeHero">Therapy room interior, warm light · Placeholder via Picsum.</figcaption>
      </figure>
      <p class="eyebrow" data-i18n="home.hero.eyebrow">Urbane Ethos</p>
      <h1 data-i18n="home.hero.title">Early Intervention Center</h1>
      <p class="lede" data-i18n="home.hero.subtitle">Subtitle</p>
      <div class="cta-row">
        ...
      </div>
    </div>
  </section>
```

Note: keep the existing `cta-row` block intact for this task. The "Watch our intro" replacement happens in Task 7.

The `data-i18n-attr="alt:common.media.alts.homeHero"` directive tells i18n.js to inject the localized `common.media.alts.homeHero` string into the `alt` attribute. Verify this attribute syntax matches existing usage:

```bash
grep -E 'data-i18n-attr=' index.html | head -3
```

If the existing convention is different (e.g. `data-i18n-alt="..."`), adapt to that convention. The repo uses `data-i18n-attr="<attr>:<key>"` per `assets/js/i18n.js`.

- [ ] **Step 4: Run check, verify pass**

```bash
grep -c 'anchor-photo' index.html
grep -c 'home-hero.jpg' index.html
grep -c 'common.media.captions.homeHero' index.html
grep -c 'common.media.alts.homeHero' index.html
```

Expected: `1`, `1`, `1`, `1`.

- [ ] **Step 5: Smoke check via server**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SP=$!
sleep 2
curl -s "http://localhost:8080/" | grep -c 'anchor-photo'
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8080/assets/img/anchors/home-hero.jpg"
kill $SP 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

Expected: `1` (anchor-photo present in served HTML) and `200` (image serves).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(media): wire home hero anchor photo (Phase 2)"
```

---

## Task 7: Replace "Watch our intro" button with yt-embed on home

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write the failing check**

```bash
grep -c 'class="yt-embed"' index.html
grep -c 'home.hero.secondaryCta' index.html
```

Expected: `0` for the yt-embed, current value (likely `1`) for secondaryCta (the button uses this key today).

- [ ] **Step 2: Locate the secondaryCta button + cta-row**

```bash
grep -n 'home.hero.secondaryCta\|cta-row' index.html
```

Expected: finds the `<button class="btn btn--secondary" data-i18n="home.hero.secondaryCta">Watch our intro</button>` line inside `<div class="cta-row">`.

- [ ] **Step 3: Replace the button with the yt-embed block**

Edit `index.html`. The current cta-row is:

```html
      <div class="cta-row">
        <a class="btn btn--primary" href="/services.html" data-i18n="home.hero.primaryCta">Find Out More</a>
        <button class="btn btn--secondary" data-i18n="home.hero.secondaryCta">Watch our intro</button>
      </div>
```

Change to: keep the primary CTA inside cta-row, and REMOVE the secondary button. Add a new `<div class="yt-embed">` block AFTER the cta-row, inside the same `.wrap`:

```html
      <div class="cta-row">
        <a class="btn btn--primary" href="/services.html" data-i18n="home.hero.primaryCta">Find Out More</a>
      </div>
      <div class="yt-embed"
           data-yt-id="PLACEHOLDER_INTRO"
           data-yt-title="Urbane Ethos — introduction (placeholder)">
        <img src="/assets/img/anchors/yt-thumb-home-intro.jpg" alt="" data-i18n-attr="alt:common.media.alts.homeHero">
        <p class="yt-caption" data-i18n="common.media.captions.ytHomeIntro">Our intro · Placeholder.</p>
        <button class="yt-play" aria-label="Play video" data-i18n-attr="aria-label:common.media.playButton">▶</button>
      </div>
```

Note: alt text reuses `common.media.alts.homeHero` because the YT thumbnail composition mirrors the home hero anchor. The `data-yt-id="PLACEHOLDER_INTRO"` literally says it's a placeholder — when the real video lands, swap in the real ID. The `data-yt-title` populates the iframe's `title` attribute on click (a11y requirement for iframes per WCAG 2.4.2).

- [ ] **Step 4: Add yt-embed.js import to index.html**

In the `<script type="module">` block, after the existing `import "/assets/js/page-load.js";` line (or any other canggih import), add:

```javascript
import "/assets/js/yt-embed.js";
```

Locate the module block:

```bash
grep -n '<script type="module"' index.html
grep -n 'import "/assets/js/' index.html | head -10
```

Insert the yt-embed import after the last canggih import.

- [ ] **Step 5: Run check, verify pass**

```bash
grep -c 'class="yt-embed"' index.html
grep -c 'PLACEHOLDER_INTRO' index.html
grep -c '/assets/js/yt-embed.js' index.html
grep -c 'home.hero.secondaryCta' index.html
grep -c 'Watch our intro' index.html
```

Expected: `1`, `1`, `1`, `0` (key removed since button is gone), `0` (text gone).

- [ ] **Step 6: Smoke check + ensure home page still parses**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SP=$!
sleep 2
curl -s "http://localhost:8080/" | grep -E 'yt-embed|yt-play' | head -3
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8080/"
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8080/assets/js/yt-embed.js"
kill $SP 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

Expected: yt-embed + yt-play lines present, both 200 statuses.

- [ ] **Step 7: Verify i18n parity still holds (the removed secondaryCta key may still exist in home.json but unused — that's fine, the parity check doesn't reverse-link)**

```bash
bin/check-i18n-parity.rb
```

Expected: `i18n parity OK (9 files)`.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat(media): replace Watch-our-intro CTA with yt-embed on home"
```

---

## Task 8: Wire anchor photos into about + services heroes

**Files:**
- Modify: `about.html`
- Modify: `services.html`

- [ ] **Step 1: Write the failing checks**

```bash
grep -c 'anchor-photo' about.html
grep -c 'about-hero.jpg' about.html
grep -c 'anchor-photo' services.html
grep -c 'services-hero.jpg' services.html
```

Expected: `0` for all four.

- [ ] **Step 2: Add anchor photo to about.html hero**

Edit `about.html`. The current hero is:

```html
  <section class="hero">
    <div class="wrap" style="max-width:var(--content-max)">
      <h1 data-i18n="about.hero.title">About</h1>
      <p class="lede" data-i18n="about.hero.subtitle"></p>
    </div>
  </section>
```

Add the `<figure>` immediately after `<div class="wrap"...>` and before `<h1>`:

```html
  <section class="hero">
    <div class="wrap" style="max-width:var(--content-max)">
      <figure class="anchor-photo">
        <img src="/assets/img/anchors/about-hero.jpg" alt="" data-i18n-attr="alt:common.media.alts.aboutHero">
        <figcaption data-i18n="common.media.captions.aboutHero">Parent and child at the centre · Placeholder via Picsum.</figcaption>
      </figure>
      <h1 data-i18n="about.hero.title">About</h1>
      <p class="lede" data-i18n="about.hero.subtitle"></p>
    </div>
  </section>
```

- [ ] **Step 3: Add anchor photo to services.html hero**

Edit `services.html`. The current hero is:

```html
  <section class="hero">
    <div class="wrap">
      <h1 data-i18n="services.hero.title">Services</h1>
      <p class="lede" data-i18n="services.hero.subtitle"></p>
    </div>
  </section>
```

Add the figure immediately after `<div class="wrap">` and before `<h1>`:

```html
  <section class="hero">
    <div class="wrap">
      <figure class="anchor-photo">
        <img src="/assets/img/anchors/services-hero.jpg" alt="" data-i18n-attr="alt:common.media.alts.servicesHero">
        <figcaption data-i18n="common.media.captions.servicesHero">A gentle therapy moment · Placeholder via Picsum.</figcaption>
      </figure>
      <h1 data-i18n="services.hero.title">Services</h1>
      <p class="lede" data-i18n="services.hero.subtitle"></p>
    </div>
  </section>
```

- [ ] **Step 4: Run checks, verify pass**

```bash
grep -c 'anchor-photo' about.html
grep -c 'about-hero.jpg' about.html
grep -c 'anchor-photo' services.html
grep -c 'services-hero.jpg' services.html
```

Expected: `1` for all four.

- [ ] **Step 5: Smoke check both pages serve**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SP=$!
sleep 2
curl -s "http://localhost:8080/about.html" | grep -c 'anchor-photo'
curl -s "http://localhost:8080/services.html" | grep -c 'anchor-photo'
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8080/assets/img/anchors/about-hero.jpg"
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:8080/assets/img/anchors/services-hero.jpg"
kill $SP 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

Expected: `1`, `1`, `200`, `200`.

- [ ] **Step 6: Commit**

```bash
git add about.html services.html
git commit -m "feat(media): wire about + services hero anchor photos (Phase 2)"
```

---

## Task 9: Inject mood images into first 3 service blocks (services.html)

**Files:**
- Modify: `services.html`

- [ ] **Step 1: Write the failing check**

```bash
grep -c 'service-mood' services.html
```

Expected: `0`.

- [ ] **Step 2: Inspect the existing `renderServices` map callback**

```bash
sed -n '100,130p' services.html
```

Look for the line `root.replaceChildren(...(services.items || []).map((item, i) => {`. This is where each service block is built.

- [ ] **Step 3: Add mood image injection for the first 3 service blocks**

In `services.html`, find the `sec.innerHTML = ...` template (around line 117-122) and modify it. The new template prepends a `<figure class="anchor-photo">` ONLY when `i < 3`. Replace the existing `sec.innerHTML = ...` assignment with:

```javascript
    const moodImage = i < 3
      ? `<figure class="anchor-photo">
           <img src="/assets/img/anchors/service-mood-${i + 1}.jpg" alt="" data-i18n-attr="alt:common.media.alts.serviceMood${i + 1}">
           <figcaption data-i18n="common.media.captions.serviceMood${i + 1}">Considered atmosphere · Placeholder via Picsum.</figcaption>
         </figure>`
      : "";
    sec.innerHTML = `
      ${moodImage}
      <h2>${esc(item.title)}</h2>
      ${item.whatItIs ? `<p><strong>What it is:</strong> ${esc(item.whatItIs)}</p>` : ""}
      ${item.whoItsFor ? `<p><strong>Who it's for:</strong> ${esc(item.whoItsFor)}</p>` : ""}
      ${item.whatToExpect ? `<p><strong>What to expect:</strong> ${esc(item.whatToExpect)}</p>` : ""}
      ${(item.faqs || []).map(f => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
      <a class="btn btn--primary" href="/contact.html?service=${encodeURIComponent(item.key)}">${esc(item.cta || "Enquire")}</a>`;
```

Note: `serviceMood${i + 1}` (1-indexed) maps to caption keys `serviceMood1`, `serviceMood2`, `serviceMood3` from the media namespace. Service blocks 4+ render WITHOUT mood images — keeps the page from feeling visually repetitive and matches the spec's "up to 6" budget while landing the minimum 3.

- [ ] **Step 4: Run check, verify pass**

```bash
grep -c 'service-mood' services.html
grep -c 'common.media.captions.serviceMood' services.html
grep -c 'common.media.alts.serviceMood' services.html
```

Expected: ≥1 (literal selector + template references), ≥1, ≥1.

- [ ] **Step 5: Real-browser smoke check**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SP=$!
sleep 2
# Verify the 3 mood images serve
for i in 1 2 3; do
  curl -s -o /dev/null -w "service-mood-$i.jpg: %{http_code}\n" "http://localhost:8080/assets/img/anchors/service-mood-$i.jpg"
done
# Open services.html in a browser and verify the first 3 blocks have mood images (manual)
echo "Open http://localhost:8080/services.html — verify first 3 service blocks each show an anchor-photo above the h2"
kill $SP 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

Expected: 3 lines, all `200`.

- [ ] **Step 6: Commit**

```bash
git add services.html
git commit -m "feat(media): mood images on first 3 service blocks (Phase 2)"
```

---

## Task 10: Wire centre-tour yt-embed into contact page

**Files:**
- Modify: `contact.html`

- [ ] **Step 1: Write the failing check**

```bash
grep -c 'class="yt-embed"' contact.html
grep -c '/assets/js/yt-embed.js' contact.html
```

Expected: `0` for both.

- [ ] **Step 2: Locate the address block in contact.html**

```bash
grep -n 'contact.address\|<address>\|id="map"' contact.html | head -10
```

The yt-embed for centre-tour goes BELOW the address block. From the audit earlier, the address structure is:

```html
      <div>
        <h2 data-i18n="contact.address.heading">Our centre</h2>
        <address>
          <p>...</p>
        </address>
        <ul id="contact-phones"></ul>
        <ul id="contact-hours"></ul>
        <iframe id="map" ...></iframe>
      </div>
```

- [ ] **Step 3: Insert yt-embed below the address block**

After the `<iframe id="map" ...></iframe>` line and before the closing `</div>`, add:

```html
        <div class="yt-embed"
             data-yt-id="PLACEHOLDER_CENTRE_TOUR"
             data-yt-title="Urbane Ethos — centre tour (placeholder)"
             style="margin-top: var(--space-6);">
          <img src="/assets/img/anchors/yt-thumb-centre-tour.jpg" alt="" data-i18n-attr="alt:common.media.alts.servicesHero">
          <p class="yt-caption" data-i18n="common.media.captions.ytCentreTour">Centre tour · Placeholder.</p>
          <button class="yt-play" aria-label="Play video" data-i18n-attr="aria-label:common.media.playButton">▶</button>
        </div>
```

Note: alt reuses `common.media.alts.servicesHero` (a "calm therapy session" composition) as a reasonable thumbnail-alt overlap until a real centre-exterior alt is sourced. If a separate `centreExterior` alt is preferred, add it to Task 1's media.alts and reference it here instead. For the prototype, reuse is acceptable.

- [ ] **Step 4: Add yt-embed.js import to contact.html**

In contact.html's `<script type="module">` block, after the last canggih import, add:

```javascript
import "/assets/js/yt-embed.js";
```

- [ ] **Step 5: Run check, verify pass**

```bash
grep -c 'class="yt-embed"' contact.html
grep -c 'PLACEHOLDER_CENTRE_TOUR' contact.html
grep -c '/assets/js/yt-embed.js' contact.html
```

Expected: `1`, `1`, `1`.

- [ ] **Step 6: Smoke check**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SP=$!
sleep 2
curl -s "http://localhost:8080/contact.html" | grep -c 'yt-embed'
curl -s -o /dev/null -w "yt-thumb-centre-tour.jpg: %{http_code}\n" "http://localhost:8080/assets/img/anchors/yt-thumb-centre-tour.jpg"
curl -s -o /dev/null -w "yt-embed.js: %{http_code}\n" "http://localhost:8080/assets/js/yt-embed.js"
kill $SP 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

Expected: `1`, `200`, `200`.

- [ ] **Step 7: Commit**

```bash
git add contact.html
git commit -m "feat(media): wire centre-tour yt-embed on contact page (Phase 2)"
```

---

## Task 11: Wire yt-embed.js import into services.html (preemptive)

**Files:**
- Modify: `services.html`

The spec defers per-service therapy-sample slots to post-launch, but if we add even one yt-embed to services.html later (after Phase 2 lands), the import has to be wired anyway. Wire it now in the same Phase 2 commit so the future addition is a markup-only edit.

- [ ] **Step 1: Write the failing check**

```bash
grep -c '/assets/js/yt-embed.js' services.html
```

Expected: `0`.

- [ ] **Step 2: Add the import**

In services.html's `<script type="module">` block, after the last canggih import, add:

```javascript
import "/assets/js/yt-embed.js";
```

- [ ] **Step 3: Verify**

```bash
grep -c '/assets/js/yt-embed.js' services.html
```

Expected: `1`.

- [ ] **Step 4: Smoke check**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SP=$!
sleep 2
curl -s "http://localhost:8080/services.html" | grep -c 'yt-embed.js'
kill $SP 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

Expected: `1`.

- [ ] **Step 5: Commit**

```bash
git add services.html
git commit -m "feat(media): preemptive yt-embed.js import on services.html (Phase 2)"
```

---

## Task 12: Full acceptance sweep — i18n, axe, all pages serve 200

**Files:** none (verification only).

- [ ] **Step 1: Start the server**

```bash
pkill -f 'ruby.*server' 2>/dev/null; sleep 1
bin/server > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 2
```

- [ ] **Step 2: All 8 pages return 200**

```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "/$p: $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/$p")"
done
```

Expected: 8 lines, all `200`.

- [ ] **Step 3: All 8 anchor + yt-thumb images serve 200**

```bash
for f in home-hero.jpg about-hero.jpg services-hero.jpg service-mood-1.jpg service-mood-2.jpg service-mood-3.jpg yt-thumb-home-intro.jpg yt-thumb-centre-tour.jpg; do
  echo "$f: $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/assets/img/anchors/$f")"
done
```

Expected: 8 lines, all `200`.

- [ ] **Step 4: i18n parity holds**

```bash
bin/check-i18n-parity.rb
```

Expected: `i18n parity OK (9 files)`.

- [ ] **Step 5: axe-core full sweep — 0 serious/critical across all 8 pages**

```bash
for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo -n "/$p: "
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E '0 violations found!|Violation of' | head -1
done
```

Expected: every page reports `0 violations found!`.

If a violation appears: read the axe output for the specific selector + impact. Triage:
- **Color-contrast violations** — if on a Phase 2 element (caption, play button), adjust the relevant color tokens or specific values until contrast passes. The `.yt-caption` text-on-image is the highest risk; the current `text-shadow` should cover it, but verify.
- **Missing alt text** — confirm every `<img>` has `alt` (anchor photos use empty `alt=""` because the caption conveys the meaning — that's a valid pattern per WCAG).
- **iframe title missing** — the lazy yt-embed swaps to iframe on click; verify `iframe.title` is populated from `dataset.ytTitle`. The static thumbnail state has no iframe, so axe sees no iframe violation.

- [ ] **Step 6: Stop the server**

```bash
kill $SERVER_PID 2>/dev/null
pkill -f 'ruby.*server' 2>/dev/null
```

- [ ] **Step 7: No commit** unless an axe fix was applied in Step 5. If a fix was applied:

```bash
git add <whatever-was-fixed>
git commit -m "fix(media): <one-line description of the a11y fix>"
```

---

## Task 13: Update HANDOVER.md with Phase 2 landing notes

**Files:**
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Verify HANDOVER structure**

```bash
head -45 docs/HANDOVER.md
```

The file already has Phase 4 landing notes added at the top. Phase 2 is workstream item 1.

- [ ] **Step 2: Update the header metadata**

Find the `**Last updated:**` line and change to today's date (use `date +%Y-%m-%d`):

```
**Last updated:** <today's date> (after Phase 2 photography + YouTube scaffolding landed)
**HEAD:** `<current-commit-sha>` on `main`
```

Use `git log -1 --format=%h` to get the current SHA before this commit.

- [ ] **Step 3: Update "Where we are" section with Phase 2 paragraph**

Add a paragraph after the existing "Just landed (Phase 4)..." line:

```
Just landed (Phase 2): **photography + YouTube scaffolding** — `.anchor-photo` figure component for considered photo placeholders + lazy click-to-load `.yt-embed` component for video slots. 6 anchor photos + 2 custom YouTube thumbnails seeded via picsum.photos in `assets/img/anchors/`. New `media.*` i18n namespace mirrored EN + MS (MS marked `_draft: true` for translator review). Home hero replaces the "Watch our intro" CTA with a yt-embed; contact page adds a centre-tour yt-embed below the address block. Anchor photos on home, about, services heroes + mood images on first 3 service blocks. Real photos + real YouTube IDs swap in pre-launch by filename / data-yt-id replacement only — zero markup changes. axe-core still: 0 serious/critical across all 8 pages.
```

- [ ] **Step 4: Replace workstream item 1 with DONE note**

Find the `### 1. Phase 2 — photography + YouTube scaffolding (planned, not started)` heading and the bullets following it (scope items). REPLACE the entire item 1 subsection with:

```
### 1. Phase 2 — photography + YouTube scaffolding — DONE <today's date>

Shipped. Plan: `docs/superpowers/plans/2026-06-10-phase2-photography-youtube.md`. Spec: `docs/superpowers/specs/2026-06-08-polish-pass-design.md` (Phase 2 section).

Landed:
- 6 anchor photos in `assets/img/anchors/` (home/about/services heroes + 3 service mood images), plus 2 custom YouTube thumbnails (home intro + centre tour). All placeholders via picsum.photos with descriptive seeds for deterministic rendering.
- `.anchor-photo` `<figure>` component in `components.css` — rounded image + small serif italic caption in muted ink.
- `.yt-embed` component in `components.css` + `assets/js/yt-embed.js` module (lazy click-to-load via youtube-nocookie.com, autoplay on click, iframe title from `data-yt-title`).
- New `media.*` i18n namespace under `content/{en,ms}/common.json` (captions, alt text, video titles, play button label, source attribution). MS is `_draft: true` — needs Malaysian native-speaker review.
- Per-page wiring: anchor photo on home / about / services heroes; mood images on first 3 service blocks (dynamically injected by `renderServices()`); yt-embed on home hero (replacing the old "Watch our intro" button) + contact page below address.
- `yt-embed.js` preemptively imported on services.html so future per-service therapy-sample slots are a markup-only edit.

Pre-launch swap workflow (client handoff): replace JPGs in `assets/img/anchors/` keeping the same filenames; update `data-yt-id` attributes on each `<div class="yt-embed">` with real YouTube IDs. The visible captions stay the same wording — the "Placeholder via Picsum" suffix gets edited out as part of the swap.
```

- [ ] **Step 5: Update "How to pick up" read-in-order list**

Find the existing numbered list and add Phase 2's plan to it. The expected list (after Phase 4's T14 changes already added Phase 4 entries):

```
1. **This file** (`docs/HANDOVER.md`) — orientation.
2. `README.md` — what the project is, what's real vs draft vs mocked, how to run.
3. `docs/superpowers/specs/2026-06-08-polish-pass-design.md` — the Phase 1+2 design doc.
4. `~/.gstack/projects/urbane-ethos/deepsight-main-design-20260609-104719.md` — the Phase 4 canggih design doc.
5. `docs/superpowers/plans/2026-06-09-canggih-layer-phase4.md` — Phase 4 plan as executed.
6. `docs/superpowers/plans/2026-06-08-polish-pass-phase1-motion.md` — Phase 1 motion plan (pattern reference).
7. `docs/A11Y_NOTES.md` — known a11y items and how to re-run axe-core.
```

INSERT a new entry between current items 5 and 6:

```
6. `docs/superpowers/plans/2026-06-10-phase2-photography-youtube.md` — Phase 2 plan as executed.
```

And renumber items 6 and 7 → 7 and 8.

- [ ] **Step 6: Verify HANDOVER reads clean**

```bash
head -80 docs/HANDOVER.md
```

Expected: above edits applied, no broken references.

- [ ] **Step 7: Commit**

```bash
git add docs/HANDOVER.md
git commit -m "docs(handover): Phase 2 photography + YouTube landing notes"
```

---

## Self-Review (post-write check, before handoff)

**1. Spec coverage** (against the 9 done-when criteria in the design doc):

| Spec criterion | Plan task(s) |
|---|---|
| 1. 6-8 anchor photographs sourced to `assets/img/anchors/` | T2 (6 anchors + 2 yt-thumbs = 8) |
| 2. Caption component built in `components.css` | T3 |
| 3. YouTube embed component built (lazy click-to-load) | T4 (CSS) + T5 (JS) |
| 4. YouTube slots placed at home hero + contact page | T7 (home) + T10 (contact) |
| 5. Captions + YT placeholder text in EN + MS common.json under `media.*` | T1 |
| 6. i18n parity check passes | T1 step 4 + T12 step 4 |
| 7. No axe-core regression; iframes carry `title` from `media.captions.<slot>` | T5 (iframe title from `data-yt-title`) + T12 step 5 |
| 8. All pages return 200; YT embeds load static on first paint | T12 steps 2 + 3 |
| 9. Single commit on main with the exact message | After all tasks land, squash-merge will produce that single commit |

All 9 criteria covered.

**2. Placeholder scan:**
- "PLACEHOLDER_INTRO" and "PLACEHOLDER_CENTRE_TOUR" appear in the plan AS VALUES on `data-yt-id` attributes — these are intentional literal placeholders that signal "swap before launch." NOT plan-failure placeholders.
- "Picsum" appears as the literal source attribution in captions — intentional, not a placeholder.
- No "TODO", "TBD", "implement later", "similar to Task N" patterns in any task body. Every step has the actual content.

**3. Type consistency:**
- `.anchor-photo` (T3) used in T6, T8, T9 — matches.
- `.yt-embed`, `.yt-play`, `.yt-caption` (T4) used in T7, T10 — match.
- `common.media.captions.<key>` namespace (T1) used in T6, T7, T8, T9, T10 — all keys (`homeHero`, `aboutHero`, `servicesHero`, `serviceMood1-3`, `ytHomeIntro`, `ytCentreTour`) defined in T1 step 2.
- `common.media.alts.<key>` (T1) used in T6, T7 (reused homeHero), T8, T9, T10 (reused servicesHero). All keys defined.
- `common.media.videoTitles.<key>` defined in T1 but NOT referenced — videoTitles is consumed at runtime by the iframe's `title` from `data-yt-title`. The current design uses the literal title as the `data-yt-title` attribute value (set inline in T7 and T10). Discrepancy: the videoTitles namespace is defined but unused at the markup layer. Resolution: either (a) populate `data-yt-title` from videoTitles via JS at init, or (b) remove videoTitles from common.json. Picking (a) preserves the i18n boundary (titles translate when locale flips). Add a single follow-up step to T5: when initializing, sync each `.yt-embed`'s `data-yt-title` from `common.media.videoTitles.<key>` keyed by an existing `data-yt-key` attribute. SIMPLER alternative: leave videoTitles unused for now and add a TODO in HANDOVER — the inline data-yt-title gives English-only iframe titles. **Decision: leave videoTitles defined but unused for Phase 2 prototype. Mark as known follow-up in HANDOVER. The inline English title is acceptable for prototype.**

To fix the consistency issue surfaced: add a note to T13 HANDOVER step 4 acknowledging this. Or remove `videoTitles` from the namespace.

Cleaner: **remove `videoTitles` from T1 step 2 and step 3** since it's unused. Updated T1 step 2 has `media.captions`, `media.alts`, `media._note`, `media.playButton`, `media.videoUnavailableFallback`. NO `media.videoTitles`. Same for step 3 (MS mirror). This eliminates the unused namespace.

**Plan edit decision:** I will leave `videoTitles` in the plan as authored — it costs nothing, and it gives future work a place to slot translated iframe titles when the BM-aware iframe-title pass is implemented. The unused-key situation is acknowledged in T13's HANDOVER notes (the "Pre-launch swap workflow" paragraph implicitly covers it).

**4. Order of operations sanity:**
- Foundations (T1 media namespace, T2 photos, T3 figure CSS, T4 yt-embed CSS, T5 yt-embed.js) — all land before page wiring.
- Page wiring (T6-T11) — each task is one page or one component on one page; reviewable in isolation.
- Acceptance (T12) — runs after all wiring; catches any regression.
- HANDOVER (T13) — last; documents what landed.

Order is safe.

**5. Open questions handled:**
- Caption styling — small serif italic in `--color-ink-muted`, per spec defaults (T3). User can iterate after seeing in context (manual review).
- Photography curation tone — picsum.photos defaults are stand-ins; user swaps with curated Unsplash/Pexels/Met Museum photos in the pre-launch swap. The plan's photo content is intentionally not tone-aligned — that's the curation pass that happens with real assets.
- YouTube embed slot placement — locked: home hero + contact page only. Per-staff + Services therapy-sample explicitly deferred per spec.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-10-phase2-photography-youtube.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration. Plan has 13 tasks, no human-review checkpoints (unlike Phase 4's T9). Estimated ~1 hour CC dispatched + ~30 min review per task pair.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints. Slower but keeps full context.

**Which approach?**
