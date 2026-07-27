# Blog generator: Markdown → static HTML posts

**Date:** 2026-07-28
**Status:** Approved design, pending implementation
**Author:** brainstormed with Rudzainy

## Problem

The live site `urbaneethos.center/blog` has 4 real articles that currently only
exist in this prototype as `externalUrl` deep-links in `content/blog.json` —
clicking a blog card leaves the site. We want each article as a local static
page, and we want a repeatable way to author future posts with a **consistent
layout** without hand-copying the full page chrome every time (the pattern that
produced `post-year-end-promo.html`).

## Decision summary (from brainstorming)

- **Not Bridgetown.** The repo is deliberately no-build static HTML; a full SSG
  reverses that and fights a one-collection job. Instead: a lightweight Ruby
  generator that emits committed static HTML. Deployment stays pure static.
- **Markdown per post** as the authoring format.
- **kramdown** (pure-Ruby, no C ext) as the Markdown→HTML lib, in a Gemfile
  `:development` group — authoring-time only, never needed by `bin/server` or
  the Pages deploy.
- **BM post stays BM-only.** Article bodies render in their source language
  (3 EN + 1 Bahasa Malaysia), matching the live site and the repo's existing
  rule that blog content is EN-only / parity-exempt. No body translation.
- **No visible provenance link.** `source_url` kept in frontmatter only.

## Scope

**In scope:**
- 4 new post source files + regenerating the existing promo post from the same
  template (5 posts total from one layout).
- `bin/build-blog.rb` generator + `content/blog/_post.html.erb` template.
- Rewrite of `content/blog.json` `posts[]` so cards point at the local pages.

**Out of scope:**
- Translating article bodies. Pagination/taxonomy plugins. Any CI/deploy change.
- Touching the "10 production pages" canggih counts or axe target (blog posts
  are not part of that set — the existing promo page isn't either).

## Architecture

### Source of truth — one Markdown file per post
```
content/blog/posts/<slug>.md
```
YAML frontmatter + Markdown body. Frontmatter fields:

| field | example | notes |
|---|---|---|
| `title` | `What does Sensory have to do with my feelings?` | rendered `<h1>` + `<title>` |
| `slug` | `what-does-sensory-have-to-do-with-my-feelings` | drives output filename `post-<slug>.html` |
| `date` | `2024-11-04` | ISO; rendered + sorted on |
| `category` | `Development` | must exist in `blog.json` categories |
| `read_time` | `3 min read` | from live metadata |
| `tags` | `[urbaneethos, occupational therapy, development]` | mirrors blog.json |
| `hero_image` | `assets/img/scraped/blog-what-does-sensory-have-to-do-with-my-feelings.webp` | existing scraped thumb; nullable |
| `lang` | `en` \| `ms` | sets `<html lang>` per page |
| `source_url` | `https://www.urbaneethos.center/post/...` | provenance, not rendered |
| `excerpt` | one-line summary | mirrors blog.json card excerpt |
| `featured` | `true`/absent | mirrors blog.json `featured[]` membership |

### The generator — `bin/build-blog.rb`
- Ruby ≥ 3.1 + `kramdown` + stdlib `erb`, `yaml`, `json`.
- For each `content/blog/posts/*.md`:
  1. Parse frontmatter + body.
  2. `Kramdown::Document.new(body).to_html` for the article HTML.
  3. Render through `content/blog/_post.html.erb` → write `post-<slug>.html`
     at repo root.
- After all posts: rebuild `content/blog.json` `posts[]` from frontmatter
  (localUrl for each, sorted by date desc), preserving the existing top-level
  `_meta`, `hero`, `categories`, and `featured` keys. Never drops the existing
  hand-maintained non-post keys.
- Idempotent and deterministic (stable key order) so re-runs produce no spurious
  diff. Exit non-zero on: missing required frontmatter field, category not in
  blog.json categories, or duplicate slug.

### Template — `content/blog/_post.html.erb`
Byte-for-byte the chrome of `post-year-end-promo.html`:
- `<!doctype html><html lang="<%= lang %>" data-fs="1">`
- 4-file CSS load order (tokens → base → components → motion).
- Skip-link, `.site-header` with nav + locale/fs tools, `.site-footer`,
  chatbot launcher.
- `<main id="main"><article class="section"><div class="wrap"
  style="max-width:var(--content-max)">` containing:
  eyebrow (category) · `<h1>` title · `<small>date · read_time</small>` ·
  optional hero `<img>` · the kramdown body HTML ·
  Contact + "Back to the blog" CTA buttons.
- The same module import block as the promo page (i18n, consent, a11y, nav,
  icons, page-load, cursor, chatbot — **no parallax**) + the `renderChrome()`
  footer-hours/translate script.

### Content sourcing
The 4 article bodies were scraped from the live site into scratchpad; they get
hand-cleaned into Markdown (drop Wix nav/footer/"Recent Posts" cruft, keep the
article prose, headings, lists, reference lists, and inline links). External
links (Google Forms apply link, bit.ly workshop link, mailto/WhatsApp) are kept
as real links in the body.

## The 5 posts

| slug | lang | date | category |
|---|---|---|---|
| `what-does-sensory-have-to-do-with-my-feelings` | en | 2024-11-04 | Development |
| `anak-dah-masuk-sekolah` | ms | 2025-03-13 | Parenting |
| `a-fulfilling-career-awaits` | en | 2025-01-23 | Career |
| `an-opportunity-to-learn-grow` | en | 2024-06-28 | Career |
| `year-end-promo-first-intake-deals` (→ file stays `post-year-end-promo.html`) | en | 2025-12-01 | Promo |

The promo keeps its existing output filename (`post-year-end-promo.html`) via an
explicit `slug: year-end-promo` in its frontmatter, so no inbound link breaks.

## Deploy / CI

No change. Generated `post-*.html` are committed and served by the existing
`.github/workflows/pages.yml` / `.gitlab-ci.yml` rsync. The generator is a local
authoring tool; CI still only runs `bin/check-i18n-parity.rb`. `content/blog.json`
stays EN-only and parity-exempt (root-level glob), so the parity gate is unaffected.

## Verification

1. `bundle install` picks up kramdown (dev group).
2. `ruby bin/build-blog.rb` runs clean, exits 0, regenerates 5 pages + blog.json.
3. Re-running the generator produces **no git diff** (idempotent).
4. `bin/check-i18n-parity.rb` still exits 0.
5. `bin/server` + open each of the 5 posts and `blog.html`: cards link to local
   pages, pages render with full chrome, BM post shows `lang="ms"`.
6. axe-core sweep over the 5 post pages: 0 violations (reuses audited components).

## Execution method

Per request: subagent-driven development with **Fable 5 orchestrating** —
Fable as architect/delegator, Opus subagents doing generation (template,
generator script, 5 markdown posts), then a verification subagent runs the
checks above.
