# Bilingual Copy TSV Export — Design

**Date:** 2026-08-13
**Status:** Approved, not yet implemented
**Deliverable:** `docs/copy-export-2026-08-13.tsv` (one-off artifact, no committed generator)

## Purpose

One spreadsheet serving two readers at once:

1. **BM translation review** — a human reviewer (and, for `privacy`, legal) checks the machine-generated Bahasa Malaysia against the English side by side, with the glossary terms and draft/placeholder flags visible.
2. **Client copy sign-off** — the client reads all site copy in page order and approves or edits it.

These two needs share a sheet because they share a row set. The reviewer filters on `translatable` and `ms_status`; the client reads the first seven columns in document order and ignores the rest.

## Scope

**In:**

- `content/en/*.json` × `content/ms/*.json` — 9 mirrored namespaces, 572 EN leaf strings, BM mirror guaranteed by the parity gate.
- `content/blog.json` — 366 strings, EN-only, parity-exempt.
- `content/careers.json` — 28 strings, EN-only, parity-exempt.

**Out:**

- `content/blog/posts/*.md` — the 38 long-form article bodies. Single-language per source and not part of the bilingual review.
- Generated `post-*.html`. Their card-level copy is already covered via `blog.json`.
- `design/directions/v{1,2,3}-*` internal comparison demos.
- Hard-coded copy in the HTML pages. Not a TSV source — see § "Hard-coded copy audit".

Expected output: **~966 rows** plus a header.

## Row granularity

One row per leaf string. Array members get indexed paths (`home.services.items[2].blurb`) so every string is individually addressable and editable. No section-level aggregation and no header rows — the file stays a clean rectangle that can be parsed back.

## Attribution approach

Only **121 of 572** keys are statically bound to a page via `data-i18n`. The remaining 451 render through JS (staff cards, service items, chatbot flow), so a purely HTML-driven walk would cover 21% of the sheet.

The export therefore uses a **hybrid**:

1. **Structural spine** — namespace and path position attribute every key. Guarantees 100% coverage.
2. **HTML overlay** — for the 121 `data-i18n`-bound keys, the real page and the enclosing `<section>`'s image facts override the structural guess.
3. **Hand-map** — the JS list renderers whose target section is unambiguous (staff grid, services grid, blog cards, chatbot panel) inherit their section's HTML facts.

The `render` column records which path produced each row, so a reader can tell a verified attribution from a structural one. Note that `render` describes *how a string reaches the screen* and is independent of `page`: `common.nav.about` is `page=global`, `render=static`, because it is bound by `data-i18n` on every page.

## Column schema

20 columns. The first seven are the human-readable payload; the rest is filterable metadata.

### Location (1–5)

| # | Column | Values |
|---|---|---|
| 1 | `page` | `index` `about` `staff` `services` `blog` `contact` `privacy` `careers` `global` |
| 2 | `section` | First path segment under the namespace — `hero`, `personalization`, `location`, `whatWeDo`, `testimonial`, `events`, … |
| 3 | `item` | Array-item identity: `2 · speech`, `0 · dr-norizan-rajak`. Empty for scalars. |
| 4 | `key` | Full i18n path — `home.services.items[2].blurb` |
| 5 | `field` | Leaf field name — `blurb` |

### Copy (6–7)

| # | Column | Notes |
|---|---|---|
| 6 | `en` | English source string |
| 7 | `ms` | Bahasa Malaysia string; empty for the EN-only sources |

### Classification (8–10)

| # | Column | Values |
|---|---|---|
| 8 | `content_type` | `heading` `eyebrow` `body` `list-item` `cta` `label` `option` `nav` `legal` `alt-text` `quote` `faq-q` `faq-a` `microcopy` `non-copy` |
| 9 | `translatable` | `TRUE` / `FALSE` |
| 10 | `render` | `static` (bound by `data-i18n` on at least one page) / `js` (hand-mapped JS renderer) / `unresolved` (structural attribution only) |

### Translation review (11–15)

| # | Column | Notes |
|---|---|---|
| 11 | `ms_status` | `translated` · `identical` · `missing` · `en-only` |
| 12 | `en_chars` | Character count |
| 13 | `ms_chars` | Character count; empty when `ms` is empty |
| 14 | `len_ratio` | `ms_chars / en_chars`, 2dp. BM typically runs 15–20% longer; this catches strings that will break a button or a nav item. |
| 15 | `glossary_hits` | EN glossary terms from `content/glossary.md` found in the EN string, semicolon-joined. Lets a reviewer verify fixed-term consistency. |

### Flags (16–20)

| # | Column | Notes |
|---|---|---|
| 16 | `draft` | `TRUE` if the key is listed in the namespace's `_draft` map (or `_draft: true` for the whole file) |
| 17 | `placeholder` | `TRUE` if listed in `_placeholder` **or** the value contains the `⟪PLACEHOLDER⟫` sentinel |
| 18 | `correction` | Reviewer note text from `_correction`, if any |
| 19 | `has_image` | `TRUE` / `FALSE` |
| 20 | `image_ref` | Resolved path, `yt:<data-yt-id>`, or `map-embed`. Empty when `has_image` is FALSE. |

## Derivation rules

### `page`

Namespace map:

| Source | `page` |
|---|---|
| `home` | `index` |
| `about` | `about` |
| `staff` | `staff` |
| `services` | `services` |
| `contact` | `contact` |
| `privacy` | `privacy` |
| `blog.json` | `blog` |
| `careers.json` | `careers` |
| `common`, `consent`, `chatbot` | `global` |

Special case: `home.staffFeatured[]` lives in `home.json` but is staff copy rendered on the home page. It stays `page=index`, `section=staffFeatured`.

Where an HTML overlay contradicts the namespace map, the overlay wins and `render` reads `static`.

### `section`

First path segment beneath the namespace, preserved in JSON document order.

### `content_type`

Namespace override is evaluated first, then the leaf-name rule.

**Overrides:**

- Everything under `privacy` → `legal`
- `common.nav.*` → `nav`
- `common.media.alts.*` → `alt-text`

**Leaf-name rule:**

| Leaf name | Type |
|---|---|
| `title`, `heading` | `heading` |
| `eyebrow` | `eyebrow` |
| `body`, `blurb`, `bio`, `excerpt`, `say`, `whatItIs`, `whoItsFor`, `whatToExpect`, `intro`, `subtitle`, `subheading`, `description` | `body` |
| members of string arrays (`points`, `hours`, `itemsList`, `tags`) | `list-item` |
| `cta`, `primaryCta`, `secondaryCta`, `submit`, `skip`, `viewAll`, `more`, `load` | `cta` |
| `label` outside `options[]` (incl. `ageLabel`, `concernLabel`, `stageLabel`, `mapLabel`) | `label` |
| `options[].label` | `option` |
| `quote`, `attribution` | `quote` |
| `q` | `faq-q` |
| `a` | `faq-a` |
| `category` (a displayed filter label on `blog.html`) | `label` |
| `id`, `key`, `value`, `next`, `input`, `icon`, `localUrl`, `thumbnail`, `photo`, `src`, `date`, `slug` | `non-copy` |
| anything unmatched | `microcopy` |

`tags[]` members are treated as `list-item` rather than `non-copy`. They read as taxonomy, but they occur only in `blog.json`, which is EN-only — so they land as `ms_status=en-only` and never reach a translator regardless.

`translatable` is `FALSE` exactly when `content_type` is `non-copy`, and `TRUE` otherwise.

### `ms_status`

| Condition | Value |
|---|---|
| Source is `blog.json` or `careers.json` | `en-only` |
| Key absent from the MS mirror | `missing` |
| MS value equals EN value | `identical` |
| Otherwise | `translated` |

`identical` is a review signal **only** on rows where `translatable=TRUE`. On `non-copy` rows it is expected and carries no meaning — the ~130 flow-control fields (`next`, `input`, `value`, slugs) are identical by design. Current data: 383 `translated`, 189 `identical`, 0 `missing` across the mirrored namespaces.

### Marker keys: exclusion and flag lookup

`_meta`, `_draft`, `_correction` and `_placeholder` are **excluded from row generation** at every level of the walk — they are flag sources for columns 16–18, never rows of their own. (This differs from `bin/check-i18n-parity.rb`, which deliberately walks `_placeholder` so that the MS mirror must reproduce it key-identically. That is a parity concern, not a copy-inventory one.)

Two properties of these markers matter, and getting either wrong yields a flag column that is silently all-`FALSE`:

1. **They use dot-index notation, not bracket notation.** `_placeholder` reads `"items.2.faqs"` and `"members.0.personalLine"`, whereas the `key` column reads `services.items[2].faqs` and `staff.members[0].personalLine`. The lookup must normalise one form to the other before comparing. Normalise the row key by rewriting `[N]` to `.N`.
2. **They may name a subtree, not a leaf.** `services._placeholder` contains `"items.2.faqs"`, and `items[2].faqs` is an array of `{q, a}` objects. So matching is **prefix matching on path segments**, not string equality: a row is flagged when its normalised key equals the marker path or begins with the marker path followed by `.`. Segment-boundary matching matters — a naive `startswith` would let a marker `items.2` wrongly flag `items.20`.

Marker paths are namespace-relative (`items.2.faqs`), while `key` is namespace-qualified (`services.items[2].faqs`). Strip the namespace before comparing.

Observed shape is always a map of `{"dot.path": true}`. `CLAUDE.md` also documents a whole-file `_draft: true` scalar; no file currently uses it, but the exporter should treat that form as flagging every row in the namespace rather than crashing on the type mismatch.

`_placeholder` is empty (`{}`) in `chatbot` and `privacy` — valid and inert.

The `placeholder` column is `TRUE` on a marker-map hit **or** when the value literally contains `⟪PLACEHOLDER⟫`. Both are checked because the two can drift: the sentinel is the visible truth, the map is the index.

### `has_image` / `image_ref`

Three sources, evaluated in order; first hit wins.

1. **Sibling image field in the same object** — `staff.members[i].photo`, `blog.posts[i].thumbnail`, `careers.culture.items[i].src`. A `null` value yields `FALSE`, which is what makes Nur Ain Nabila's intentional initials-tile read correctly rather than as a missing file.
2. **Enclosing HTML section**, for `data-i18n`-bound keys — `TRUE` when the containing `<section>` holds an `<img>`, `.anchor-photo`, `.yt-embed`, or `[data-map-embed]`. `image_ref` is the `src`, or `yt:<data-yt-id>`, or `map-embed`.
3. **Hand-mapped JS renderers** inherit their section's HTML facts from (2).

Otherwise `FALSE` with an empty `image_ref`.

## Non-copy rows are included

The ~130 `translatable=FALSE` rows stay in the sheet rather than being dropped. Two reasons: a spreadsheet filter hides them in one click, and keeping them makes the export a complete accounting of `content/`, which is what gives the hard-coded-copy audit a trustworthy denominator.

## Ordering

**Document order, not alphabetical.** Alphabetical ordering would scatter a page's copy and make sign-off unreadable.

1. `page` in site nav order: `index`, `about`, `staff`, `services`, `blog`, `contact`, `careers`, `privacy`, `global`
2. `section` in the order it appears in its JSON file — which tracks the page's top-to-bottom render order
3. Array index ascending
4. Fields in authored order within each object

## File format

- **Tab-separated**, one header row, `.tsv`.
- **UTF-8 with BOM.** The copy carries `–`, `·`, `’` and the `⟪PLACEHOLDER⟫` sentinel; Excel mojibakes these without a BOM. Sheets and Numbers accept either.
- **Escaping is a guard, not a need.** No value in `content/` currently contains a tab or a newline (verified). The exporter still replaces tabs with a single space, encodes newlines as a literal `\n`, and asserts zero raw tabs/newlines survive in any field before writing. A silent tab would shift every column right of it.
- No quoting. With tabs and newlines eliminated, quoting would only add escaping ambiguity.

## Verification

Before the file is considered done:

1. Row count equals the number of leaf strings across the three sources (~966), with no key appearing twice.
2. Every key present in `content/en/*.json` appears in the sheet — set-difference against the parity script's own key walk, which is the existing source of truth for what a key is.
3. Column count is exactly 20 on every line.
4. No raw tab or newline inside any field.
5. Spot-check the round trip: reopen the TSV, confirm `home.hero.subtitle`, a `staff.members[]` row, a `chatbot.flow` row and a `blog.posts[]` row each carry the right page, section, flags and image state.
6. **Flag columns are non-empty.** `draft` must be `TRUE` on at least the known `common`/`consent`/`contact`/`home` draft paths, and `placeholder` on at least `home.events.blurb`, `services.items[2].faqs.*`, `services.items[4].whoItsFor`, `staff.members[0].personalLine` and the two `careers.json` paths. An all-`FALSE` flag column means the dot-index normalisation or the prefix match is broken, not that the content is clean — this is the failure mode most likely to pass unnoticed.
7. Cross-check the sentinel against the map: the count of rows whose value contains `⟪PLACEHOLDER⟫` should reconcile with the count flagged by `_placeholder`. A discrepancy is a real content drift worth reporting, not an exporter bug to paper over.

## Hard-coded copy audit

Separate from the TSV. Per the standing rule that no translatable copy may be hard-coded in a page, the export run also scans the 10 production pages for visible text that is **not** behind a `data-i18n` key.

Findings are **reported in the reply, not written as TSV rows** — mixing un-keyed strings into a sign-off sheet would imply they are translatable content when they are in fact a defect to fix in the markup. Any real leakage becomes follow-up work: move the string into `content/{en,ms}/` and bind it.

Expected false positives to filter out: `<script>`/`<style>` contents, HTML comments, the `<noscript>` fallback, and copy inside the JS template literals that render the staff/services/blog cards — those are already i18n-driven at runtime.

## Out of scope

- Any committed generator under `bin/`. This is a one-off artifact by decision; if the sheet is needed again after content changes, the export is re-run from this spec.
- Changing `bin/check-i18n-parity.rb` or any CI gate.
- Acting on the hard-coded-copy findings. Reporting them is in scope; fixing them is separate work.
- Translating, editing, or correcting any copy. This export reads `content/`; it does not write to it.
