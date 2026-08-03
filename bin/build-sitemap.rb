#!/usr/bin/env ruby
# frozen_string_literal: true

# Sitemap generator: writes sitemap.xml at the repo root from the static
# production pages + the generated blog posts (content/blog.json posts[]).
# Authoring-time tool — re-run after adding pages or posts:  ruby bin/build-sitemap.rb
#
# ORIGIN is the canonical production origin. It is the ONE deliberate exception
# to the project's all-relative-path convention: <loc> URLs in a sitemap MUST be
# absolute. If the canonical domain changes, change it here and re-run.

require "json"

ORIGIN = "https://urbaneethos.center"
ROOT   = File.expand_path("..", __dir__)

# Indexable static pages (path => rough change cadence). Deliberately EXCLUDES:
#   - analytics.html  (demo dashboard, not real content)
#   - careers.html    (unlinked / direct-URL only, pending client placement)
#   - 404.html        (error page)
STATIC = {
  ""                          => "monthly",
  "about.html"                => "monthly",
  "staff.html"                => "monthly",
  "services.html"             => "monthly",
  "blog.html"                 => "weekly",
  "contact.html"              => "monthly",
  "privacy.html"              => "yearly",
  "post-year-end-promo.html"  => "yearly"
}.freeze

def loc(path)
  "#{ORIGIN}/#{path}"
end

blog = JSON.parse(File.read(File.join(ROOT, "content", "blog.json")))
post_urls = (blog["posts"] || [])
  .map { |p| p["localUrl"].to_s.sub(%r{\A\./}, "") }
  .reject(&:empty?)
  .uniq

entries = STATIC.map { |path, freq| [loc(path), freq] }
entries += post_urls.map { |u| [loc(u), "yearly"] }

xml = +%(<?xml version="1.0" encoding="UTF-8"?>\n)
xml << %(<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n)
entries.each do |url, freq|
  xml << "  <url>\n    <loc>#{url}</loc>\n    <changefreq>#{freq}</changefreq>\n  </url>\n"
end
xml << "</urlset>\n"

File.write(File.join(ROOT, "sitemap.xml"), xml)
puts "wrote sitemap.xml (#{entries.size} URLs)"
