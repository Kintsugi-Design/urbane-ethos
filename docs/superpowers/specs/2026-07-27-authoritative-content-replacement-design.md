# Authoritative Content Replacement — Design Spec

**Date:** 2026-07-27
**Status:** Approved design → implementation
**Author:** content pass driven by client-supplied authoritative materials

## Problem

The prototype's content is a three-way mix:

- **REAL** — scraped verbatim from the live Wix site (`content/scraped-raw/*.html`, ~2026-06-08).
- **DRAFT/GENERATED** — invented filler flagged `_draft` in each JSON, written to fill gaps the live site didn't cover.
- **SCAFFOLD** — UI chrome (nav, buttons, consent, chatbot, ARIA, analytics) with no live-site equivalent.

The client has since supplied **three additional authoritative sources** that post-date the scrape and either fill the drafted gaps or correct the generated copy:

1. **PDF company profile** (`UE Company Profile _20260524_230402_0000.pdf`) — updated Vision & Mission, 6 services, full 8-person team + roles, full address, email, careers "Benefits", team headshots.
2. **Brochure photos** (6 images) — programmes, assessment flow, operation hours, screening-vs-assessment decision tree, concerns checklist.
3. **Nasirah Zulkifli's WhatsApp corrections** (co-director) — she reviews the prototype directly and corrects positioning, age range, screening-vs-assessment distinction, assessment mechanics, EIP/grouping/other programmes.

## Goal

Replace generated content with authoritative content wherever any source speaks to it; replace remaining generated content with **clearly-marked Lorem ipsum**; incorporate orphan source content appropriately; keep the prototype functional and the EN/MS parity gate green.

## Decisions (locked with client)

1. **Source authority:** all four sources are authoritative. Lorem ipsum only where *none* of them cover a slot. On conflict, newest/most-direct wins (**PDF + Nasirah's direct corrections > old Wix scrape**); conflicts are flagged inline.
2. **Replacement scope:** **body/marketing content only.** Functional scaffolding (nav, buttons, form labels, consent banner, chatbot flow, ARIA, analytics demo) stays intact. The drafted 10-section **privacy notice → Lorem ipsum** (it is fake legal text).
3. **Placeholder style:** classic Latin **Lorem ipsum** as the visible value, plus a greppable marker.
4. **PDF headshots:** extract the 8 team photos, wire to staff cards, flag as **low-res interim** (pending proper shoot + consent).
5. **Careers "Benefits":** build a `careers.html` page **not linked from nav or index** (direct-URL only); README TODO; copy lives in `content/careers.json` (repo-root, EN-only, exempt from parity like `blog.json`).
6. **Promos:** port the year-end / first-intake promos as a **statically-generated blog post** (new local article page) linked from the blog index. No CMS — all posts are static HTML.

## Placeholder mechanic

Every generated string resolves to exactly one of: **REAL** (sourced), **LOREM** (marked placeholder), **KEEP** (functional scaffold).

- LOREM strings: visible value is Latin lorem ipsum prefixed with the sentinel `⟪PLACEHOLDER⟫ ` (greppable, obviously non-final).
- Each JSON file that gains lorem carries a sibling marker map `"_placeholder": { "<dot.path>": true }` (mirrors the existing `_draft` convention).
- On a string that becomes REAL: remove its `_draft` flag. On a string that becomes LOREM: move it from `_draft` → `_placeholder`.
- Grep contract: `grep -rn "⟪PLACEHOLDER⟫" content/` lists every unresolved copy slot pre-launch.

## Per-namespace resolution

### about.json — largest upgrade
- `mission` → **REAL**: replace the thin mapped "Our Vision" with the PDF's full **Vision** (2 points) + **Mission** (2 points). See Appendix A.
- `hero.subtitle` → **REAL**: Nasirah's therapy-centre positioning (Appendix C).
- `story` → **REAL, keep** Wix "Our Story"; may enrich with PDF "Since 2005, 20+ years…" (Appendix A).
- `values` band (4 invented items) → **structurally replaced** by a real **Vision & Mission** band from the PDF (orphan content incorporated appropriately). The invented "values" concept is dropped, not lorem'd.

### services.json — major real upgrade (brochure + Nasirah)
- **Screening vs Assessment** split into distinct real content — they are *separate services* (Nasirah). Screening: OT (fine motor, school readiness) + Clinical Psychology (emotional, behavioural). Assessment: 3-in-1 (OT + Clinical Psychology + Speech-Language), 1–2 hrs, 3 allied-health roles detailed, +4th learning/school-readiness component for school age. (Appendix C, D)
- `specialed` (was fully drafted) → **REAL** from PDF service #05 (Cognitive Therapy & Special Education) + brochure SPED.
- `eip` → **REAL** detail: EIP is for children **≤12**; school-readiness program 6–12; play group 3–5; morning 4 hr (school readiness) / afternoon 2 hr (play group). (Appendix C, D)
- New real **Programmes** content (brochure Appendix D): Early Intervention (disorder list), Individual (one-to-one; OT/Speech/Learning; OT required每session; by availability), Grouping (5–6 children; 2 sessions/day weekdays; AM 4 hr OT+Speech+pre-literacy+pre-primary; PM 2 hr OT+Speech+play+basic concepts), Other (parent coaching & teacher training; social group 7–9 & 13–18; fine-motor group 3–8 beginner/intermediate/advance; ADL adolescents; sensory-feeding therapy; vocational skills 15+).
- `whoItsFor` / `whatToExpect` / FAQs → **REAL** where brochure/Nasirah answer (assessment duration 1–2 hrs, who's involved, screening-or-full-assessment decision tree, concerns self-check). **LOREM** only for genuinely unsourced slots.
- **Operation hours** referenced anywhere → corrected value (see Cross-cutting).

### staff.json
- Names, roles, credentials → **REAL** (PDF confirms all 8; Nur Ain Nabila administrator retained from Wix — not in PDF).
- 4 lead bios (Norizan, Nasirah, Liyana, Norizzati) → **REAL** (Wix).
- 5 other bios (Tengku Sarah, Emalin, Syahira, Nuraisyah/Aisyah, Nur Ain) → **LOREM** (PDF gives role only; no bio source anywhere).
- All 9 `personalLine`s (pure invention) → **LOREM**.
- Photos → extract 8 PDF headshots to `assets/img/staff-pdf/`, wire to the matching members, `alt` retains a real name, add an interim-quality note; members without a PDF photo keep `[REAL PHOTO REQUIRED]`.

### home.json
- `location.hours` → **REAL corrected** (Appendix D resolves the discrepancy): **Monday 12PM–5PM, Tuesday–Saturday 9AM–6PM, closed Sunday & public holidays.** `location.address` → full PDF address.
- `hero.subtitle` → **REAL** (Nasirah positioning). `hero.headline` (4-word invented tagline, no source) → **LOREM**.
- `services.items[*]` titles/blurbs → **REAL** (specialed blurb now sourced from PDF #05).
- `staffFeatured[*]` greeting/personalLine, `events.blurb` → **LOREM**. `testimonial`, `whatWeDo` → **REAL, keep** (whatWeDo may gain the therapy-centre framing).
- personalization / rail / scaffold headings → **KEEP**.

### contact.json + common.json (footer)
- Add real **email `urbaneethos@yahoo.com`** (PDF).
- Address → full PDF address: *No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor.*
- Hours → corrected (above). Phones: Reception `+603-7734 3044`, WhatsApp `+6013-249 0069` → **REAL, keep**.
- Form fields, chatbotCta, nav, buttons, ARIA, media captions → **KEEP** (functional scaffold).

### privacy.json
- All 10 section **bodies → LOREM**. Headings, prototype disclaimer, and the real address/phone in §0 → **KEEP**.

### consent.json / chatbot.json / analytics.html
- **KEEP functional.** Chatbot per-service `say` strings may be upgraded with real Nasirah copy where they map. Pricing stays `⟪PLACEHOLDER⟫` (no RM figures were supplied — Nasirah's "the charges would be:" list was cut off).

### blog.json — real, plus one new static post
- Existing 4 posts → **REAL, unchanged** (EN-only, external deep-links kept).
- **New static post** for the promos: create a local article page + a `blog.json` entry with a *local* `externalUrl` (or new `localUrl`) pointing to it. Category e.g. "Notice/Promo". This is the first statically-generated local article and sets the pattern.

### careers.json (new, repo-root, EN-only)
- Benefits block from PDF (Appendix B) → real content for `careers.html`. Exempt from parity (root-level, like `blog.json`).

## New pages

Both new pages reuse the standard `<head>` (4 CSS files in order) and the canggih JS layer for visual/behavioural consistency.

- **`careers.html`** — direct-URL only, absent from nav and index. Renders `content/careers.json`. README gains a TODO: "Careers page exists at `/careers.html` (unlinked) — decide placement + real copy before launch."
- **Blog post page** (e.g. `blog/year-end-promo.html` or `post-year-end-promo.html`) — static article rendering the ported promo copy. Linked from the blog index card.

**Canggih invariant update:** the documented smoke check (`grep -c "<module>.js" *.html | paste -sd+ | bc` must equal 8) becomes the production-page count *N* (currently 8 → 8 + careers + blog-post). Update `CLAUDE.md`, the two deploy exclusion lists if the new pages must (or must not) ship, and the invariant number. Careers + the blog post **do** deploy (they're public via direct URL / blog link).

## Cross-cutting

- **Operation hours (authoritative, resolves discrepancy):** Monday **12PM–5PM**; Tuesday–Saturday **9AM–6PM**; closed Sunday & public holidays. Apply to `home.location.hours`, `contact.hours`, `common.footer.hours`, and any services reference.
- **Address (authoritative):** No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor.
- **Email (authoritative):** urbaneethos@yahoo.com. (Privacy notice's `hello@urbaneethos.center` becomes lorem anyway; contact/footer use the real yahoo address.)
- **Name variants:** PDF "Aisyah Azman" ≈ repo "Nuraisyah Azman" (Special Education Teacher); PDF "Norizzati Afiqah" = repo "Norizzati Afiqah" (Head of OT). Keep repo's fuller names; note the variant.
- **Positioning correction (Nasirah):** the centre is a **therapy centre** for neurodivergent individuals **0–20 and expanding to older/elderly** — not only "language & social skills." Ensure hero/about/services intros reflect this.

## MS (Bahasa Malaysia) mirror

- Every changed EN string re-translated to MS applying `content/glossary.md`; `_meta.reviewedBy` stays `null`.
- LOREM values are identical Latin in both locales (parity satisfied by identical keys; value language is irrelevant for lorem).
- `_placeholder` marker maps mirror into MS files too.
- `bin/check-i18n-parity.rb` MUST exit 0 after every namespace change. `careers.json` and `blog.json` stay EN-only (root-level, exempt).

## Out of scope / flagged in HANDOVER

- Real staff photo shoot + parental/staff consent workflow (PDF headshots are interim).
- Real pricing (chatbot pricing stays placeholder).
- Legal review of a real privacy notice (currently lorem).
- Careers page final placement/copy.
- Concerns-checklist & screening-decision-tree as *interactive tools* (this pass ports their text as real service content only).

## Verification

1. `grep -rn "⟪PLACEHOLDER⟫" content/` — every remaining lorem slot is listed and intentional.
2. `grep -rn "_draft" content/en/` — no `_draft` flag remains on a string that a source now covers.
3. `bin/check-i18n-parity.rb` exits 0.
4. `grep -c "<canggih-module>.js" *.html | paste -sd+ | bc` equals the new production-page count for each canggih module.
5. `bin/server` + click each page (home, about, staff, services, blog, contact, privacy, careers, new blog post) — real copy renders EN and MS; no leftover generated marketing text; staff photos load.
6. axe-core ratchet: 0 violations on the production pages (new pages included).

---

## Appendix A — PDF: About / Vision / Mission (verbatim)

**About Us:** "At Urbane Ethos Early Intervention Center, we believe that a holistic approach to therapy, driven by transdisciplinary collaboration, is the key to unlocking each client's full potential. Our team, comprised of Clinical Linguists, Speech-Language Therapists, Occupational Therapist, Clinical Psychologist and Special Education Teacher, work seamlessly together to provide comprehensive, evidence-based care tailored to individual needs.

Since 2005, we have had over 20 years of experience providing client-centered intervention for language and speech disorders, developmental disorders, mental health disorders and for learning disabilities. We provide one-to-one therapy sessions, and group sessions, parent consultations and trainings along with school screening programs. Our programs are personalized or specially catered to fit the child's abilities, goals, and interests."

**Vision:**
1. To provide rehabilitative and therapeutic services at an international standard in the local context.
2. To empower individuals of all ages to achieve their fullest potential through compassionate, evidence-based, and collaborative therapy services.

**Mission:**
1. To provide effective, quality and accessible therapy services.
2. To provide holistic, individualized, and transdisciplinary therapy and intervention services that support the developmental, communicative, and psychological well-being of our clients.

**Our Services (6):** 01 Occupational Therapy Assessment & Intervention · 02 Clinical Linguistics & Speech-Language Assessment & Intervention · 03 Clinical Psychology Assessment & Intervention · 04 Individual Education Program (IEP) & Early Intervention Program (EIP) · 05 Cognitive Therapy & Special Education · 06 ADL & IADL Training / Social Skills Group / Individual Training Program (ITP). "All employees in our company are professionally licensed."

**Our Team (8):** Dr. Norizan Rajak — Clinical Director & Clinical Linguist · Nasirah Zulkifli, OTR/L — Co-director & Occupational Therapist · Norizzati Afiqah, OTR/L — Head of OT Department · Liyana Tarmizi — Clinical Psychologist · Emalin Nasuha — Speech-Language Therapist · Tengku Sarah Nabilah, OTR/L — Occupational Therapist · Syahira Hassan, OTR/L — Occupational Therapist · Aisyah Azman — Special Education Teacher.

**Contact:** +6013-249 0069 · urbaneethos@yahoo.com · www.urbaneethos.center · Urbane Ethos Early Intervention Center, No. 4, Jalan Elektron E U16/E, Seksyen U16, E-Boulevard, Denai Alam, 40160 Shah Alam, Selangor.

## Appendix B — PDF: Careers "Benefits" (verbatim)

- **Comprehensive Mental Health Coverage** — Including medical insurance and mental health support.
- **Professional Development** — Access to training programs, workshops, and conferences to enhance skills.
- **Work-life Balance** — More than 12 annual leave days per year, sick leave, and overtime is discouraged.
- **Supportive Work Environment** — A collaborative and respectful workplace culture that values each team member's contributions.

## Appendix C — Nasirah's WhatsApp corrections (verbatim, co-director)

- "As mentioned, we cater between 0-20 years old and expanding to older and elderly patients."
- "Not only language and social skills but please highlight that we are a therapy center."
- "We offer client centered rehabilitation and therapy for motor development, sensory integration, speech-language therapy as well as social and cognitive stimulation for neurodivergent individuals ranging from toddlers, children, adults and elderly."
- "OUR SERVICES — Urbane Ethos Early Intervention Center offers language enhancement and social and cognitive stimulation intervention for typically developing children and children with special needs, school age children, and adults."
- Screening (separate services): "1. Occupational Therapy: Fine motor, school readiness. 2. Clinical Psychology: emotional, behavioural."
- Assessment: "For assessment, it is a 3in1 package 0-20 years old and older. Including OT, CP and Speech-Language Assessment. ++ Learning/School readiness assessment for those of school age and older."
- "At Urbane Ethos, we provide a holistic 3-in-1 assessment comprising of all three different areas of allied health: Occupational Therapy, Speech-Language and Communication as well as Clinical Psychology. A 4th component would also be included, if the child is already of learning age. Usually, the assessment could take around 1-2 hours depending on the needs of the child."
- Assessment involves 3 allied health professionals: "1) Occupational therapist: Assess sensory integration, gross motor, and fine motor development and activities of daily living (ADL). 2) Speech/Language therapist: Assess pre-verbal skills, receptive and expressive language; if the child is already ready for learning, then his academic performance would be assessed as well. 3) Clinical psychologist review and observe their behaviour, play skills, and if it is appropriate to their age and developments. Consultation charges are included in the assessment as well."
- EIP: "EIP program is ONLY for children ages 12 and below — 1. school readiness program 6-12 years old. 2. Play group - 3-5 years old." "Morning session 4 hours - school readiness. Afternoon 2 hours - play group."
- Other groups beyond the brochure: "1. Social skills group for (13-18 years old). 2. social skills group (7-9 years old). 3. Vocational skills training (15 and above)."

## Appendix D — Brochure (verbatim)

**Background:** "Offers quick, consistent and personalized intervention services for typically developing children, children with special needs and school age children. Our integrated and multidisciplinary set up consists of therapists from the fields of: Occupational Therapy (OT), Speech, Language and Pathology (SLP), Special Education (SPED) — working harmoniously to provide programmes and services catered individually to your child's needs."

**Our Services / Screening Services and Assessment:** "Screening for Individuals or for childcare providers/learning centers. Full MULTIDISCIPLINARY developmental assessment of child's language, fine & gross motor, sensory profile and if necessary learning. Referral report to identified paediatrician, child psychologist and SLPs."

**Early Intervention Programme:** "Children with mild to moderate disorders — Global or Developmental Delay / Intellectual, AD/HD, Autism, Down Syndrome, Hearing Impairments, Dyspraxia, etc. Stimulation of language as precursor for the development of high intelligence as well as sensory stimulation to help develop, regain and maintain the child's ability to be able to participate in everyday situations and/or activities and adapt to different environments."

**Individual Programme:** "One-to-one sessions. Occupational Therapy, Speech Therapy and Learning Therapy. Occupational Therapy is *required for every session to address children with sensory and attention issues. Session is based on availability."

**Grouping Programme:** "In a group of 5-6 children. 2 sessions per day on weekdays. Morning session (4 hours): Occupational Therapy, Speech Therapy, Pre-literacy, Pre-primary school preparation. Afternoon session (2 hours): Occupational Therapy, Speech Therapy, Play group and learning basic concepts."

**Other Programmes:** "Parent coaching and Teacher training. Social Group (7 years +): to develop social skills, learning interpersonal skills, facilitate understanding and empathy amongst peers. Fine Motor Group (3-8 years old): focusing on pre-writing skills, handwriting readiness, drawing; Beginner level, intermediate level and advance level class. Activities of Daily Living (ADL) group (Adolescents). Sensory - Feeding Therapy."

**How you can join us:** Assessment (on weekdays, appointment based; assess by Clinical Linguist, Occupational Therapist & Speech Therapist) → Programmes (Intensive sessions within 30 days; Individual sessions book per session; Grouping Morning & Afternoon) → Book Session → **Operation hours: Monday 12–5pm; Tuesday–Friday 9am–6pm; Saturday 9am–6pm; Closed Sunday & Public Holiday** → Attend Session.

**Screening or Full Assessment? (decision tree):** "Would you like to know whether your child's development is as expected?" → YES → "Do you have a LITTLE concern or a LOT of concerns?" → LITTLE → **Screening** (broad picture of development; early identification of potential issues; determine if further evaluation/intervention is needed; if further evaluation is needed → Full Assessment). A LOT → **Full Assessment** (comprehensive understanding of strengths, challenges, specific developmental needs; personalised strategies, therapies, interventions; helps identify conditions like Autism, ADHD, learning disabilities).

**Concerns checklist — "Tick the concerns relevant to your child's development":**
- **Occupational Therapy (OT):** Fine Motor (poor handwriting, difficulty using utensils or manipulating toys like building blocks); Gross Motor (trouble walking, running, climbing, or balancing); Self-Care (dressing, brushing teeth, eating independently, toileting); Sensory Processing (over-sensitive/avoids textures, sounds, lights, movement; or seeks excessive sensory input); Coordination and Strength (clumsy, trips/falls, weak muscle tone).
- **Speech & Language Therapy (ST):** Speech Development (limited babbling by 12 months, no single words by 16 months, unclear speech beyond age 2); Understanding Language (difficulty following simple instructions); Expressing Needs (limited vocabulary, trouble forming sentences); Social Interaction (avoids eye contact, trouble engaging, no gestures like pointing/waving); Repetitive Language (echolalia; words without meaning).
- **Clinical Psychology (CP):** Emotional Regulation (frequent tantrums, intense outbursts, difficulty calming down); Social Behaviour (difficulty making friends, responding to social cues, cooperative play); Routine and Transitions (struggles with changes in routine/activities/new environments); Anxiety or Fear (excessive clinginess, separation anxiety, fearfulness); Aggressive or Withdrawn Behaviour (hitting, biting, persistent sadness, loss of interest, withdrawal).
- Scoring: "1 or 2 ticks = [screening]; 3 or more ticks = [assessment]."

## Appendix E — Promos (from live services page, verbatim) → port to a blog post

- "Our Annual Year End Promo! Full assessment at 20% off."
- "Special Deals … First Intake … bundle packages 25% off! Contact 013-249 0069."
