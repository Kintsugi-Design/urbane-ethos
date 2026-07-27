# Plan — All-ages personalization micro-survey

**Date:** 2026-07-27 · **Branch:** `feat/all-ages-personalization` · **Status:** planned, not implemented

## Goal

Rework the home-page personalization micro-survey (`index.html` + `content/{en,ms}/home.json` `personalization` block + `assets/js/personalization.js`) so it addresses **any age** — self, child, or a cared-for loved one — matching Nasirah's positioning: Urbane Ethos is a **therapy centre** for neurodivergent individuals from toddlers to elderly (0–20 today, expanding older). Source of truth for wording and age gates: `docs/superpowers/specs/2026-07-27-authoritative-content-replacement-design.md` Appendices C/D.

Constraints: no build step, relative paths, parity green (`bin/check-i18n-parity.rb`), axe 0 on home, existing concern slugs keep working, rules stay a deterministic table (no ML).

## Verified current state (read 2026-07-27)

- Chip renderer (`index.html` ~L321–336) **already supports both** plain strings and `{value,label}` objects — age can move to slug objects with **zero renderer changes**.
- `assets/js/personalization.js`: `RULES.concernToService/concernToBlogTags/concernToStaff` keyed on slugs `speech | motor-skills | behaviour | learning | not-sure`. `age` and `stage` are stored in `sessionStorage` but unused. Consent-gated on `personalization`. `sessionStorage` is session-scoped, so no migration needed for the age-value format change.
- Home services grid keys (`content/en/home.json` `services.items[].key`): `screening, ot, speech, specialed, eip, psych`. `eip` is **not** in `concernToService` — correct, keep it that way (EIP is children ≤12 only).
- Parity script (`bin/check-i18n-parity.rb`) recurses **hashes only** (arrays contribute no keys) and strips `_meta`/`_draft`/`_correction`. So the `ageOptions` shape change and label edits cannot break parity as long as EN/MS both change; new `ageNotes` object keys must be mirrored.

### Pre-existing defects found while verifying (fixed by this plan)

1. **`concernToStaff` ids are stale.** They point at `speech-lead`, `ot-lead`, … but `content/{en,ms}/staff.json` members use real ids (`ms-emalin-nasuha-hachim`, `mrs-norizzati-afiqah`, …). `recommendedStaffId()` therefore never matches and the recommended-rail staff card never renders.
2. **`concernToBlogTags` tags don't exist.** Rules use `Speech`, `Motor`, `Behaviour`, `Parenting`; actual `content/blog.json` tags are `speech therapy`, `occupational therapy`, `development`, `special needs`, `Parenting Workshop`, `promo`, `urbaneethos`. `recommendedBlog()` always falls back to `posts.slice(0,2)`.
3. **`reorderServices` never visibly fires on the home page.** `personalization.js` runs it on `DOMContentLoaded` / `consent:changed`, but the grid is built later by async `renderHome()` in `index.html` (which also re-renders on `personalization:changed` **without** reordering). The sync reorder always races ahead of the async rebuild, so the grid stays in JSON order. Fix: call `reorderServices(svcGrid)` inside `renderHome()` right after the grid is populated.

---

## Chosen taxonomy (reference for all tasks)

### Age bands (`ageOptions` → `{value, label}` objects; slugs locale-agnostic)

| slug | EN label | MS label | rationale |
|---|---|---|---|
| `early-years` | `0–3 · Early years` | `0–3 · Awal kanak-kanak` | EIP play group starts 3 |
| `preschool` | `4–6 · Preschool` | `4–6 · Prasekolah` | pre-school-readiness band |
| `school-age` | `7–12 · School age` | `7–12 · Usia sekolah` | EIP school-readiness 6–12; social group 7–9 |
| `teen` | `13–17 · Teenager` | `13–17 · Remaja` | social group 13–18, vocational 15+, ADL adolescents |
| `adult` | `18–59 · Adult` | `18–59 · Dewasa` | individual OT/speech/psych/cognitive |
| `older-adult` | `60+ · Older adult` | `60+ · Warga emas` | "expanding to older and elderly" (Appendix C) |

### Concern slugs (existing slugs unchanged; labels relabelled age-inclusive; one added)

| slug | EN label | MS label | → service | → blog tags | → staff id |
|---|---|---|---|---|---|
| `speech` | Speech & communication | Pertuturan & komunikasi | `speech` | `["speech therapy"]` | `ms-emalin-nasuha-hachim` |
| `motor-skills` | Movement & motor skills | Pergerakan & kemahiran motor | `ot` | `["occupational therapy", "development"]` | `mrs-norizzati-afiqah` |
| `behaviour` | Behaviour & emotions | Tingkah laku & emosi | `psych` | `["development"]` | `ms-liyana-tarmizi` |
| `learning` | Learning & cognition | Pembelajaran & kognitif | `specialed` | `["special needs", "Parenting Workshop"]` | `ms-nuraisyah-azman` |
| `daily-living` **(new)** | Daily living & independence | Kehidupan seharian & berdikari | `ot` | `["occupational therapy", "development"]` | `nasirah-zulkifli` |
| `not-sure` | Not sure | Tidak pasti | `screening` | `["Parenting Workshop", "development"]` | `dr-norizan-rajak` |

`daily-living` covers ADL/self-care/rehab so adults and elderly see themselves; it maps to OT (ADL sits under OT in Appendix C/D). `eip` remains reachable only via the child-band age note, never via concern mapping.

---

## Task 1 — EN content (`content/en/home.json`, `content/glossary.md`)

Files: `/Users/deepsight/code/urbane-ethos/content/en/home.json`, `/Users/deepsight/code/urbane-ethos/content/glossary.md`. No JS/HTML in this task.

**1a. Replace the `personalization` block in `content/en/home.json` with exactly:**

```json
"personalization": {
  "heading": "Tell us a little about the person who needs support",
  "subheading": "You, your child, or someone you care for — any age. Skip if you'd rather browse on your own.",
  "ageLabel": "Age group",
  "ageOptions": [
    { "value": "early-years", "label": "0–3 · Early years" },
    { "value": "preschool", "label": "4–6 · Preschool" },
    { "value": "school-age", "label": "7–12 · School age" },
    { "value": "teen", "label": "13–17 · Teenager" },
    { "value": "adult", "label": "18–59 · Adult" },
    { "value": "older-adult", "label": "60+ · Older adult" }
  ],
  "concernLabel": "Main area of concern",
  "concernOptions": [
    { "value": "speech", "label": "Speech & communication" },
    { "value": "motor-skills", "label": "Movement & motor skills" },
    { "value": "behaviour", "label": "Behaviour & emotions" },
    { "value": "learning", "label": "Learning & cognition" },
    { "value": "daily-living", "label": "Daily living & independence" },
    { "value": "not-sure", "label": "Not sure" }
  ],
  "stageLabel": "What stage are you at?",
  "stageOptions": [
    "Just exploring",
    "Looking to assess",
    "Ready to book"
  ],
  "ageNotes": {
    "child": "For children 12 and below, ask us about the Early Intervention Programme — school-readiness sessions (ages 6–12) and play group (ages 3–5).",
    "teen": "For teens we run social-skills groups (13–18), vocational skills training (15+) and an ADL group for adolescents, alongside individual therapy.",
    "adult": "Adults are welcome too — individual occupational therapy, speech-language therapy, clinical psychology and cognitive stimulation sessions.",
    "olderAdult": "For older adults we offer individual therapy, cognitive stimulation, and daily-living and rehabilitation support."
  },
  "submit": "Show me what's relevant",
  "skip": "Skip"
}
```

(`stageLabel`/`stageOptions`/`submit`/`skip` unchanged — shown for context. All facts in `ageNotes` are from Appendix C/D: EIP ≤12, school-readiness 6–12, play group 3–5, social groups 7–9 & 13–18, vocational 15+, ADL adolescents, adults/elderly individual OT/speech/psych/cognitive + ADL/rehab.)

**1b. Mark the new drafted copy** in the top-level `_draft` map (create it — `content/en/home.json` currently has `_meta` and `_placeholder` but no `_draft`; the parity script strips `_draft`):

```json
"_draft": {
  "personalization.heading": true,
  "personalization.subheading": true,
  "personalization.ageNotes.child": true,
  "personalization.ageNotes.teen": true,
  "personalization.ageNotes.adult": true,
  "personalization.ageNotes.olderAdult": true
}
```

**1c. Update `content/glossary.md`** so future translations stay consistent. In `## Concerns`, replace the five entries with:

```
- Speech & communication → Pertuturan & komunikasi
- Movement & motor skills → Pergerakan & kemahiran motor
- Behaviour & emotions → Tingkah laku & emosi
- Learning & cognition → Pembelajaran & kognitif
- Daily living & independence → Kehidupan seharian & berdikari
- Not sure → Tidak pasti
```

Add a new section after Concerns:

```
## Age bands
- Early years → Awal kanak-kanak
- Preschool → Prasekolah
- School age → Usia sekolah
- Teenager → Remaja
- Adult → Dewasa
- Older adult → Warga emas
```

## Task 2 — MS mirror (`content/ms/home.json`)

File: `/Users/deepsight/code/urbane-ethos/content/ms/home.json`. Slugs (`value`) byte-identical to EN; labels translated per glossary (Terapi Carakerja, Terapi Pertuturan, Psikologi Klinikal, Program Intervensi Awal). Keep `_meta.reviewedBy: null`.

**Replace the `personalization` block with exactly:**

```json
"personalization": {
  "heading": "Ceritakan sedikit tentang orang yang memerlukan sokongan",
  "subheading": "Anda, anak anda, atau orang yang anda sayangi — pada sebarang usia. Langkau jika anda lebih suka melihat-lihat sendiri.",
  "ageLabel": "Kumpulan umur",
  "ageOptions": [
    { "value": "early-years", "label": "0–3 · Awal kanak-kanak" },
    { "value": "preschool", "label": "4–6 · Prasekolah" },
    { "value": "school-age", "label": "7–12 · Usia sekolah" },
    { "value": "teen", "label": "13–17 · Remaja" },
    { "value": "adult", "label": "18–59 · Dewasa" },
    { "value": "older-adult", "label": "60+ · Warga emas" }
  ],
  "concernLabel": "Bidang utama yang membimbangkan",
  "concernOptions": [
    { "value": "speech", "label": "Pertuturan & komunikasi" },
    { "value": "motor-skills", "label": "Pergerakan & kemahiran motor" },
    { "value": "behaviour", "label": "Tingkah laku & emosi" },
    { "value": "learning", "label": "Pembelajaran & kognitif" },
    { "value": "daily-living", "label": "Kehidupan seharian & berdikari" },
    { "value": "not-sure", "label": "Tidak pasti" }
  ],
  "stageLabel": "Anda berada di peringkat mana?",
  "stageOptions": [
    "Sekadar melihat-lihat",
    "Ingin membuat penilaian",
    "Sedia untuk menempah"
  ],
  "ageNotes": {
    "child": "Untuk kanak-kanak 12 tahun ke bawah, tanya kami tentang Program Intervensi Awal — sesi kesediaan sekolah (umur 6–12) dan kumpulan bermain (umur 3–5).",
    "teen": "Untuk remaja, kami menjalankan kumpulan kemahiran sosial (13–18), latihan kemahiran vokasional (15+) dan kumpulan Aktiviti Kehidupan Seharian (ADL) untuk remaja, di samping terapi individu.",
    "adult": "Dewasa juga dialu-alukan — sesi individu Terapi Carakerja, terapi pertuturan-bahasa, Psikologi Klinikal dan rangsangan kognitif.",
    "olderAdult": "Untuk warga emas, kami menawarkan terapi individu, rangsangan kognitif, serta sokongan kehidupan seharian dan pemulihan."
  },
  "submit": "Tunjukkan apa yang berkaitan",
  "skip": "Langkau"
}
```

**Mirror the `_draft` map** (same six dot-paths as Task 1b) into `content/ms/home.json`. (`_draft` is stripped from parity, but keeping the flags in both files preserves the review-marker convention.) Do not touch `_meta` except leaving `reviewedBy: null` as-is.

## Task 3 — Rules + age wiring (`assets/js/personalization.js`)

File: `/Users/deepsight/code/urbane-ethos/assets/js/personalization.js` only.

**3a. Replace the whole `RULES` const (lines 10–32) with:**

```js
const RULES = {
  // "eip" (Early Intervention Programme) is age-gated — children ≤12 ONLY
  // (Appendix C). It is deliberately absent from concernToService; child age
  // bands surface it via ageToNoteKey instead.
  concernToService: {
    "speech": "speech",
    "motor-skills": "ot",
    "behaviour": "psych",
    "learning": "specialed",
    "daily-living": "ot",
    "not-sure": "screening"
  },
  // Tags must match content/blog.json posts[].tags verbatim.
  concernToBlogTags: {
    "speech": ["speech therapy"],
    "motor-skills": ["occupational therapy", "development"],
    "behaviour": ["development"],
    "learning": ["special needs", "Parenting Workshop"],
    "daily-living": ["occupational therapy", "development"],
    "not-sure": ["Parenting Workshop", "development"]
  },
  // Ids must match content/{en,ms}/staff.json members[].id verbatim.
  concernToStaff: {
    "speech": "ms-emalin-nasuha-hachim",
    "motor-skills": "mrs-norizzati-afiqah",
    "behaviour": "ms-liyana-tarmizi",
    "learning": "ms-nuraisyah-azman",
    "daily-living": "nasirah-zulkifli",
    "not-sure": "dr-norizan-rajak"
  },
  // Age band slug → subkey under home.personalization.ageNotes.
  ageToNoteKey: {
    "early-years": "child",
    "preschool": "child",
    "school-age": "child",
    "teen": "teen",
    "adult": "adult",
    "older-adult": "olderAdult"
  }
};

// Age guard: services never surfaced prominently to bands they don't serve.
const ADULT_BANDS = new Set(["adult", "older-adult"]);
const AGE_GATED_SERVICE_KEYS = ["eip"]; // children ≤12 only
```

**3b. Replace `reorderServices` (lines 52–62) with** (concern still drives the primary sort; age adds a deterministic demotion of age-gated cards for adult bands):

```js
export function reorderServices(container) {
  const data = read();
  if (!data?.concern) return;
  const cards = [...container.querySelectorAll("[data-service-key]")];
  const priorityKey = RULES.concernToService[data.concern];
  const priority = cards.find(c => c.dataset.serviceKey === priorityKey);
  if (priority && container.firstElementChild !== priority) {
    container.prepend(priority);
  }
  // Adults / older adults never see age-gated (children-only) services first.
  if (ADULT_BANDS.has(data.age)) {
    AGE_GATED_SERVICE_KEYS.forEach(key => {
      const gated = container.querySelector(`[data-service-key="${key}"]`);
      if (gated) container.append(gated);
    });
  }
}
```

**3c. Add a new export after `recommendedStaffId` (line 76):**

```js
// Returns the home.json path (relative to the loaded namespace object) of the
// age-appropriate note, or null. The page's renderer resolves it against the
// already-fetched home JSON — this module stays i18n-free.
export function ageNoteKeyPath() {
  const data = read();
  const sub = data?.age ? RULES.ageToNoteKey[data.age] : null;
  return sub ? ["personalization", "ageNotes", sub] : null;
}
```

Nothing else in the file changes (`read`/`write`/`reset`/`attachSurvey`/`initPersonalization` untouched; `FormData.get("age")` now yields the slug automatically because the chip `<input value>` carries `ageOptions[].value`).

## Task 4 — Home-page render wiring (`index.html`, `assets/css/components.css`)

**4a. Static fallback copy** (overwritten by i18n, but keep pre-hydration flash consistent). In the survey form (~L108–122):

- L109: `<h2 data-i18n="home.personalization.heading">Tell us a little about the person who needs support</h2>`
- L110: `<p data-i18n="home.personalization.subheading">You, your child, or someone you care for — any age. Skip if you'd rather browse on your own.</p>`
- L112: `<legend data-i18n="home.personalization.ageLabel">Age group</legend>`
- L120: align the drifted fallback to the JSON string: `<legend data-i18n="home.personalization.stageLabel">What stage are you at?</legend>`

No change to `data-personalize-chips` markup or the `chips()` renderer (~L321–336) — it already handles `{value, label}` (verified: `typeof opt === "string" ? opt : opt.value / opt.label`). The `chips("age", ...)` call needs no edit. Update the stale comment at ~L317 ("plain string (age, stage) or an object (concern)") to say age + concern are `{value,label}`, stage is plain strings.

**4b. Age-note element.** In the services section (~L148–154), insert between the `<h2>` and the grid:

```html
<p class="section-note" data-personalize-age-note hidden></p>
```

**4c. Inline module script changes** (bottom of `index.html`):

- L261 import becomes:
  `import { read as readPers, recommendedBlog, recommendedStaffId, reorderServices, ageNoteKeyPath } from "./assets/js/personalization.js";`
- In `renderHome()`, immediately after the services grid `replaceChildren` block (~L353), add — this also fixes pre-existing defect #3 (reorder racing the async rebuild):

```js
  // Reorder must run after the async rebuild (personalization.js's own
  // DOMContentLoaded/consent:changed hook fires before this grid exists).
  if (svcGrid) reorderServices(svcGrid);

  // Age-appropriate note (drafted copy; slug → ageNotes subkey via rules table).
  const ageNoteEl = document.querySelector("[data-personalize-age-note]");
  if (ageNoteEl) {
    const path = ageNoteKeyPath();
    const text = path ? path.reduce((o, k) => o?.[k], home) : null;
    if (text) { ageNoteEl.textContent = text; ageNoteEl.hidden = false; }
    else { ageNoteEl.hidden = true; ageNoteEl.textContent = ""; }
  }
```

(`renderHome` already re-runs on `personalization:changed` / `personalization:reset` / `consent:changed` / `i18n:changed`, so reorder + note update live on submit, reset, consent change, and locale toggle with no extra listeners.)

**4d. Minimal style** for `.section-note` inside `@layer components` in `assets/css/components.css` (reuse tokens; do not add new ones):

```css
.section-note {
  max-width: 52ch;
  margin-block: calc(-1 * var(--space-2, 0.5rem)) var(--space-4, 1rem);
  color: var(--ink-soft, var(--ink));
  font-size: 0.9375rem;
}
```

Implementer: check `tokens.css` for the actual muted-ink/space token names and substitute — the intent is "small, muted, one line under the section heading"; do not invent new tokens.

## Task 5 — Verification

1. `cd /Users/deepsight/code/urbane-ethos && bin/check-i18n-parity.rb` → exit 0 (`i18n parity OK (9 files)`).
2. `bin/server`, browse `http://localhost:8080/`:
   - Accept-all on the consent banner → survey visible with 6 age chips, 6 concern chips, 3 stage chips (EN labels from the table above).
   - Select `60+ · Older adult` + `Daily living & independence` → submit → sage stamp fires; services grid re-renders with **Occupational Therapy first** and **IEP & Early Intervention Program last**; age note shows the `olderAdult` string; recommended rail shows OT/development blog cards + **Nasirah Zulkifli** staff card (staff card rendering is the regression check for defect #1).
   - Select `7–12 · School age` + `Speech & communication` → Speech Therapy first, `eip` NOT demoted, `child` age note (EIP mention) visible.
   - Toggle EN→MS: chips re-label in BM, `sessionStorage["urbane-ethos:personalization"]` unchanged (slugs), same reorder holds.
   - "Reset preferences" link → grid back to default order, note hidden. Zero console errors throughout.
3. Repeat the submit path in MS locale first (locale-agnostic slugs check).
4. axe on home only (survey + note are home-scoped): `npx -y @axe-core/cli "http://localhost:8080/" --tags wcag2a,wcag2aa,wcag22aa` → 0 violations. Watch specifically: the six-chip radio groups keep the existing `visually-hidden` input pattern; `[data-personalize-age-note]` is plain text (no live-region needed — it renders with the rest of the grid).
5. Open `test/smoke/personalization.html` and `test/smoke/personalization-locale.html` and confirm both still pass their on-page instructions (they key on slugs, which are unchanged/extended).

## Task 6 — Docs touch-up (`docs/HANDOVER.md`)

Add a short entry to the "what just landed" section: all-ages survey (6 age-band slugs, `daily-living` concern), age-gate guard for `eip`, age notes, and the three pre-existing defect fixes (stale staff ids, phantom blog tags, reorder race). One paragraph; no new doc files.

---

## Sequencing / parallelism

- Tasks 1, 2, 3 touch disjoint files and can run in parallel.
- Task 4 depends on Task 3 (imports `ageNoteKeyPath`, `reorderServices`) and on Task 1 for fallback strings.
- Tasks 5–6 last.

## Self-review

- Every concern slug (`speech`, `motor-skills`, `behaviour`, `learning`, `daily-living`, `not-sure`) has entries in all three of `concernToService` / `concernToBlogTags` / `concernToStaff` — checked against the taxonomy table; 6/6/6. ✓
- All `concernToService` targets (`speech, ot, psych, specialed, screening`) exist in `services.items[].key`; `eip` is absent from the map (age-gated). ✓
- All `concernToStaff` ids exist in `content/{en,ms}/staff.json`. All blog tags exist verbatim in `content/blog.json`. ✓
- EN/MS `value` slugs byte-identical in both `ageOptions` and `concernOptions`; every `ageToNoteKey` key matches an `ageOptions[].value`; every note subkey exists in both `ageNotes` objects. ✓
- No child-only copy remains in the survey: heading, subheading, ageLabel rewritten; concern labels age-neutral; stage strings already neutral. (The centre's *name* retains "Early Intervention" — that's branding, out of scope.) ✓
- Existing stored slugs keep working; old plain-label `age` values ("0–2") die with the session and unknown values no-op in `ADULT_BANDS`/`ageToNoteKey`. ✓
- Parity: only hash-key additions are `personalization.ageNotes.{child,teen,adult,olderAdult}` + `_draft` (stripped), mirrored in both locales. ✓

## Decisions for the controller to confirm

1. **Fixing the three pre-existing defects in this branch** (stale staff ids, phantom blog tags, reorder race) — they're prerequisites for the verification steps to pass, but they widen the diff slightly beyond "survey rework".
2. **`behaviour` → blog tags `["development"]`** is weak (no psychology-tagged post exists yet). Acceptable fallback, or hold until a psych post lands?
3. Age bands `13–17` / `18–59` vs the brochure's `13–18` social group — an 18-year-old picks "Adult" and misses the teen note. Accepted as a labelling simplification.
4. MS strings remain machine-drafted (`reviewedBy: null`, `_draft` flags set) pending human review, per repo convention.
