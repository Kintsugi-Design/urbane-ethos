# Blog Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 4 live-site blog articles (plus the existing promo post) into committed static `post-*.html` pages generated from Markdown by a small Ruby tool, so the blog reads locally and future posts share one layout.

**Architecture:** Markdown-per-post source (`content/blog/posts/*.md`, YAML frontmatter + body) → `bin/build-blog.rb` renders each through one ERB template (`content/blog/_post.html.erb`, byte-identical chrome to `post-year-end-promo.html`) → writes `post-<slug>.html` at repo root → rebuilds the `posts[]` array of `content/blog.json`. Deployment stays pure committed static HTML; the generator is an authoring-time tool only.

**Tech Stack:** Ruby ≥ 3.1, `kramdown` (pure-Ruby Markdown→HTML, Gemfile `:development` group), stdlib `erb`/`yaml`/`json`, stdlib `minitest` for generator unit tests.

**Spec:** `docs/superpowers/specs/2026-07-28-blog-generator-design.md`

---

## File Structure

- Create `content/blog/posts/what-does-sensory-have-to-do-with-my-feelings.md` — EN article source.
- Create `content/blog/posts/anak-dah-masuk-sekolah.md` — BM article source (`lang: ms`).
- Create `content/blog/posts/a-fulfilling-career-awaits.md` — EN article source.
- Create `content/blog/posts/an-opportunity-to-learn-grow.md` — EN article source.
- Create `content/blog/posts/year-end-promo.md` — migration of the existing promo page.
- Create `content/blog/_post.html.erb` — the single shared page template.
- Create `bin/build-blog.rb` — the generator (executable).
- Create `test/blog-generator/test_generator.rb` — minitest for the pure logic (frontmatter parse, blog.json merge, slug rules).
- Create `test/blog-generator/fixtures/sample.md` — fixture post for the tests.
- Modify `Gemfile` — add `kramdown` in a `:development` group.
- Modify `content/blog.json` — regenerated `posts[]` (via the generator, not by hand).
- Delete/overwrite `post-year-end-promo.html` — becomes generator output (regenerated, not hand-edited).

Each `.md` owns one article's content and metadata. `_post.html.erb` owns layout. `bin/build-blog.rb` owns parsing + rendering + index rewrite. Tests isolate the pure logic from filesystem/render.

---

## Task 1: Add kramdown dev dependency

**Files:**
- Modify: `Gemfile`

- [ ] **Step 1: Add kramdown to a development group**

Edit `Gemfile` to append after the existing `gem "webrick", "~> 1.8"` line:

```ruby
group :development do
  # Authoring-time only: powers bin/build-blog.rb (blog Markdown -> static HTML).
  # NOT required by bin/server or the Pages deploy — output is committed static HTML.
  gem "kramdown", "~> 2.4"
end
```

- [ ] **Step 2: Install**

Run: `bundle install`
Expected: bundler resolves and installs `kramdown` (2.4.x), updates `Gemfile.lock`. Exit 0.

- [ ] **Step 3: Verify it loads**

Run: `ruby -e 'require "kramdown"; puts Kramdown::VERSION'`
Expected: prints `2.4.0` (or 2.4.x). Exit 0.

- [ ] **Step 4: Commit**

```bash
git add Gemfile Gemfile.lock
git commit -m "build: add kramdown as a development-group dependency for the blog generator"
```

---

## Task 2: Generator unit tests (write failing first)

The pure logic worth testing: parsing frontmatter+body out of a `.md` string, mapping a post hash to a `blog.json` entry, and the required-field / duplicate-slug guards. These are defined as module methods on `BlogGen` so they can be tested without touching the filesystem or ERB.

**Files:**
- Create: `test/blog-generator/fixtures/sample.md`
- Create: `test/blog-generator/test_generator.rb`

- [ ] **Step 1: Write the fixture**

Create `test/blog-generator/fixtures/sample.md`:

```markdown
---
title: Sample Post
slug: sample-post
id: sample-post
date: 2025-01-01
category: Development
read_time: 1 min read
tags: [alpha, beta]
hero_image: assets/img/scraped/sample.webp
lang: en
source_url: https://example.com/post/sample
excerpt: A one-line sample excerpt.
featured: false
---

# Heading

A paragraph with a [link](https://example.com).

- one
- two
```

- [ ] **Step 2: Write the failing test**

Create `test/blog-generator/test_generator.rb`:

```ruby
require "minitest/autorun"
require_relative "../../bin/build-blog"

class TestBlogGen < Minitest::Test
  def fixture
    File.read(File.join(__dir__, "fixtures", "sample.md"))
  end

  def test_parse_splits_frontmatter_and_body
    fm, body = BlogGen.parse(fixture)
    assert_equal "Sample Post", fm["title"]
    assert_equal "sample-post", fm["slug"]
    assert_equal "Development", fm["category"]
    assert_equal ["alpha", "beta"], fm["tags"]
    assert_equal "en", fm["lang"]
    assert_includes body, "# Heading"
    refute_includes body, "title: Sample Post" # frontmatter stripped from body
  end

  def test_require_fields_raises_on_missing
    fm = { "title" => "x" } # missing slug, date, category, lang, excerpt
    err = assert_raises(RuntimeError) { BlogGen.require_fields!(fm, "sample.md") }
    assert_match(/missing required/i, err.message)
  end

  def test_index_entry_shape
    fm, _ = BlogGen.parse(fixture)
    entry = BlogGen.index_entry(fm)
    assert_equal "sample-post", entry["id"]
    assert_equal "Sample Post", entry["title"]
    assert_equal "2025-01-01", entry["date"]
    assert_equal "Development", entry["category"]
    assert_equal "A one-line sample excerpt.", entry["excerpt"]
    assert_equal "assets/img/scraped/sample.webp", entry["thumbnail"]
    assert_equal ["alpha", "beta"], entry["tags"]
    assert_equal "./post-sample-post.html", entry["localUrl"]
    refute entry.key?("externalUrl")
  end

  def test_duplicate_slug_detected
    err = assert_raises(RuntimeError) { BlogGen.assert_unique_slugs!(["a", "b", "a"]) }
    assert_match(/duplicate slug/i, err.message)
  end
end
```

- [ ] **Step 3: Run to verify it fails**

Run: `ruby test/blog-generator/test_generator.rb`
Expected: FAIL — `cannot load such file -- .../bin/build-blog` (generator not written yet).

---

## Task 3: Write the generator `bin/build-blog.rb`

**Files:**
- Create: `bin/build-blog.rb`

- [ ] **Step 1: Write the generator**

Create `bin/build-blog.rb` (make executable in Step 3). It must load without side effects when required (tests require it), so all filesystem/render work sits behind `BlogGen.build` guarded by `if __FILE__ == $PROGRAM_NAME`.

```ruby
#!/usr/bin/env ruby
# frozen_string_literal: true

# Blog generator: content/blog/posts/*.md -> post-<slug>.html + content/blog.json posts[].
# Authoring-time tool. Output is committed static HTML; bin/server/deploy never run this.
# Usage: ruby bin/build-blog.rb   (from repo root)

require "yaml"
require "json"
require "erb"

module BlogGen
  ROOT       = File.expand_path("..", __dir__)
  POSTS_DIR  = File.join(ROOT, "content", "blog", "posts")
  TEMPLATE   = File.join(ROOT, "content", "blog", "_post.html.erb")
  BLOG_JSON  = File.join(ROOT, "content", "blog.json")
  REQUIRED   = %w[title slug date category lang excerpt].freeze

  module_function

  # Split "---\nYAML\n---\nbody" into [frontmatter_hash, body_string].
  def parse(text)
    unless text.start_with?("---")
      raise "post is missing a YAML frontmatter block (must start with ---)"
    end
    _, fm_raw, body = text.split(/^---\s*$\n/, 3)
    fm = YAML.safe_load(fm_raw || "", permitted_classes: [Date]) || {}
    fm = fm.transform_keys(&:to_s)
    fm.each { |k, v| fm[k] = v.to_s if v.is_a?(Date) }
    [fm, (body || "").lstrip]
  end

  def require_fields!(fm, filename)
    missing = REQUIRED.reject { |k| fm[k] && !fm[k].to_s.strip.empty? }
    return if missing.empty?

    raise "#{filename}: missing required frontmatter field(s): #{missing.join(", ")}"
  end

  def assert_unique_slugs!(slugs)
    dupes = slugs.tally.select { |_, n| n > 1 }.keys
    raise "duplicate slug(s): #{dupes.join(", ")}" unless dupes.empty?
  end

  def assert_categories!(fm, categories, filename)
    return if categories.include?(fm["category"])

    raise "#{filename}: category #{fm["category"].inspect} not in blog.json categories #{categories.inspect}"
  end

  # blog.json posts[] entry derived from frontmatter.
  def index_entry(fm)
    {
      "id"        => (fm["id"] && !fm["id"].to_s.empty? ? fm["id"] : fm["slug"]),
      "title"     => fm["title"],
      "date"      => fm["date"].to_s,
      "category"  => fm["category"],
      "excerpt"   => fm["excerpt"],
      "thumbnail" => (fm["hero_image"] && !fm["hero_image"].to_s.empty? ? fm["hero_image"] : nil),
      "tags"      => Array(fm["tags"]),
      "localUrl"  => "./post-#{fm["slug"]}.html"
    }
  end

  # Render one post to full HTML via the ERB template.
  # Locals available in the template: fm (Hash), body_html (String).
  def render(fm, body_html, template_src)
    b = binding
    b.local_variable_set(:fm, fm)
    b.local_variable_set(:body_html, body_html)
    ERB.new(template_src, trim_mode: "-").result(b)
  end

  def build
    require "kramdown"
    blog = JSON.parse(File.read(BLOG_JSON))
    categories = blog["categories"] || []
    template_src = File.read(TEMPLATE)

    files = Dir[File.join(POSTS_DIR, "*.md")].sort
    raise "no posts found in #{POSTS_DIR}" if files.empty?

    parsed = files.map do |path|
      fm, body = parse(File.read(path))
      require_fields!(fm, File.basename(path))
      assert_categories!(fm, categories, File.basename(path))
      body_html = Kramdown::Document.new(body).to_html
      [fm, body_html]
    end

    assert_unique_slugs!(parsed.map { |fm, _| fm["slug"] })

    parsed.each do |fm, body_html|
      html = render(fm, body_html, template_src)
      out = File.join(ROOT, "post-#{fm["slug"]}.html")
      File.write(out, html)
      puts "wrote #{File.basename(out)}"
    end

    # Rebuild posts[] sorted by date desc; preserve every other top-level key.
    entries = parsed.map { |fm, _| index_entry(fm) }
                    .sort_by { |e| e["date"] }.reverse
    blog["posts"] = entries
    File.write(BLOG_JSON, JSON.pretty_generate(blog) + "\n")
    puts "wrote content/blog.json (#{entries.size} posts)"
  end
end

BlogGen.build if __FILE__ == $PROGRAM_NAME
```

- [ ] **Step 2: Run the unit tests to verify they pass**

Run: `ruby test/blog-generator/test_generator.rb`
Expected: PASS — 4 runs, 0 failures, 0 errors. (`test_index_entry_shape` confirms `localUrl == "./post-sample-post.html"` and no `externalUrl`.)

- [ ] **Step 3: Make executable + commit**

```bash
chmod +x bin/build-blog.rb
git add bin/build-blog.rb test/blog-generator/
git commit -m "feat(blog): add Markdown->static-HTML generator with unit tests"
```

---

## Task 4: Write the ERB template

Reproduce the chrome of `post-year-end-promo.html` exactly, parameterized. Read that file first to copy the header/footer verbatim.

**Files:**
- Create: `content/blog/_post.html.erb`

- [ ] **Step 1: Write the template**

Create `content/blog/_post.html.erb`. The `<header>`, `<footer>`, chatbot button, and the module `<script>` block are copied verbatim from `post-year-end-promo.html` (lines 15-57, 72-107, 109, 111-132). Only the `<html>` tag, `<title>`, and `<article>` inner content are parameterized:

```erb
<!doctype html>
<html lang="<%= fm["lang"] %>" data-fs="1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><%= fm["title"] %> — Urbane Ethos</title>
<link rel="stylesheet" href="./assets/css/tokens.css">
<link rel="stylesheet" href="./assets/css/base.css">
<link rel="stylesheet" href="./assets/css/components.css">
<link rel="stylesheet" href="./assets/css/motion.css">
</head>
<body class="blog post">
<a class="skip-link" href="#main" data-i18n="common.nav.skipToContent">Skip to content</a>

<header class="site-header">
  <div class="wrap header-row">
    <button class="nav-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="primary-nav"
            aria-label="Open menu"
            data-i18n-attr="aria-label:common.nav.menu">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line class="line-top" x1="3" y1="9" x2="21" y2="9" />
        <line class="line-bot" x1="3" y1="15" x2="21" y2="15" />
      </svg>
    </button>
    <a class="brand" href="./">
      <span>Urbane Ethos</span>
      <small data-i18n="home.hero.title">Early Intervention Center</small>
    </a>
    <nav id="primary-nav" aria-label="Primary">
      <ul class="nav-list">
        <li><a href="./about.html" data-i18n="common.nav.about">About</a></li>
        <li><a href="./staff.html" data-i18n="common.nav.staff">Staff</a></li>
        <li><a href="./services.html" data-i18n="common.nav.services">Services</a></li>
        <li><a href="./blog.html" data-i18n="common.nav.blog">Blog</a></li>
        <li><a href="./contact.html" data-i18n="common.nav.contact">Contact</a></li>
      </ul>
      <div class="nav-tools">
        <span class="locale-toggle" aria-label="Language">
          <button data-locale-set="en">EN</button>
          <button data-locale-set="ms">BM</button>
        </span>
        <button class="fs-toggle" data-fs-cycle aria-label="Text size"><span class="fs-toggle-letter">A</span><span data-icon="chevron-up-down"></span></button>
      </div>
    </nav>
    <div class="header-tools">
      <span class="locale-toggle" aria-label="Language">
        <button data-locale-set="en">EN</button>
        <button data-locale-set="ms">BM</button>
      </span>
      <button class="fs-toggle" data-fs-cycle aria-label="Text size"><span class="fs-toggle-letter">A</span><span data-icon="chevron-up-down"></span></button>
      <a class="btn btn--primary" href="./contact.html" data-i18n="common.cta.bookSession">Book Now</a>
    </div>
  </div>
</header>

<main id="main">
  <article class="section">
    <div class="wrap" style="max-width:var(--content-max)">
      <p class="section-eyebrow"><%= fm["category"] %></p>
      <h1><%= fm["title"] %></h1>
      <p><small><%= fm["date"] %> · <%= fm["read_time"] %></small></p>
<% if fm["hero_image"] && !fm["hero_image"].to_s.empty? -%>
      <figure class="anchor-photo">
        <img src="./<%= fm["hero_image"] %>" alt="" loading="lazy">
      </figure>
<% end -%>
      <%= body_html %>
      <p><a class="btn btn--primary" href="./contact.html" data-i18n="common.cta.bookSession">Book Now</a> <a class="btn btn--secondary" href="./blog.html" data-i18n="common.cta.backToBlog">Back to the blog</a></p>
    </div>
  </article>
</main>

<footer class="site-footer">
  <div class="wrap grid">
    <div>
      <h4>Address</h4>
      <p data-i18n="common.footer.address"></p>
      <p data-i18n="common.footer.phone1"></p>
      <p><a href="mailto:urbaneethos@yahoo.com" data-i18n="common.footer.email">urbaneethos@yahoo.com</a></p>
    </div>
    <div>
      <h4 data-i18n="common.footer.hoursLabel">Hours</h4>
      <ul id="footer-hours"></ul>
    </div>
    <div>
      <h4>Site</h4>
      <ul>
        <li><a href="./about.html" data-i18n="common.nav.about">About</a></li>
        <li><a href="./services.html" data-i18n="common.nav.services">Services</a></li>
        <li><a href="./staff.html" data-i18n="common.nav.staff">Staff</a></li>
        <li><a href="./blog.html" data-i18n="common.nav.blog">Blog</a></li>
        <li><a href="./contact.html" data-i18n="common.nav.contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <h4>Privacy</h4>
      <ul>
        <li><a href="./privacy.html" data-i18n="common.footer.privacy">Privacy notice</a></li>
        <li><a href="#" data-consent-manage data-i18n="common.footer.manageCookies">Manage cookies</a></li>
        <li><a href="./analytics.html" data-i18n="common.footer.analyticsDemo">Analytics demo</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-base">
    <p class="footer-wordmark">Urbane Ethos</p>
    <p data-i18n="common.footer.rights">© Urbane Ethos Early Intervention Center</p>
  </div>
</footer>

<button class="chatbot-launcher" aria-label="Open chat assistant" data-i18n-attr="aria-label:common.a11y.openChatbot"><span data-icon="chat"></span></button>

<script type="module">
import { getLocale, translatePage } from "./assets/js/i18n.js";
import "./assets/js/consent.js";
import "./assets/js/a11y.js";
import "./assets/js/nav.js";
import "./assets/js/icons.js";
import "./assets/js/page-load.js";
import "./assets/js/cursor.js";
import "./assets/js/chatbot.js";

async function renderChrome() {
  const locale = getLocale();
  const common = await fetch(`./content/${locale}/common.json`).then(r => r.json());

  const fhrs = document.getElementById("footer-hours");
  if (fhrs) fhrs.replaceChildren(...(common.footer?.hours || []).map(s => { const li = document.createElement("li"); li.textContent = s; return li; }));

  await translatePage(locale);
}
renderChrome();
document.addEventListener("i18n:changed", renderChrome);
</script>
</body>
</html>
```

- [ ] **Step 2: Add the two new i18n keys used by the CTA buttons**

The template references `common.cta.backToBlog` (new). Confirm `common.cta.bookSession` already exists; add `backToBlog` to both locales.

Run to inspect: `ruby -rjson -e 'puts JSON.parse(File.read("content/en/common.json"))["cta"].to_json'`

Edit `content/en/common.json` — inside the `"cta"` object add:
```json
"backToBlog": "Back to the blog"
```
Edit `content/ms/common.json` — inside the `"cta"` object add:
```json
"backToBlog": "Kembali ke blog"
```

- [ ] **Step 3: Verify i18n parity still passes**

Run: `ruby bin/check-i18n-parity.rb`
Expected: exit 0, no missing keys. (Both locales gained the same `cta.backToBlog` key.)

- [ ] **Step 4: Commit**

```bash
git add content/blog/_post.html.erb content/en/common.json content/ms/common.json
git commit -m "feat(blog): add post ERB template and backToBlog i18n key"
```

---

## Task 5: Author the 5 Markdown post sources

Content below is cleaned from the live site (Wix nav/footer/"Recent Posts" cruft removed; article prose, headings, lists, reference lists, and inline links kept). Do not paraphrase — use verbatim.

**Files:**
- Create: `content/blog/posts/what-does-sensory-have-to-do-with-my-feelings.md`
- Create: `content/blog/posts/anak-dah-masuk-sekolah.md`
- Create: `content/blog/posts/a-fulfilling-career-awaits.md`
- Create: `content/blog/posts/an-opportunity-to-learn-grow.md`
- Create: `content/blog/posts/year-end-promo.md`

- [ ] **Step 1: Write `what-does-sensory-have-to-do-with-my-feelings.md`**

```markdown
---
title: What does Sensory have to do with my feelings?
slug: what-does-sensory-have-to-do-with-my-feelings
id: what-does-sensory-have-to-do-with-my-feelings
date: 2024-11-04
category: Development
read_time: 3 min read
tags: [urbaneethos, occupational therapy, development]
hero_image: assets/img/scraped/blog-what-does-sensory-have-to-do-with-my-feelings.webp
lang: en
source_url: https://www.urbaneethos.center/post/what-does-sensory-have-to-do-with-my-feelings
excerpt: Sensory processing and emotional regulation are deeply interconnected aspects of human development, and together they play a significant role in shaping how we manage emotions.
featured: true
---

Sensory processing and emotional regulation are deeply interconnected aspects of human development, and together they play a significant role in shaping how individuals understand, react to, and manage their emotions. Sensory processing refers to the ways in which we receive and respond to sensory information—sights, sounds, smells, tastes, and textures—from our environment. Emotional regulation, meanwhile, is controlled by parts of the brain such as the amygdala, which plays a central role in emotional responses. When sensory processing works smoothly, it supports emotional balance; but when challenges arise in processing sensory information, it can impact one's ability to regulate emotions effectively.

_Illustrator | Credit @ Elise Gravel_

Here are some ways that sensory processing and emotional intelligence are connected:

- **Sensory-processing sensitivity (SPS):** Involves increased sensitivity to environmental stimuli. People with SPS may perceive and respond to stimuli, including emotional ones, more intensely.
- **Inadequate sensory processing:** May cause difficulties with emotional regulation and behaviors.
- **Sensory diet:** Can help with emotional regulation. The type of sensory diet that works best for a child depends on their needs, but it should be consistent.

One key connection between sensory processing and emotional regulation is sensory-processing sensitivity (SPS), that means individuals respond more intensely to sensory input. For children and adults with SPS, sensory cues in the environment, like noise or bright lights, can trigger stronger emotional responses than they might in others. For instance, an unexpected loud noise might make someone with high SPS feel overwhelmed and anxious, creating challenges for emotional regulation in moments of stress.

In some cases, inadequate sensory processing can lead to more severe challenges with emotional regulation and behavior. Children with sensory processing disorder (SPD) may find it hard to engage in typical social interactions or adapt to changes, which may heighten feelings of frustration or anxiety. For these children, emotional regulation becomes particularly challenging because sensory input can be overwhelming, leading to intense or unpredictable emotional responses.

A sensory diet is one method that can help improve emotional regulation for those with sensory processing challenges. This personalized plan of sensory activities is designed to meet an individual's unique sensory needs. A consistent sensory diet can help a child feel more grounded, reducing sensory overload and providing tools to manage emotions better. The specific activities in a sensory diet vary but may include calming exercises like deep breathing or sensory breaks to reset and refocus.

The environment also plays a crucial role. Studies show that children with high SPS often fare better in environments where caregivers are warm, responsive, and emotionally supportive. This type of positive, nurturing environment helps highly sensitive children develop emotional regulation skills, as they feel safe to explore emotions without fear of harsh judgment. Conversely, for children with SPS, a less responsive caregiving style, where warmth and sensitivity are lacking, can lead to emotional dysregulation, as they may feel misunderstood and struggle to process their more intense emotional reactions.

Sensory processing and emotional regulation form a complex system, affecting daily interactions, social skills, and well-being. As we learn more about this connection, we can better support children and adults in managing their emotions, especially those with higher sensory sensitivities. Sensory processing strategies, nurturing environments, and responsive caregiving can create a foundation for more effective emotional regulation, ultimately helping individuals achieve a greater sense of emotional stability and resilience.

Learn more about how sensory processing and emotional regulation is linked from our upcoming workshop Growing Strong Minds happening on Saturday, 9th November 2024 at Raja Tun Uda Library, Shah Alam. Click here: <https://bit.ly/StrongMindUE>

### References

- Drndarević, N., Protić, S., & Mestre, J. M. (2021). Sensory-Processing Sensitivity and Pathways to Depression and Aggression: The Mediating Role of Trait Emotional Intelligence and Decision-Making Style—A Pilot Study. _International Journal of Environmental Research and Public Health, 18_(24), 13202. https://doi.org/10.3390/ijerph182413202
- Hong, E., & Hong, S. (2016). The Relationship Between Sensory Processing and Emotional Regulation: A Literature Review. _Journal of Korean Society of Sensory Integration Therapists, 14_, 50-59. 10.18064/JKASI.2016.14.1.050.
- Sperati, A., Acevedo, B. P., Dellagiulia, A., Fasolo, M., Spinelli, M., D'Urso, G., & Lionetti, F. (2024). The contribution of Sensory Processing Sensitivity and internalized attachment representations on emotion regulation competencies in school-age children. _Frontiers in Psychology, 15_, 1357808. https://doi.org/10.3389/fpsyg.2024.1357808
```

- [ ] **Step 2: Write `anak-dah-masuk-sekolah.md`** (BM, `lang: ms`)

```markdown
---
title: Anak Dah Masuk Sekolah! Tips Mengekalkan Minat Anak ke Sekolah Daripada Pakar Klinikal Psikologi
slug: anak-dah-masuk-sekolah
id: anak-dah-masuk-sekolah
date: 2025-03-13
category: Parenting
read_time: 2 min read
tags: [urbaneethos, Parenting Workshop]
hero_image: assets/img/scraped/blog-anak-dah-masuk-sekolah.webp
lang: ms
source_url: https://www.urbaneethos.center/post/anak-dah-masuk-sekolah-tips-mengekalkan-minat-anak-ke-sekolah-daripada-pakar-klinikal-psikologi
excerpt: Apabila anak sudah mula bersekolah, cabaran seterusnya bagi ibu bapa ialah mengekalkan semangat dan minat mereka untuk terus belajar.
featured: true
---

Apabila anak sudah mula bersekolah, cabaran seterusnya bagi ibu bapa ialah mengekalkan semangat dan minat mereka untuk terus belajar dan menikmati pengalaman di sekolah. Berikut adalah beberapa cara yang boleh membantu:

### Wujudkan Rutin yang Konsisten

Pastikan anak mempunyai rutin harian yang konsisten, termasuk waktu tidur yang mencukupi dan persediaan awal ke sekolah. Rutin yang baik membantu mereka lebih bersedia dan bersemangat. Jika rutin anak-anak berubah terlalu kerap, mereka mungkin rasa risau dan cepat penat. Jika rutin anak-anak perlu diubah, cerita kepada mereka sebelum melakukan perubahan, supaya mereka boleh menjangka apa yang bakal berlaku. Wujudkan rutin yang konsisten!

### Tunjukkan Minat Terhadap Pembelajaran Mereka

Sentiasa bertanya kepada anak tentang apa yang mereka pelajari di sekolah. Contoh soalan yang boleh ditanya adalah:

- "Apa benda baru yang kamu pelajari hari ini?"
- "Ada aktiviti seronok yang kamu buat di sekolah tadi?"
- "Apa yang kamu rasa susah untuk faham hari ini?"
- "Siapa kawan baru yang kamu jumpa hari ini?"
- "Ada kawan yang perlukan bantuan awak ke harini?"

Kemudian, berikan pujian dan galakan atas usaha mereka, bukan hanya pada pencapaian akademik.

- ❌ Baguslah Abang hari ni.
- ✅ Bagus Abang fokus dan dengar apa cikgu ajar dalam kelas Sains harini walaupon Abang rasa tak faham. Nanti kita ulang kaji sama-sama topik yang susah tu ye.

Puji usaha mereka juga, bukan pencapaian sahaja.

### Jadikan Sekolah Sebagai Pengalaman Menyeronokkan

Bantu anak melihat sekolah sebagai tempat yang menarik dengan mengaitkan pembelajaran dengan kehidupan seharian. Contohnya, jika mereka belajar tentang sains, lakukan eksperimen mudah di rumah. Jika mereka belajar kira-kira (Maths), ajak mereka kira-kira semasa membeli barang di kedai. Jadikan sekolah satu pengalaman yang menyeronokkan.

### Beri Sokongan Emosi

Jika anak mengalami cabaran seperti kesukaran bersosial atau tekanan akademik, dengar dan berikan sokongan. Pastikan mereka tahu bahawa sekolah adalah tempat untuk belajar dan berkembang, bukan sekadar untuk mendapat markah tinggi. Beberapa cara yang boleh dilakukan:

- Jika anak mengalami kesukaran berkawan, bantu mereka dengan mengajarkan cara memulakan perbualan atau memberi dorongan untuk menyertai aktiviti berkumpulan.
- Jika anak merasa tertekan dengan kerja sekolah, bantu mereka mengurus masa dengan lebih baik atau berbincang dengan guru jika tekanan semakin meningkat.
- Sekiranya anak berasa kecewa dengan kegagalan, bantu mereka melihat kegagalan sebagai peluang untuk belajar dan berkembang.
- Luangkan masa bersama anak untuk mendengar perasaan mereka tanpa menghakimi, agar mereka tahu mereka sentiasa mempunyai tempat yang selamat untuk berkongsi masalah.

### Libatkan Diri dalam Aktiviti Sekolah

Ibu bapa boleh menyertai aktiviti sekolah seperti hari terbuka, sukan, atau program lain. Ini membantu anak melihat bahawa ibu bapa juga menghargai pendidikan mereka.

### Bina Hubungan Baik dengan Guru

Hubungan yang baik antara ibu bapa dan guru dapat membantu memahami keperluan dan perkembangan anak dengan lebih baik. Ini juga memberi peluang untuk menangani sebarang isu yang mungkin timbul lebih awal. Jalin kerjasama yang baik dengan guru dan bersikap terbuka terhadap maklum balas mengenai anak anda. Guru juga ingin melihat anak-anak kita berkembang. Tanpa maklum balas, sukar untuk mengenal pasti keperluan mereka dan membantu mereka maju.

Dengan pendekatan yang betul, ibu bapa dapat membantu mengekalkan minat anak untuk ke sekolah dan memastikan mereka terus berkembang dengan positif dalam persekitaran pembelajaran mereka. Teruskan usaha murni anda, ibu bapa sekalian 🙂

Jika ada apa-apa pertanyaan, atau kalau ada masalah yang khusus yang menyebabkan kesukaran untuk belajar dan ke sekolah boleh hubungi +013-249 0069.
```

- [ ] **Step 3: Write `a-fulfilling-career-awaits.md`**

```markdown
---
title: "A Fulfilling Career Awaits: Join Us as a Special Education Teacher!"
slug: a-fulfilling-career-awaits
id: a-fulfilling-career-awaits
date: 2025-01-23
category: Career
read_time: 2 min read
tags: [urbaneethos, special needs]
hero_image: assets/img/scraped/blog-a-fulfilling-career-awaits.jpg
lang: en
source_url: https://www.urbaneethos.center/post/a-fulfilling-career-awaits-join-us-as-a-special-education-teacher
excerpt: Are you passionate about making a difference in the lives of neurodiverse children and individuals with special needs? We have the perfect opportunity for you.
featured: true
---

Are you passionate about making a difference in the lives of neurodiverse children and individuals with special needs? Do you thrive in a collaborative, dynamic environment where every day brings opportunities to inspire and create positive change? If so, we have the perfect opportunity for you!

### About the Role

We are currently seeking a Special Education Teacher to join our multidisciplinary team of therapists and educators. In this role, you will teach and support children, teenagers, and/or adults with developmental delays, movement difficulties, speech and learning challenges, or other special needs. Your primary mission will be to foster their social, emotional, intellectual, and physical development while collaborating closely with other professionals.

### What We're Looking For

To be successful in this role, you should possess the following:

- **Qualifications:** A Professional Certificate, Advanced/Higher/Graduate Diploma, Bachelor's Degree, or Advanced Degree in Special Education or related allied health courses.
- **Experience:** 1–2 years of relevant experience; fresh graduates with strong center-based volunteering experience are also welcome.
- **Language Skills:** Fluency in English and Malay is essential. Mandarin and Tamil language skills are a bonus.
- **Personal Qualities:** A positive attitude, passion for teamwork, and excellent interpersonal skills.
- **Professional Skills:** Outstanding written and verbal communication, adaptability, problem-solving abilities, and leadership capabilities. You should be a critical thinker who can navigate challenges with innovative solutions.

### Your Responsibilities

As a Special Education Teacher, your day-to-day responsibilities will include:

- Assessing students' abilities and limitations to create tailored individual and group classroom plans.
- Teaching and guiding students while promoting their overall development.
- Coordinating care and lessons at the center and at home, working closely with families.
- Building strong, respectful rapport with students and their families.
- Writing and presenting professional reports in English and Malay for consultations and external parties.
- Contributing proactively to enhance service quality and student progress.
- Collaborating with a multidisciplinary team and initiating discussions to optimize lesson plans.

### Why Join Us?

We offer a comprehensive benefits package to ensure your well-being and career growth:

- **Immediate Benefits:** EPF & SOCSO coverage, medical insurance, and annual leave.
- **Performance Bonuses:** Annual bonuses based on performance and attitude.
- **Professional Development:** Continuing education opportunities through in-house and external training.
- **Additional Perks:** Medical and hospitalization leave. Mental health benefits and parking allowances (upon confirmation).

### Be Part of a Life-Changing Team

This is more than just a job; it's an opportunity to transform lives every day. If you are empathetic, responsible, and eager to make a meaningful impact, we encourage you to apply. Join us in creating a brighter future for individuals with special needs—and for yourself.

Apply today to start your rewarding journey in special education! Send in your resumes to <urbaneethos@yahoo.com>.
```

- [ ] **Step 4: Write `an-opportunity-to-learn-grow.md`**

```markdown
---
title: "An Opportunity to Learn & Grow: On the Search for Speech-Language Therapists"
slug: an-opportunity-to-learn-grow
id: an-opportunity-to-learn-grow
date: 2024-06-28
category: Career
read_time: 1 min read
tags: [urbaneethos, speech therapy]
hero_image: assets/img/scraped/blog-an-opportunity-to-learn-grow.webp
lang: en
source_url: https://www.urbaneethos.center/post/an-opportunity-to-learn-grow-on-the-search-for-speech-language-therapists
excerpt: We're excited to welcome fresh graduates and experienced professionals to join our multidisciplinary team of speech-language therapists.
featured: false
---

Are you passionate about making a difference in people's lives? We're excited to welcome fresh graduates and experienced professionals to join our multidisciplinary team! At our center, we've dedicated 20 years to supporting children and adolescents with developmental delays and learning disabilities in Selangor. As we are looking to expand our services to cater to Vocational Training for adolescents and young adults as well as geriatric care in 2025-2026, we're looking for dedicated speech-language therapists to join us on this journey.

### Why Join Us?

- **Multidisciplinary Team:** Work alongside clinical psychologists, occupational therapists, and special education teachers in a collaborative environment.
- **Career Growth:** Enjoy continuous education benefits and opportunities for clinical growth.
- **Attractive Benefits:** We offer a competitive benefit package and pay that reflects your skills and experience.

If you're ready to make a meaningful impact and grow professionally in a supportive environment, apply today and be a part of our mission to empower individuals of all ages. Together, we can make a difference in the lives of those we serve.

Apply Now: <https://forms.gle/mdrQYQBWtKu73Mky7>

Join us in transforming lives through compassionate care and professional excellence. Please email us your application at <urbaneethos@yahoo.com> and/or contact Ms. Airah via WhatsApp at +60 13 249 0069.
```

- [ ] **Step 5: Write `year-end-promo.md`** (migrates the existing promo page)

```markdown
---
title: Our Annual Year End Promo & First Intake Special Deals
slug: year-end-promo
id: year-end-promo-first-intake-deals
date: 2025-12-01
category: Promo
read_time: 1 min read
tags: [urbaneethos, promo]
hero_image:
lang: en
source_url:
excerpt: Our Annual Year End Promo! Full assessment at 20% off — plus First Intake bundle packages at 25% off. Contact 013-249 0069.
featured: false
---

**Our Annual Year End Promo! Full assessment at 20% off.**

**Special Deals — First Intake — bundle packages 25% off! Contact 013-249 0069.**
```

- [ ] **Step 6: Commit**

```bash
git add content/blog/posts/
git commit -m "content(blog): add 5 Markdown post sources (4 scraped + promo migration)"
```

---

## Task 6: Generate, wire, and verify

**Files:**
- Modify (generated): `content/blog.json`, `post-year-end-promo.html`
- Create (generated): `post-what-does-sensory-have-to-do-with-my-feelings.html`, `post-anak-dah-masuk-sekolah.html`, `post-a-fulfilling-career-awaits.html`, `post-an-opportunity-to-learn-grow.html`

- [ ] **Step 1: Run the generator**

Run: `ruby bin/build-blog.rb`
Expected output (order may vary):
```
wrote post-a-fulfilling-career-awaits.html
wrote post-an-opportunity-to-learn-grow.html
wrote post-anak-dah-masuk-sekolah.html
wrote post-what-does-sensory-have-to-do-with-my-feelings.html
wrote post-year-end-promo.html
wrote content/blog.json (5 posts)
```
Exit 0.

- [ ] **Step 2: Verify idempotency (re-run produces no diff)**

```bash
ruby bin/build-blog.rb
git diff --stat
```
Expected: after the first run's changes are staged/committed, a second run leaves the working tree clean for the generated files (no spurious diff). If `blog.json` re-orders keys on each run, fix key ordering in the generator before proceeding.

- [ ] **Step 3: Verify blog.json posts all became local**

Run: `ruby -rjson -e 'p JSON.parse(File.read("content/blog.json"))["posts"].map { |x| [x["id"], x["localUrl"], x.key?("externalUrl")] }'`
Expected: all 5 posts have a `localUrl` of the form `./post-<slug>.html` and `false` for `externalUrl` presence. `featured` top-level array unchanged.

- [ ] **Step 4: Verify each generated page has full chrome + correct lang**

```bash
for f in post-what-does-sensory-have-to-do-with-my-feelings.html post-anak-dah-masuk-sekolah.html post-a-fulfilling-career-awaits.html post-an-opportunity-to-learn-grow.html post-year-end-promo.html; do
  echo "== $f =="
  grep -c 'class="site-header"' "$f"
  grep -c 'assets/js/chatbot.js' "$f"
  grep -o '<html lang="[a-z]*"' "$f" | head -1
done
```
Expected: each file prints `1`, `1`, and its `<html lang="...">` — `post-anak-dah-masuk-sekolah.html` must show `lang="ms"`; the other four `lang="en"`.

- [ ] **Step 5: Verify i18n parity still green**

Run: `ruby bin/check-i18n-parity.rb`
Expected: exit 0.

- [ ] **Step 6: Smoke-test in the browser**

```bash
bin/server &
SRV=$!
sleep 1
curl -s localhost:8080/blog.html >/dev/null && echo "blog ok"
for f in post-what-does-sensory-have-to-do-with-my-feelings post-anak-dah-masuk-sekolah post-a-fulfilling-career-awaits post-an-opportunity-to-learn-grow post-year-end-promo; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "localhost:8080/$f.html"); echo "$f -> $code"
done
kill $SRV
```
Expected: `blog ok` and every post returns `200`.

- [ ] **Step 7: axe-core sweep over the 5 post pages (0 violations target)**

```bash
bin/server &
SRV=$!
sleep 1
for p in post-what-does-sensory-have-to-do-with-my-feelings post-anak-dah-masuk-sekolah post-a-fulfilling-career-awaits post-an-opportunity-to-learn-grow post-year-end-promo; do
  echo "=== $p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p.html" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done
kill $SRV
```
Expected: 0 violations on each. If ChromeDriver mismatches, see `docs/A11Y_NOTES.md` § "Tooling".

- [ ] **Step 8: Commit generated output**

```bash
git add content/blog.json post-*.html
git commit -m "feat(blog): generate 5 local post pages and wire blog.json to local URLs"
```

---

## Task 7: Document the workflow

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `docs/HANDOVER.md`

- [ ] **Step 1: Add a "Blog generator" note to README.md**

Under the run/test section (near the `bin/` commands), add:

```markdown
### Blog posts

Blog articles are authored as Markdown in `content/blog/posts/*.md` (YAML
frontmatter + body) and generated to static `post-<slug>.html` pages plus the
`content/blog.json` `posts[]` index by:

    ruby bin/build-blog.rb

Requires the `kramdown` dev gem (`bundle install`). The generator is
authoring-time only — deployment serves the committed `post-*.html` as-is.
To add a post: drop a new `.md` in `content/blog/posts/`, run the generator,
commit the generated files.
```

- [ ] **Step 2: Add a routing/gotcha note to CLAUDE.md**

In the "Pages and routing" section, after the `post-year-end-promo.html` sentence, add:

```markdown
Blog article pages (`post-*.html`) are **generated** from `content/blog/posts/*.md`
by `bin/build-blog.rb` (kramdown, dev-group gem) through `content/blog/_post.html.erb`.
Do not hand-edit `post-*.html` or the `posts[]` array in `content/blog.json` — edit the
Markdown source and re-run the generator. Blog bodies are single-language per source
(EN, plus one BM post) and remain parity-exempt.
```

- [ ] **Step 3: Add a HANDOVER.md entry**

Add a dated bullet under the current-state section noting: blog posts now generated locally from Markdown; 4 external deep-links converted to local pages; `bin/build-blog.rb` + `content/blog/` added; kramdown dev dep.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md docs/HANDOVER.md
git commit -m "docs: document the Markdown blog generator workflow"
```

---

## Self-Review Notes

- **Spec coverage:** generator (T3) ✓, ERB template (T4) ✓, Markdown sources incl. promo migration (T5) ✓, blog.json rewrite to localUrl (T3 logic + T6 run) ✓, kramdown dev-only (T1) ✓, BM stays BM (T5 step 2, `lang: ms`) ✓, no visible provenance (source_url in frontmatter, not rendered by template) ✓, deploy unchanged (no CI edits) ✓, verification incl. axe (T6) ✓.
- **Type consistency:** `BlogGen.parse` returns `[fm, body]`; tests and `build` both consume that shape. `index_entry` keys match what T6 step 3 asserts. `render(fm, body_html, template_src)` locals match the ERB's `fm` / `body_html` references.
- **Naming:** `post-<slug>.html` used consistently; promo keeps `post-year-end-promo.html` via `slug: year-end-promo`. blog.json `id` for promo becomes `year-end-promo-first-intake-deals` (explicit `id:` in frontmatter) — nothing references the old id in `featured[]`, so no break.
```
