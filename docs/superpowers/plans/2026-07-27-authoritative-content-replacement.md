# Authoritative Content Replacement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Tasks are grouped into phases; every task inside a parallel group touches a **disjoint file set** — dispatch them concurrently. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved spec `docs/superpowers/specs/2026-07-27-authoritative-content-replacement-design.md`: replace generated content with authoritative copy (PDF company profile, brochure, Nasirah's WhatsApp corrections, Wix scrape), lorem-mark everything no source covers, wire interim PDF headshots, add an unlinked `careers.html`, add the first local static blog post, and keep the EN/MS parity gate green.

**Branch:** `content/authoritative-replacement` (already checked out).

**This is a CONTENT + light-structural pass.** No new build tooling, no framework, no polyfills. Verification is grep contracts + `bin/check-i18n-parity.rb` + `bin/server` visual passes — there is no unit-test suite in this repo.

**All source copy an implementer needs is embedded verbatim in the tasks below** (it comes from the spec's Appendices A–E). Do not re-open the PDF/brochure/WhatsApp except where a task explicitly says so (Task 2.1 image extraction).

---

## The placeholder mechanic (used by every content task)

Every generated string resolves to exactly one of:

- **REAL** — replaced with sourced copy quoted in the task. Remove its `_draft` entry.
- **LOREM** — visible value becomes Latin lorem ipsum **prefixed with the sentinel `⟪PLACEHOLDER⟫ `**. Move its `_draft` entry into a sibling top-level `"_placeholder": { "<dot.path>": true }` map (create the map if absent; keys use the same dot-path convention `_draft` uses).
- **KEEP** — functional scaffold, untouched (any existing `_draft` entry on a KEEP-functional string also stays untouched).

**Canonical lorem strings — use these EXACT values so EN and MS are byte-identical (parity + grep contract depend on it):**

- `LOREM-SHORT` (headlines, greetings, personalLines, FAQ questions):
  `⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet.`
- `LOREM-MED` (blurbs, bios, whoItsFor/whatToExpect, FAQ answers):
  `⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
- `LOREM-LONG` (privacy section bodies):
  `⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`
- Lorem FAQ pair: `{ "q": "<LOREM-SHORT with trailing '.' replaced by '?'>", "a": "<LOREM-MED>" }` — i.e. q = `⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet?`

**Parity note on `_placeholder`:** `bin/check-i18n-parity.rb` skips only `_meta` / `_draft` / `_correction`. `_placeholder` **is** walked, so the MS mirror (Phase 5) must reproduce each `_placeholder` map **key-identical** to EN. Do NOT modify the parity script.

**Cross-cutting authoritative values (used by several tasks — always exactly these):**

- Hours array (replaces every existing 2-line hours array):
  ```json
  [
    "Monday: 12PM – 5PM",
    "Tuesday – Saturday: 9AM – 6PM",
    "Closed Sunday & Public Holidays"
  ]
  ```
- Address (full): `No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor`
- Email: `urbaneethos@yahoo.com`
- Phones (unchanged, real): Reception `+603-7734 3044`, WhatsApp `+6013-249 0069`

---

## Dependency graph / parallel groups

```
Group A (run concurrently — 10 tasks, disjoint files):
  Phase 1: 1.1 about · 1.2 services · 1.3 staff · 1.4 home · 1.5 contact+common · 1.6 privacy · 1.7 chatbot
  Phase 2: 2.1 PDF headshots + staff.html          (independent of Phase 1; owns staff.html + new images, NOT staff.json)
  Phase 3: 3.1 careers.html + content/careers.json (independent)
  Phase 4: 4.1 blog post page + blog.json + blog.html (independent)

Group B (after ALL of Phase 1 — 7 tasks, disjoint files, run concurrently):
  Phase 5: 5.1–5.7 MS re-mirror, one task per namespace (contact+common is one task)

Group C (after Groups A + B — 2 tasks, disjoint files, run concurrently):
  Phase 6: 6.1 footer-email wiring across all pages · 6.2 CLAUDE.md + deploy verification

Group D (after Group C — sequential):
  Phase 7: 7.1 README + HANDOVER refresh
  Phase 8: 8.1 final verification sweep
```

**Known temporary red state:** between the first Phase 1 task landing and the last Phase 5 task landing, `bin/check-i18n-parity.rb` is expected to fail (EN changed, MS not yet mirrored). CI only runs on the default branch, so this is safe on this feature branch. Each Phase 5 task's verification checks *its own namespace* is clean; the full exit-0 gate is Phase 5's group-exit criterion and re-checked in Phase 8.

**File-ownership table (disjointness contract):**

| Task | Owns (only these files may be edited/created) |
|---|---|
| 1.1 | `content/en/about.json`, `about.html` |
| 1.2 | `content/en/services.json`, `services.html` |
| 1.3 | `content/en/staff.json` |
| 1.4 | `content/en/home.json` |
| 1.5 | `content/en/contact.json`, `content/en/common.json`, `contact.html` |
| 1.6 | `content/en/privacy.json` |
| 1.7 | `content/en/chatbot.json` |
| 2.1 | `assets/img/staff-pdf/*` (new), `staff.html` |
| 3.1 | `careers.html` (new), `content/careers.json` (new) |
| 4.1 | `post-year-end-promo.html` (new), `content/blog.json`, `blog.html` |
| 5.1–5.7 | `content/ms/<namespace>.json` (5.5 owns both `contact.json` + `common.json`) |
| 6.1 | footer blocks of `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `privacy.html`, `analytics.html`, `careers.html`, `post-year-end-promo.html` |
| 6.2 | `CLAUDE.md` (verify-only pass over `.github/workflows/pages.yml`, `.gitlab-ci.yml`) |
| 7.1 | `README.md`, `docs/HANDOVER.md` |
| 8.1 | none (verification only; may file follow-up fixes) |

---

# Phase 1 — EN namespace replacement (7 parallel tasks)

## Task 1.1: `about.json` — Vision & Mission upgrade (+ `about.html` band rename)

**Files:** `content/en/about.json`, `about.html`

**Resolution table:**

| Key | Resolution | Source |
|---|---|---|
| `hero.title` | KEEP (`"ABOUT US"`) | — |
| `hero.subtitle` | REAL | Nasirah (Appendix C) |
| `mission.heading` + `mission.body` | REAL — becomes "About us" with the PDF About-Us paragraph | PDF (Appendix A) — see conflict note below |
| `story.heading` | KEEP (`"Our story"`) | — |
| `story.body` | REAL — Wix story kept, enriched with PDF "Since 2005…" paragraph | Wix + PDF (Appendix A) |
| `values.*` | **structurally replaced** by `visionMission.*` (rename the key; invented values dropped, not lorem'd) | PDF (Appendix A) |
| `ctas.*` | KEEP | — |

- [ ] **Step 1:** Replace `hero.subtitle` with (assembled verbatim from Nasirah's two correction lines):

  > `A therapy centre for neurodivergent individuals — we cater between 0–20 years old and expanding to older and elderly patients.`

- [ ] **Step 2:** Replace the `mission` block with:

  ```json
  "mission": {
    "heading": "About us",
    "body": "At Urbane Ethos Early Intervention Center, we believe that a holistic approach to therapy, driven by transdisciplinary collaboration, is the key to unlocking each client's full potential. Our team, comprised of Clinical Linguists, Speech-Language Therapists, Occupational Therapist, Clinical Psychologist and Special Education Teacher, work seamlessly together to provide comprehensive, evidence-based care tailored to individual needs."
  }
  ```

  *(Conflict note for reviewers: the spec's about-section says `mission` gets Vision+Mission AND the band gets Vision & Mission. To avoid rendering the same copy twice on one page, this plan puts the PDF About-Us paragraph in the `mission` slot and dedicates the band to Vision & Mission. Flagged in the plan header report.)*

- [ ] **Step 3:** Replace `story.body` with (Wix story, first clause replaced by PDF's fuller sentence):

  > `Since 2005, we have had over 20 years of experience providing client-centered intervention for language and speech disorders, developmental disorders, mental health disorders and for learning disabilities. Urbane Ethos Early Intervention Center started up the first multi-displinary center in 2005 based in Shah Alam and has since aided children, adolescents and parents in achieving developmental milestones and overcoming their disability or disorder to achieve a greater quality of life.`

- [ ] **Step 4:** Delete the whole `values` block; add in its place:

  ```json
  "visionMission": {
    "heading": "Vision & Mission",
    "items": [
      {
        "title": "Vision",
        "body": "1. To provide rehabilitative and therapeutic services at an international standard in the local context. 2. To empower individuals of all ages to achieve their fullest potential through compassionate, evidence-based, and collaborative therapy services."
      },
      {
        "title": "Mission",
        "body": "1. To provide effective, quality and accessible therapy services. 2. To provide holistic, individualized, and transdisciplinary therapy and intervention services that support the developmental, communicative, and psychological well-being of our clients."
      }
    ]
  }
  ```

- [ ] **Step 5:** Update `_draft`: remove `hero.subtitle` and `values.items` (both now REAL/removed). If the map is now empty, delete the `_draft` key entirely. Do NOT add a `_placeholder` map (this file has no lorem). Update `_meta._note` to say the values band was replaced by the PDF Vision & Mission band on 2026-07-27.

- [ ] **Step 6 (`about.html`, light structural):**
  - Change `<h2 data-i18n="about.values.heading">` → `data-i18n="about.visionMission.heading"` with fallback text `Vision &amp; Mission`.
  - In the inline module, change `data.values?.items` → `data.visionMission?.items` (grid id `about-values` may stay).
  - Change the mission `<h2 data-i18n="about.mission.heading">Our mission</h2>` fallback text to `About us` (the `data-i18n` path is unchanged).

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/en/about.json"))' \
    && grep -c "transdisciplinary collaboration" content/en/about.json   # 1
  grep -c "visionMission" about.html                                     # 2 (heading + JS)
  grep -c '"values"' content/en/about.json                               # 0
  grep -c "⟪PLACEHOLDER⟫" content/en/about.json                          # 0
  ```
  Visual: `bin/server` → `/about.html` shows About us / Our story / Vision & Mission band (2 cards).

---

## Task 1.2: `services.json` — screening/assessment split + programmes (+ `services.html` programmes section)

**Files:** `content/en/services.json`, `services.html`

This is the largest task. The `items` array goes from 6 → 7 entries (`screening` splits into `screening` + `assessment` — Nasirah: they are *separate services*), and a new top-level `programmes` block is added (brochure content), rendered by a new section in `services.html`.

**Resolution table (final `items` order: screening, assessment, ot, speech, specialed, eip, psych):**

| Key | Resolution |
|---|---|
| `hero.title` | KEEP |
| `hero.subtitle` | REAL — existing sentence kept (it matches Nasirah's "OUR SERVICES" correction verbatim) + append her therapy-centre sentence |
| `items[screening]` all four sub-fields + faqs | REAL (Nasirah + brochure decision tree + concerns-checklist scoring) |
| `items[assessment]` (new) all sub-fields + faqs | REAL (Nasirah 3-in-1 + brochure) |
| `items[ot].whatItIs`, `.whatToExpect` | KEEP (Wix, real) |
| `items[ot].whoItsFor` | REAL (brochure concerns checklist, OT column) |
| `items[ot].faqs` | LOREM (drafted, unsourced) — one lorem FAQ pair |
| `items[speech].whatItIs`, `.whatToExpect` | KEEP (Wix, real) |
| `items[speech].whoItsFor` | REAL (checklist, ST column) |
| `items[speech].faqs` | LOREM — one lorem FAQ pair |
| `items[specialed].title` | REAL — retitle `Cognitive Therapy & Special Education` (PDF service #05) |
| `items[specialed].whatItIs` | REAL-assembled (PDF #05 title + brochure SPED framing + PDF licensing line) |
| `items[specialed].whoItsFor`, `.whatToExpect` | LOREM (no source gives a body — spec gap, flagged) |
| `items[specialed].faqs` | LOREM — one lorem FAQ pair |
| `items[eip].title` | REAL — retitle `Individual Education Program (IEP) & Early Intervention Program (EIP)` (PDF service #04) |
| `items[eip].whatItIs` | REAL — Wix text kept, disorder list corrected to brochure wording |
| `items[eip].whoItsFor` | REAL — Nasirah's ≤12 correction (replaces Beginners 2–5 / Intermediate 6–8) |
| `items[eip].whatToExpect` | REAL — Nasirah's session-structure correction |
| `items[eip].faqs` | LOREM — one lorem FAQ pair (drafted originals removed) |
| `items[psych].whatItIs` | KEEP (Wix, real) |
| `items[psych].whoItsFor` | REAL (checklist, CP column) |
| `items[psych].whatToExpect` | LOREM |
| `items[psych].faqs` | LOREM — one lorem FAQ pair |
| `programmes` (new block) | REAL (brochure + Nasirah's extra groups) |
| all `cta` strings | KEEP (add one for assessment: `"Enquire about Assessment"`) |

- [ ] **Step 1:** `hero.subtitle` — append to the existing sentence (space-separated):

  > `We offer client centered rehabilitation and therapy for motor development, sensory integration, speech-language therapy as well as social and cognitive stimulation for neurodivergent individuals ranging from toddlers, children, adults and elderly.`

- [ ] **Step 2:** Replace `items[0]` (screening) with:

  ```json
  {
    "key": "screening",
    "title": "Screening",
    "icon": "screening",
    "whatItIs": "Screening for individuals or for childcare providers/learning centers — a broad picture of your child's development and early identification of potential issues. We offer two screening services: 1. Occupational Therapy: fine motor, school readiness. 2. Clinical Psychology: emotional, behavioural.",
    "whoItsFor": "Would you like to know whether your child's development is as expected? If you have a LITTLE concern, a screening gives a broad picture of development, early identification of potential issues, and determines if further evaluation or intervention is needed. If you have A LOT of concerns, go straight to a Full Assessment.",
    "whatToExpect": "A broad developmental check by our allied-health team. If the screening shows further evaluation is needed, we will recommend a Full Assessment.",
    "faqs": [
      {
        "q": "Screening or full assessment — which one do we need?",
        "a": "A little concern: start with a Screening — it gives a broad picture of development and early identification of potential issues, and determines if further evaluation or intervention is needed. A lot of concerns: book a Full Assessment — it gives a comprehensive understanding of strengths, challenges and specific developmental needs, personalised strategies, therapies and interventions, and helps identify conditions like Autism, ADHD, and learning disabilities."
      },
      {
        "q": "How many concerns count as 'a lot'?",
        "a": "As a guide from our concerns checklist: 1 or 2 concerns ticked — a screening is a good start. 3 or more ticks — book a full assessment."
      }
    ],
    "cta": "Enquire about Screening"
  }
  ```

- [ ] **Step 3:** Insert new `items[1]` (assessment):

  ```json
  {
    "key": "assessment",
    "title": "Assessment",
    "icon": "screening",
    "whatItIs": "At Urbane Ethos, we provide a holistic 3-in-1 assessment comprising of all three different areas of allied health: Occupational Therapy, Speech-Language and Communication as well as Clinical Psychology. A 4th component would also be included, if the child is already of learning age. Usually, the assessment could take around 1-2 hours depending on the needs of the child. A full MULTIDISCIPLINARY developmental assessment of child's language, fine & gross motor, sensory profile and if necessary learning, with a referral report to identified paediatrician, child psychologist and SLPs.",
    "whoItsFor": "It is a 3-in-1 package for 0-20 years old and older, including OT, Clinical Psychology and Speech-Language Assessment — plus a Learning/School readiness assessment for those of school age and older.",
    "whatToExpect": "Assessments run on weekdays, appointment based. Three allied health professionals are involved: 1) Occupational therapist: assess sensory integration, gross motor, and fine motor development and activities of daily living (ADL). 2) Speech/Language therapist: assess pre-verbal skills, receptive and expressive language; if the child is already ready for learning, academic performance is assessed as well. 3) Clinical psychologist: review and observe behaviour, play skills, and whether they are appropriate to age and development. Consultation charges are included in the assessment.",
    "faqs": [
      {
        "q": "How long does the assessment take?",
        "a": "Usually around 1-2 hours depending on the needs of the child."
      },
      {
        "q": "What happens after the assessment?",
        "a": "You can proceed to programmes: intensive sessions within 30 days, individual sessions booked per session, or the grouping programme (morning and afternoon sessions). Then book a session and attend."
      }
    ],
    "cta": "Enquire about Assessment"
  }
  ```

- [ ] **Step 4:** OT item — replace `whoItsFor` with (brochure checklist, OT column):

  > `Children showing concerns in: Fine Motor (poor handwriting, difficulty using utensils or manipulating toys like building blocks); Gross Motor (trouble walking, running, climbing, or balancing); Self-Care (dressing, brushing teeth, eating independently, toileting); Sensory Processing (over-sensitive or avoids textures, sounds, lights, movement — or seeks excessive sensory input); Coordination and Strength (clumsy, trips or falls often, weak muscle tone).`

  Replace `faqs` with one lorem FAQ pair. `whatItIs` / `whatToExpect` / `cta` unchanged.

- [ ] **Step 5:** Speech item — replace `whoItsFor` with (checklist, ST column):

  > `Children showing concerns in: Speech Development (limited babbling by 12 months, no single words by 16 months, unclear speech beyond age 2); Understanding Language (difficulty following simple instructions); Expressing Needs (limited vocabulary, trouble forming sentences); Social Interaction (avoids eye contact, trouble engaging, no gestures like pointing or waving); Repetitive Language (echolalia; words without meaning).`

  Replace `faqs` with one lorem FAQ pair. Everything else unchanged.

- [ ] **Step 6:** Specialed item — retitle to `Cognitive Therapy & Special Education`; replace `whatItIs` with:

  > `Cognitive therapy and special education (SPED) delivered as part of our integrated, multidisciplinary set up — therapists from Occupational Therapy (OT), Speech, Language and Pathology (SLP) and Special Education (SPED) working harmoniously to provide programmes and services catered individually to your child's needs. All employees in our company are professionally licensed.`

  `whoItsFor`, `whatToExpect` → LOREM-MED. `faqs` → one lorem FAQ pair. Remove the item-level `_note`. `cta` → `"Enquire about Cognitive Therapy & Special Education"`.

- [ ] **Step 7:** EIP item — retitle to `Individual Education Program (IEP) & Early Intervention Program (EIP)`; replace `whoItsFor` with:

  > `The EIP program is ONLY for children ages 12 and below: 1. School readiness program — 6-12 years old. 2. Play group — 3-5 years old. For children with mild to moderate disorders — Global or Developmental Delay / Intellectual, AD/HD, Autism, Down Syndrome, Hearing Impairments, Dyspraxia, etc.`

  Replace `whatToExpect` with:

  > `Morning session (4 hours) — school readiness. Afternoon session (2 hours) — play group. Stimulation of language as precursor for the development of high intelligence as well as sensory stimulation to help develop, regain and maintain the child's ability to be able to participate in everyday situations and/or activities and adapt to different environments.`

  Keep `whatItIs` (trim its final "Beginners/Intermediate"-era sentence if present — the age-band framing must not survive anywhere in the item). Replace `faqs` with one lorem FAQ pair.

- [ ] **Step 8:** Psych item — replace `whoItsFor` with (checklist, CP column):

  > `Children and families noticing concerns in: Emotional Regulation (frequent tantrums, intense outbursts, difficulty calming down); Social Behaviour (difficulty making friends, responding to social cues, cooperative play); Routine and Transitions (struggles with changes in routine, activities, or new environments); Anxiety or Fear (excessive clinginess, separation anxiety, fearfulness); Aggressive or Withdrawn Behaviour (hitting, biting, persistent sadness, loss of interest, withdrawal).`

  `whatToExpect` → LOREM-MED. `faqs` → one lorem FAQ pair.

- [ ] **Step 9:** Add new top-level block after `items`:

  ```json
  "programmes": {
    "heading": "Our Programmes",
    "intro": "Offers quick, consistent and personalized intervention services for typically developing children, children with special needs and school age children. Our integrated and multidisciplinary set up consists of therapists from the fields of: Occupational Therapy (OT), Speech, Language and Pathology (SLP), Special Education (SPED) — working harmoniously to provide programmes and services catered individually to your child's needs.",
    "items": [
      {
        "title": "Early Intervention Programme",
        "body": "Children with mild to moderate disorders — Global or Developmental Delay / Intellectual, AD/HD, Autism, Down Syndrome, Hearing Impairments, Dyspraxia, etc. Stimulation of language as precursor for the development of high intelligence as well as sensory stimulation to help develop, regain and maintain the child's ability to be able to participate in everyday situations and/or activities and adapt to different environments."
      },
      {
        "title": "Individual Programme",
        "body": "One-to-one sessions: Occupational Therapy, Speech Therapy and Learning Therapy. Occupational Therapy is required for every session to address children with sensory and attention issues. Session is based on availability."
      },
      {
        "title": "Grouping Programme",
        "body": "In a group of 5-6 children, 2 sessions per day on weekdays. Morning session (4 hours): Occupational Therapy, Speech Therapy, Pre-literacy, Pre-primary school preparation. Afternoon session (2 hours): Occupational Therapy, Speech Therapy, Play group and learning basic concepts."
      },
      {
        "title": "Other Programmes",
        "body": "Parent coaching and Teacher training. Social skills groups (7-9 years old and 13-18 years old): developing social skills, learning interpersonal skills, facilitating understanding and empathy amongst peers. Fine Motor Group (3-8 years old): pre-writing skills, handwriting readiness, drawing — beginner, intermediate and advance level classes. Activities of Daily Living (ADL) group (adolescents). Sensory - Feeding Therapy. Vocational skills training (15 and above)."
      }
    ]
  }
  ```

- [ ] **Step 10:** Rebuild `_draft`/`_placeholder`: `_draft` shrinks to nothing (delete it — every previously drafted slot is now REAL or LOREM). New `_placeholder` map (7-item array indexing: 0 screening, 1 assessment, 2 ot, 3 speech, 4 specialed, 5 eip, 6 psych):

  ```json
  "_placeholder": {
    "items.2.faqs": true,
    "items.3.faqs": true,
    "items.4.whoItsFor": true,
    "items.4.whatToExpect": true,
    "items.4.faqs": true,
    "items.5.faqs": true,
    "items.6.whatToExpect": true,
    "items.6.faqs": true
  }
  ```

  Update `_meta._note` (mention the 2026-07-27 split + programmes source). Keep `_correction` as-is.

- [ ] **Step 11 (`services.html`, light structural):** after the existing services list section, add a programmes section:

  ```html
  <section class="section section--alt">
    <div class="wrap">
      <h2 data-i18n="services.programmes.heading">Our Programmes</h2>
      <p data-i18n="services.programmes.intro"></p>
      <div class="grid-3" id="programmes-grid"></div>
    </div>
  </section>
  ```

  In the inline module's `renderServices()`, after the items render, add (mirroring the card pattern used in `about.html`):

  ```js
  const pg = document.getElementById("programmes-grid");
  if (pg) pg.replaceChildren(...(services.programmes?.items || []).map(p => {
    const c = document.createElement("article");
    c.className = "card";
    c.innerHTML = `<div class="card-inner"><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>`;
    return c;
  }));
  ```

  (Use the page's existing `esc()` helper; match its actual variable names when editing.)

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'd=JSON.parse(File.read("content/en/services.json")); raise unless d["items"].length==7 && d["items"][1]["key"]=="assessment" && d["programmes"]["items"].length==4'
  grep -c "3-in-1 assessment" content/en/services.json        # 1
  grep -c "ONLY for children ages 12 and below" content/en/services.json  # 1
  grep -c "Beginners" content/en/services.json                # 0
  grep -c "programmes-grid" services.html                     # 2
  grep -c "⟪PLACEHOLDER⟫" content/en/services.json            # 13 (8 _placeholder slots; each of the 5 lorem faqs slots is a q+a pair = 2 strings: 5×2 + 3 singles)
  ```
  Visual: `/services.html` shows Screening and Assessment as separate cards, the ≤12 EIP framing, and the four-programme band.

---

## Task 1.3: `staff.json` — real roster confirmed, invented lines lorem'd, PDF photo paths

**Files:** `content/en/staff.json`

**Resolution table:**

| Key | Resolution |
|---|---|
| `hero.title` | KEEP |
| `hero.subtitle` | REAL — append PDF licensing line |
| `members[*].name`, `.role`, `.credentials` | KEEP (PDF confirms all 8; Nur Ain retained from Wix — not in PDF) |
| `members[*].greeting` | KEEP (formulaic, carries the real name) |
| bios: Norizan, Nasirah, Liyana, Norizzati (indices 0–3) | KEEP (Wix, real) |
| bios: Tengku Sarah, Emalin, Syahira, Nuraisyah, Nur Ain (indices 4–8) | LOREM-MED |
| `members[*].personalLine` (all 9) | LOREM-SHORT |
| `members[*].photo` for the 8 PDF members | REAL — point at `assets/img/staff-pdf/<id>.jpg` + add `"photoInterim": true` |
| `members[8]` (Nur Ain) photo | KEEP placeholder path (no PDF photo → stays `[REAL PHOTO REQUIRED]`) |

- [ ] **Step 1:** `hero.subtitle` — append: ` All employees in our company are professionally licensed.` (PDF, verbatim).

- [ ] **Step 2:** For **all 9** members set `personalLine` to LOREM-SHORT. For members index 4–8 (`ms-tengku-sarah-nabilah`, `ms-emalin-nasuha-hachim`, `ms-syahira-hassan`, `ms-nuraisyah-azman`, `mrs-nur-ain-nabila`) set `bio` to LOREM-MED. Remove the per-member `"_note": "…Bio is drafted…"` lines for those members (superseded by `_placeholder`).

- [ ] **Step 3:** For the 8 PDF members set photo + interim flag (paths must match Task 2.1 filenames exactly):

  | index | id | photo |
  |---|---|---|
  | 0 | `dr-norizan-rajak` | `assets/img/staff-pdf/dr-norizan-rajak.jpg` |
  | 1 | `nasirah-zulkifli` | `assets/img/staff-pdf/nasirah-zulkifli.jpg` |
  | 2 | `ms-liyana-tarmizi` | `assets/img/staff-pdf/ms-liyana-tarmizi.jpg` |
  | 3 | `mrs-norizzati-afiqah` | `assets/img/staff-pdf/mrs-norizzati-afiqah.jpg` |
  | 4 | `ms-tengku-sarah-nabilah` | `assets/img/staff-pdf/ms-tengku-sarah-nabilah.jpg` |
  | 5 | `ms-emalin-nasuha-hachim` | `assets/img/staff-pdf/ms-emalin-nasuha-hachim.jpg` |
  | 6 | `ms-syahira-hassan` | `assets/img/staff-pdf/ms-syahira-hassan.jpg` |
  | 7 | `ms-nuraisyah-azman` | `assets/img/staff-pdf/ms-nuraisyah-azman.jpg` |

  Add `"photoInterim": true` next to each of these `photo` keys. Member 8 (Nur Ain) keeps her existing placeholder path and gets **no** `photoInterim` key… **correction:** parity walks keys, so either all 9 members get `photoInterim` (Nur Ain: `false`) or the MS mirror must reproduce the asymmetry exactly. **Decision: give all 9 members `photoInterim` (`true` ×8, `false` for Nur Ain)** — uniform keys are safer for parity.

  Also update `_meta._note`: PDF "Aisyah Azman" = repo "Nuraisyah Azman" (Special Education Teacher) — repo keeps the fuller name; PDF headshots are low-res interim pending a proper shoot + consent.

- [ ] **Step 4:** Rebuild the marker maps: `_draft` → delete (every entry resolved). `_placeholder`:

  ```json
  "_placeholder": {
    "members.0.personalLine": true,
    "members.1.personalLine": true,
    "members.2.personalLine": true,
    "members.3.personalLine": true,
    "members.4.personalLine": true,
    "members.4.bio": true,
    "members.5.personalLine": true,
    "members.5.bio": true,
    "members.6.personalLine": true,
    "members.6.bio": true,
    "members.7.personalLine": true,
    "members.7.bio": true,
    "members.8.personalLine": true,
    "members.8.bio": true
  }
  ```

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'd=JSON.parse(File.read("content/en/staff.json")); raise unless d["members"].length==9 && d["members"].count{|m|m["photoInterim"]}==8'
  grep -c "staff-pdf" content/en/staff.json          # 8
  grep -c "⟪PLACEHOLDER⟫" content/en/staff.json      # 14 (9 personalLines + 5 bios)
  grep -c "professionally licensed" content/en/staff.json  # 1
  ```

---

## Task 1.4: `home.json` — corrected hours/address, real positioning, lorem'd inventions

**Files:** `content/en/home.json`

**Resolution table:**

| Key | Resolution |
|---|---|
| `hero.eyebrow`, `.title`, `.primaryCta`, `.secondaryCta` | KEEP |
| `hero.headline` | LOREM-SHORT (invented tagline, no source) |
| `hero.subtitle` | REAL (Nasirah, verbatim) |
| `personalization.*` | KEEP (scaffold) |
| `location.address` | REAL — full PDF address |
| `location.hours` | REAL — corrected hours array |
| `location.eyebrow/title/mapLabel` | KEEP |
| `services.items[*]` titles/blurbs | REAL (see step 4) |
| `testimonial.*` | KEEP (real, scraped) |
| `whatWeDo.*` | KEEP (real, scraped) |
| `staffFeatured[*].greeting` (3 strings) | KEEP — "Hi, I'm <real first name>" carries the real roster name (controller override 2026-07-27) |
| `staffFeatured[*].personalLine` (3 strings) | LOREM-SHORT (invented, unsourced) |
| `events.blurb` | LOREM-MED |
| `staff.*`, `events.eyebrow/heading/cta`, `recommendedRail.*`, `blog.*` | KEEP |

- [ ] **Step 1:** `hero.headline` → LOREM-SHORT. `hero.subtitle` → (Nasirah, verbatim):

  > `We offer client centered rehabilitation and therapy for motor development, sensory integration, speech-language therapy as well as social and cognitive stimulation for neurodivergent individuals ranging from toddlers, children, adults and elderly.`

  (Note: `index.html` splits the headline into words for the hero animation — lorem words animate fine, no HTML change needed.)

- [ ] **Step 2:** `location.address` → the full address (see cross-cutting values). `location.hours` → the corrected 3-line hours array.

- [ ] **Step 3:** `services.items` — keep the 6-card grid keyed as today, with these title/blurb updates:
  - `screening` → title `Screening & Assessment`, blurb (assembled from Nasirah, verbatim fragments): `Two separate services: screening (Occupational Therapy — fine motor, school readiness; Clinical Psychology — emotional, behavioural) and a holistic 3-in-1 assessment covering Occupational Therapy, Speech-Language and Communication, and Clinical Psychology.`
  - `specialed` → title `Cognitive Therapy & Special Education` (PDF #05), blurb: `Cognitive therapy and special education delivered by our professionally licensed team as part of an integrated, multidisciplinary set up.` Remove the item `_note`.
  - `eip` → title `IEP & Early Intervention Program` (PDF #04 short form), blurb unchanged (real).
  - `ot`, `speech`, `psych` → unchanged (real).

- [ ] **Step 4:** `staffFeatured[0..2]`: **KEEP** each `greeting` (real name — do not touch); set only each `personalLine` to LOREM-SHORT. `events.blurb` → LOREM-MED; remove the events `_note`.

- [ ] **Step 5:** Marker maps — `_draft` → delete (hero.subtitle + services.items.3.blurb now REAL; greetings KEEP; the rest moved). New:

  ```json
  "_placeholder": {
    "hero.headline": true,
    "staffFeatured.0.personalLine": true,
    "staffFeatured.1.personalLine": true,
    "staffFeatured.2.personalLine": true,
    "events.blurb": true
  }
  ```

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/en/home.json"))'
  grep -c "Seksyen U16, E-Boulevard" content/en/home.json     # 1
  grep -c "12PM – 5PM" content/en/home.json                   # 1
  grep -c "12PM – 6PM" content/en/home.json                   # 0
  grep -c "⟪PLACEHOLDER⟫" content/en/home.json                # 5 (hero.headline + 3 personalLines + events.blurb)
  grep -c "neurodivergent individuals" content/en/home.json   # 1
  grep -c "Hi, I'm" content/en/home.json                      # 3 (greetings KEPT real)
  ```

---

## Task 1.5: `contact.json` + `common.json` — real email, full address, corrected hours (+ `contact.html` email row)

**Files:** `content/en/contact.json`, `content/en/common.json`, `contact.html`

**Resolution table:**

| Key | Resolution |
|---|---|
| `contact.address.line1/line2` | REAL — full PDF address split across the two lines |
| `contact.email` (new key) | REAL — `urbaneethos@yahoo.com` |
| `contact.hours` | REAL — corrected hours array |
| `contact.phones` | KEEP (real) |
| `contact.hero`, `contact.form.*`, `contact.chatbotCta.*` | KEEP (functional scaffold; the two `tellUsMore` `_draft` entries stay in `_draft` — functional, unsourced, not marketing) |
| `common.footer.address` | REAL — full PDF address |
| `common.footer.email` (new key) | REAL — `urbaneethos@yahoo.com` |
| `common.footer.hours` | REAL — corrected hours array |
| everything else in `common.json` (nav, cta, a11y, media, locale, fontSize) | KEEP |

- [ ] **Step 1 (`contact.json`):**
  ```json
  "address": {
    "heading": "Our centre",
    "line1": "No. 4, Jalan Elektron E U16/E, Seksyen U16",
    "line2": "E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor",
    "mapEmbedSrc": null,
    "_note": "Full address per PDF company profile (2026-05-24). No embedded Google Maps iframe on live site."
  },
  "email": "urbaneethos@yahoo.com",
  ```
  Replace `hours` with the corrected 3-line array. Update `_meta._note` (email now sourced from PDF).

- [ ] **Step 2 (`common.json`):** in `footer`, set `address` to the full single-line address, add `"email": "urbaneethos@yahoo.com"` after `phone2`, replace `hours` with the corrected array.

- [ ] **Step 3 (`contact.html`):** in the address/phones block, add an email row after the phone list:

  ```html
  <p><a href="mailto:urbaneethos@yahoo.com" data-i18n="contact.email">urbaneethos@yahoo.com</a></p>
  ```

  (If the page renders phones from JSON in the inline module, add the email line the same way that block is built — keep the `mailto:` link. Do **not** touch the footer here; footer email wiring across all pages is Task 6.1.)

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/en/contact.json")); JSON.parse(File.read("content/en/common.json"))'
  grep -c "urbaneethos@yahoo.com" content/en/contact.json   # 1
  grep -c "urbaneethos@yahoo.com" content/en/common.json    # 1
  grep -c "urbaneethos@yahoo.com" contact.html              # >=1
  grep -c "12PM – 6PM" content/en/contact.json content/en/common.json | grep -c ":0"  # 2 (old hours gone)
  ```
  Visual: `/contact.html` shows full address, email link, 3-line hours.

---

## Task 1.6: `privacy.json` — fake legal text → lorem; §0 stays real (with full address)

**Files:** `content/en/privacy.json`

**Resolution table:**

| Key | Resolution |
|---|---|
| `header.*` (title, lastUpdated, disclaimer) | KEEP (update `lastUpdated` value to `"Last updated: 27 July 2026"`) |
| `sections[0].heading` + `.body` ("Who we are") | REAL — keep, but upgrade to the full PDF address + keep phone |
| `sections[1..9].heading` | KEEP (headings are structural) |
| `sections[1..9].body` | LOREM-LONG (all 9 — drafted legal text is fake; the `hello@urbaneethos.center` placeholder email disappears with it) |

- [ ] **Step 1:** `sections[0].body` →

  > `Urbane Ethos Early Intervention Center, No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor. Contact: +603-7734 3044 · urbaneethos@yahoo.com.`

- [ ] **Step 2:** `sections[1].body` … `sections[9].body` → LOREM-LONG (identical string ×9).

- [ ] **Step 3:** Marker maps — `_draft` → delete (`sections.0.body` is now REAL; 1–9 move). New:

  ```json
  "_placeholder": {
    "sections.1.body": true,
    "sections.2.body": true,
    "sections.3.body": true,
    "sections.4.body": true,
    "sections.5.body": true,
    "sections.6.body": true,
    "sections.7.body": true,
    "sections.8.body": true,
    "sections.9.body": true
  }
  ```

  Update `_meta._note`: bodies intentionally lorem pending a real, counsel-reviewed notice; `_meta.lastUpdated` → `2026-07-27`.

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/en/privacy.json"))'
  grep -c "⟪PLACEHOLDER⟫" content/en/privacy.json          # 9
  grep -c "hello@urbaneethos.center" content/en/privacy.json  # 0
  grep -c "Seksyen U16" content/en/privacy.json            # 1
  ```

---

## Task 1.7: `chatbot.json` — upgrade per-service `say` strings; pricing stays sentinel

**Files:** `content/en/chatbot.json`

**Resolution table:**

| Key | Resolution |
|---|---|
| `ui.*`, `flow` structure, all `options`/`next`/`input`/`set` | KEEP (functional decision tree — do not add/remove nodes or options) |
| `flow.service.screening.say` | REAL (Nasirah) — was `_draft` |
| `flow.service.specialed.say` | REAL-assembled (PDF #05) — was `_draft` |
| `flow.service.eip.say` | REAL — corrected (drops Beginners 2–5 / Intermediate 6–8) |
| `flow.service.ot.say`, `.speech.say`, `.psych.say` | KEEP (already real, from Wix) |
| `flow.price.show.say` | LOREM sentinel — pricing was never supplied (Nasirah's charges list was cut off) |
| all other `say` strings | KEEP |

- [ ] **Step 1:** `flow.service.screening.say` →

  > `Screening and assessment are separate services. Screening covers two areas: Occupational Therapy (fine motor, school readiness) and Clinical Psychology (emotional, behavioural). If you have more concerns, we provide a holistic 3-in-1 assessment — Occupational Therapy, Speech-Language and Communication, and Clinical Psychology — usually around 1-2 hours depending on the needs of the child.`

- [ ] **Step 2:** `flow.service.specialed.say` →

  > `Cognitive Therapy & Special Education — delivered by our professionally licensed Special Education Teacher as part of our integrated, multidisciplinary set up, catered individually to your child's needs.`

- [ ] **Step 3:** `flow.service.eip.say` →

  > `The EIP program is only for children ages 12 and below: a school readiness program (6-12 years old, morning session, 4 hours) and a play group (3-5 years old, afternoon session, 2 hours), run by our certified Occupational Therapist, Speech Therapist/Clinical Linguist and Special Education Teacher.`

- [ ] **Step 4:** `flow.price.show.say` →

  > `⟪PLACEHOLDER⟫ Based on that, the typical range is RM___–RM___ (pricing to be confirmed with the centre). Want to confirm with the team?`

  (`chatbot.js` treats `say` as plain text — no code change needed.)

- [ ] **Step 5:** Marker maps — `_draft` → delete (both entries now REAL). New:

  ```json
  "_placeholder": {
    "flow.price.show.say": true
  }
  ```

  Update `_meta._note` (say-strings upgraded from PDF + co-director corrections 2026-07-27; pricing intentionally placeholder).

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/en/chatbot.json"))'
  grep -c "RM_RANGE_PLACEHOLDER" content/en/chatbot.json   # 0
  grep -c "⟪PLACEHOLDER⟫" content/en/chatbot.json          # 1
  grep -c "ages 12 and below" content/en/chatbot.json      # 1
  grep -c "Beginners" content/en/chatbot.json              # 0
  ```

---

# Phase 2 — PDF headshots (1 task, runs in Group A)

## Task 2.1: Extract 8 team headshots → `assets/img/staff-pdf/` + render photos in `staff.html`

**Files:** `assets/img/staff-pdf/*.jpg` (new, 8 files), `staff.html`
**Does NOT touch:** `content/en/staff.json` (Task 1.3 owns it and writes the matching paths).

**Source:** `/Users/deepsight/Downloads/UE Company Profile _20260524_230402_0000.pdf`, **page 2**, "OUR TEAM" section. Grid layout (verified): top row left→right **Dr. Norizan Rajak, Nasirah Zulkifli, Norizzati Afiqah, Liyana Tarmizi**; bottom row left→right **Emalin Nasuha, Tengku Sarah Nabilah, Syahira Hassan, Aisyah Azman**. Nur Ain Nabila (Administrator) has **no** PDF photo.

**Name → file mapping (must match Task 1.3 exactly):**

| PDF caption | Repo member id | Output file |
|---|---|---|
| Dr. Norizan Rajak — Clinical Director & Clinical Linguist | `dr-norizan-rajak` | `dr-norizan-rajak.jpg` |
| Nasirah Zulkifli, OTR/L — Co-director & Occupational Therapist | `nasirah-zulkifli` | `nasirah-zulkifli.jpg` |
| Norizzati Afiqah, OTR/L — Head of OT Department | `mrs-norizzati-afiqah` | `mrs-norizzati-afiqah.jpg` |
| Liyana Tarmizi — Clinical Psychologist | `ms-liyana-tarmizi` | `ms-liyana-tarmizi.jpg` |
| Emalin Nasuha — Speech-Language Therapist | `ms-emalin-nasuha-hachim` | `ms-emalin-nasuha-hachim.jpg` |
| Tengku Sarah Nabilah, OTR/L — Occupational Therapist | `ms-tengku-sarah-nabilah` | `ms-tengku-sarah-nabilah.jpg` |
| Syahira Hassan, OTR/L — Occupational Therapist | `ms-syahira-hassan` | `ms-syahira-hassan.jpg` |
| Aisyah Azman — Special Education Teacher (repo: **Nuraisyah** Azman — name variant, keep repo id) | `ms-nuraisyah-azman` | `ms-nuraisyah-azman.jpg` |

- [ ] **Step 1 — extraction (preferred path, embedded images):** `pdfimages`, `pdftoppm`, and `magick` are all installed (`/opt/homebrew/bin`). Work in the scratchpad, then copy results in:

  ```bash
  cd "$SCRATCHPAD" && mkdir -p ue-pdf && cd ue-pdf
  pdfimages -png -f 2 -l 2 "/Users/deepsight/Downloads/UE Company Profile _20260524_230402_0000.pdf" team
  ls -la  # inspect: expect the 8 headshots among the dumps (plus decorative graphics)
  ```

  Open the dumped images (Read tool) and match each face-bearing image to the caption order above. Headshots in the PDF are round-cropped over purple card frames — the embedded originals may be rectangular (good — use them as-is).

- [ ] **Step 2 — fallback (if embedded dumps are unusable/composited):** rasterize page 2 at 200 DPI and crop the 8 card regions:

  ```bash
  pdftoppm -png -r 200 -f 2 -l 2 "/Users/deepsight/Downloads/UE Company Profile _20260524_230402_0000.pdf" page
  # page-2.png ≈ 1700×2200px. Team grid occupies roughly y 1180–1870.
  # Measure exact card boxes by viewing page-2.png, then per member:
  magick page-2.png -crop <W>x<H>+<X>+<Y> +repage <output>.jpg
  ```

  Crop to the circular-photo region of each card (square crop centred on the face circle is fine). Eyeball every crop with the Read tool before accepting.

- [ ] **Step 3 — normalize + install:** convert to JPG, cap the long edge at 480px (these are low-res interim files; don't upscale):

  ```bash
  for f in <matched files>; do magick "$f" -resize '480x480>' -quality 82 assets/img/staff-pdf/<mapped-name>.jpg; done
  ```

- [ ] **Step 4 (`staff.html`, light structural):** the staff card template currently renders only an initials `div` (`.staff-photo` with `aria-label="[REAL PHOTO REQUIRED] …"`). Change the template so a member with a photo + `photoInterim` renders an `<img>`; members without keep the initials placeholder:

  ```js
  const photoHtml = (m.photo && m.photoInterim)
    ? `<img class="staff-photo staff-photo--img" src="./${m.photo}" alt="${m.name}" loading="lazy">`
    : `<div class="staff-photo" role="img" aria-label="[REAL PHOTO REQUIRED] ${m.name}">${initials}</div>`;
  ```

  Notes: `alt` keeps the real name (spec). Keep the `./` relative prefix. If `.staff-photo` styles don't fit an `<img>` (it was built for an initials div), add a minimal `style` or reuse existing classes — do **not** add new CSS files; a small addition inside `@layer components` in `assets/css/components.css` is out of this task's file set, so prefer inline sizing on the class already present (`.staff-photo` is expected to size/crop via `object-fit: cover` — if a components.css touch is truly unavoidable, coordinate with the controller rather than editing it silently).

- [ ] **Step 5:** Because this task runs concurrently with 1.3, test locally with a hand-patched copy if needed, but **commit only the images + staff.html**. Full visual verification of photos happens after Group A merges (and in Phase 8).

- [ ] **Verify:**
  ```bash
  ls assets/img/staff-pdf/ | wc -l                       # 8
  ls assets/img/staff-pdf/                               # exact 8 mapped filenames
  for f in assets/img/staff-pdf/*.jpg; do sips -g pixelWidth "$f"; done  # all ≤480
  grep -c "photoInterim" staff.html                      # >=1
  grep -c "REAL PHOTO REQUIRED" staff.html               # >=1 (fallback branch retained)
  ```
  Post-merge visual: `/staff.html` shows 8 photos + Nur Ain's initials placeholder.

---

# Phase 3 — Careers page (1 task, runs in Group A)

## Task 3.1: `careers.html` (unlinked, direct-URL only) + `content/careers.json`

**Files:** `careers.html` (new), `content/careers.json` (new)
**Must NOT:** add any link to `careers.html` from nav, index, or footer (direct-URL only per client decision). README TODO is Task 7.1's job.

- [ ] **Step 1 — `content/careers.json`** (repo-root `content/`, EN-only — the parity script only globs `content/en` vs `content/ms`, so root-level files are exempt, same as `blog.json`):

  ```json
  {
    "_meta": {
      "source": "UE Company Profile PDF (2026-05-24), Benefits section",
      "createdAt": "2026-07-27",
      "_note": "EN-only, exempt from i18n parity (root-level, like blog.json). Page is deliberately unlinked from nav/index — direct URL only, pending client decision on placement."
    },
    "_placeholder": {
      "hero.subtitle": true,
      "outro.body": true
    },
    "hero": {
      "title": "Careers",
      "subtitle": "⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    },
    "benefits": {
      "heading": "Benefits",
      "items": [
        {
          "title": "Comprehensive Mental Health Coverage",
          "body": "Including medical insurance and mental health support."
        },
        {
          "title": "Professional Development",
          "body": "Access to training programs, workshops, and conferences to enhance skills."
        },
        {
          "title": "Work-life Balance",
          "body": "More than 12 annual leave days per year, sick leave, and overtime is discouraged."
        },
        {
          "title": "Supportive Work Environment",
          "body": "A collaborative and respectful workplace culture that values each team member's contributions."
        }
      ]
    },
    "outro": {
      "heading": "How to apply",
      "body": "⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "cta": "Contact us",
      "email": "urbaneethos@yahoo.com"
    }
  }
  ```

  (Benefits copy is PDF Appendix B **verbatim**, including "overtime is discouraged". Hero subtitle + outro body are unsourced → sentinel lorem.)

- [ ] **Step 2 — `careers.html`:** clone `blog.html`'s skeleton (it's the closest single-JSON content page):
  - Standard `<head>`: charset, viewport, `<title>Careers — Urbane Ethos</title>`, then the 4 CSS files **in order** `tokens.css` → `base.css` → `components.css` → `motion.css`, all `./assets/css/…`.
  - `<body class="careers">` with the standard header (copy from `blog.html`; **no** `aria-current` anywhere — careers isn't in the nav), standard footer, chatbot launcher.
  - Main: hero section (`data-i18n`-free — careers.json is EN-only and NOT part of the i18n namespace fetch; render everything from the JSON in the inline module instead), a benefits `grid-3`/`grid-2` of cards (same card markup as `about.html` values band), and an outro section whose CTA links `./contact.html`.
  - Inline module — standard canggih import block (same 8 imports as `blog.html`, same order):

    ```js
    import { getLocale, translatePage } from "./assets/js/i18n.js";
    import "./assets/js/consent.js";
    import "./assets/js/a11y.js";
    import "./assets/js/nav.js";
    import "./assets/js/icons.js";
    import "./assets/js/page-load.js";
    import "./assets/js/cursor.js";
    import "./assets/js/chatbot.js";
    ```

    Then fetch `./content/careers.json` (locale-independent path — note: NOT `./content/${locale}/…`), render hero/benefits/outro, render footer hours from `./content/${locale}/common.json` (copy the `footer-hours` pattern from `blog.html`), and call `translatePage(locale)` so the header/footer chrome still translates. Re-render on `i18n:changed` like every other page.

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/careers.json"))'
  grep -c "overtime is discouraged" content/careers.json      # 1
  grep -c 'assets/js/nav.js' careers.html                     # 1  (repeat for all 8 modules)
  grep -c 'careers.html' index.html about.html staff.html services.html blog.html contact.html privacy.html analytics.html | grep -vc ':0'   # 0 — no page links to it
  grep -c 'href="\./content/careers.json"\|content/careers.json' careers.html  # >=1
  ```
  Visual: `http://localhost:8080/careers.html` renders 4 benefit cards verbatim; EN/BM toggle translates chrome only; nav/footer show no Careers link.

---

# Phase 4 — Promo blog post (1 task, runs in Group A)

## Task 4.1: `post-year-end-promo.html` + `blog.json` entry + `blog.html` local-link support

**Files:** `post-year-end-promo.html` (new, repo root), `content/blog.json`, `blog.html`

This is the **first statically-generated local article — it sets the pattern** (root-level file so `./assets/...` relative paths keep working; no `blog/` subdirectory).

**Source copy (Appendix E, verbatim — the only real promo copy that exists):**
- `Our Annual Year End Promo! Full assessment at 20% off.`
- `Special Deals … First Intake … bundle packages 25% off! Contact 013-249 0069.`

- [ ] **Step 1 — `blog.json`:** add `"Promo"` to `categories` (after `"Speech"`), and prepend to `posts`:

  ```json
  {
    "id": "year-end-promo-first-intake-deals",
    "title": "Our Annual Year End Promo & First Intake Special Deals",
    "date": "2025-12-01",
    "category": "Promo",
    "excerpt": "Our Annual Year End Promo! Full assessment at 20% off — plus First Intake bundle packages at 25% off. Contact 013-249 0069.",
    "thumbnail": null,
    "tags": ["urbaneethos", "promo"],
    "localUrl": "./post-year-end-promo.html"
  }
  ```

  Notes: no `externalUrl` — `localUrl` is the new field for local articles. `thumbnail` is null (blog cards render a `stripe-fill` div, not the thumbnail — verified in `blog.html`). **Date `2025-12-01` is a plan-chosen approximation** (the live-site promos are undated); flagged for the controller. Add a `_meta` note line documenting the local-article pattern. Leave `featured` unchanged.

- [ ] **Step 2 — `blog.html` (light structural):** in `paint()`, support local posts:

  ```js
  a.href = p.localUrl || p.externalUrl;
  if (!p.localUrl) { a.target = "_blank"; a.rel = "noopener"; }
  ```

  (Currently every card gets `target="_blank"` — local articles must open in the same tab.)

- [ ] **Step 3 — `post-year-end-promo.html`:** standard page skeleton (clone `blog.html` head/header/footer exactly as Task 3.1 does; `<body class="blog post">`), standard 8-import canggih block (same list as Task 3.1). Article content is **static HTML in the page** (that's the pattern — no per-post JSON):

  ```html
  <main id="main">
    <article class="section">
      <div class="wrap" style="max-width:var(--content-max)">
        <p class="section-eyebrow">Promo</p>
        <h1>Our Annual Year End Promo &amp; First Intake Special Deals</h1>
        <p><small>2025-12-01 · Promo</small></p>
        <p><strong>Our Annual Year End Promo! Full assessment at 20% off.</strong></p>
        <p><strong>Special Deals — First Intake — bundle packages 25% off! Contact 013-249 0069.</strong></p>
        <p>⟪PLACEHOLDER⟫ Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <p><a class="btn btn--primary" href="./contact.html">Contact us</a> <a class="btn btn--secondary" href="./blog.html">Back to the blog</a></p>
      </div>
    </article>
  </main>
  ```

  The two bolded lines are the Appendix E copy verbatim (em-dash join of the elided "Special Deals … First Intake …" fragment is acceptable rendering of the ellipses). The single lorem paragraph is the only connective tissue — sentinel-prefixed, so the pre-launch grep finds it (note: it lives in HTML, not `content/`, so Phase 8 greps the repo root too). The inline module still fetches `./content/${locale}/common.json` for footer hours + `translatePage` for chrome.

- [ ] **Verify:**
  ```bash
  ruby -rjson -e 'd=JSON.parse(File.read("content/blog.json")); raise unless d["posts"][0]["localUrl"] && d["categories"].include?("Promo")'
  grep -c "20% off" post-year-end-promo.html            # >=1
  grep -c "25% off" post-year-end-promo.html            # >=1
  grep -c "localUrl" blog.html                          # >=2 (href + target guard)
  grep -c 'assets/js/nav.js' post-year-end-promo.html   # 1 (repeat for all 8 modules)
  ```
  Visual: `/blog.html` shows the Promo card first; clicking opens `/post-year-end-promo.html` in the **same tab**; external cards still open new tabs; Promo filter chip works.

---

# Phase 5 — MS re-mirror (7 parallel tasks, after ALL of Phase 1)

**Common rules for every 5.x task (read the paired 1.x task first — it defines exactly which strings changed):**

1. For every EN string that became **REAL** in Phase 1: re-translate to MS applying `content/glossary.md` fixed terms first (e.g. *Urbane Ethos Early Intervention Center → Pusat Intervensi Awal Urbane Ethos*, *Occupational Therapy → Terapi Carakerja*, *Speech Therapy → Terapi Pertuturan*, *Clinical Psychology → Psikologi Klinikal*, *Special Education → Pendidikan Khas*, *Screening or Assessment → Saringan atau Penilaian*, *Child/Children → Anak/Kanak-kanak*, *Parent → Ibu bapa*). Days/hours strings stay English (glossary rule) — the corrected hours array is copied **verbatim** into MS.
2. For every EN string that became **LOREM**: copy the EN value **byte-identically** (identical Latin incl. the `⟪PLACEHOLDER⟫ ` prefix).
3. Mirror all structural changes exactly: key renames (`values` → `visionMission`), added/removed items (7-entry services array, `programmes` block, `email` keys, `photoInterim` on all 9 members, `_placeholder` maps), deleted `_draft` maps. The `_placeholder` map must be **key-identical** to EN (it is parity-checked).
4. `_meta.reviewedBy` stays `null`. Set `_meta.translatedAt: "2026-07-27"` and keep/append `_meta.translatedBy`.
5. Addresses, phone numbers, email, names, credentials: copy verbatim (never translated).
6. Proper-noun service copy that is itself program-branding (e.g. "IEP", "EIP", "OTR/L", "ADL", "SPED") stays as-is inside MS sentences.

| Task | File | Mirrors |
|---|---|---|
| 5.1 | `content/ms/about.json` | Task 1.1 (incl. `visionMission` rename — `about.html` already reads the new path for both locales) |
| 5.2 | `content/ms/services.json` | Task 1.2 (7 items, `programmes` block, `_placeholder`) |
| 5.3 | `content/ms/staff.json` | Task 1.3 (lorem lines byte-identical; photo paths + `photoInterim` copied verbatim) |
| 5.4 | `content/ms/home.json` | Task 1.4 |
| 5.5 | `content/ms/contact.json` + `content/ms/common.json` | Task 1.5 (email + address + hours copied verbatim) |
| 5.6 | `content/ms/privacy.json` | Task 1.6 (§0 body: translate the sentence frame, keep address/phone/email verbatim; 9 lorem bodies byte-identical) |
| 5.7 | `content/ms/chatbot.json` | Task 1.7 (3 upgraded says translated; `flow.price.show.say` copied **byte-identical** to EN — it is `_placeholder`-marked, so no translation) |

- [ ] **Per-task verification (namespace-scoped, tolerant of siblings still in flight):**
  ```bash
  ruby -rjson -e 'JSON.parse(File.read("content/ms/<ns>.json"))'
  bin/check-i18n-parity.rb 2>&1 | grep -c "^<ns>\.json" || true   # 0 lines mentioning this namespace
  diff <(grep -o '⟪PLACEHOLDER⟫.*' content/en/<ns>.json | sort) <(grep -o '⟪PLACEHOLDER⟫.*' content/ms/<ns>.json | sort)  # empty
  ```
- [ ] **Group-exit criterion (controller runs once after all 7 land):**
  ```bash
  bin/check-i18n-parity.rb    # exits 0, "i18n parity OK (9 files)"
  ```

---

# Phase 6 — Canggih invariant + deploy + footer wiring (2 parallel tasks, after Groups A+B)

## Task 6.1: Footer email line on all 10 pages

**Files:** footer blocks only, in: `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `contact.html`, `privacy.html`, `analytics.html`, `careers.html`, `post-year-end-promo.html`

- [ ] In each page's `<footer class="site-footer">` Address column, after the `<p data-i18n="common.footer.phone1">` line, add:

  ```html
  <p><a href="mailto:urbaneethos@yahoo.com" data-i18n="common.footer.email">urbaneethos@yahoo.com</a></p>
  ```

  (The key was added to EN+MS `common.json` in Tasks 1.5/5.5. `analytics.html` / `privacy.html` have reduced chrome — if a page's footer has no Address column, add the email where the address/phone renders; if it renders no contact block at all, skip it and note which pages were skipped in the task report.)

- [ ] **Verify:**
  ```bash
  grep -lc "common.footer.email" index.html about.html staff.html services.html blog.html contact.html privacy.html analytics.html careers.html post-year-end-promo.html | wc -l   # 10 (or 10 minus explicitly-reported skips)
  ```
  Visual: footer email renders and is a `mailto:` link on `/`, `/careers.html`, `/post-year-end-promo.html`.

## Task 6.2: CLAUDE.md invariant update + deploy verification

**Files:** `CLAUDE.md` (edits); `.github/workflows/pages.yml` + `.gitlab-ci.yml` (verify only — **both deploys are rsync-with-exclusions, so new root-level files ship automatically; expect zero workflow edits**).

- [ ] **Step 1 (`CLAUDE.md`):**
  - "Eight production pages" → **ten** production pages; add `careers.html` (direct-URL only, unlinked) and `post-year-end-promo.html` (first local static blog article) to the pages list in § "Pages and routing".
  - Canggih wiring rule: "must be imported in every one of the 8 HTML pages" → 10; update the smoke check to `grep -c "<module-name>.js" *.html | paste -sd+ | bc   # must equal 10` and note the per-module expected counts (see Step 3).
  - § Content/i18n: add `careers.json` next to `blog.json` as root-level EN-only parity-exempt; document the new `_placeholder` marker (sentinel `⟪PLACEHOLDER⟫`, sibling map, parity-mirrored — unlike `_meta`/`_draft`/`_correction` it IS walked by the parity script, so EN/MS maps must match).
  - § Image placeholders: add `assets/img/staff-pdf/` (8 low-res interim headshots extracted from the company-profile PDF; pre-launch swap = replace files keeping filenames; Nur Ain still `[REAL PHOTO REQUIRED]`).
  - axe ratchet: "0 violations on all 8 production pages" → 10.

- [ ] **Step 2 (deploy verification, no edits expected):** confirm none of the new paths (`careers.html`, `post-year-end-promo.html`, `content/careers.json`, `assets/img/staff-pdf/`) match any `--exclude` pattern in either workflow (they don't — exclusions are dev-dir/dotfile based). If a future dev-only dir were added this pass (none is), mirror it in both files.

- [ ] **Step 3 — canggih count verification (record in task report):**
  ```bash
  for m in nav icons page-load cursor i18n consent a11y chatbot; do printf "%-12s" $m; grep -l "assets/js/$m.js" *.html | wc -l; done
  ```
  Expected after this pass: `nav` 10 · `icons` 10 · `page-load` 10 · `cursor` 10 · `i18n` 9 (all but analytics) · `consent` 9 (all but analytics) · `a11y` 8 (all but analytics+privacy) · `chatbot` 8 (all but analytics+privacy) · `parallax` stays 3 (hero pages only) · `personalization` 1 · `yt-embed` 3 · `analytics-demo-data` 1. Any mismatch = a new page shipped without full wiring — fix before Phase 7.

---

# Phase 7 — README + HANDOVER refresh (1 task, after Phase 6)

## Task 7.1: Rewrite `README.md` to current state; update `docs/HANDOVER.md` flags

**Files:** `README.md`, `docs/HANDOVER.md`

- [ ] **README.md** — rewrite to reflect the post-replacement state (keep the existing section skeleton: Status / Run locally / Structure / What's real vs draft vs mocked / Browser support / i18n parity / Known a11y gaps / Out of scope / Credits):
  - Update the page inventory to 10 pages; describe `post-year-end-promo.html` as the first local static blog article (pattern: root-level static HTML + `localUrl` in `blog.json`).
  - **Rewrite "What's real vs draft vs mocked"** around the new three-state model: REAL (sourced: Wix scrape, company-profile PDF 2026-05-24, brochure, co-director corrections), `⟪PLACEHOLDER⟫` lorem (greppable: `grep -rn "⟪PLACEHOLDER⟫" content/ *.html`), KEEP-functional scaffold. Remove now-stale claims (e.g. "no contact email known" — email is real now; old hours; invented values band).
  - Add the **careers TODO** verbatim: `TODO: Careers page exists at ./careers.html (unlinked from nav/index — direct URL only). Decide placement + real copy before launch.`
  - Add pre-launch flags: **interim staff photos** (low-res PDF extractions in `assets/img/staff-pdf/`, pending proper shoot + parental/staff consent; Nur Ain has none), **pricing** still placeholder (chatbot), **privacy notice** bodies are intentional lorem pending a real counsel-reviewed notice, **MS translations** still machine-generated (`reviewedBy: null`), blog post date approximate.
- [ ] **docs/HANDOVER.md** — add a dated section "Authoritative content replacement — landed 2026-07-27" summarizing: what became REAL per namespace, the `⟪PLACEHOLDER⟫`/`_placeholder` mechanic, the two new pages, the interim-photo caveat; move/mirror the deferred flags from the spec's "Out of scope" list (photo shoot + consent workflow, real pricing, legal privacy review, careers placement, concerns-checklist/decision-tree as interactive tools). Update the "Verification one-liners" section: page loop now includes `careers.html post-year-end-promo.html`, canggih count = 10, add the sentinel grep.
- [ ] **Verify:**
  ```bash
  grep -c "careers.html" README.md            # >=1
  grep -c "⟪PLACEHOLDER⟫" README.md           # >=1 (documents the grep contract)
  grep -c "2026-07-27" docs/HANDOVER.md       # >=1
  grep -c "12PM – 6PM" README.md              # 0 (no stale hours)
  ```

---

# Phase 8 — Final verification (1 task, last)

## Task 8.1: Full-repo verification sweep

**Files:** none (report-only; small fixes may be applied if a check fails, respecting file ownership of whichever phase the defect belongs to).

- [ ] **1. Sentinel inventory** — every hit must be on the intentional list below:
  ```bash
  grep -rn "⟪PLACEHOLDER⟫" content/ *.html
  ```
  Intentional: `services` ×8 slots (13 strings incl. FAQ q+a pairs) · `staff` ×14 · `home` ×5 (hero.headline + 3 personalLines + events.blurb; greetings KEPT real) · `privacy` ×9 · `chatbot` ×1 · `careers.json` ×2 · `post-year-end-promo.html` ×1 — **each duplicated in `content/ms/`** for the parity-checked namespaces. Anything else is a leak; anything missing means a lorem slot was silently filled.
- [ ] **2. No stale `_draft` on sourced strings:**
  ```bash
  grep -rn '"_draft"' content/en/ content/ms/
  ```
  Only permitted survivors: `contact.json` `form.fields.tellUsMore*` (×2 keys, EN+MS — functional scaffold, unsourced). Everything else must be gone.
- [ ] **3. Parity:** `bin/check-i18n-parity.rb` → exit 0, `i18n parity OK (9 files)`.
- [ ] **4. Canggih counts:** re-run Task 6.2 Step 3 loop; same expected numbers.
- [ ] **5. Old-value leak check:**
  ```bash
  grep -rn "12PM – 6PM" content/ *.html          # 0 hits
  grep -rn "RM_RANGE_PLACEHOLDER" content/       # 0 hits
  grep -rn "hello@urbaneethos.center" content/   # 0 hits
  grep -rn "Beginners Group" content/            # 0 hits
  ```
- [ ] **6. JSON well-formedness:** `for f in content/en/*.json content/ms/*.json content/*.json; do ruby -rjson -e "JSON.parse(File.read('$f'))" || echo "BAD: $f"; done`
- [ ] **7. Visual pass (`bin/server`, both locales):** home (lorem headline visible + sentinel, real subtitle, corrected hours/address, 6 service cards incl. retitles) · about (About us / story / Vision & Mission band) · services (7 cards, programmes band, screening-vs-assessment) · staff (8 PDF photos + Nur Ain initials, lorem personal lines) · blog (Promo card → local article, same tab; externals still new-tab) · post page (promos verbatim) · careers (direct URL, benefits verbatim, absent from all navs) · contact (email mailto, full address, 3-line hours) · privacy (§0 real, 9 lorem bodies) · analytics (untouched) · EN↔BM toggle on each · chatbot: screening/specialed/eip answers updated, price answer shows sentinel.
- [ ] **8. axe-core ratchet (if ChromeDriver available):** 0 violations across all **10** pages:
  ```bash
  for p in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html careers.html post-year-end-promo.html; do
    echo "=== /$p ==="; npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -3
  done
  ```
  If tooling is unavailable in-session, record it as an owed manual check in HANDOVER (consistent with existing practice — axe is not CI-gated).

---

## Plan self-review (writing-plans checklist — performed, fixes applied inline)

- **Spec coverage:** every Appendix A–E block lands exactly once — A: About-Us ¶1 → 1.1 mission; ¶2 → 1.1 story; Vision/Mission → 1.1 band; services #01–#06 → 1.2/1.4 titles (#04/#05 retitles; #06 → programmes "Other"); team roster → 1.3/2.1; licensing line → 1.3 hero + 1.2 specialed; contact block → 1.5/1.6. B → 3.1. C: positioning → 1.1/1.2/1.4 heroes; screening/assessment split → 1.2 + 1.7; EIP ≤12 → 1.2 + 1.7; extra groups → 1.2 programmes. D: background → programmes intro; EIP/Individual/Grouping/Other → programmes; join-us flow + hours → 1.2 assessment + cross-cutting hours; decision tree + checklist → 1.2 screening faqs + whoItsFor columns. E → 4.1. Cross-cutting hours/address/email → 1.4/1.5/1.6/6.1.
- **Placeholder scan:** the only `⟪PLACEHOLDER⟫` literals in this plan are intentional lorem values; no `TBD`/`TODO`-style gaps remain in task bodies (the README TODO in 7.1 is a deliverable, not a gap).
- **Name consistency:** `ms-nuraisyah-azman` (repo) vs "Aisyah Azman" (PDF) handled identically in 1.3 and 2.1; the 8 staff-pdf filenames in 1.3 and 2.1 are byte-identical; `visionMission` spelling matches between 1.1 JSON and 1.1 HTML steps; `localUrl` matches between 4.1 JSON and JS; `photoInterim` uniform across all 9 members (parity-safe).
- **Disjointness:** verified via the file-ownership table — no file appears in two tasks of the same parallel group (`staff.json` 1.3 vs `staff.html`+images 2.1; `blog.html` only in 4.1; `contact.html` in 1.5 and again only in sequential 6.1).

## Spec conflicts / gaps for the controller (also reported out-of-band)

1. **about `mission` double-assignment** — spec gives Vision+Mission to both the `mission` slot and the band; resolved as About-Us ¶1 in `mission`, band = Vision & Mission (no on-page duplication). Reverse if the client prefers.
2. **`specialed` "REAL from PDF #05"** — PDF #05 is a service *title* only; body slots beyond an assembled `whatItIs` are lorem'd and flagged in `_placeholder`.
3. **home `staffFeatured[*].greeting` → LOREM** (spec's literal instruction) removes real names from home staff cards while `staff.json` greetings stay real. Followed literally; controller may prefer KEEP.
4. **Blog post date** `2025-12-01` is invented (promos are undated) — needs client confirmation.
5. **`_placeholder` is parity-walked** (script skips only `_meta`/`_draft`/`_correction`) — handled by exact mirroring, but a one-line script change would be more robust if the controller prefers.
