# Staff refresh + client photo integration — design

**Date:** 2026-08-09
**Status:** approved, ready for implementation

## Why

Two practitioners left and two joined. Separately, the client supplied 41 photos (29 unique — 12 exact duplicates) to replace the interim imagery on the site.

Auditing that set surfaced an unrelated live problem: **two currently-published images expose identifiable children**, one of which was already flagged `PENDING` in `content/en/common.json` `media._note` and never actioned. This spec fixes that as part of the same pass.

## Governing rule (client decision, 2026-08-09)

> Exclude photos with children's faces. Exclude photos with sensitive information.

Applied strictly. A face visible in profile or partially turned counts as identifiable. "Sensitive information" means anything readable that identifies a real person: client names, appointment schedules, name tags.

## Part 1 — Staff replacement

### 1.1 Robin replaces Liyana (Clinical Psychologist)

`ms-liyana-tarmizi` → `ms-robin-koh-hui-xuan`, same array index (2), same role.

| Field | Value |
|---|---|
| `name` | `Ms. Koh Hui Xuan (Robin)` |
| `role` (EN) | `Clinical Psychologist` |
| `role` (MS) | `Ahli Psikologi Klinikal` |
| `greeting` | `Hi, I'm Robin` / `Hai, saya Robin` |
| `photo` | `assets/img/staff/ms-robin-koh-hui-xuan.jpeg` |
| `photoInterim` | `false` |

`credentials`:
1. Master of Clinical Psychology, UCSI University
2. Registered Clinical Psychologist, Malaysian Allied Health Professions Council (MAHPC: CP00517)
3. Member, Malaysian Society of Clinical Psychology (MSCP: CP1-00619)
4. Trained in PEERS® for Preschoolers

`personalLine` (EN): *"I help people give a voice to their struggles, and build a life that feels like their own."*
Derived from the client's own copy. This **retires a lorem-ipsum placeholder** rather than adding one.

`bio` (EN):
> Robin works with children, adolescents and adults across psychological assessment, diagnosis and intervention — anxiety, depression, stress, adjustment difficulties, and neurodivergence including Autism Spectrum Disorder (ASD) and Attention-Deficit/Hyperactivity Disorder (ADHD). She practises Cognitive Behavioural Therapy (CBT) and Acceptance and Commitment Therapy (ACT) with integrated art therapy, supporting clients to build psychological flexibility and live a meaningful life. A strong advocate for mental health literacy and early intervention, she has delivered mental health talks and psychoeducation sessions in public schools for students, educators and families.

The client's source copy arrives as four blocks (approach / modalities / passion & interests / education & registration). The staff card renders greeting → role → credentials → personalLine → bio. Modalities and registration fold into `credentials`; approach and passion condense into the single `bio` paragraph above. No schema change.

Robin's pronouns are stated as she/her in the client's copy; used as given.

### 1.2 Farwizah replaces Nuraisyah (Special Education Teacher)

`ms-nuraisyah-azman` → `ms-farwizah`, same array index (7), same role.

| Field | Value |
|---|---|
| `name` | `Ms. Farwizah` |
| `role` (EN) | `Special Education Teacher` |
| `role` (MS) | `Guru Pendidikan Khas` |
| `greeting` | `Hi, I'm Farwizah` / `Hai, saya Farwizah` |
| `photo` | `assets/img/staff/ms-farwizah.jpeg` |
| `photoInterim` | `false` |

`credentials`:
1. Bachelor of Psychology (Hons), Universiti Pendidikan Sultan Idris (UPSI)
2. Diploma Pascasiswazah Pendidikan (DPP), Universiti Kebangsaan Malaysia (UKM)
3. Permit Mengajar JPNS.SPS-2026/PTGPP/14/0805

`personalLine` (EN): *"I want every child to grow into as much of themselves as they can — and to do it independently."*

`bio` (EN):
> A special needs education teacher with a background in psychology and education, working to help children grow to the most of their potential and become independent. Also active in volunteerism — supporting those in need and contributing to children's development.

Pronouns were not supplied for Farwizah, so the bio is written pronoun-free. This matches the house style of the other bios, which mostly omit pronouns.

The permit number is published at explicit client instruction (2026-08-09), consistent with the MAHPC registration numbers already published for other practitioners.

### 1.3 Renderer fix

`staff.html` currently gates the photo on `photoInterim`:

```js
const photoHtml = (m.photo && m.photoInterim) ? `<img …>` : `<div class="staff-photo" …>${initials}</div>`;
```

A **real** (non-interim) photo therefore renders as an initials tile. Change to gate on `m.photo` alone, and set `mrs-nur-ain-nabila.photo` to `null` in both locales so she keeps her initials placeholder as intended.

Robin's and Farwizah's headshots are client-submitted, not PDF extracts, so they live in a new `assets/img/staff/` rather than `assets/img/staff-pdf/`, and carry `photoInterim: false`. This keeps the documented pre-launch swap workflow from trying to replace two photos that don't need replacing.

### 1.4 Touchpoints

| File | Change |
|---|---|
| `content/en/staff.json` | members[2], members[7] replaced; `_meta._note` updated; three `_placeholder` keys removed |
| `content/ms/staff.json` | same, translated (glossary applied) |
| `content/en/home.json` | `staffFeatured[1]` id + greeting + personalLine |
| `content/ms/home.json` | same, translated |
| `staff.html` | two static fallback `<article>` cards; renderer `photoHtml` fix |
| `index.html` | one static fallback `.person-row` |
| `assets/js/personalization.js` | `concernToStaff`: `behaviour` → `ms-robin-koh-hui-xuan`, `learning` → `ms-farwizah` |

**Deleted:** `assets/img/staff-pdf/ms-liyana-tarmizi.jpg`, `assets/img/staff-pdf/ms-nuraisyah-azman.jpg`, `assets/img/placeholders/staff-ms-liyana-tarmizi.png`, `assets/img/placeholders/staff-ms-nuraisyah-azman.png`.

**`_placeholder` keys to remove from BOTH `en` and `ms` staff.json** (they must stay key-identical or `bin/check-i18n-parity.rb` fails):
- `members.2.personalLine` — Robin now has a real one
- `members.7.personalLine` — Farwizah now has a real one
- `members.7.bio` — Farwizah now has a real one

`members.2.bio` was never in the placeholder map (Liyana had a real bio), so nothing to remove there.

## Part 2 — Photo integration

### 2.1 Remediation — live images that break the rule

| Slot | Current problem | Replacement |
|---|---|---|
| `assets/img/anchors/services-hero.jpg` | Three identifiable children's faces + two adults, spread across all thirds (not croppable). Also date-stamps the centre to March 2019 via a "Tentang Hari Ini" board. | Overhead shot of hands arranging language/sentence-building cards. No faces, no personal data. `1024×768` → `1024×576`. |
| `assets/img/anchors/yt-thumb-centre-tour.jpg` | One boy's face fully visible, lit, in focus. Already flagged `PENDING` in `common.json`. | Child on the sensory platform swing, shot from behind, whale-mural backdrop. `1600×1493` → `1600×900`. |

The `services-hero` replacement drops from 1600px to 1024px wide. Accepted: it renders inside `var(--content-max)` as an anchor figure, not a full-bleed hero, and no upscaling will be applied.

The other six anchors pass the audit and stay: `about-hero.jpg`, `service-mood-1/2/3.jpg` are face-hidden photos; `service-specialed.jpg` and `yt-thumb-home-intro.jpg` are illustrations.

### 2.2 New placements

| Destination | Source | Page wiring |
|---|---|---|
| `assets/img/anchors/about-team.jpg` | Nine-person team line-up, unmasked, in the therapy room | New `.anchor-photo` figure on `about.html` |
| `assets/img/anchors/contact-reception.jpg` | Three staff at the reception counter | New `.anchor-photo` figure on `contact.html`, near the address block. Cropped to 780×760 at implementation time — the source framing cut the "U" off the counter wordmark ("RBANE ETHOS"), which read as a mistake, so the sign band is cropped out entirely. |
| `assets/img/anchors/service-ot-room.jpg` | Sensory room: platform swing, crash mat, whale mural | New `ot` entry in the `serviceArt` map in `services.html` |
| `assets/img/culture/team-heart.jpg` | Team making heart shapes, mural backdrop | `careers.html` culture strip |
| `assets/img/culture/team-birthday.jpg` | Staff birthday table | `careers.html` culture strip |
| `assets/img/culture/team-festive.jpg` | Staff at reception with festive hampers | `careers.html` culture strip |
| `assets/img/culture/community-eip.jpg` | EIP awareness talk, ~90 attendees | `careers.html` culture strip |

Adding `ot` to `serviceArt` means `service-mood-3.jpg` is no longer reached (blocks 0 `screening` and 1 `assessment` still use mood-1/mood-2; block 2 `ot` now has bespoke art). The file and its i18n keys stay in place — the `i < 3` code path is intact for future services.

The careers culture strip is a new section rendered from `content/careers.json`. `careers.json` is root-level and **exempt from the parity gate**, so captions live there rather than in `common.json`. Alt text ships in the same file.

### 2.3 Processing

For every photo: strip EXIF (`-strip`), convert to progressive JPEG at quality 82, resize to the target above, no upscaling. Culture strip images target 800px on the long edge (they render small). Filenames are stable so the documented pre-launch swap workflow still works by filename replacement.

### 2.4 Excluded, and why

**Identifiable children (9):** group class photo with ~8 children; restaurant line-up; river selfie; toddler with gift bags; painting collage; night café group; two team selfies with a child in frame; cafe spaghetti-tower selfie.

**Dropped during verification (1):** the off-site team retreat group was approved during design, but visual review of the processed asset found a child front-and-centre. His face is largely covered by a cap and a mask and he is looking down, so he is not readily identifiable — but the governing rule is strict, the photo was disposable culture filler, and the cost of being wrong is a child published without consent. Removed from the culture strip, which ships with four images instead of five.

**Sensitive information (2):**
- Child stepping across floor footprints — the whiteboard behind lists **real client names and appointment times** (`Hariz Naim … 10:00am–11:00am`, `Adam Rizqy (Dr)`, `Ishaq (Mr Foo)`, `Sharvin`, `Sufiyyah`). PDPA exposure. Compositionally the strongest photo in the set; a hard crop would remove the whiteboard entirely and make it publishable. Left out per the governing rule; available on request.
- Child holding caterpillar artwork — children's first names visible on wall name tags.

**Quality (5):** two motion-blurred night patio shots, a blown-out backlit café selfie, an unreadable low-light team-building shot, and a photograph of a third-party organisation's seminar slide (`SmartParents.com.my`).

**Available but unplaced (1):** therapist high-five with a child. The child's face is covered by a cartoon sticker; a crop could exclude them entirely, but there is no natural slot left and the sticker reads as amateur. Not processed.

## Verification

1. `bin/check-i18n-parity.rb` exits 0 — key trees identical across `content/en/` and `content/ms/`, including the `_placeholder` maps.
2. Canggih module import counts unchanged: `nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3`.
3. `grep -rn "liyana\|Liyana\|nuraisyah\|Nuraisyah"` returns hits only in `docs/superpowers/` history — no live references.
4. Every new `<img>` has `alt` (or `alt=""` with a `<figcaption>`, matching the existing `.anchor-photo` pattern). axe-core stays at 0 violations across the 10 production pages.
5. No broken image paths: every `src` in the 10 production pages resolves to a file on disk.
6. Re-audit the final `assets/img/anchors/` + `assets/img/culture/` set with fresh eyes against the governing rule.

## Out of scope

- Reshooting staff headshots (the other eight remain low-res PDF extracts flagged `photoInterim: true`).
- The remaining lorem-ipsum `personalLine` / `bio` placeholders for the other seven staff.
- Real YouTube IDs (`data-yt-id` stays `PLACEHOLDER_*`).
- Human/legal review of the Bahasa Malaysia privacy copy.
