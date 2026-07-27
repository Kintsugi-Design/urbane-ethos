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
