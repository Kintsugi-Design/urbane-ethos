# Bilingual Copy TSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `docs/copy-export-2026-08-13.tsv` — a 20-column, ~966-row key-level inventory of every EN and BM string in `content/`, attributed to page and section, for simultaneous BM translation review and client copy sign-off.

**Architecture:** A single throwaway Ruby script builds the sheet in one pass: walk the JSON sources into leaf rows, classify each row, pair it with its BM mirror, overlay HTML-derived page/image facts onto the statically bound keys, sort into document order, and write TSV. A minitest suite drives each stage. The script is developed under TDD but **is not committed** — per the spec, only the TSV ships.

**Tech Stack:** Ruby 3.4 (stdlib `json` only, no gems), minitest for tests. Matches the `bin/build-blog.rb` + `test/blog-generator/test_generator.rb` pattern already in the repo: a `module_function` module, `require_relative`-able, main guarded by `if __FILE__ == $PROGRAM_NAME`.

---

## Working locations

The exporter and its tests are scratch artifacts. The user chose "one-off TSV only", and the spec puts a committed generator under `bin/` explicitly out of scope.

| Role | Path |
|---|---|
| Exporter | `$SCRATCH/copy-export.rb` |
| Tests | `$SCRATCH/test_copy_export.rb` |
| **Committed output** | `docs/copy-export-2026-08-13.tsv` |

Where `$SCRATCH` is:

```
/private/tmp/claude-501/-Users-deepsight-code-urbane-ethos/701b668c-ab3b-499f-a672-767097b61f5f/scratchpad
```

Set it once per shell:

```bash
export SCRATCH=/private/tmp/claude-501/-Users-deepsight-code-urbane-ethos/701b668c-ab3b-499f-a672-767097b61f5f/scratchpad
export UE_ROOT=/Users/deepsight/code/urbane-ethos
```

The script reads the repo through `ENV["UE_ROOT"]` so tests can run from anywhere. Only Task 10 touches git, and it commits exactly one file.

## Spec deviation resolved in this plan

The spec says "where an HTML overlay contradicts the namespace map, the overlay wins." Measured against the real pages, **104 keys bind to exactly one page but 21 bind to two or more** (`common.cta.bookSession`, `common.footer.*`, `common.a11y.openChatbot`, …). "The overlay wins" is undefined for those.

**Rule adopted:** the overlay reassigns `page` only when a key is bound on exactly one page. A key bound on 2+ pages keeps its namespace-map value (`global`). `render=static` and the image facts still apply in both cases. This preserves the spec's intent — attribute a string to the page it actually appears on — without inventing a false single home for genuinely shared chrome.

**Consequence for the `page` enum.** The spec dropped `promo-post` from the enum on the grounds that article bodies are out of scope. That is right for the bodies, but exactly one key — `common.cta.backToBlog` — is bound uniquely on `post-year-end-promo.html`, so the overlay attributes it there. The enum therefore needs a tenth value, `post-year-end-promo`, ordered directly after `blog`. `analytics.html` needs no value: it carries zero `data-i18n` attributes.

---

### Task 1: Leaf walker with marker exclusion

Produces the row spine: every leaf string in a JSON tree, keyed by full path, with `_meta` / `_draft` / `_correction` / `_placeholder` subtrees skipped entirely.

**Files:**
- Create: `$SCRATCH/copy-export.rb`
- Create: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

```ruby
# $SCRATCH/test_copy_export.rb
require "minitest/autorun"
require_relative "copy-export"

class TestWalker < Minitest::Test
  def test_walks_nested_strings_with_dotted_paths
    tree = { "hero" => { "title" => "Hi", "eyebrow" => "Yo" } }
    assert_equal([["hero.title", "Hi"], ["hero.eyebrow", "Yo"]], CopyExport.walk(tree))
  end

  def test_indexes_array_members_with_brackets
    tree = { "items" => [{ "title" => "A" }, { "title" => "B" }] }
    assert_equal([["items[0].title", "A"], ["items[1].title", "B"]], CopyExport.walk(tree))
  end

  def test_indexes_string_arrays
    tree = { "points" => %w[one two] }
    assert_equal([["points[0]", "one"], ["points[1]", "two"]], CopyExport.walk(tree))
  end

  def test_skips_marker_subtrees
    tree = {
      "_meta" => { "scrapedAt" => "2026-06-08" },
      "_draft" => { "hero.title" => true },
      "_correction" => { "hero.title" => "note" },
      "_placeholder" => { "hero.title" => true },
      "hero" => { "title" => "Hi" }
    }
    assert_equal([["hero.title", "Hi"]], CopyExport.walk(tree))
  end

  def test_skips_non_string_leaves
    tree = { "photo" => nil, "featured" => true, "count" => 3, "name" => "Ain" }
    assert_equal([["name", "Ain"]], CopyExport.walk(tree))
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `cannot load such file -- copy-export`

- [ ] **Step 3: Write the minimal implementation**

```ruby
# $SCRATCH/copy-export.rb
#!/usr/bin/env ruby
# frozen_string_literal: true

# One-off bilingual copy inventory.
# Spec: docs/superpowers/specs/2026-08-13-bilingual-copy-tsv-export-design.md
# Not committed. Output docs/copy-export-2026-08-13.tsv is the deliverable.

require "json"

module CopyExport
  ROOT    = ENV.fetch("UE_ROOT", File.expand_path("..", __dir__))
  MARKERS = %w[_meta _draft _correction _placeholder].freeze

  module_function

  # Depth-first leaf walk. Hash insertion order is preserved by Ruby, so the
  # emission order IS the JSON document order the sheet sorts on.
  def walk(obj, prefix = "")
    case obj
    when Hash
      obj.flat_map do |k, v|
        next [] if MARKERS.include?(k)
        walk(v, prefix.empty? ? k.to_s : "#{prefix}.#{k}")
      end
    when Array
      obj.each_with_index.flat_map { |v, i| walk(v, "#{prefix}[#{i}]") }
    when String
      [[prefix, obj]]
    else
      [] # nil / bool / numeric are not copy
    end
  end
end
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `5 runs, 8 assertions, 0 failures, 0 errors`

- [ ] **Step 5: Sanity-check the real corpus**

```bash
cd "$SCRATCH" && ruby -r./copy-export -e '
  total = 0
  Dir[File.join(CopyExport::ROOT, "content/en/*.json")].each do |f|
    total += CopyExport.walk(JSON.parse(File.read(f))).size
  end
  %w[blog careers].each do |n|
    total += CopyExport.walk(JSON.parse(File.read(File.join(CopyExport::ROOT, "content/#{n}.json")))).size
  end
  puts "leaf strings: #{total}"'
```

Expected: `leaf strings: 966`. Any other number means the marker exclusion or the array handling is wrong — stop and fix before continuing.

---

### Task 2: Marker flag lookup

The highest-risk component. `_draft` and `_placeholder` index entries as **namespace-relative dot-index** paths (`items.2.faqs`, `members.0.personalLine`) while row keys are **namespace-qualified bracket** paths (`services.items[2].faqs.q`). And `items.2.faqs` names a subtree, not a leaf. Getting either wrong yields a flag column that is silently all-`FALSE`.

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestFlagLookup < Minitest::Test
  def test_normalises_brackets_and_strips_namespace
    assert_equal "items.2.faqs.q", CopyExport.rel_path("services.items[2].faqs[0].q").sub(".0.", ".")
    assert_equal "hero.subtitle",  CopyExport.rel_path("careers.hero.subtitle")
    assert_equal "members.0.personalLine", CopyExport.rel_path("staff.members[0].personalLine")
  end

  def test_exact_match
    assert CopyExport.flagged?({ "events.blurb" => true }, "events.blurb")
  end

  def test_subtree_prefix_match
    map = { "items.2.faqs" => true }
    assert CopyExport.flagged?(map, "items.2.faqs.0.q")
    assert CopyExport.flagged?(map, "items.2.faqs.0.a")
  end

  def test_respects_segment_boundary
    # "items.2" must not flag "items.20"
    refute CopyExport.flagged?({ "items.2" => true }, "items.20.title")
  end

  def test_ignores_false_and_missing
    refute CopyExport.flagged?({ "a.b" => false }, "a.b")
    refute CopyExport.flagged?({}, "a.b")
    refute CopyExport.flagged?(nil, "a.b")
  end

  def test_whole_file_draft_scalar
    # CLAUDE.md documents `_draft: true`; no file uses it, but it must not crash.
    assert CopyExport.flagged?(true, "anything.at.all")
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'rel_path' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

Add inside `module CopyExport`, after `walk`:

```ruby
  # "services.items[2].faqs[0].q" -> "items.2.faqs.0.q"
  # Marker maps are namespace-relative and use dot-index, not brackets.
  def rel_path(key)
    key.gsub(/\[(\d+)\]/, '.\1').sub(/\A[^.]+\./, "")
  end

  # Markers may name a subtree, so match on segment boundaries, never bare
  # string prefix: "items.2" must not swallow "items.20".
  def flagged?(marker, rel)
    return false if marker.nil?
    return true  if marker == true
    return false unless marker.is_a?(Hash)

    marker.any? do |path, on|
      on && (rel == path || rel.start_with?("#{path}."))
    end
  end
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `11 runs, ~18 assertions, 0 failures, 0 errors`

- [ ] **Step 5: Verify against real markers**

```bash
cd "$SCRATCH" && ruby -r./copy-export -e '
  d = JSON.parse(File.read(File.join(CopyExport::ROOT, "content/en/services.json")))
  hits = CopyExport.walk(d).select { |k, _| CopyExport.flagged?(d["_placeholder"], CopyExport.rel_path("services.#{k}")) }
  puts "services placeholder rows: #{hits.size}"
  hits.first(3).each { |k, v| puts "  #{k} = #{v[0, 40]}" }'
```

Expected: 4 or more rows, every value beginning with `⟪PLACEHOLDER⟫`. **Zero rows means the normalisation is broken** — that is the failure this task exists to prevent.

- [ ] **Step 6: Commit**

Nothing to commit — scratch files are not tracked. Proceed.

---

### Task 3: Classification — `content_type` and `translatable`

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestClassify < Minitest::Test
  def t(key, ns) = CopyExport.content_type(key, ns)

  def test_namespace_overrides_win_first
    assert_equal "legal",    t("privacy.sections[0].body", "privacy")
    assert_equal "nav",      t("common.nav.about", "common")
    assert_equal "alt-text", t("common.media.alts.homeHero", "common")
  end

  def test_string_array_members_are_list_items
    assert_equal "list-item", t("home.whatWeDo.points[1]", "home")
    assert_equal "list-item", t("home.location.hours[0]", "home")
    assert_equal "list-item", t("blog.posts[0].tags[1]", "blog")
  end

  def test_options_label_is_distinct_from_plain_label
    assert_equal "option", t("home.personalization.ageOptions[0].label", "home")
    assert_equal "label",  t("home.personalization.ageLabel", "home")
    assert_equal "label",  t("blog.posts[0].category", "blog")
  end

  def test_leaf_name_rules
    assert_equal "heading", t("home.services.heading", "home")
    assert_equal "heading", t("home.hero.title", "home")
    assert_equal "eyebrow", t("home.hero.eyebrow", "home")
    assert_equal "body",    t("home.services.items[2].blurb", "home")
    assert_equal "body",    t("home.hero.subtitle", "home")
    assert_equal "cta",     t("home.hero.primaryCta", "home")
    assert_equal "quote",   t("home.testimonial.attribution", "home")
    assert_equal "faq-q",   t("services.items[0].faqs[0].q", "services")
    assert_equal "faq-a",   t("services.items[0].faqs[0].a", "services")
  end

  def test_non_copy
    assert_equal "non-copy", t("chatbot.flow.start.options[0].next", "chatbot")
    assert_equal "non-copy", t("staff.members[0].photo", "staff")
    assert_equal "non-copy", t("blog.posts[0].localUrl", "blog")
  end

  def test_unmatched_falls_back_to_microcopy
    assert_equal "microcopy", t("staff.members[0].greeting", "staff")
  end

  def test_translatable_is_the_inverse_of_non_copy
    assert_equal false, CopyExport.translatable?("non-copy")
    assert_equal true,  CopyExport.translatable?("body")
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'content_type' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

Add inside `module CopyExport`:

```ruby
  NON_COPY = %w[id key value next input icon localUrl thumbnail photo src date slug].freeze
  HEADINGS = %w[title heading].freeze
  BODIES   = %w[body blurb bio excerpt say whatItIs whoItsFor whatToExpect
                intro subtitle subheading description].freeze
  CTAS     = %w[cta primaryCta secondaryCta submit skip viewAll more load].freeze
  LABELS   = %w[label ageLabel concernLabel stageLabel mapLabel category].freeze
  QUOTES   = %w[quote attribution].freeze

  def segments(key) = key.gsub(/\[(\d+)\]/, '.\1').split(".")

  def content_type(key, ns)
    segs = segments(key)

    # Namespace overrides are evaluated before any leaf-name rule.
    return "legal"    if ns == "privacy"
    return "nav"      if ns == "common" && segs[1] == "nav"
    return "alt-text" if ns == "common" && segs[1] == "media" && segs[2] == "alts"

    # A trailing numeric segment means a member of a string array.
    return "list-item" if segs.last.match?(/\A\d+\z/)

    leaf   = segs.last
    parent = segs[0..-2].reverse.find { |s| !s.match?(/\A\d+\z/) }

    return "non-copy" if NON_COPY.include?(leaf)
    return "option"   if leaf == "label" && parent == "options"
    return "heading"  if HEADINGS.include?(leaf)
    return "eyebrow"  if leaf == "eyebrow"
    return "body"     if BODIES.include?(leaf)
    return "cta"      if CTAS.include?(leaf)
    return "label"    if LABELS.include?(leaf)
    return "quote"    if QUOTES.include?(leaf)
    return "faq-q"    if leaf == "q"
    return "faq-a"    if leaf == "a"

    "microcopy"
  end

  def translatable?(content_type) = content_type != "non-copy"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~18 runs, 0 failures, 0 errors`

- [ ] **Step 5: Review the real distribution**

```bash
cd "$SCRATCH" && ruby -r./copy-export -e '
  tally = Hash.new(0)
  Dir[File.join(CopyExport::ROOT, "content/en/*.json")].sort.each do |f|
    ns = File.basename(f, ".json")
    CopyExport.walk(JSON.parse(File.read(f))).each { |k, _| tally[CopyExport.content_type("#{ns}.#{k}", ns)] += 1 }
  end
  tally.sort_by { |_, v| -v }.each { |k, v| puts format("  %-10s %d", k, v) }'
```

Expected: every type present with a plausible count, and `microcopy` **not** dominating. A large `microcopy` bucket means leaf names are being missed — inspect and extend the rule tables before continuing.

---

### Task 4: BM pairing, `ms_status`, and length metrics

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestMsStatus < Minitest::Test
  def test_status_values
    assert_equal "en-only",    CopyExport.ms_status("Hi", nil, en_only: true)
    assert_equal "missing",    CopyExport.ms_status("Hi", nil, en_only: false)
    assert_equal "identical",  CopyExport.ms_status("book", "book", en_only: false)
    assert_equal "translated", CopyExport.ms_status("Hi", "Hai", en_only: false)
  end

  def test_len_ratio
    assert_equal "1.50", CopyExport.len_ratio("abcd", "abcdef")
    assert_equal "",     CopyExport.len_ratio("abcd", nil)
    assert_equal "",     CopyExport.len_ratio("", "abc")
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'ms_status' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

```ruby
  def ms_status(en, ms, en_only:)
    return "en-only" if en_only
    return "missing" if ms.nil?
    ms == en ? "identical" : "translated"
  end

  def len_ratio(en, ms)
    return "" if ms.nil? || en.nil? || en.empty?
    format("%.2f", ms.length.to_f / en.length)
  end
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~20 runs, 0 failures, 0 errors`

- [ ] **Step 5: Confirm the corpus-wide distribution**

```bash
cd "$SCRATCH" && ruby -r./copy-export -e '
  tally = Hash.new(0)
  Dir[File.join(CopyExport::ROOT, "content/en/*.json")].sort.each do |f|
    en = CopyExport.walk(JSON.parse(File.read(f))).to_h
    ms = CopyExport.walk(JSON.parse(File.read(f.sub("/en/", "/ms/")))).to_h
    en.each { |k, v| tally[CopyExport.ms_status(v, ms[k], en_only: false)] += 1 }
  end
  p tally'
```

Expected: `{"translated"=>383, "identical"=>189}` and no `missing` — matching the parity gate, which guarantees zero missing keys.

---

### Task 5: Glossary term matching

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestGlossary < Minitest::Test
  def test_parses_en_terms_from_markdown
    md = <<~MD
      # EN → BM Glossary
      ## Service names
      - Occupational Therapy → Terapi Carakerja
      - Child / Children → Anak / Kanak-kanak
      Not a term line.
    MD
    terms = CopyExport.glossary_terms(md)
    assert_includes terms, "Occupational Therapy"
    # A slashed EN side yields each alternative separately.
    assert_includes terms, "Child"
    assert_includes terms, "Children"
    refute_includes terms, "Not a term line."
  end

  def test_matches_case_insensitively_and_joins_with_semicolons
    terms = ["Occupational Therapy", "Parent"]
    assert_equal "Occupational Therapy;Parent",
                 CopyExport.glossary_hits("occupational therapy for a Parent", terms)
    assert_equal "", CopyExport.glossary_hits("nothing here", terms)
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'glossary_terms' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

```ruby
  # content/glossary.md lists "- EN term → BM term" under ## headings.
  # A slashed EN side ("Child / Children") is two searchable alternatives.
  def glossary_terms(markdown)
    markdown.lines.filter_map { |line|
      m = line.match(/\A-\s*(.+?)\s*→/)
      next unless m
      m[1].split("/").map(&:strip).reject(&:empty?)
    }.flatten.uniq
  end

  def glossary_hits(en, terms)
    terms.select { |t| en.downcase.include?(t.downcase) }.join(";")
  end
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~22 runs, 0 failures, 0 errors`

- [ ] **Step 5: Spot-check against the real glossary**

```bash
cd "$SCRATCH" && ruby -r./copy-export -e '
  terms = CopyExport.glossary_terms(File.read(File.join(CopyExport::ROOT, "content/glossary.md")))
  puts "terms: #{terms.size}"
  home = JSON.parse(File.read(File.join(CopyExport::ROOT, "content/en/home.json")))
  puts CopyExport.glossary_hits(home["hero"]["subtitle"], terms)'
```

Expected: a non-zero term count and at least one hit on the hero subtitle (it contains "speech-language therapy" and "motor development").

---

### Task 6: HTML overlay — binding, page attribution, section image facts

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

Sections in these pages are flat — `index.html` has 10 `<section>` opens and 10 closes, no nesting — so a non-greedy regex scan is sufficient and no HTML parser gem is needed. Pages with zero `<section>` elements (`privacy.html`, `post-year-end-promo.html`) are treated as one block.

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestHtmlOverlay < Minitest::Test
  HTML = <<~H
    <section class="hero">
      <h1 data-i18n="home.hero.title">T</h1>
      <img src="./assets/img/anchors/home-hero.webp" alt="" data-i18n-attr="alt:common.media.alts.homeHero">
    </section>
    <section class="section">
      <p data-i18n="home.whatWeDo.intro">I</p>
    </section>
    <section class="section">
      <div class="yt-embed" data-yt-id="PLACEHOLDER_TOUR"></div>
      <p data-i18n="home.events.blurb">B</p>
    </section>
  H

  def test_extracts_keys_from_both_attribute_forms
    idx = CopyExport.index_html("index", HTML)
    assert idx.key?("home.hero.title")
    # data-i18n-attr carries an "alt:" prefix that must be stripped.
    assert idx.key?("common.media.alts.homeHero")
  end

  def test_image_facts_come_from_the_enclosing_section
    idx = CopyExport.index_html("index", HTML)
    assert_equal "assets/img/anchors/home-hero.webp", idx["home.hero.title"][:image_ref]
    assert_nil idx["home.whatWeDo.intro"][:image_ref]
    assert_equal "yt:PLACEHOLDER_TOUR", idx["home.events.blurb"][:image_ref]
  end

  def test_page_assigned_only_when_uniquely_bound
    merged = CopyExport.merge_indexes(
      "index" => { "a.b" => { image_ref: nil }, "shared.x" => { image_ref: nil } },
      "about" => { "shared.x" => { image_ref: nil } }
    )
    assert_equal "index", merged["a.b"][:page]
    # Bound on 2+ pages -> no page override; namespace map keeps it global.
    assert_nil merged["shared.x"][:page]
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'index_html' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

```ruby
  PAGES = %w[index about staff services blog contact analytics privacy careers
             post-year-end-promo].freeze

  # One entry per data-i18n key found on this page, carrying the image facts of
  # its enclosing <section>.
  def index_html(_page, html)
    blocks = html.scan(%r{<section\b[^>]*>(.*?)</section>}m).map(&:first)
    blocks = [html] if blocks.empty?

    blocks.each_with_object({}) do |block, acc|
      ref = section_image_ref(block)
      block.scan(/data-i18n(?:-attr)?="([^"]*)"/).flatten.each do |raw|
        raw.split(",").each do |part|
          key = part.split(":").last.to_s.strip
          next if key.empty?
          acc[key] = { image_ref: ref }
        end
      end
    end
  end

  def section_image_ref(block)
    if (m = block.match(/data-yt-id="([^"]+)"/))       then "yt:#{m[1]}"
    elsif block.include?("data-map-embed")             then "map-embed"
    elsif (m = block.match(/<img[^>]+src="\.?\/?([^"]+)"/)) then m[1]
    end
  end

  # page => {key => facts}  ~>  key => facts + :page (only if uniquely bound)
  def merge_indexes(per_page)
    owners = Hash.new { |h, k| h[k] = [] }
    per_page.each { |page, idx| idx.each_key { |k| owners[k] << page } }

    per_page.each_with_object({}) do |(page, idx), acc|
      idx.each do |key, facts|
        acc[key] ||= facts.dup
        acc[key][:page] = page if owners[key].uniq.size == 1
      end
    end
  end

  def html_index
    per_page = PAGES.to_h { |p| [p, index_html(p, File.read(File.join(ROOT, "#{p}.html")))] }
    merge_indexes(per_page)
  end
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~25 runs, 0 failures, 0 errors`

- [ ] **Step 5: Verify against the real pages**

```bash
cd "$SCRATCH" && ruby -r./copy-export -e '
  idx = CopyExport.html_index
  puts "bound keys: #{idx.size}"
  puts "with a page: #{idx.count { |_, v| v[:page] }}"
  puts "with an image: #{idx.count { |_, v| v[:image_ref] }}"
  puts idx["home.hero.title"].inspect'
```

Expected: ~125 bound keys, 104 with a page, and `home.hero.title` showing `:page=>"index"` with the `home-hero.webp` ref.

---

### Task 7: Row assembly

Joins every prior stage into the 20-column row set.

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestRows < Minitest::Test
  def rows = @rows ||= CopyExport.build_rows

  def find(key) = rows.find { |r| r[:key] == key }

  def test_row_count_matches_leaf_count
    assert_equal 966, rows.size
    assert_equal rows.size, rows.map { |r| r[:key] }.uniq.size, "duplicate keys"
  end

  def test_every_row_has_all_twenty_columns
    rows.each { |r| assert_equal CopyExport::COLUMNS.size, r.keys.size, r[:key] }
  end

  def test_a_static_home_row
    r = find("home.hero.subtitle")
    assert_equal "index", r[:page]
    assert_equal "hero",  r[:section]
    assert_equal "body",  r[:content_type]
    assert_equal "static", r[:render]
    assert_equal "translated", r[:ms_status]
    assert_equal "TRUE", r[:has_image]
  end

  def test_staff_featured_stays_on_index
    assert_equal "index", find("home.staffFeatured[0].greeting")[:page]
  end

  def test_item_identity_is_populated_for_array_members
    assert_match(/\A2 · /, find("home.services.items[2].blurb")[:item])
    assert_equal "", find("home.hero.subtitle")[:item]
  end

  def test_en_only_sources
    r = find("careers.hero.title")
    assert_equal "careers", r[:page]
    assert_equal "en-only", r[:ms_status]
    assert_equal "", r[:ms]
  end

  def test_placeholder_and_draft_flags_are_populated
    assert_equal "TRUE", find("home.events.blurb")[:placeholder]
    assert_equal "TRUE", find("staff.members[0].personalLine")[:placeholder]
    assert_equal "TRUE", find("services.items[4].whoItsFor")[:placeholder]
    assert_equal "TRUE", find("home.personalization.heading")[:draft]
  end

  def test_null_photo_yields_no_image
    ain = rows.find { |r| r[:key].start_with?("staff.members") && r[:en].include?("Nur Ain") }
    assert_equal "FALSE", ain[:has_image]
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'build_rows' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

```ruby
  COLUMNS = %i[page section item key field en ms content_type translatable render
               ms_status en_chars ms_chars len_ratio glossary_hits
               draft placeholder correction has_image image_ref].freeze

  NS_PAGE = {
    "home" => "index", "about" => "about", "staff" => "staff",
    "services" => "services", "contact" => "contact", "privacy" => "privacy",
    "blog" => "blog", "careers" => "careers",
    "common" => "global", "consent" => "global", "chatbot" => "global"
  }.freeze

  # Includes post-year-end-promo: `common.cta.backToBlog` is bound uniquely on
  # that page, so the overlay legitimately attributes it there. Omitting it
  # would drop the row to the 99 bucket and sort it after `global`.
  PAGE_ORDER = %w[index about staff services blog post-year-end-promo contact
                  careers privacy global].freeze

  # Sibling fields that make a row's own object image-bearing.
  SIBLING_IMAGE = %w[photo thumbnail src].freeze

  def sources
    en_only = %w[blog careers].map { |n| [n, File.join(ROOT, "content/#{n}.json"), true] }
    mirrored = Dir[File.join(ROOT, "content/en/*.json")].sort.map do |f|
      [File.basename(f, ".json"), f, false]
    end
    mirrored + en_only
  end

  # Nearest enclosing object of a leaf, so we can read its sibling image field
  # and its identity (key/id/title).
  def object_at(root, key)
    segs = segments(key)[1..-2] # drop namespace and leaf
    segs.reduce(root) do |node, seg|
      return nil unless node
      seg.match?(/\A\d+\z/) ? node[seg.to_i] : node[seg]
    end
  end

  def item_identity(key, obj)
    idx = segments(key)[0..-2].reverse.find { |s| s.match?(/\A\d+\z/) }
    return "" unless idx
    name = obj.is_a?(Hash) ? (obj["key"] || obj["id"] || obj["title"]) : nil
    name ? "#{idx} · #{name}" : idx
  end

  def build_rows
    glossary = glossary_terms(File.read(File.join(ROOT, "content/glossary.md")))
    bound    = html_index

    sources.flat_map do |ns, path, en_only|
      en_doc = JSON.parse(File.read(path))
      ms_doc = en_only ? {} : JSON.parse(File.read(path.sub("/en/", "/ms/")))
      ms_map = en_only ? {} : walk(ms_doc).to_h
      drafts = en_doc.is_a?(Hash) ? en_doc["_draft"] : nil
      places = en_doc.is_a?(Hash) ? en_doc["_placeholder"] : nil
      corrs  = en_doc.is_a?(Hash) ? en_doc["_correction"] : nil

      walk(en_doc).map do |path_key, en|
        key  = "#{ns}.#{path_key}"
        rel  = rel_path(key)
        ms   = en_only ? nil : ms_map[path_key]
        ct   = content_type(key, ns)
        obj  = object_at(en_doc, key)
        facts = bound[key]

        sibling = obj.is_a?(Hash) ? SIBLING_IMAGE.filter_map { |f| obj[f] }.first : nil
        image   = sibling || facts&.dig(:image_ref)

        {
          page:          facts&.dig(:page) || NS_PAGE.fetch(ns),
          section:       segments(key)[1].to_s,
          item:          item_identity(key, obj),
          key:           key,
          field:         segments(key).last.match?(/\A\d+\z/) ? segments(key)[-2] : segments(key).last,
          en:            en,
          ms:            ms.to_s,
          content_type:  ct,
          translatable:  translatable?(ct) ? "TRUE" : "FALSE",
          render:        facts ? "static" : "unresolved",
          ms_status:     ms_status(en, ms, en_only: en_only),
          en_chars:      en.length.to_s,
          ms_chars:      ms ? ms.length.to_s : "",
          len_ratio:     len_ratio(en, ms),
          glossary_hits: glossary_hits(en, glossary),
          draft:         flagged?(drafts, rel) ? "TRUE" : "FALSE",
          placeholder:   (flagged?(places, rel) || en.include?("⟪PLACEHOLDER⟫")) ? "TRUE" : "FALSE",
          correction:    (corrs.is_a?(Hash) ? corrs[rel].to_s : ""),
          has_image:     image ? "TRUE" : "FALSE",
          image_ref:     image.to_s
        }
      end
    end
  end
```

Note `home.staffFeatured[*]` needs no special case: its namespace is `home`, which maps to `index` already.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~33 runs, 0 failures, 0 errors`

If `test_a_static_home_row` fails on `has_image`, check that `index.html`'s hero `<section>` really encloses the `<img>` — it does at `index.html:101-121`.

---

### Task 8: JS renderer hand-map

The spec's third attribution source. List renderers whose target section is unambiguous are marked `render=js` rather than `unresolved`.

The spec describes these rows as inheriting "their section's HTML facts". In practice that reduces to `render` alone, because the three renderers that emit images — staff cards, blog cards, culture strip — carry a **per-item** image (`photo`, `thumbnail`, `src`) that Task 7's sibling lookup already resolves more precisely than any section-level fact could. Inheriting a section-wide `image_ref` on top of that would overwrite a correct per-row answer with a coarser one. So the hand-map sets `render` and nothing else; `page` still comes from the namespace map, which is already correct for every prefix in the table.

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestJsHandMap < Minitest::Test
  def rows = @rows ||= CopyExport.build_rows
  def find(key) = rows.find { |r| r[:key] == key }

  def test_hand_mapped_prefixes_are_marked_js
    assert_equal "js", find("staff.members[0].name")[:render]
    assert_equal "js", find("services.items[0].title")[:render]
    assert_equal "js", find("blog.posts[0].title")[:render]
    assert_equal "js", find("chatbot.flow.start.say")[:render]
  end

  def test_unmapped_keys_stay_unresolved
    # consent.* is built entirely by consent.js and carries no data-i18n binding.
    assert_equal "unresolved", find("consent.banner.heading")[:render]
  end

  def test_static_still_wins_over_js
    assert_equal "static", find("home.hero.subtitle")[:render]
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `Expected: "js", Actual: "unresolved"`

- [ ] **Step 3: Write the minimal implementation**

Add the table:

```ruby
  # Key-prefix => the page whose renderer emits it. Only renderers whose target
  # section is unambiguous are listed; everything else stays "unresolved".
  JS_RENDERERS = {
    "staff.members"     => "staff",
    "services.items"    => "services",
    "blog.posts"        => "blog",
    "home.staffFeatured" => "index",
    "chatbot.flow"      => "global",
    "chatbot.ui"        => "global"
  }.freeze

  def js_renderer_for(key)
    JS_RENDERERS.find { |prefix, _| key == prefix || key.start_with?("#{prefix}.", "#{prefix}[") }
  end
```

Then in `build_rows`, replace the `render:` line:

```ruby
          render:        facts ? "static" : (js_renderer_for(key) ? "js" : "unresolved"),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~36 runs, 0 failures, 0 errors`

---

### Task 9: Ordering and TSV writing

**Files:**
- Modify: `$SCRATCH/copy-export.rb`
- Modify: `$SCRATCH/test_copy_export.rb`

- [ ] **Step 1: Write the failing test**

Append to `test_copy_export.rb`:

```ruby
class TestTsv < Minitest::Test
  def test_sorts_by_page_order_then_stable_document_order
    rows = [
      { page: "privacy", key: "privacy.a" },
      { page: "index",   key: "home.b" },
      { page: "index",   key: "home.a" },
      { page: "global",  key: "common.a" }
    ]
    got = CopyExport.sort_rows(rows).map { |r| r[:key] }
    # index before privacy before global; within index, original order preserved.
    assert_equal %w[home.b home.a privacy.a common.a], got
  end

  def test_escapes_tabs_and_newlines
    assert_equal "a b",     CopyExport.tsv_escape("a\tb")
    assert_equal 'a\\nb',   CopyExport.tsv_escape("a\nb")
    assert_equal 'a\\nb',   CopyExport.tsv_escape("a\r\nb")
  end

  def test_render_emits_bom_header_and_one_line_per_row
    rows = [CopyExport::COLUMNS.to_h { |c| [c, "x"] }]
    out = CopyExport.render_tsv(rows)
    assert out.start_with?("﻿"), "missing BOM"
    lines = out.lines
    assert_equal 2, lines.size
    assert_equal CopyExport::COLUMNS.size, lines[0].chomp.split("\t", -1).size
    assert_equal CopyExport::COLUMNS.size, lines[1].chomp.split("\t", -1).size
  end
end
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: FAIL — `undefined method 'sort_rows' for CopyExport`

- [ ] **Step 3: Write the minimal implementation**

```ruby
  # Stable sort on page rank alone. Rows arrive in JSON document order, and
  # Enumerable#sort_by is not stable, so carry the original index as a tiebreak.
  def sort_rows(rows)
    rows.each_with_index.sort_by { |r, i| [PAGE_ORDER.index(r[:page]) || 99, i] }.map(&:first)
  end

  def tsv_escape(value)
    value.to_s.gsub("\t", " ").gsub(/\r\n?|\n/, '\n')
  end

  def render_tsv(rows)
    out = +"﻿"
    out << COLUMNS.join("\t") << "\n"
    rows.each { |r| out << COLUMNS.map { |c| tsv_escape(r[c]) }.join("\t") << "\n" }
    out
  end

  def build
    rows = sort_rows(build_rows)
    tsv  = render_tsv(rows)

    # Guard: a raw tab would silently shift every column to its right.
    tsv.lines.each_with_index do |line, i|
      cols = line.chomp.split("\t", -1).size
      raise "line #{i + 1}: #{cols} columns, expected #{COLUMNS.size}" unless cols == COLUMNS.size
    end

    out = File.join(ROOT, "docs", "copy-export-2026-08-13.tsv")
    File.write(out, tsv)
    puts "wrote #{out} (#{rows.size} rows)"
  end
end

CopyExport.build if __FILE__ == $PROGRAM_NAME
```

Move the existing `end` that closes `module CopyExport` so the main guard sits outside it, matching `bin/build-blog.rb`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$SCRATCH" && ruby test_copy_export.rb`
Expected: `~39 runs, 0 failures, 0 errors`

---

### Task 10: Generate, verify, and commit the TSV

**Files:**
- Create: `docs/copy-export-2026-08-13.tsv`

- [ ] **Step 1: Generate**

```bash
cd "$SCRATCH" && ruby copy-export.rb
```

Expected: `wrote /Users/deepsight/code/urbane-ethos/docs/copy-export-2026-08-13.tsv (966 rows)`

- [ ] **Step 2: Run the spec's verification checklist**

```bash
cd "$UE_ROOT" && ruby -e '
  f = "docs/copy-export-2026-08-13.tsv"
  lines = File.read(f).sub("﻿", "").lines.map(&:chomp)
  head, *rows = lines
  cols = head.split("\t", -1)

  puts "columns:  #{cols.size} (expect 20)"
  puts "rows:     #{rows.size} (expect 966)"
  bad = rows.each_with_index.reject { |l, _| l.split("\t", -1).size == 20 }
  puts "bad rows: #{bad.size} (expect 0)"

  idx = cols.each_with_index.to_h
  keys = rows.map { |l| l.split("\t", -1)[idx["key"]] }
  puts "dupes:    #{keys.size - keys.uniq.size} (expect 0)"

  %w[draft placeholder has_image].each do |c|
    n = rows.count { |l| l.split("\t", -1)[idx[c]] == "TRUE" }
    puts "#{c} TRUE: #{n}"
  end
  sent = rows.count { |l| l.include?("⟪PLACEHOLDER⟫") }
  ph   = rows.count { |l| l.split("\t", -1)[idx["placeholder"]] == "TRUE" }
  puts "sentinel rows: #{sent} vs placeholder-flagged: #{ph}"'
```

Expected: 20 columns, 966 rows, 0 bad rows, 0 dupes, and **non-zero counts for `draft`, `placeholder` and `has_image`**. An all-`FALSE` flag column is the silent failure Task 2 exists to prevent — if it appears here, go back to Task 2, do not ship the file.

If `sentinel rows` and `placeholder-flagged` disagree, that is real content drift between the `_placeholder` maps and the visible `⟪PLACEHOLDER⟫` sentinels. Note the delta and report it; do not "fix" it by loosening the flag.

- [ ] **Step 3: Cross-check key coverage against the parity script's own key walk**

```bash
cd "$UE_ROOT" && ruby -rjson -e '
  def walk(o, p = "")
    case o
    when Hash then o.flat_map { |k, v| %w[_meta _draft _correction _placeholder].include?(k) ? [] : walk(v, p.empty? ? k : "#{p}.#{k}") }
    when Array then o.each_with_index.flat_map { |v, i| walk(v, "#{p}[#{i}]") }
    when String then [p]
    else []
    end
  end
  expected = Dir["content/en/*.json"].flat_map { |f| ns = File.basename(f, ".json"); walk(JSON.parse(File.read(f))).map { |k| "#{ns}.#{k}" } }
  cols = File.read("docs/copy-export-2026-08-13.tsv").sub("﻿", "").lines.first.chomp.split("\t")
  ki = cols.index("key")
  got = File.read("docs/copy-export-2026-08-13.tsv").sub("﻿", "").lines.drop(1).map { |l| l.chomp.split("\t", -1)[ki] }
  missing = expected - got
  puts "missing from sheet: #{missing.size}"
  missing.first(10).each { |k| puts "  #{k}" }'
```

Expected: `missing from sheet: 0`.

- [ ] **Step 4: Spot-check the round trip by eye**

```bash
cd "$UE_ROOT" && ruby -e '
  cols = nil
  File.read("docs/copy-export-2026-08-13.tsv").sub("﻿", "").lines.each_with_index do |l, i|
    f = l.chomp.split("\t", -1)
    (cols = f; next) if i.zero?
    next unless %w[home.hero.subtitle staff.members[0].name chatbot.flow.start.say blog.posts[0].title].include?(f[cols.index("key")])
    puts cols.zip(f).map { |c, v| "#{c}=#{v[0, 44]}" }.join(" | ")
    puts
  end'
```

Confirm each of the four carries a sensible page, section, content type, flags and image state.

- [ ] **Step 5: Confirm the existing gates still pass**

The export only reads `content/`, but run both gates to prove nothing was mutated:

```bash
cd "$UE_ROOT" && ruby bin/check-i18n-parity.rb && ruby bin/check-contact-channels.rb && git status --porcelain
```

Expected: parity OK, channels OK, and `git status` showing **only** `?? docs/copy-export-2026-08-13.tsv`. Any other modified file means the script wrote where it should not have.

- [ ] **Step 6: Commit**

```bash
cd "$UE_ROOT" && git add docs/copy-export-2026-08-13.tsv && git commit -m "docs: bilingual EN/BM copy inventory TSV

966 key-level rows across content/{en,ms}/*.json, blog.json and careers.json.
20 columns: page/section attribution, item identity, content type,
translatable flag, render path, ms_status, length metrics, glossary hits,
and draft/placeholder/correction/image flags.

For BM translation review and client copy sign-off. Generated per
docs/superpowers/specs/2026-08-13-bilingual-copy-tsv-export-design.md;
one-off artifact, generator not committed."
```

---

### Task 11: Hard-coded copy audit

Reported in the reply, never written into the sheet. Un-keyed strings are a markup defect, not translatable content, and listing them as rows would imply otherwise.

**Files:**
- Create: `$SCRATCH/audit-hardcoded.rb`

- [ ] **Step 1: Write the audit script**

```ruby
# $SCRATCH/audit-hardcoded.rb
# Visible text in the 10 production pages that is NOT behind a data-i18n key.
require "json"

ROOT  = ENV.fetch("UE_ROOT")
PAGES = %w[index about staff services blog contact analytics privacy careers
           post-year-end-promo].freeze

# Elements that carry copy. An element with data-i18n on it is already bound.
TEXT_TAG = /<(h1|h2|h3|h4|p|li|button|a|figcaption|label|summary|th|td)\b([^>]*)>(.*?)<\/\1>/m

PAGES.each do |page|
  html = File.read(File.join(ROOT, "#{page}.html"))
  # Strip what is not visitor-visible prose.
  html = html.gsub(%r{<script\b.*?</script>}m, "")
             .gsub(%r{<style\b.*?</style>}m, "")
             .gsub(/<!--.*?-->/m, "")
             .gsub(%r{<noscript\b.*?</noscript>}m, "")

  findings = html.scan(TEXT_TAG).filter_map do |_tag, attrs, inner|
    next if attrs.include?("data-i18n")
    text = inner.gsub(/<[^>]+>/, "").gsub(/\s+/, " ").strip
    next if text.empty?
    next if text.length < 3            # icons, separators, single glyphs
    next unless text.match?(/[A-Za-z]{3}/)
    next if text.match?(/\A[\d\s.:\-–—·|]+\z/)  # dates, times, numerals
    text
  end.uniq

  next if findings.empty?
  puts "=== #{page}.html (#{findings.size}) ==="
  findings.each { |t| puts "  #{t[0, 110]}" }
  puts
end
```

- [ ] **Step 2: Run it**

```bash
cd "$SCRATCH" && ruby audit-hardcoded.rb
```

- [ ] **Step 3: Triage the output by hand**

Expect false positives; classify each finding before reporting:

| Category | Action |
|---|---|
| Text inside a JS template literal that renders i18n data at runtime (staff/services/blog cards) | Not a finding — already i18n-driven |
| Fallback text inside an element that also carries `data-i18n` on a **child** | Not a finding |
| Proper nouns, the address, phone numbers, email addresses | Not a finding — governed by `bin/check-contact-channels.rb`, not i18n |
| Genuine prose with no key anywhere | **Real finding** |

- [ ] **Step 4: Report**

Report real findings in the reply as `file:line` plus the string and a proposed `content/{en,ms}/` key. Do **not** fix them — the spec puts remediation out of scope.

---

## Verification summary

| Check | Where | Pass condition |
|---|---|---|
| Unit tests | Tasks 1–9 | all green, ~39 runs |
| Leaf count | Task 1 Step 5 | 966 |
| Placeholder normalisation | Task 2 Step 5 | non-zero hits, all `⟪PLACEHOLDER⟫` |
| ms_status distribution | Task 4 Step 5 | 383 translated / 189 identical / 0 missing |
| HTML binding | Task 6 Step 5 | ~125 bound, 104 page-attributed |
| Column + row integrity | Task 10 Step 2 | 20 cols, 966 rows, 0 dupes, flags non-zero |
| Key coverage vs parity walk | Task 10 Step 3 | 0 missing |
| Repo untouched | Task 10 Step 5 | both gates pass, only the TSV is new |

## Deviations from the spec, consolidated

Both were found by checking the spec's rules against the real data while writing this plan. Neither changes the deliverable's shape.

1. **Multi-page binding tie-break.** The spec's "overlay wins" is undefined for the 21 keys bound on 2+ pages. Resolved above: overlay sets `page` only for uniquely bound keys.
2. **`page` enum gains `post-year-end-promo`.** One key, `common.cta.backToBlog`, binds uniquely there. Ten values, not nine.

Fold both back into the spec once the export is verified.

## Out of scope

- Committing a generator under `bin/`.
- Modifying `bin/check-i18n-parity.rb` or any CI gate.
- Fixing hard-coded copy findings — reporting only.
- Editing, translating, or correcting any string in `content/`.
- The 38 blog article bodies in `content/blog/posts/*.md`.
