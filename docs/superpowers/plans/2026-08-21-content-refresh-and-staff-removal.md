# Content refresh (Screening + Assessment) and staff removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply co-director Nasirah's 2026-08-21 copy corrections to the Screening and Assessment services, remove two departed staff members from the roster, and record the two deferred anchor-photo swaps as a handover follow-up.

**Architecture:** This repo is a static, no-build, bilingual prototype. All visible copy lives in `content/{en,ms}/*.json`; the HTML pages carry hand-maintained *SEO static fallbacks* that mirror that JSON and are replaced at runtime by data-driven JS. So every content change here is **two edits** (EN + MS JSON) plus, where a static fallback mirrors it, a third edit to the HTML. There is no test framework — the gates are two Ruby scripts, run in a fixed order.

**Tech Stack:** Plain HTML/CSS/ESM JavaScript, JSON content files, Ruby 3.1+ (WEBrick dev server and the two gate scripts), Python 3 (used below only as a precise string-replacement tool — it is not a project dependency).

---

## Before you start

Read `docs/superpowers/specs/2026-08-21-content-refresh-and-staff-removal-design.md`. It is the approved spec this plan implements.

Three project rules that will bite you if you skip them:

1. **`content/en/*.json` and `content/ms/*.json` must have identical key trees.** `bin/check-i18n-parity.rb` enforces it and CI gates on it. `_meta`, `_draft` and `_correction` are stripped from the check — **`_placeholder` is NOT**, it is walked like any other key. Task 3 re-indexes a `_placeholder` map and is the single most likely place to break the build.
2. **Commit messages must not carry `Co-Authored-By: Claude` trailers or "Generated with Claude Code" lines.** Workspace policy.
3. **Never reformat a JSON file wholesale.** Do not round-trip through `json.dump`. Every edit below is an exact-string replacement against the raw file text, with an assertion that the old string was found. If an assertion fires, stop and report — do not improvise a fuzzy match.

Baseline check before touching anything:

```bash
bin/check-i18n-parity.rb && ruby bin/check-contact-channels.rb && echo BASELINE-GREEN
```

Expected: `BASELINE-GREEN` on the last line. If it is already red, stop and report — that is a pre-existing failure, not yours to fix inside this plan.

---

## File structure

| File | Responsibility | Tasks |
| --- | --- | --- |
| `content/en/services.json` | EN service copy (screening = `items[0]`, assessment = `items[1]`) | 1, 2 |
| `content/ms/services.json` | BM mirror of the above | 1, 2 |
| `content/en/staff.json` | EN roster: `members[]`, `_placeholder` index map, `_meta._note` | 3 |
| `content/ms/staff.json` | BM mirror of the above | 3 |
| `staff.html` | SEO static fallback: one `<article class="staff-card">` per member | 4 |
| `index.html` | SEO static fallback: 3 featured rows + a "…and N more" footer row | 4 |
| `assets/img/staff-pdf/ms-tengku-sarah-nabilah.jpg` | Orphaned headshot | 4 |
| `CLAUDE.md`, `README.md`, `docs/HANDOVER.md` | Stale counts and named references | 5 |

---

## Task 1: Screening copy

Only `items[0].whatItIs` changes. `whoItsFor`, `whatToExpect`, `faqs` and `cta` already match the client source verbatim — **do not touch them.** In particular `faqs[0].a` already carries the "a little concern / a lot of concerns" text the client re-sent; it is not a new requirement.

**Files:**
- Modify: `content/en/services.json`
- Modify: `content/ms/services.json`

- [ ] **Step 1: Confirm the current strings are what this plan expects**

```bash
python3 -c "
import json
for loc in ['en','ms']:
    d=json.load(open(f'content/{loc}/services.json'))
    print(loc, repr([x for x in d['items'] if x['key']=='screening'][0]['whatItIs'][-90:]))
"
```

Expected output:

```
en "1. Occupational Therapy: fine motor, school readiness. 2. Clinical Psychology: emotional, behavioural."
ms "1. Terapi Carakerja: motor halus, kesediaan sekolah. 2. Psikologi Klinikal: emosi, tingkah laku."
```

If either differs, stop and report — someone has edited this since the spec was written.

- [ ] **Step 2: Apply both replacements**

```bash
python3 - <<'PY'
EDITS = [
  ("content/en/services.json",
   "Screening for individuals or for childcare providers/learning centers — a broad picture of your child's development and early identification of potential issues. We offer two screening services: 1. Occupational Therapy: fine motor, school readiness. 2. Clinical Psychology: emotional, behavioural.",
   "Screening for individuals or for childcare providers/learning centers — a broad picture of your child's development and early identification of potential issues. We offer two screening services: 1. Occupational Therapy: To assess motor development, Activities of Daily Living (ADL and iADLs), school readiness. 2. Clinical Psychology: To screen for emotional, behavioural concerns. This screening package does not include Speech-Language Pathology (SLP) screening. For further information regarding SLP, please refer to the assessment section."),
  ("content/ms/services.json",
   "Saringan untuk individu atau untuk penyedia jagaan kanak-kanak/pusat pembelajaran — gambaran menyeluruh tentang perkembangan anak anda dan pengenalpastian awal isu berpotensi. Kami menawarkan dua perkhidmatan saringan: 1. Terapi Carakerja: motor halus, kesediaan sekolah. 2. Psikologi Klinikal: emosi, tingkah laku.",
   "Saringan untuk individu atau untuk penyedia jagaan kanak-kanak/pusat pembelajaran — gambaran menyeluruh tentang perkembangan anak anda dan pengenalpastian awal isu berpotensi. Kami menawarkan dua perkhidmatan saringan: 1. Terapi Carakerja: Menilai perkembangan motor, Aktiviti Kehidupan Harian (ADL dan iADL), kesediaan sekolah. 2. Psikologi Klinikal: Menyaring kebimbangan emosi dan tingkah laku. Pakej saringan ini tidak termasuk saringan Patologi Bahasa Pertuturan (SLP). Untuk maklumat lanjut mengenai SLP, sila rujuk bahagian penilaian."),
]
for path, old, new in EDITS:
    s = open(path, encoding="utf-8").read()
    assert s.count(old) == 1, f"expected exactly 1 match in {path}, found {s.count(old)}"
    open(path, "w", encoding="utf-8").write(s.replace(old, new))
    print("patched", path)
PY
```

Expected: two `patched …` lines, no traceback.

Note on `iADLs`: the client's WhatsApp message writes "iADLS". We ship `iADLs` (instrumental Activities of Daily Living). This is deliberate — do not "correct" it back.

- [ ] **Step 3: Verify the JSON still parses and the gates pass**

```bash
python3 -m json.tool content/en/services.json > /dev/null && python3 -m json.tool content/ms/services.json > /dev/null && echo JSON-OK
bin/check-i18n-parity.rb && ruby bin/check-contact-channels.rb && echo GATES-GREEN
```

Expected: `JSON-OK`, then `GATES-GREEN`. Parity cannot change here (no keys added or removed) — if it fails, you corrupted a file.

- [ ] **Step 4: Commit**

```bash
git add content/en/services.json content/ms/services.json
git commit -m "content(services): expand the screening OT scope and note the SLP exclusion"
```

---

## Task 2: Assessment copy

Two strings per locale: `items[1].whatItIs` and `items[1].faqs[0].a`. `whoItsFor` and `whatToExpect` already match the client source exactly — **do not touch them.** `faqs[1]` is unchanged.

**Files:**
- Modify: `content/en/services.json`
- Modify: `content/ms/services.json`

- [ ] **Step 1: Confirm the current strings**

```bash
python3 -c "
import json
for loc in ['en','ms']:
    it=[x for x in json.load(open(f'content/{loc}/services.json'))['items'] if x['key']=='assessment'][0]
    print(loc, 'faq0:', repr(it['faqs'][0]['a']))
"
```

Expected output:

```
en faq0: 'Usually around 1-2 hours depending on the needs of the child.'
ms faq0: 'Kebiasaannya sekitar 1-2 jam bergantung pada keperluan anak.'
```

If either differs, stop and report.

- [ ] **Step 2: Apply all four replacements**

Each `whatItIs` edit is expressed as two smaller substring swaps rather than one whole-paragraph swap, so the surrounding sentences are provably untouched.

```bash
python3 - <<'PY'
EDITS = [
  # EN whatItIs: the 4th component sentence
  ("content/en/services.json",
   "A 4th component would also be included, if the child is already of learning age.",
   "A 4th component for Learning would also be included, to assess proficiency and early literacy skills, if the child is nearing or already of schooling age."),
  # EN whatItIs: duration qualifier
  ("content/en/services.json",
   "the assessment could take around 1-2 hours depending on the needs of the child",
   "the assessment could take around 1-2 hours depending on the needs and readiness of the child"),
  # EN faqs[0].a
  ("content/en/services.json",
   "Usually around 1-2 hours depending on the needs of the child.",
   "Usually around 1-2 hours depending on the needs and readiness of the child."),
  # MS whatItIs: the 4th component sentence
  ("content/ms/services.json",
   "Komponen ke-4 turut disertakan jika anak sudah mencapai usia pembelajaran.",
   "Komponen ke-4 untuk Pembelajaran turut disertakan, bagi menilai kemahiran dan literasi awal, jika anak hampir atau sudah mencapai usia persekolahan."),
  # MS whatItIs: duration qualifier
  ("content/ms/services.json",
   "penilaian mengambil masa sekitar 1-2 jam bergantung pada keperluan anak",
   "penilaian mengambil masa sekitar 1-2 jam bergantung pada keperluan dan kesediaan anak"),
  # MS faqs[0].a
  ("content/ms/services.json",
   "Kebiasaannya sekitar 1-2 jam bergantung pada keperluan anak.",
   "Kebiasaannya sekitar 1-2 jam bergantung pada keperluan dan kesediaan anak."),
]
for path, old, new in EDITS:
    s = open(path, encoding="utf-8").read()
    assert s.count(old) == 1, f"expected exactly 1 match for {old[:40]!r} in {path}, found {s.count(old)}"
    open(path, "w", encoding="utf-8").write(s.replace(old, new))
    print("patched", path, "|", old[:45])
PY
```

Expected: six `patched …` lines, no traceback.

- [ ] **Step 3: Verify**

```bash
python3 -c "
import json
for loc in ['en','ms']:
    it=[x for x in json.load(open(f'content/{loc}/services.json'))['items'] if x['key']=='assessment'][0]
    assert 'readiness' in it['whatItIs'] or 'kesediaan' in it['whatItIs'], loc
    assert 'readiness' in it['faqs'][0]['a'] or 'kesediaan' in it['faqs'][0]['a'], loc
print('ASSESSMENT-OK')
"
bin/check-i18n-parity.rb && ruby bin/check-contact-channels.rb && echo GATES-GREEN
```

Expected: `ASSESSMENT-OK`, then `GATES-GREEN`.

- [ ] **Step 4: Commit**

```bash
git add content/en/services.json content/ms/services.json
git commit -m "content(services): describe the 4th learning component and add the readiness qualifier"
```

---

## Task 3: Remove the two staff members from content

Remove `ms-tengku-sarah-nabilah` (currently `members[4]`) and `mrs-nur-ain-nabila` (currently `members[8]`) from both locales. 9 members → 7.

**This is the task that can break CI.** `_placeholder` is keyed by array index (`members.5.bio`) and `bin/check-i18n-parity.rb` walks it, so the EN and MS maps must end up key-identical *and* pointing at the right members.

**Files:**
- Modify: `content/en/staff.json`
- Modify: `content/ms/staff.json`

- [ ] **Step 1: Record the pre-change state**

```bash
python3 -c "
import json
for loc in ['en','ms']:
    d=json.load(open(f'content/{loc}/staff.json'))
    print(loc, len(d['members']), [m['id'] for m in d['members']])
    print(loc, 'placeholder:', sorted(d['_placeholder']))
"
```

Expected: 9 members in each locale, in the same order, and both `_placeholder` maps holding these 11 keys:

```
['members.0.personalLine', 'members.1.personalLine', 'members.3.personalLine',
 'members.4.bio', 'members.4.personalLine', 'members.5.bio', 'members.5.personalLine',
 'members.6.bio', 'members.6.personalLine', 'members.8.bio', 'members.8.personalLine']
```

- [ ] **Step 2: Remove the members and re-index `_placeholder`**

This one edit does need to rewrite the file structurally, so it *does* round-trip through `json.dump`. That is acceptable here and only here: it is applied identically to both locales, and Step 3 diffs the result. `indent=2` + `ensure_ascii=False` matches the existing file style.

The re-index is computed from the old→new index mapping rather than hard-coded, so it stays correct if the roster shifts before this runs.

```bash
python3 - <<'PY'
import json, collections

REMOVE = {"ms-tengku-sarah-nabilah", "mrs-nur-ain-nabila"}

for loc in ("en", "ms"):
    path = f"content/{loc}/staff.json"
    d = json.load(open(path, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)

    ids = [m["id"] for m in d["members"]]
    assert REMOVE <= set(ids), f"{path}: expected both members present, got {ids}"

    # old index -> new index, for the members we keep
    remap, n = {}, 0
    for old_i, m in enumerate(d["members"]):
        if m["id"] in REMOVE:
            continue
        remap[old_i] = n
        n += 1

    d["members"] = [m for m in d["members"] if m["id"] not in REMOVE]

    new_ph = collections.OrderedDict()
    for key, val in d["_placeholder"].items():
        head, idx, tail = key.split(".", 2)
        assert head == "members", f"{path}: unexpected placeholder key {key}"
        old_i = int(idx)
        if old_i not in remap:      # belonged to a removed member — drop it
            continue
        new_ph[f"members.{remap[old_i]}.{tail}"] = val
    d["_placeholder"] = new_ph

    json.dump(d, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(path, "a", encoding="utf-8").write("\n")
    print(path, "->", len(d["members"]), "members,", len(new_ph), "placeholder keys")
PY
```

Expected: two lines, each reading `7 members, 7 placeholder keys`.

- [ ] **Step 3: Verify the re-index landed on the right people**

```bash
python3 -c "
import json
for loc in ['en','ms']:
    d=json.load(open(f'content/{loc}/staff.json'))
    ids=[m['id'] for m in d['members']]
    assert ids==['dr-norizan-rajak','nasirah-zulkifli','ms-robin-koh-hui-xuan','mrs-norizzati-afiqah','ms-emalin-nasuha-hachim','ms-syahira-hassan','ms-farwizah'], (loc, ids)
    assert sorted(d['_placeholder'])==['members.0.personalLine','members.1.personalLine','members.3.personalLine','members.4.bio','members.4.personalLine','members.5.bio','members.5.personalLine'], (loc, sorted(d['_placeholder']))
    # the surviving placeholder entries must still point at members who actually hold lorem text
    for k in d['_placeholder']:
        i=int(k.split('.')[1]); field=k.split('.')[2]
        assert '⟪PLACEHOLDER⟫' in d['members'][i][field], (loc, k, d['members'][i][field][:40])
print('STAFF-JSON-OK')
"
```

Expected: `STAFF-JSON-OK`.

Then confirm the diff removed only what it should — no accidental reflow of unrelated content:

```bash
git diff --stat content/en/staff.json content/ms/staff.json
```

Expected: both files show roughly equal insert/delete counts dominated by the two removed member blocks and the `_placeholder` keys. If the diff shows every line changed, the indentation style did not match — stop and report.

- [ ] **Step 4: Rewrite `_meta._note` in both locales**

The current EN note claims "9 staff members", places Farwizah at `members[7]` and Nur Ain at `members[8]`, and says "six other practitioners still carry low-res interim headshots". All four facts are now wrong.

```bash
python3 - <<'PY'
NEW_EN = ("7 staff members. Robin (members[2]) and Farwizah (members[6]) joined 2026-08-09; their copy is "
          "client-supplied and their headshots are real client-submitted files in assets/img/staff/ "
          "(photoInterim: false — excluded from the pre-launch photo swap). The five other practitioners still "
          "carry low-res interim headshots extracted from the company-profile PDF (2026-05-24), pending a proper "
          "shoot + consent. Ms Tengku Sarah Nabilah and Mrs Nur Ain Nabila were removed 2026-08-21 (client "
          "instruction); every remaining member has a photo, so no card renders the initials tile. greeting "
          "carries the real name; personalLine and several bios are still placeholder pending source.")

import json, collections
for loc, note in (("en", NEW_EN), ("ms", NEW_EN)):
    path = f"content/{loc}/staff.json"
    d = json.load(open(path, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
    d["_meta"]["_note"] = note
    json.dump(d, open(path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    open(path, "a", encoding="utf-8").write("\n")
    print("note updated:", path)
PY
```

Expected: two `note updated: …` lines. (`_meta` is stripped from the parity check, so the same English note in both files is fine and matches how the file already worked.)

- [ ] **Step 5: Run the gates**

```bash
bin/check-i18n-parity.rb && ruby bin/check-contact-channels.rb && echo GATES-GREEN
```

Expected: `GATES-GREEN`. **If parity fails here, the `_placeholder` maps diverged** — re-run the Step 3 verification on each locale and compare the two key lists directly.

- [ ] **Step 6: Commit**

```bash
git add content/en/staff.json content/ms/staff.json
git commit -m "content(staff): remove Tengku Sarah Nabilah and Nur Ain Nabila from the roster"
```

---

## Task 4: Update the HTML static fallbacks and drop the orphaned headshot

`staff.html` and `index.html` each carry a hand-maintained SEO static fallback that mirrors `staff.json`. The runtime JS replaces it from data, so **the fallback is the only markup that needs editing** — do not touch the render functions.

**Files:**
- Modify: `staff.html` (delete two `<article class="staff-card">` blocks from the fallback)
- Modify: `index.html` (the `person-row--more` footer row in the fallback)
- Delete: `assets/img/staff-pdf/ms-tengku-sarah-nabilah.jpg`

- [ ] **Step 1: Delete the two `<article>` blocks from `staff.html`**

Delete by id, not by line number — the first deletion shifts the lines for the second.

```bash
python3 - <<'PY'
import re
path = "staff.html"
s = open(path, encoding="utf-8").read()
for sid in ("ms-tengku-sarah-nabilah", "mrs-nur-ain-nabila"):
    pat = re.compile(r'\n    <article class="staff-card" id="' + re.escape(sid) + r'">.*?\n    </article>', re.S)
    s, n = pat.subn("", s)
    assert n == 1, f"expected exactly 1 article for {sid}, removed {n}"
    print("removed", sid)
open(path, "w", encoding="utf-8").write(s)
PY
```

Expected: two `removed …` lines.

- [ ] **Step 2: Verify `staff.html` now has exactly 7 cards and no dangling references**

```bash
grep -c '<article class="staff-card"' staff.html
grep -n 'sarah-nabilah\|nur-ain\|Nur Ain\|Sarah' staff.html
```

Expected: `7` from the first command, and **no output** from the second.

- [ ] **Step 3: Update the `index.html` fallback footer row**

Featured members are Norizan, Robin and Norizzati (from `content/en/home.json` `staffFeatured`). The remaining roster is Nasirah, Emalin, Syahira, Farwizah — so the count becomes 4, and the decorative stack (`rest.slice(0, 3)`, two-letter initials) becomes `NB · ME · MS`.

```bash
python3 - <<'PY'
path = "index.html"
s = open(path, encoding="utf-8").read()
EDITS = [
  ('<span class="person-stack-av person-stack-av--2">MT</span><span class="person-stack-av person-stack-av--3">ME</span>',
   '<span class="person-stack-av person-stack-av--2">ME</span><span class="person-stack-av person-stack-av--3">MS</span>'),
  ("…and 6 more of us who'll say hello.",
   "…and 4 more of us who'll say hello."),
]
for old, new in EDITS:
    assert s.count(old) == 1, f"expected exactly 1 match for {old[:50]!r}, found {s.count(old)}"
    s = s.replace(old, new)
open(path, "w", encoding="utf-8").write(s)
print("index.html fallback updated")
PY
```

Expected: `index.html fallback updated`.

Sanity-check the result:

```bash
grep -n 'person-stack-av\|more of us' index.html
```

Expected: the stack line reads `NB`, `ME`, `MS` in that order, and the copy reads "…and 4 more of us who'll say hello."

- [ ] **Step 4: Delete the orphaned headshot**

Nur Ain had `"photo": null`, so there is no file for her.

```bash
grep -rn "ms-tengku-sarah-nabilah.jpg" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs
git rm assets/img/staff-pdf/ms-tengku-sarah-nabilah.jpg
ls -1 assets/img/staff-pdf/ | wc -l
```

Expected: the `grep` returns **no output** (nothing still references the file), then `git rm` succeeds, then `5`.

- [ ] **Step 5: Look at the pages**

```bash
bin/server &
sleep 2
curl -s http://localhost:8080/staff.html | grep -c '<article class="staff-card"'
curl -s http://localhost:8080/index.html | grep -o 'and 4 more of us'
```

Expected: `7`, then `and 4 more of us`.

Then open `http://localhost:8080/staff.html` and `http://localhost:8080/` in a browser and confirm: the staff grid shows 7 cards with no empty slot or broken image, and the home "people" band shows 3 rows plus "…and 4 more of us who'll say hello." Kill the server when done (`kill %1`).

- [ ] **Step 6: Commit**

```bash
git add staff.html index.html assets/img/staff-pdf/ms-tengku-sarah-nabilah.jpg
git commit -m "staff: drop the two departed members from the static fallbacks"
```

---

## Task 5: Sync the docs and record the deferred photo swaps

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `docs/HANDOVER.md`

- [ ] **Step 1: Fix the stale counts and named references**

Line numbers are as verified on 2026-08-21; the replacements are keyed on text, so they survive small drift.

```bash
python3 - <<'PY'
EDITS = [
  ("CLAUDE.md",
   "Nur Ain Nabila (Administrator) has `\"photo\": null` and renders an initials tile — that is intentional, not a missing file.\n\n",
   ""),
  ("CLAUDE.md",
   "6 **low-res interim headshots**",
   "5 **low-res interim headshots**"),
  ("README.md",
   "5 staff bios + all 9 staff personal lines",
   "2 staff bios + 5 staff personal lines"),
  ("README.md",
   "holds 8 low-res headshots",
   "holds 5 low-res headshots"),
  ("README.md",
   " Nur Ain Nabila (Administrator) has **no** PDF photo — her card still shows the initials `[REAL PHOTO REQUIRED]` placeholder.",
   ""),
  ("docs/HANDOVER.md",
   "; **Nur Ain has no photo** (still an initials `[REAL PHOTO REQUIRED]` placeholder)",
   ""),
]
for path, old, new in EDITS:
    s = open(path, encoding="utf-8").read()
    assert s.count(old) == 1, f"expected exactly 1 match for {old[:50]!r} in {path}, found {s.count(old)}"
    open(path, "w", encoding="utf-8").write(s.replace(old, new))
    print("patched", path, "|", (old[:45] or "(deletion)"))
PY
```

Expected: six `patched …` lines. If any assertion fires, report which one — the surrounding wording may have drifted, and the right fix is to read the line and adapt, not to loosen the match.

Note on the README numbers: **both were already stale before this change.** `content/en/staff.json`
holds 4 lorem bios (Sarah, Emalin, Syahira, Nur Ain) — not 5 — and 7 lorem personal lines, not 9
(Robin and Farwizah have real ones). Removing Sarah and Nur Ain leaves **2** lorem bios and **5**
lorem personal lines. Those are the corrected figures; do not "restore" the old ones.

**Do not touch** `docs/HANDOVER.md:150` or `:257`, `docs/copy-export-2026-08-13.tsv`, or any dated file under `docs/superpowers/{specs,plans}/`. Those are historical records of what was true at the time; rewriting them is wrong.

- [ ] **Step 2: Add the handover entry for this change and the deferred photo swaps**

Read `docs/HANDOVER.md` first and match its house style. Add the block below as a new dated section
near the top (the file is reverse-chronological — the most recent pass leads). The OPEN photo-swap
bullets also belong conceptually with the existing "### Deferred flags (client-facing, from this
pass)" list further down; keep them in the new section rather than splitting them, and cross-reference
if the file's convention calls for it.

```markdown
### 2026-08-21 — Screening/Assessment copy refresh + roster trimmed to 7

Client corrections from co-director Nasirah (WhatsApp, 2026-08-21). Screening `whatItIs` gained the
expanded OT scope (motor development, ADL/iADLs, school readiness) and an explicit note that the
package excludes SLP screening. Assessment `whatItIs` now describes the 4th Learning component
(proficiency + early literacy, for children nearing or at schooling age) and both it and
`faqs[0].a` qualify the 1–2 hour duration with "and readiness". Ms Tengku Sarah Nabilah and Mrs Nur
Ain Nabila were removed from the roster (9 → 7) across both locales, the `staff.html` / `index.html`
static fallbacks, and `assets/img/staff-pdf/`. Spec:
`docs/superpowers/specs/2026-08-21-content-refresh-and-staff-removal-design.md`.

Side effect worth knowing: with Nur Ain gone, **every remaining member has a photo**, so no card
renders the initials tile any more. The fallback code path in `staff.html` and `index.html` is still
correct and should stay — it just has no current consumer.

**OPEN — two anchor photos to swap.** The client supplied replacements on 2026-08-21, but only as
WhatsApp screenshots; the originals never reached the repo, so this is deferred until the real files
arrive. Both are same-filename drop-ins requiring no markup change:

- `assets/img/anchors/service-ot-room.jpg` → hand-over-hand fine-motor photo (child's hands stamping
  a caterpillar with a broccoli print; no face visible). When it lands, rewrite
  `common.media.alts.serviceArtOt` in EN and MS — it currently reads "The sensory room, with a
  platform swing, crash mat and painted underwater mural", which will no longer describe the image.
- `assets/img/anchors/contact-reception.jpg` → team group photo in front of the painted mural. When
  it lands, rewrite **both** `common.media.captions.contactReception` ("Say hello at reception.") and
  `common.media.alts.contactReception` ("Three team members at the Urbane Ethos reception counter")
  in EN and MS. `about-team.jpg` on about.html stays as-is — client decision, contact page only.

Both current images are going partly on photo-governance grounds (see
`docs/superpowers/specs/2026-08-09-staff-refresh-and-photo-integration-design.md` § 2.4): the
sensory-room shot has identifiable faces, and the reception shot has paperwork on the counter. Audit
the replacements against the same rule before wiring them in.
```

- [ ] **Step 3: Full verification sweep**

```bash
bin/check-i18n-parity.rb && ruby bin/check-contact-channels.rb && echo GATES-GREEN
grep -rn "sarah-nabilah\|nur-ain\|Nur Ain\|Tengku Sarah" . --exclude-dir=node_modules --exclude-dir=.git
```

Expected: `GATES-GREEN`, and the `grep` returns hits **only** in dated historical files: `docs/HANDOVER.md` (the 2026-08-21 entry you just wrote, plus the historical lines 150/257), `docs/copy-export-2026-08-13.tsv`, and files under `docs/superpowers/{specs,plans}/`. **No hits in any `.html`, `.json`, or `.js` file, and none in `CLAUDE.md` or `README.md`.**

Also confirm the canggih import counts are untouched (nothing in this change should have moved a script tag):

```bash
for m in nav icons page-load cursor i18n consent a11y chatbot footer-hours parallax; do printf "%-14s" $m; \
  grep -l "assets/js/$m.js" index.html about.html staff.html services.html blog.html \
  contact.html analytics.html privacy.html careers.html post-year-end-promo.html | wc -l; done
```

Expected: `nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 10 · consent 10 · a11y 10 · chatbot 8 · footer-hours 10 · parallax 3`.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md docs/HANDOVER.md
git commit -m "docs: sync staff counts and record the deferred anchor-photo swaps"
```

---

## Done criteria

- `bin/check-i18n-parity.rb` and `ruby bin/check-contact-channels.rb` both exit 0, in that order.
- `services.html` renders the new Screening and Assessment copy in both accordions.
- `staff.html` shows 7 cards; `index.html` shows 3 featured rows plus "…and 4 more of us".
- No `.html` / `.json` / `.js` file, and neither `CLAUDE.md` nor `README.md`, mentions the two removed members.
- `docs/HANDOVER.md` carries the 2026-08-21 entry including the two OPEN photo swaps.

No axe-core re-audit is needed: this change removes two structurally identical cards and substitutes text. It adds no new markup patterns.
