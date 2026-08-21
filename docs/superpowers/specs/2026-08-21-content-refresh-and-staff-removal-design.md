# Content refresh (Screening + Assessment) and staff removal — design

**Date:** 2026-08-21
**Status:** approved, ready to plan
**Source:** WhatsApp corrections from co-director Nasirah Zulkifli, 2026-08-21 (10:54–11:25 AM), relayed as screenshots.

## Scope

Four client-requested changes. Three land in this pass; the fourth is deliberately deferred.

1. Screening service copy — expanded OT scope + a new SLP-exclusion sentence.
2. Assessment service copy — the 4th (Learning) component is described properly; duration qualifier gains "and readiness".
3. Staff list — remove **Ms Tengku Sarah Nabilah** and **Mrs Nur Ain Nabila** (9 → 7 members).
4. **Deferred:** two anchor-photo swaps. The replacement photos arrived only as WhatsApp screenshots; the originals are not on disk at usable resolution. Recorded as a follow-up in `docs/HANDOVER.md`, not implemented here.

Out of scope: any other service copy, the `programmes` block, blog, careers.

## 1. Screening copy

Target: `content/en/services.json` → `items[0]` (`key: "screening"`), and its `content/ms/services.json` mirror.

**Only `whatItIs` changes.** `whoItsFor`, `whatToExpect`, `faqs` and `cta` are already verbatim-correct against the source — in particular `faqs[0].a` already carries the client's "a little concern / a lot of concerns" text word for word. Do not touch them.

### EN — new `items[0].whatItIs`

```
Screening for individuals or for childcare providers/learning centers — a broad picture of your child's development and early identification of potential issues. We offer two screening services: 1. Occupational Therapy: To assess motor development, Activities of Daily Living (ADL and iADLs), school readiness. 2. Clinical Psychology: To screen for emotional, behavioural concerns. This screening package does not include Speech-Language Pathology (SLP) screening. For further information regarding SLP, please refer to the assessment section.
```

Deltas from the current string:
- `fine motor, school readiness` → `To assess motor development, Activities of Daily Living (ADL and iADLs), school readiness`
- `emotional, behavioural` → `To screen for emotional, behavioural concerns`
- New final two sentences (the SLP exclusion + pointer to the assessment section).

**Deliberate normalisation:** the source writes "iADLS". We ship **`iADLs`** — instrumental Activities of Daily Living. This is a decision, not a transcription slip; do not "correct" it back.

### MS — new `items[0].whatItIs`

Glossary-bound terms: Occupational Therapy → Terapi Carakerja; Clinical Psychology → Psikologi Klinikal; Speech Language Pathologist → Pakar Patologi Bahasa Pertuturan. Existing in-file precedent to match: `Aktiviti Kehidupan Harian (ADL)` and `Patologi Bahasa Pertuturan (SLP)`.

```
Saringan untuk individu atau untuk penyedia jagaan kanak-kanak/pusat pembelajaran — gambaran menyeluruh tentang perkembangan anak anda dan pengenalpastian awal isu berpotensi. Kami menawarkan dua perkhidmatan saringan: 1. Terapi Carakerja: Menilai perkembangan motor, Aktiviti Kehidupan Harian (ADL dan iADL), kesediaan sekolah. 2. Psikologi Klinikal: Menyaring kebimbangan emosi dan tingkah laku. Pakej saringan ini tidak termasuk saringan Patologi Bahasa Pertuturan (SLP). Untuk maklumat lanjut mengenai SLP, sila rujuk bahagian penilaian.
```

## 2. Assessment copy

Target: `items[1]` (`key: "assessment"`) in both locales. `whoItsFor` and `whatToExpect` already match the source exactly — leave them alone.

### EN — `items[1].whatItIs`

Two deltas inside the existing string; the rest of the paragraph is unchanged.

- `A 4th component would also be included, if the child is already of learning age.`
  → `A 4th component for Learning would also be included, to assess proficiency and early literacy skills, if the child is nearing or already of schooling age.`
- `depending on the needs of the child` → `depending on the needs and readiness of the child`

Resulting string:

```
At Urbane Ethos, we provide a holistic 3-in-1 assessment comprising of all three different areas of allied health: Occupational Therapy, Speech-Language and Communication as well as Clinical Psychology. A 4th component for Learning would also be included, to assess proficiency and early literacy skills, if the child is nearing or already of schooling age. Usually, the assessment could take around 1-2 hours depending on the needs and readiness of the child. A full MULTIDISCIPLINARY developmental assessment of child's language, fine & gross motor, sensory profile and if necessary learning, with a referral report to identified paediatrician, child psychologist and SLPs.
```

### EN — `items[1].faqs[0].a`

`Usually around 1-2 hours depending on the needs of the child.`
→ `Usually around 1-2 hours depending on the needs and readiness of the child.`

`faqs[1]` unchanged.

### MS — `items[1].whatItIs`

```
Di Urbane Ethos, kami menyediakan penilaian holistik 3-in-1 yang merangkumi ketiga-tiga bidang kesihatan bersekutu yang berbeza: Terapi Carakerja, Bahasa-Pertuturan dan Komunikasi serta Psikologi Klinikal. Komponen ke-4 untuk Pembelajaran turut disertakan, bagi menilai kemahiran dan literasi awal, jika anak hampir atau sudah mencapai usia persekolahan. Kebiasaannya, penilaian mengambil masa sekitar 1-2 jam bergantung pada keperluan dan kesediaan anak. Penilaian perkembangan MULTIDISIPLIN penuh terhadap bahasa, motor halus & kasar, profil sensori dan jika perlu pembelajaran anak, dengan laporan rujukan kepada pakar pediatrik, ahli psikologi kanak-kanak dan SLP yang dikenal pasti.
```

### MS — `items[1].faqs[0].a`

```
Kebiasaannya sekitar 1-2 jam bergantung pada keperluan dan kesediaan anak.
```

## 3. Staff removal

Remove two members. Current roster, by array index:

| idx | id | name |
| --- | --- | --- |
| 0 | `dr-norizan-rajak` | Dr Norizan Binti Rajak |
| 1 | `nasirah-zulkifli` | Nasirah Binti Zulkifli |
| 2 | `ms-robin-koh-hui-xuan` | Ms. Koh Hui Xuan (Robin) |
| 3 | `mrs-norizzati-afiqah` | Mrs Norizzati Afiqah |
| **4** | `ms-tengku-sarah-nabilah` | **Ms Tengku Sarah Nabilah — REMOVE** |
| 5 | `ms-emalin-nasuha-hachim` | Ms Emalin Nasuha Hachim |
| 6 | `ms-syahira-hassan` | Ms Syahira Hassan |
| 7 | `ms-farwizah` | Ms. Farwizah |
| **8** | `mrs-nur-ain-nabila` | **Mrs Nur Ain Nabila — REMOVE** |

After removal the roster is 7, indices 0–6, and the two survivors that shift are `ms-emalin-nasuha-hachim` (5 → 4), `ms-syahira-hassan` (6 → 5), `ms-farwizah` (7 → 6).

### 3a. `content/{en,ms}/staff.json`

Delete the two member objects from `members[]` in **both** locales.

**`_placeholder` must be re-indexed.** It is keyed by array position and — unlike `_meta` / `_draft` / `_correction` — `bin/check-i18n-parity.rb` *walks* it, so EN and MS must end up key-identical or the gate fails. Current map (both locales):

```
members.0.personalLine, members.1.personalLine, members.3.personalLine,
members.4.personalLine, members.4.bio,
members.5.personalLine, members.5.bio,
members.6.personalLine, members.6.bio,
members.8.personalLine, members.8.bio
```

New map (both locales, identical):

```
members.0.personalLine, members.1.personalLine, members.3.personalLine,
members.4.personalLine, members.4.bio,
members.5.personalLine, members.5.bio
```

Derivation: drop the `members.4.*` (Sarah) and `members.8.*` (Nur Ain) entries; old `members.5.*` → `members.4.*`; old `members.6.*` → `members.5.*`. Old index 7 (Farwizah) had no placeholder entries and gains none.

Rewrite `_meta._note` in both locales: it currently claims "9 staff members", "Farwizah (members[7])", "Nur Ain Nabila (members[8]) has no photo and renders an initials placeholder", and "six other practitioners still carry low-res interim headshots". After this change: **7** members, Robin `members[2]`, Farwizah `members[6]`, **no** member without a photo, and **five** interim headshots.

### 3b. `staff.html`

Delete the `<article class="staff-card" id="ms-tengku-sarah-nabilah">` and `<article class="staff-card" id="mrs-nur-ain-nabila">` blocks from the SEO static fallback. Nothing else on the page references them; the JS renderer is data-driven.

### 3c. `index.html`

Only the SEO static fallback needs editing — the runtime JS derives both the stack and the count from `staff.json`.

- `…and 6 more of us who'll say hello.` → `…and 4 more of us who'll say hello.`
- The decorative initials stack is `rest.slice(0, 3)` of the non-featured members. Featured are Norizan, Robin, Norizzati; `rest` becomes Nasirah, Emalin, Syahira, Farwizah. So `NB · MT · ME` → `NB · ME · MS`.

### 3d. Assets

Delete `assets/img/staff-pdf/ms-tengku-sarah-nabilah.jpg` — orphaned once the member object goes. Nur Ain had `photo: null`, so no file to remove.

### 3e. Docs with stale counts

Exact hits, verified 2026-08-21:

- `CLAUDE.md:160` — delete the whole line ("Nur Ain Nabila (Administrator) has `"photo": null` and renders an initials tile — that is intentional, not a missing file."). Also change the `assets/img/staff-pdf/` bullet from "6 **low-res interim headshots**" to 5.
- `README.md:87` — "all 9 staff personal lines" → 7. Re-count the "5 staff bios" figure too: Sarah and Nur Ain both carried lorem bios, so it becomes 3.
- `README.md:109` — claims `assets/img/staff-pdf/` holds "8 low-res headshots". That is *already* stale (it predates the Robin/Farwizah swap; the directory holds 6 today, 5 after this change). Fix to 5, and delete the trailing sentence "Nur Ain Nabila (Administrator) has **no** PDF photo — her card still shows the initials `[REAL PHOTO REQUIRED]` placeholder."
- `docs/HANDOVER.md:281` — open-items list; delete the "**Nur Ain has no photo** (still an initials `[REAL PHOTO REQUIRED]` placeholder)" clause.
- **Leave alone:** `docs/HANDOVER.md:150` and `:257` are dated historical narrative describing what was true at the time, as are `docs/copy-export-2026-08-13.tsv` and every dated file under `docs/superpowers/{specs,plans}/`. Rewriting history there is wrong.

After Nur Ain goes, **no page renders an initials tile any more** — every remaining member has a photo. The initials fallback in `staff.html` and `index.html` stays (it is a legitimate code path), it simply has no current consumer.

## 4. Deferred: anchor photo swaps

Not implemented in this pass. Add a follow-up entry to `docs/HANDOVER.md` capturing both targets precisely enough to be a drop-in later:

- `assets/img/anchors/service-ot-room.jpg` → the hand-over-hand fine-motor photo (child's hands stamping a caterpillar with a broccoli print; no face visible). Supplied by Nasirah 2026-08-21. Same filename, no markup change. The alt `common.media.alts.serviceArtOt` ("The sensory room, with a platform swing, crash mat and painted underwater mural") must be rewritten in EN and MS when the file lands.
- `assets/img/anchors/contact-reception.jpg` → the team group photo in front of the painted mural. Same filename. **Also** rewrite, in EN and MS: `common.media.captions.contactReception` (currently "Say hello at reception.") and `common.media.alts.contactReception` (currently "Three team members at the Urbane Ethos reception counter"). `about-team.jpg` on about.html stays as it is — client decision, contact page only.

Both current images are being replaced partly on photo-governance grounds (see `docs/superpowers/specs/2026-08-09-staff-refresh-and-photo-integration-design.md` § 2.4): the sensory-room shot has identifiable faces, and the reception shot has paperwork on the counter. Audit the replacements against the same rule before wiring them in.

## Verification

In order:

1. `bin/check-i18n-parity.rb` — exits non-zero if the re-indexed `_placeholder` maps diverge between locales. This is the change most likely to break.
2. `ruby bin/check-contact-channels.rb` — unaffected by this work, but it is the second CI gate and both must pass.
3. `bin/server`, then eyeball `services.html` (Screening and Assessment cards, both accordions), `staff.html` (7 cards, no gaps), `index.html` (three featured rows + "…and 4 more", initials stack correct).
4. Confirm no stale references remain: `grep -rn "sarah-nabilah\|nur-ain\|Nur Ain\|Tengku Sarah" . --exclude-dir=node_modules --exclude-dir=.git` should return only the historical dated docs under `docs/`.

No axe re-audit needed — no markup structure changes, only removed cards and text substitutions.
