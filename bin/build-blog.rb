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
    by_date = parsed.sort_by { |fm, _| fm["date"].to_s }.reverse
    blog["posts"] = by_date.map { |fm, _| index_entry(fm) }
    # Derive featured[] from the `featured: true` frontmatter flag (date desc),
    # so the flag is authoritative instead of a silent no-op.
    blog["featured"] = by_date.map { |fm, _| index_entry(fm)["id"] if fm["featured"] }.compact
    File.write(BLOG_JSON, JSON.pretty_generate(blog) + "\n")
    puts "wrote content/blog.json (#{parsed.size} posts)"
  end
end

BlogGen.build if __FILE__ == $PROGRAM_NAME
