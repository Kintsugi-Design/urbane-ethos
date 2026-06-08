# Urbane Ethos Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an interactive HTML prototype of the urbaneethos.center revamp into `urbane-ethos/` with bilingual EN/BM, mocked-but-interactive chatbot + personalization, PDPA consent banner, WCAG 2.2 AA accessibility, and three Direction comparison demos (B committed, A & C as artifacts).

**Architecture:** Pure HTML/CSS/JS, no build step, no bundler. Ruby + WEBrick for local dev. 8 public pages, content in mirrored EN/MS JSON trees, design tokens from Direction B "Warm & Handcrafted". JS modules are ES modules. Tests are a mix of TDD (Ruby parity script), browser-runnable smoke pages (JS modules), and axe-core (a11y).

**Tech Stack:** HTML5, modern CSS (cascade layers, custom properties, `clamp()`), vanilla ES modules, Ruby 3.4 + `webrick` gem (dev server only), `@axe-core/cli` via `npx` (one-off a11y audit).

**Spec:** `urbane-ethos/docs/superpowers/specs/2026-06-08-urbane-ethos-revamp-design.md`

---

## File Structure

```
urbane-ethos/
  .git/                              (Task 1)
  .gitignore                         (Task 1)
  README.md                          (Task 1, finalized in Task 23)
  Gemfile                            (Task 1)
  Gemfile.lock                       (Task 1, after bundle install)
  bin/
    server                           (Task 1)
    check-i18n-parity.rb             (Task 2)
  content/
    glossary.md                      (Task 4)
    blog.json                        (Task 3)
    scraped-raw/                     (Task 3, gitignored)
    en/
      common.json                    (Task 3)
      home.json                      (Task 3)
      about.json                     (Task 3)
      staff.json                     (Task 3)
      services.json                  (Task 3)
      contact.json                   (Task 3)
      chatbot.json                   (Task 13, drafted in Task 3)
      consent.json                   (Task 12, drafted in Task 3)
      privacy.json                   (Task 12, drafted in Task 3)
    ms/                              (Task 4, mirrors en/)
  assets/
    img/scraped/                     (Task 3)
    img/placeholders/                (Task 3)
    fonts/                           (Task 9)
    css/
      tokens.css                     (Task 9)
      base.css                       (Task 9)
      components.css                 (Task 9, extended through Tasks 16-21)
      motion.css                     (Task 9)
    js/
      i18n.js                        (Task 10)
      a11y.js                        (Task 11)
      consent.js                     (Task 12)
      chatbot.js                     (Task 13)
      personalization.js             (Task 14)
      analytics-demo-data.js         (Task 15)
  design/directions/
    v2-warm/system.html              (Task 5)
    v2-warm/index.html               (Task 6)
    v1-quiet/index.html              (Task 7)
    v3-bold/index.html               (Task 8)
  test/
    parity-fixtures/                 (Task 2)
    smoke/                           (Tasks 10-14, one smoke page per JS module)
  index.html                         (Task 16)
  about.html                         (Task 17)
  staff.html                         (Task 18)
  services.html                      (Task 19)
  blog.html                          (Task 20)
  contact.html                       (Task 21)
  analytics.html                     (Task 15)
  privacy.html                       (Task 12)
  docs/superpowers/
    specs/2026-06-08-urbane-ethos-revamp-design.md  (already exists)
    plans/2026-06-08-urbane-ethos-revamp.md         (this file)
```

---

## Task 1: Repo init + skeleton

**Files:**
- Create: `urbane-ethos/.gitignore`
- Create: `urbane-ethos/Gemfile`
- Create: `urbane-ethos/bin/server`
- Create: `urbane-ethos/README.md` (initial scaffold; finalized in Task 23)

- [ ] **Step 1: Initialize git**

```bash
cd /Users/deepsight/code/urbane-ethos
git init -b main
```

Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Write `.gitignore`**

```
.DS_Store
*.log
.vscode/
vendor/bundle/
.bundle/
content/scraped-raw/
```

- [ ] **Step 3: Write `Gemfile`**

```ruby
source "https://rubygems.org"

ruby ">= 3.1"

gem "webrick", "~> 1.8"
```

- [ ] **Step 4: Write `bin/server`**

```ruby
#!/usr/bin/env ruby
require "webrick"

root = File.expand_path("..", __dir__)
port = ENV.fetch("PORT", 8080).to_i

server = WEBrick::HTTPServer.new(
  Port: port,
  DocumentRoot: root,
  AccessLog: [[$stderr, WEBrick::AccessLog::COMMON_LOG_FORMAT]]
)

trap("INT") { server.shutdown }
puts "Serving #{root} at http://localhost:#{port}"
server.start
```

Then: `chmod +x bin/server`.

- [ ] **Step 5: Write initial `README.md` scaffold**

```markdown
# Urbane Ethos — Website Revamp Prototype

Phase 2 prototype for the urbaneethos.center website revamp.
Live site: https://www.urbaneethos.center/

## Run locally

    bundle install
    bin/server
    # open http://localhost:8080

## Status

Work in progress. See `docs/superpowers/plans/2026-06-08-urbane-ethos-revamp.md`.
```

- [ ] **Step 6: Install gems and verify server runs**

```bash
cd /Users/deepsight/code/urbane-ethos
bundle install
bin/server &
sleep 1
curl -sI http://localhost:8080/README.md | head -n 1
kill %1
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 7: Commit**

```bash
git add .gitignore Gemfile Gemfile.lock bin/server README.md
git commit -m "chore: init repo skeleton with Ruby+WEBrick dev server"
```

---

## Task 2: i18n parity script (TDD)

**Files:**
- Create: `urbane-ethos/bin/check-i18n-parity.rb`
- Create: `urbane-ethos/test/parity-fixtures/good/en/home.json`
- Create: `urbane-ethos/test/parity-fixtures/good/ms/home.json`
- Create: `urbane-ethos/test/parity-fixtures/missing-ms/en/home.json`
- Create: `urbane-ethos/test/parity-fixtures/missing-ms/ms/home.json`
- Create: `urbane-ethos/test/parity-fixtures/run.sh`

- [ ] **Step 1: Write fixtures — `good/en/home.json`**

```json
{
  "hero": { "title": "Welcome", "cta": "Find Out More" },
  "_meta": { "translatedBy": null }
}
```

- [ ] **Step 2: Write `good/ms/home.json`**

```json
{
  "hero": { "title": "Selamat Datang", "cta": "Ketahui Lebih Lanjut" },
  "_meta": { "translatedBy": "claude-opus-4-7" }
}
```

- [ ] **Step 3: Write `missing-ms/en/home.json`**

```json
{
  "hero": { "title": "Welcome", "cta": "Find Out More" }
}
```

- [ ] **Step 4: Write `missing-ms/ms/home.json`**

```json
{
  "hero": { "title": "Selamat Datang" }
}
```

- [ ] **Step 5: Write `test/parity-fixtures/run.sh`**

```bash
#!/usr/bin/env bash
set -e

PASS=0
FAIL=0

run_case() {
  local name="$1"
  local dir="$2"
  local expected_code="$3"

  set +e
  bin/check-i18n-parity.rb "$dir/en" "$dir/ms" > /dev/null 2>&1
  local actual=$?
  set -e

  if [ "$actual" -eq "$expected_code" ]; then
    echo "PASS: $name (exit $actual)"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $name (expected $expected_code, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

run_case "good fixtures parity" test/parity-fixtures/good 0
run_case "missing ms keys"       test/parity-fixtures/missing-ms 1

echo
echo "$PASS passed, $FAIL failed"
exit "$FAIL"
```

Then: `chmod +x test/parity-fixtures/run.sh`.

- [ ] **Step 6: Run tests — confirm they fail (script doesn't exist yet)**

```bash
test/parity-fixtures/run.sh
```

Expected: both cases FAIL because `bin/check-i18n-parity.rb` doesn't exist.

- [ ] **Step 7: Write `bin/check-i18n-parity.rb`**

```ruby
#!/usr/bin/env ruby
require "json"

en_dir = ARGV[0] || "content/en"
ms_dir = ARGV[1] || "content/ms"

def walk_keys(obj, prefix = "")
  case obj
  when Hash
    obj.flat_map do |k, v|
      next [] if k == "_meta"
      path = prefix.empty? ? k.to_s : "#{prefix}.#{k}"
      [path] + walk_keys(v, path)
    end
  else
    []
  end
end

def load_keys(dir)
  unless Dir.exist?(dir)
    abort "Directory not found: #{dir}"
  end

  Dir.glob(File.join(dir, "*.json")).each_with_object({}) do |path, acc|
    name = File.basename(path, ".json")
    data = JSON.parse(File.read(path))
    acc[name] = walk_keys(data).sort
  end
end

en = load_keys(en_dir)
ms = load_keys(ms_dir)

problems = []

(en.keys | ms.keys).sort.each do |file|
  en_keys = en[file] || []
  ms_keys = ms[file] || []

  only_en = en_keys - ms_keys
  only_ms = ms_keys - en_keys

  only_en.each { |k| problems << "#{file}.json: missing in ms/: #{k}" }
  only_ms.each { |k| problems << "#{file}.json: missing in en/: #{k}" }
end

if problems.empty?
  puts "i18n parity OK (#{en.keys.size} files)"
  exit 0
else
  problems.each { |p| warn p }
  warn "\n#{problems.size} parity issue(s)"
  exit 1
end
```

Then: `chmod +x bin/check-i18n-parity.rb`.

- [ ] **Step 8: Run tests — confirm both pass**

```bash
test/parity-fixtures/run.sh
```

Expected: `2 passed, 0 failed`.

- [ ] **Step 9: Commit**

```bash
git add bin/check-i18n-parity.rb test/parity-fixtures/
git commit -m "feat: add Ruby i18n parity check with fixture-based tests"
```

---

## Task 3: Scrape live site (EN content)

**Files:**
- Create: `urbane-ethos/content/scraped-raw/*.html` (gitignored cache)
- Create: `urbane-ethos/content/en/common.json`
- Create: `urbane-ethos/content/en/home.json`
- Create: `urbane-ethos/content/en/about.json`
- Create: `urbane-ethos/content/en/staff.json`
- Create: `urbane-ethos/content/en/services.json`
- Create: `urbane-ethos/content/en/contact.json`
- Create: `urbane-ethos/content/en/chatbot.json` (draft, refined in Task 13)
- Create: `urbane-ethos/content/en/consent.json` (draft, refined in Task 12)
- Create: `urbane-ethos/content/en/privacy.json` (draft, refined in Task 12)
- Create: `urbane-ethos/content/blog.json` (EN-only)
- Create: `urbane-ethos/assets/img/scraped/` + downloaded images

- [ ] **Step 1: Cache raw HTML for the 6 public pages**

```bash
mkdir -p urbane-ethos/content/scraped-raw urbane-ethos/assets/img/scraped urbane-ethos/assets/img/placeholders

for path in "" about staff services blog contact; do
  out="urbane-ethos/content/scraped-raw/${path:-home}.html"
  curl -sSL -A "Mozilla/5.0 urbane-ethos-revamp" \
    "https://www.urbaneethos.center/${path}" -o "$out"
  echo "saved $out ($(wc -c < "$out") bytes)"
done
```

Expected: 6 HTML files, all > 0 bytes.

- [ ] **Step 2: Extract content into `content/en/common.json`**

Structure (populate values from scraped HTML — header, footer, nav labels, CTAs, a11y strings):

```json
{
  "_meta": { "source": "urbaneethos.center", "scrapedAt": "2026-06-08" },
  "nav": {
    "about": "About",
    "staff": "Staff",
    "services": "Services",
    "events": "Events",
    "blog": "Blog",
    "contact": "Contact",
    "more": "More",
    "bookNow": "Book Now",
    "skipToContent": "Skip to content",
    "menu": "Open menu",
    "menuClose": "Close menu"
  },
  "locale": {
    "switchToEnglish": "EN",
    "switchToMalay": "BM",
    "currentLabel": "Current language",
    "blogNotice": "Site navigation translates; blog articles remain in English."
  },
  "fontSize": {
    "label": "Text size",
    "values": ["A", "A+", "A++"]
  },
  "footer": {
    "address": "4, Jalan Elektron U16/E, Denai Alam, 40160 Shah Alam",
    "phone1": "+603-7734 3044",
    "phone2": "+6013-249 0069",
    "hoursLabel": "Hours",
    "hours": [
      "Monday: 12PM – 6PM",
      "Tuesday – Saturday: 9AM – 6PM"
    ],
    "social": { "facebook": "Facebook", "instagram": "Instagram" },
    "rights": "© Urbane Ethos Early Intervention Center",
    "manageCookies": "Manage cookies",
    "privacy": "Privacy notice",
    "analyticsDemo": "Analytics demo"
  },
  "cta": {
    "findOutMore": "Find Out More",
    "bookSession": "Book a session",
    "talkToUs": "Talk to us",
    "viewServices": "View services",
    "meetStaff": "Meet our team",
    "contactUs": "Contact us"
  },
  "a11y": {
    "openChatbot": "Open chat assistant",
    "closeChatbot": "Close chat assistant",
    "personalizationReset": "Reset personalization",
    "playVideoPlaceholder": "Play introduction video",
    "videoUnavailable": "Video coming soon"
  }
}
```

- [ ] **Step 3: Extract `content/en/home.json`**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "hero": {
    "eyebrow": "Urbane Ethos",
    "title": "Early Intervention Center",
    "subtitle": "<PASTE VERBATIM SUBHEAD FROM SCRAPE>",
    "primaryCta": "Find Out More",
    "secondaryCta": "Watch our intro"
  },
  "personalization": {
    "heading": "Tell us a little about your child",
    "subheading": "Skip if you'd rather browse on your own.",
    "ageLabel": "Child's age",
    "ageOptions": ["0–2", "3–5", "6–9", "10+"],
    "concernLabel": "Main area of concern",
    "concernOptions": ["Speech", "Motor skills", "Behaviour", "Learning", "Not sure"],
    "stageLabel": "Where are you in your journey?",
    "stageOptions": ["Just exploring", "Looking to assess", "Ready to book"],
    "submit": "Show me what's relevant",
    "skip": "Skip"
  },
  "location": {
    "title": "Visit us",
    "address": "4, Jalan Elektron U16/E, Denai Alam, 40160 Shah Alam",
    "hours": [
      "Monday: 12PM – 6PM",
      "Tuesday – Saturday: 9AM – 6PM"
    ]
  },
  "services": {
    "heading": "How we can help",
    "items": [
      { "key": "screening", "title": "Screening or Assessment", "blurb": "<VERBATIM>" },
      { "key": "ot", "title": "Occupational Therapy", "blurb": "<VERBATIM>" },
      { "key": "speech", "title": "Speech Therapy", "blurb": "<VERBATIM>" },
      { "key": "specialed", "title": "Special Education", "blurb": "<VERBATIM>" },
      { "key": "eip", "title": "Early Intervention Program", "blurb": "<VERBATIM>" },
      { "key": "psych", "title": "Clinical Psychology", "blurb": "<VERBATIM>" }
    ]
  },
  "testimonial": {
    "quote": "<VERBATIM TESTIMONIAL>",
    "attribution": "<FIRST NAME, CHILD AGE BAND>"
  },
  "whatWeDo": {
    "heading": "What can we do for you?",
    "body": "<VERBATIM PARAGRAPH(S)>"
  },
  "staffFeatured": [
    { "id": "<staffId1>", "greeting": "Hi, I'm <Name>", "personalLine": "<ONE WARM SENTENCE>" },
    { "id": "<staffId2>", "greeting": "Hi, I'm <Name>", "personalLine": "<ONE WARM SENTENCE>" },
    { "id": "<staffId3>", "greeting": "Hi, I'm <Name>", "personalLine": "<ONE WARM SENTENCE>" }
  ],
  "events": {
    "heading": "Events",
    "blurb": "<VERBATIM>",
    "cta": "Get in touch"
  },
  "recommendedRail": {
    "heading": "Recommended for you",
    "subheading": "Based on what you shared earlier",
    "resetLabel": "Reset preferences"
  },
  "blog": {
    "heading": "From the blog",
    "viewAll": "View all articles"
  }
}
```

> Where `<VERBATIM ...>` appears: copy the corresponding text from `content/scraped-raw/home.html` verbatim. Where staff IDs appear: use slugified names (e.g. `dr-jane-doe`).

- [ ] **Step 4: Extract `content/en/about.json`**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "hero": { "title": "<VERBATIM>", "subtitle": "<VERBATIM>" },
  "mission": { "heading": "Our mission", "body": "<VERBATIM>" },
  "story": { "heading": "Our story", "body": "<VERBATIM>" },
  "values": {
    "heading": "What we stand for",
    "items": [
      { "title": "<VERBATIM>", "body": "<VERBATIM>" }
    ]
  },
  "ctas": { "services": "View services", "contact": "Get in touch" }
}
```

- [ ] **Step 5: Extract `content/en/staff.json`**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "hero": { "title": "Meet our team", "subtitle": "<VERBATIM>" },
  "members": [
    {
      "id": "<slug>",
      "name": "<VERBATIM>",
      "role": "<VERBATIM>",
      "credentials": ["<VERBATIM>"],
      "greeting": "Hi, I'm <First Name>",
      "personalLine": "<ONE WARM SENTENCE>",
      "bio": "<VERBATIM>",
      "photo": "assets/img/scraped/staff-<slug>.jpg",
      "video": null
    }
  ]
}
```

Repeat the object for every staff member found in `scraped-raw/staff.html`. Names/credentials are NOT translated downstream.

- [ ] **Step 6: Extract `content/en/services.json`**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "hero": { "title": "Services", "subtitle": "<VERBATIM>" },
  "items": [
    {
      "key": "screening",
      "title": "Screening or Assessment",
      "icon": "screening",
      "whatItIs": "<VERBATIM>",
      "whoItsFor": "<VERBATIM>",
      "whatToExpect": "<VERBATIM>",
      "faqs": [{ "q": "<COMMON QUESTION>", "a": "<ANSWER>" }],
      "cta": "Enquire about Screening"
    }
  ]
}
```

Six items total — one per service.

- [ ] **Step 7: Extract `content/en/contact.json`**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "hero": { "title": "Get in touch", "subtitle": "<VERBATIM>" },
  "address": {
    "heading": "Our centre",
    "line1": "4, Jalan Elektron U16/E",
    "line2": "Denai Alam, 40160 Shah Alam",
    "mapEmbedSrc": "https://www.google.com/maps/embed?pb=<EMBED CODE FROM SCRAPE>"
  },
  "phones": [
    { "label": "Reception", "number": "+603-7734 3044" },
    { "label": "WhatsApp", "number": "+6013-249 0069" }
  ],
  "hours": [
    "Monday: 12PM – 6PM",
    "Tuesday – Saturday: 9AM – 6PM"
  ],
  "form": {
    "heading": "Send us a message",
    "subheading": "Or chat with us live — bottom right.",
    "fields": {
      "nameLabel": "Your name",
      "emailLabel": "Email",
      "phoneLabel": "Phone (optional)",
      "concernLabel": "What's on your mind?",
      "submit": "Send",
      "namePlaceholder": "First and last name",
      "emailPlaceholder": "you@example.com",
      "phonePlaceholder": "Optional — for callbacks",
      "concernPlaceholder": "Tell us a little about your child"
    },
    "successNote": "Your default mail app will open with this message ready to send.",
    "errors": {
      "nameRequired": "Please enter your name.",
      "emailRequired": "We need an email to reply to.",
      "emailInvalid": "That email doesn't look right.",
      "concernRequired": "Please tell us what we can help with."
    }
  },
  "chatbotCta": {
    "heading": "Prefer to chat?",
    "body": "Our assistant can give you a price indication in a minute or two.",
    "button": "Chat with us"
  }
}
```

- [ ] **Step 8: Draft `content/en/chatbot.json` (decision tree skeleton)**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "ui": {
    "launchAria": "Open chat assistant",
    "panelTitle": "Urbane Ethos Assistant",
    "subtitle": "Friendly, fast, no pressure.",
    "inputPlaceholder": "Type a message…",
    "send": "Send",
    "micAria": "Speak instead of typing",
    "ttsAria": "Read responses aloud",
    "minimize": "Minimize",
    "close": "Close",
    "consentNotice": "Transcripts saved only if you opted in. Manage in footer.",
    "transcriptHeading": "Conversation"
  },
  "flow": {
    "start": {
      "say": "Hi! I can help with bookings, services, pricing, or pass you to a human. Where would you like to start?",
      "options": [
        { "label": "Book a session", "next": "book" },
        { "label": "Ask about a service", "next": "service" },
        { "label": "Pricing indication", "next": "price.q1" },
        { "label": "Talk to a human", "next": "human" }
      ]
    },
    "book": {
      "say": "Lovely. Tell me which service and when works for you, and we'll text you a confirmation.",
      "input": "free",
      "next": "human.collect"
    },
    "service": {
      "say": "Which service can I tell you about?",
      "options": [
        { "label": "Screening", "next": "service.screening" },
        { "label": "Occupational Therapy", "next": "service.ot" },
        { "label": "Speech Therapy", "next": "service.speech" },
        { "label": "Special Education", "next": "service.specialed" },
        { "label": "Early Intervention", "next": "service.eip" },
        { "label": "Clinical Psychology", "next": "service.psych" }
      ]
    },
    "service.screening": { "say": "<VERBATIM 2-SENTENCE SUMMARY>", "next": "start" },
    "service.ot": { "say": "<VERBATIM>", "next": "start" },
    "service.speech": { "say": "<VERBATIM>", "next": "start" },
    "service.specialed": { "say": "<VERBATIM>", "next": "start" },
    "service.eip": { "say": "<VERBATIM>", "next": "start" },
    "service.psych": { "say": "<VERBATIM>", "next": "start" },
    "price.q1": {
      "say": "Which service?",
      "options": [
        { "label": "Screening", "next": "price.q2", "set": { "service": "screening" } },
        { "label": "Occupational Therapy", "next": "price.q2", "set": { "service": "ot" } },
        { "label": "Speech Therapy", "next": "price.q2", "set": { "service": "speech" } }
      ]
    },
    "price.q2": {
      "say": "What's your child's age?",
      "options": [
        { "label": "0–2", "next": "price.q3", "set": { "age": "0-2" } },
        { "label": "3–5", "next": "price.q3", "set": { "age": "3-5" } },
        { "label": "6–9", "next": "price.q3", "set": { "age": "6-9" } },
        { "label": "10+", "next": "price.q3", "set": { "age": "10+" } }
      ]
    },
    "price.q3": {
      "say": "How often are you thinking?",
      "options": [
        { "label": "One-off / assessment", "next": "price.show", "set": { "freq": "one" } },
        { "label": "Weekly", "next": "price.show", "set": { "freq": "weekly" } },
        { "label": "Multiple times a week", "next": "price.show", "set": { "freq": "intensive" } }
      ]
    },
    "price.show": {
      "say": "Based on that, the typical range is <RM_RANGE_PLACEHOLDER — VERIFY WITH CENTER>. Want to confirm with the team?",
      "options": [
        { "label": "Yes, confirm with the team", "next": "human" },
        { "label": "Not yet", "next": "start" }
      ]
    },
    "human": {
      "say": "Of course. We'll WhatsApp you within 1 business day. What's your name and phone number?",
      "input": "name+phone",
      "next": "human.confirm"
    },
    "human.collect": {
      "say": "Got it. To confirm, what's your name and phone number?",
      "input": "name+phone",
      "next": "human.confirm"
    },
    "human.confirm": {
      "say": "Thanks! We'll be in touch shortly. (In this prototype, the message isn't actually sent.)",
      "options": [{ "label": "Back to start", "next": "start" }]
    }
  }
}
```

- [ ] **Step 9: Draft `content/en/consent.json`**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "banner": {
    "heading": "Your data choices",
    "body": "We collect a little information to make this site work well for you. Choose what's OK.",
    "acceptAll": "Accept all",
    "necessaryOnly": "Necessary only",
    "customize": "Customize",
    "save": "Save my choices",
    "manage": "Manage cookies",
    "readFullNotice": "Read the full privacy notice"
  },
  "toggles": {
    "necessary": {
      "label": "Necessary",
      "description": "Required for the site to work — your language choice, text size, and these consent settings.",
      "locked": "Always on"
    },
    "analytics": {
      "label": "Analytics",
      "description": "Anonymous counts of pages viewed and buttons clicked. Helps us improve the site."
    },
    "personalization": {
      "label": "Personalization",
      "description": "Your answers to the 'tell us about your child' prompt. This includes sensitive personal data; explicit consent only."
    },
    "chatbot": {
      "label": "Chat history",
      "description": "Keep your chat transcripts between visits. Off = session only."
    }
  },
  "ariaLive": "Cookie banner shown."
}
```

- [ ] **Step 10: Draft `content/en/privacy.json` (10 sections — see spec §5.8)**

```json
{
  "_meta": { "scrapedAt": "2026-06-08", "lastUpdated": "2026-06-08", "version": "0.1-prototype" },
  "header": {
    "title": "Privacy notice",
    "lastUpdated": "Last updated: 8 June 2026",
    "disclaimer": "Prototype-grade notice. Must be reviewed by Malaysian counsel before production launch."
  },
  "sections": [
    { "heading": "Who we are", "body": "Urbane Ethos Early Intervention Center, 4 Jalan Elektron U16/E, Denai Alam, 40160 Shah Alam. Contact: +603-7734 3044." },
    { "heading": "Data we collect", "body": "<VERBATIM SUMMARY OF FIVE CATEGORIES: visitor metadata, micro-survey, chatbot transcripts, contact-form submissions, cookies>" },
    { "heading": "Why we collect it", "body": "<VERBATIM>" },
    { "heading": "Sensitive personal data", "body": "If you tell us about your child's developmental concerns through the survey or chatbot, that is sensitive personal data under the PDPA. We only collect it with your explicit consent." },
    { "heading": "Retention", "body": "Session data is cleared when you close your browser. Persistent data (if you opted in) is kept for up to 12 months unless you ask us to delete it." },
    { "heading": "Third parties", "body": "We don't share your data with third parties in this prototype." },
    { "heading": "Your rights", "body": "You can ask to see, correct, or delete any data we hold about you. Email us at <CONTACT EMAIL FROM SCRAPE>." },
    { "heading": "Withdrawing consent", "body": "Open 'Manage cookies' at the bottom of any page to change your choices at any time." },
    { "heading": "Cookies & storage", "body": "We use browser storage for: language, text size, consent state, personalization answers (if opted in), and chat history (if opted in)." },
    { "heading": "Complaints", "body": "If you're unhappy with how we've handled your data, you may complain to Jabatan Perlindungan Data Peribadi (JPDP), Ministry of Communications, Malaysia." }
  ]
}
```

- [ ] **Step 11: Build `content/blog.json` (EN-only)**

```json
{
  "_meta": { "scrapedAt": "2026-06-08" },
  "hero": { "title": "From the blog" },
  "categories": ["All", "Speech", "Motor", "Behaviour", "Parenting"],
  "posts": [
    {
      "id": "<slug>",
      "title": "<VERBATIM>",
      "date": "<YYYY-MM-DD>",
      "category": "<one of above>",
      "excerpt": "<VERBATIM>",
      "thumbnail": "assets/img/scraped/blog-<slug>.jpg",
      "tags": ["<tag1>"],
      "externalUrl": "https://www.urbaneethos.center/post/<slug>"
    }
  ],
  "featured": ["<slug1>", "<slug2>", "<slug3>"]
}
```

- [ ] **Step 12: Download referenced images**

```bash
# For each image URL referenced in the scraped JSONs (staff photos, blog thumbnails,
# location photo), curl into assets/img/scraped/ with the slugified filename.
# Convert to WebP/AVIF/JPEG triplet if cwebp/avifenc are installed; otherwise leave as
# original and mark as a Phase 3 optimization task.
```

- [ ] **Step 13: Validate JSON parses cleanly**

```bash
cd /Users/deepsight/code/urbane-ethos
for f in content/en/*.json content/blog.json; do
  ruby -rjson -e "JSON.parse(File.read('$f')); puts '$f OK'"
done
```

Expected: all files print `OK`.

- [ ] **Step 14: Commit**

```bash
git add content/en/ content/blog.json assets/img/scraped/
git commit -m "feat(content): scrape EN content from urbaneethos.center"
```

---

## Task 4: Translate EN → BM (Phase 0b)

**Files:**
- Create: `urbane-ethos/content/glossary.md`
- Create: `urbane-ethos/content/ms/common.json`
- Create: `urbane-ethos/content/ms/home.json`
- Create: `urbane-ethos/content/ms/about.json`
- Create: `urbane-ethos/content/ms/staff.json`
- Create: `urbane-ethos/content/ms/services.json`
- Create: `urbane-ethos/content/ms/contact.json`
- Create: `urbane-ethos/content/ms/chatbot.json`
- Create: `urbane-ethos/content/ms/consent.json`
- Create: `urbane-ethos/content/ms/privacy.json`

- [ ] **Step 1: Write `content/glossary.md`**

```markdown
# EN → BM Glossary

Fixed translations applied before per-string translation. Do not translate these terms otherwise.

## Service names
- Early Intervention → Intervensi Awal
- Early Intervention Program → Program Intervensi Awal
- Screening or Assessment → Saringan atau Penilaian
- Occupational Therapy → Terapi Carakerja
- Speech Therapy → Terapi Pertuturan
- Special Education → Pendidikan Khas
- Clinical Psychology → Psikologi Klinikal

## Center
- Urbane Ethos Early Intervention Center → Pusat Intervensi Awal Urbane Ethos
- Center → Pusat
- Staff → Kakitangan
- Team → Pasukan

## Audience
- Child / Children → Anak / Kanak-kanak
- Parent / Parents → Ibu bapa
- Family → Keluarga

## CTAs
- Find Out More → Ketahui Lebih Lanjut
- Book Now → Tempah Sekarang
- Book a session → Tempah sesi
- Contact us → Hubungi kami
- Get in touch → Hubungi kami
- View services → Lihat perkhidmatan
- Meet our team → Temui pasukan kami

## Concerns
- Speech → Pertuturan
- Motor skills → Kemahiran motor
- Behaviour → Tingkah laku
- Learning → Pembelajaran
- Not sure → Tidak pasti

## Stages
- Just exploring → Sekadar melihat-lihat
- Looking to assess → Ingin membuat penilaian
- Ready to book → Sedia untuk menempah

## Legal / PDPA
- Personal Data Protection Act → Akta Perlindungan Data Peribadi
- PDPA → APDP
- Sensitive personal data → Data peribadi sensitif
- Consent → Persetujuan
- Privacy notice → Notis Privasi
- Cookies → Kuki

## Days/hours stay English (international convention in MY context)
```

- [ ] **Step 2: Translate `content/en/common.json` → `content/ms/common.json`**

Mirror every key. Apply glossary first. Set `_meta`:

```json
{
  "_meta": {
    "scrapedAt": "2026-06-08",
    "translatedBy": "claude-opus-4-7",
    "translatedAt": "2026-06-08",
    "reviewedBy": null
  },
  "nav": {
    "about": "Tentang",
    "staff": "Kakitangan",
    "services": "Perkhidmatan",
    "events": "Acara",
    "blog": "Blog",
    "contact": "Hubungi",
    "more": "Lagi",
    "bookNow": "Tempah Sekarang",
    "skipToContent": "Langkau ke kandungan",
    "menu": "Buka menu",
    "menuClose": "Tutup menu"
  },
  "...": "translate every remaining key in en/common.json the same way"
}
```

> Apply this pattern to every file. For brevity the plan does not inline every translation — translate every key, keep structure identical, set `_meta` block.

- [ ] **Step 3: Translate `content/en/home.json` → `content/ms/home.json`**

Same approach. Translate `<VERBATIM ...>` content blocks freely (this is the prototype's draft BM content). Preserve any embedded HTML tags or entities. Keep `services.items[].key` values unchanged (`screening`, `ot`, etc.) — those are stable IDs.

- [ ] **Step 4: Translate the remaining files**

In this order:
- `about.json`
- `staff.json` — keep `members[].name`, `members[].credentials`, `members[].id` unchanged; translate `role`, `greeting` ("Hi, I'm <First>" → "Hai, saya <First>"), `personalLine`, `bio`. Translate `hero.*`.
- `services.json` — keep `items[].key`; translate everything else; apply glossary to titles.
- `contact.json` — translate everything except `phones[].number`, `address.line1`/`line2` (proper noun).
- `chatbot.json` — translate every `say`, `options[].label`, `ui.*`. Keep `next`/`set`/`input` machine values unchanged.
- `consent.json` — translate every `label`, `description`, banner string. Note "explicit consent only" must translate as "persetujuan jelas sahaja".
- `privacy.json` — translate `header.*` and every `sections[].heading` + `sections[].body`. The disclaimer in `header.disclaimer` should be translated as a notice that prototype must be reviewed by Malaysian counsel.

- [ ] **Step 5: Run parity check**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/check-i18n-parity.rb content/en content/ms
```

Expected: `i18n parity OK (9 files)` and exit 0.

If failure: read the missing-key lines, fix the offending file (usually a typo or missed nested object), re-run.

- [ ] **Step 6: Validate JSON parses cleanly**

```bash
for f in content/ms/*.json; do
  ruby -rjson -e "JSON.parse(File.read('$f')); puts '$f OK'"
done
```

Expected: all `OK`.

- [ ] **Step 7: Commit**

```bash
git add content/glossary.md content/ms/
git commit -m "feat(content): add draft BM translations with parity check passing"
```

---

## Task 5: Direction B — design system reference page

**Files:**
- Create: `urbane-ethos/design/directions/v2-warm/system.html`

This page defines all design tokens and components for Direction B. It will be the source of truth for `assets/css/tokens.css` (extracted in Task 9). Standalone HTML — no shared assets dependency yet.

- [ ] **Step 1: Create the page skeleton**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Direction B — Warm & Handcrafted · Design System</title>
<style>
:root {
  /* Palette — warm cream base, deep warm brown ink */
  --color-cream: #F6EFE3;
  --color-cream-soft: #FBF6EC;
  --color-ink: #2B1F14;
  --color-ink-soft: #4A372A;
  --color-ink-muted: #7A6A5C;
  --color-sage: #8FA68A;
  --color-sage-deep: #5C7758;
  --color-terracotta: #C77B5C;
  --color-terracotta-deep: #A05A3D;
  --color-sun: #E6B25C; /* CTA accent */
  --color-line: #E2D4BD;
  --color-error: #B5403B;

  /* Type */
  --font-serif: "Source Serif 4", "Cormorant Garamond", Georgia, serif;
  --font-sans: "Inter", "Helvetica Neue", system-ui, sans-serif;
  --type-h1: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  --type-h2: clamp(2rem, 3vw + 1rem, 3rem);
  --type-h3: clamp(1.5rem, 1.5vw + 1rem, 2rem);
  --type-body: clamp(1rem, 0.3vw + 0.95rem, 1.125rem);
  --type-small: 0.875rem;
  --line-tight: 1.15;
  --line-body: 1.6;
  --tracking-tight: -0.02em;

  /* Space — 8px ramp */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Radii */
  --radius-1: 6px;
  --radius-2: 14px;
  --radius-3: 28px;
  --radius-pill: 999px;

  /* Motion */
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --dur-1: 180ms;
  --dur-2: 320ms;

  /* Shadow */
  --shadow-1: 0 1px 2px rgba(43,31,20,0.08);
  --shadow-2: 0 10px 30px -10px rgba(43,31,20,0.18);
}
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
body { margin: 0; font: var(--type-body)/var(--line-body) var(--font-sans); color: var(--color-ink); background: var(--color-cream); }
h1,h2,h3 { font-family: var(--font-serif); letter-spacing: var(--tracking-tight); line-height: var(--line-tight); margin: 0 0 var(--space-4); }
h1 { font-size: var(--type-h1); }
h2 { font-size: var(--type-h2); }
h3 { font-size: var(--type-h3); }
.wrap { max-width: 72rem; margin: 0 auto; padding: var(--space-16) var(--space-8); }
section { margin-bottom: var(--space-24); border-top: 1px solid var(--color-line); padding-top: var(--space-12); }
.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--space-4); }
.swatch { border-radius: var(--radius-2); padding: var(--space-4); border: 1px solid var(--color-line); }
.swatch .chip { height: 80px; border-radius: var(--radius-1); margin-bottom: var(--space-2); }
.btn { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-6); border-radius: var(--radius-pill); border: none; font: 600 1rem var(--font-sans); cursor: pointer; transition: transform var(--dur-1) var(--ease); }
.btn:focus-visible { outline: 3px solid var(--color-sun); outline-offset: 3px; }
.btn--primary { background: var(--color-ink); color: var(--color-cream-soft); }
.btn--primary:hover { transform: translateY(-1px); }
.btn--secondary { background: transparent; color: var(--color-ink); border: 1.5px solid var(--color-ink); }
.btn--ghost { background: transparent; color: var(--color-ink-soft); }
.card { background: var(--color-cream-soft); border-radius: var(--radius-3); padding: var(--space-8); box-shadow: var(--shadow-1); }
.chip-pill { display: inline-flex; padding: var(--space-2) var(--space-4); border-radius: var(--radius-pill); border: 1.5px solid var(--color-ink); background: transparent; font: 500 0.9rem var(--font-sans); cursor: pointer; }
.chip-pill[aria-pressed="true"] { background: var(--color-ink); color: var(--color-cream-soft); }
</style>
</head>
<body>
<main class="wrap">
  <h1>Direction B — Warm & Handcrafted</h1>
  <p>Design system reference. Tokens, type, color, components.</p>

  <section><h2>Palette</h2>
    <div class="swatches">
      <div class="swatch"><div class="chip" style="background:var(--color-cream)"></div>Cream <code>#F6EFE3</code></div>
      <div class="swatch"><div class="chip" style="background:var(--color-cream-soft)"></div>Cream soft <code>#FBF6EC</code></div>
      <div class="swatch"><div class="chip" style="background:var(--color-ink)"></div>Ink <code>#2B1F14</code></div>
      <div class="swatch"><div class="chip" style="background:var(--color-sage-deep)"></div>Sage deep <code>#5C7758</code></div>
      <div class="swatch"><div class="chip" style="background:var(--color-terracotta-deep)"></div>Terracotta <code>#A05A3D</code></div>
      <div class="swatch"><div class="chip" style="background:var(--color-sun)"></div>Sun <code>#E6B25C</code></div>
    </div>
  </section>

  <section><h2>Type</h2>
    <h1>The quiet warmth of care</h1>
    <h2>Listening before recommending</h2>
    <h3>Every child is met where they are</h3>
    <p>Body copy uses a humanist sans with generous line-height for stress-reduced reading. Headings pair a warm humanist serif for editorial calm.</p>
  </section>

  <section><h2>Buttons</h2>
    <p>
      <button class="btn btn--primary">Book a session</button>
      <button class="btn btn--secondary">Find out more</button>
      <button class="btn btn--ghost">Skip</button>
    </p>
  </section>

  <section><h2>Chips</h2>
    <p>
      <button class="chip-pill" aria-pressed="true">0–2</button>
      <button class="chip-pill" aria-pressed="false">3–5</button>
      <button class="chip-pill" aria-pressed="false">6–9</button>
      <button class="chip-pill" aria-pressed="false">10+</button>
    </p>
  </section>

  <section><h2>Card</h2>
    <div class="card">
      <h3>Speech Therapy</h3>
      <p>Helping your child find their voice — at their own pace, with someone who's listened to a thousand first words.</p>
      <button class="btn btn--secondary">Learn more</button>
    </div>
  </section>
</main>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify**

```bash
bin/server &
sleep 1
open http://localhost:8080/design/directions/v2-warm/system.html
```

Verify: page renders, swatches show, buttons hoverable, focus ring visible on Tab.

- [ ] **Step 3: Stop server, commit**

```bash
kill %1 2>/dev/null || true
git add design/directions/v2-warm/system.html
git commit -m "feat(design): Direction B system reference page"
```

---

## Task 6: Direction B — single-page demo

**Files:**
- Create: `urbane-ethos/design/directions/v2-warm/index.html`

Single long-scroll page showing Direction B applied to hero + services + staff + chatbot. Self-contained `<style>` block (copy tokens from system.html); no shared assets yet.

- [ ] **Step 1: Write the page**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Direction B — Warm & Handcrafted · Demo</title>
<style>
  /* Paste the :root token block + base styles + button/chip/card classes from
     design/directions/v2-warm/system.html into this <style> block. */
</style>
</head>
<body>
<header class="site-header">
  <div class="wrap header-row">
    <a href="#" class="brand">Urbane Ethos<br><small>Early Intervention Center</small></a>
    <nav aria-label="Primary">
      <a href="#services">Services</a><a href="#staff">Team</a><a href="#contact">Contact</a>
    </nav>
    <a href="#book" class="btn btn--primary">Book Now</a>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <p class="eyebrow">Urbane Ethos</p>
    <h1>Early intervention,<br>made human.</h1>
    <p class="lede">For families finding their way. Speech, motor, learning, behaviour — supported by people, not algorithms.</p>
    <div class="cta-row">
      <button class="btn btn--primary">Find out more</button>
      <button class="btn btn--secondary">Watch our intro</button>
    </div>
  </div>
</section>

<section id="services" class="section">
  <div class="wrap">
    <h2>How we can help</h2>
    <div class="grid-3">
      <article class="card"><h3>Screening</h3><p>A gentle first step to understand where your child is.</p></article>
      <article class="card"><h3>Speech Therapy</h3><p>Helping your child find their voice.</p></article>
      <article class="card"><h3>Occupational Therapy</h3><p>Building everyday skills that build confidence.</p></article>
      <article class="card"><h3>Special Education</h3><p>Tailored learning that meets each child where they are.</p></article>
      <article class="card"><h3>Early Intervention</h3><p>Structured support across the early years.</p></article>
      <article class="card"><h3>Clinical Psychology</h3><p>Compassionate assessment and counselling.</p></article>
    </div>
  </div>
</section>

<section id="staff" class="section section--alt">
  <div class="wrap">
    <h2>Meet the people who'll be there</h2>
    <div class="staff-card">
      <div class="staff-photo" aria-hidden="true">[REAL PHOTO REQUIRED]</div>
      <div>
        <p class="greeting">Hi, I'm Dr. Sarah</p>
        <p class="role">Clinical Psychologist · 12 years with kids 0–9</p>
        <p>I came into this work because of my niece. I stayed because of every parent I've watched exhale at the end of a hard week.</p>
      </div>
    </div>
  </div>
</section>

<button class="chatbot-launcher" aria-label="Open chat assistant">💬</button>

<style>
  /* + paste demo-specific styles for header, hero, sections, staff-card, chatbot-launcher */
  .site-header { background: var(--color-cream-soft); border-bottom: 1px solid var(--color-line); position: sticky; top: 0; z-index: 10; }
  .header-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-8); }
  .brand { font-family: var(--font-serif); font-size: 1.25rem; color: var(--color-ink); text-decoration: none; line-height: 1.1; }
  .brand small { color: var(--color-ink-muted); font-size: 0.8rem; }
  nav a { color: var(--color-ink); margin: 0 var(--space-3); text-decoration: none; }
  nav a:hover, nav a:focus-visible { color: var(--color-terracotta-deep); }
  .hero { padding: var(--space-24) 0; background: linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-soft) 100%); }
  .hero .eyebrow { font: 600 0.875rem var(--font-sans); letter-spacing: 0.15em; text-transform: uppercase; color: var(--color-terracotta-deep); margin: 0 0 var(--space-4); }
  .hero h1 { font-size: var(--type-h1); margin-bottom: var(--space-6); }
  .hero .lede { font-size: 1.25rem; color: var(--color-ink-soft); max-width: 36rem; margin-bottom: var(--space-8); }
  .cta-row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
  .section { padding: var(--space-24) 0; }
  .section--alt { background: var(--color-cream-soft); }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap: var(--space-6); margin-top: var(--space-8); }
  .staff-card { display: grid; grid-template-columns: 200px 1fr; gap: var(--space-8); align-items: start; }
  .staff-photo { background: var(--color-line); aspect-ratio: 4/5; border-radius: var(--radius-3); display: flex; align-items: center; justify-content: center; color: var(--color-ink-muted); font-size: 0.75rem; }
  .greeting { font-family: var(--font-serif); font-size: 1.75rem; margin: 0 0 var(--space-2); }
  .role { color: var(--color-ink-muted); margin: 0 0 var(--space-4); }
  .chatbot-launcher { position: fixed; bottom: var(--space-6); right: var(--space-6); width: 56px; height: 56px; border-radius: var(--radius-pill); background: var(--color-ink); color: var(--color-cream-soft); border: none; font-size: 1.5rem; cursor: pointer; box-shadow: var(--shadow-2); }
  @media (max-width: 640px) {
    .staff-card { grid-template-columns: 1fr; }
    .header-row nav { display: none; }
  }
</style>
</body>
</html>
```

> Paste the token `:root` block from `system.html` at the top of the page's `<style>`. The demo-specific styles above append to it.

- [ ] **Step 2: Open in browser**

```bash
bin/server &
sleep 1
open http://localhost:8080/design/directions/v2-warm/index.html
kill %1 2>/dev/null || true
```

Verify: warm color palette, serif headings, photo-card placeholder visible, chatbot bubble bottom-right, mobile layout collapses gracefully under 640px.

- [ ] **Step 3: Commit**

```bash
git add design/directions/v2-warm/index.html
git commit -m "feat(design): Direction B single-page demo"
```

---

## Task 7: Direction A — "Quiet & Trustworthy" comparison demo

**Files:**
- Create: `urbane-ethos/design/directions/v1-quiet/index.html`

Single self-contained page using the same content as Task 6 (hero, services, staff, chatbot) but rendered in Direction A's Pentagram-style restraint: huge whitespace, neutral sans-only typography, two-tone palette (off-white + deep navy), photography-led implied.

- [ ] **Step 1: Write the page (copy structure from v2-warm/index.html, swap tokens + styles)**

Replace the `:root` block with:

```css
:root {
  --color-paper: #FAFAF7;
  --color-ink: #131618;
  --color-ink-soft: #3A4045;
  --color-ink-muted: #7A8086;
  --color-rule: #DDDDD7;
  --color-accent: #1F3B5A; /* deep navy */
  --font-sans: "Söhne", "Inter", system-ui, sans-serif;
  --type-h1: clamp(3rem, 6vw, 6rem);
  --type-h2: clamp(2rem, 3vw, 3.25rem);
  --type-body: 1.0625rem;
  --line-tight: 1.05;
  --line-body: 1.55;
  --tracking-tight: -0.04em;
  --space-1: 0.25rem; --space-2: 0.5rem; --space-4: 1rem; --space-8: 2rem;
  --space-12: 3rem; --space-16: 4rem; --space-24: 6rem; --space-32: 8rem;
}
h1, h2, h3 { font-family: var(--font-sans); font-weight: 500; letter-spacing: var(--tracking-tight); line-height: var(--line-tight); }
body { background: var(--color-paper); color: var(--color-ink); }
.hero { padding: var(--space-32) 0; }
.btn--primary { background: var(--color-ink); color: var(--color-paper); border-radius: 0; padding: var(--space-4) var(--space-8); }
.btn--secondary { background: transparent; border: 1px solid var(--color-ink); border-radius: 0; }
.card { background: transparent; border-top: 1px solid var(--color-rule); border-radius: 0; padding: var(--space-8) 0; box-shadow: none; }
.section { padding: var(--space-32) 0; }
.section--alt { background: transparent; border-top: 1px solid var(--color-rule); }
.staff-photo { aspect-ratio: 1; border-radius: 0; }
.chatbot-launcher { background: var(--color-ink); border-radius: 0; }
```

Keep the HTML body identical to v2-warm; only the styling changes.

- [ ] **Step 2: Verify in browser**

```bash
bin/server &
sleep 1
open http://localhost:8080/design/directions/v1-quiet/index.html
kill %1 2>/dev/null || true
```

Verify: feels restrained, lots of whitespace, no rounded corners, two-tone palette.

- [ ] **Step 3: Commit**

```bash
git add design/directions/v1-quiet/index.html
git commit -m "feat(design): Direction A 'Quiet' comparison demo"
```

---

## Task 8: Direction C — "Bold & Inclusive" comparison demo

**Files:**
- Create: `urbane-ethos/design/directions/v3-bold/index.html`

Copy structure from Task 6, swap tokens for high-contrast vivid palette + display type.

- [ ] **Step 1: Write the page with these token overrides**

```css
:root {
  --color-bg: #FFFCF0;
  --color-ink: #0F0F0F;
  --color-teal: #006E6B;
  --color-yellow: #FFC700;
  --color-coral: #FF5C5C;
  --color-rule: #0F0F0F;
  --font-display: "Söhne Breit", "Archivo Black", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --type-h1: clamp(3rem, 9vw, 8rem);
  --type-h2: clamp(2rem, 5vw, 4.5rem);
  --line-tight: 0.95;
  --tracking-tight: -0.04em;
  --space-4: 1rem; --space-8: 2rem; --space-16: 4rem; --space-24: 6rem;
  --radius-pill: 999px;
}
body { background: var(--color-bg); color: var(--color-ink); font-family: var(--font-body); }
h1, h2, h3 { font-family: var(--font-display); font-weight: 900; text-transform: uppercase; letter-spacing: var(--tracking-tight); line-height: var(--line-tight); }
.hero { background: var(--color-yellow); border-bottom: 4px solid var(--color-ink); padding: var(--space-16) 0; }
.btn--primary { background: var(--color-ink); color: var(--color-yellow); border-radius: var(--radius-pill); padding: var(--space-4) var(--space-8); font-weight: 800; }
.btn--secondary { background: var(--color-coral); color: var(--color-ink); border: 4px solid var(--color-ink); border-radius: var(--radius-pill); }
.card { background: var(--color-bg); border: 4px solid var(--color-ink); border-radius: 24px; box-shadow: 8px 8px 0 var(--color-ink); }
.section--alt { background: var(--color-teal); color: var(--color-bg); }
.section--alt h2 { color: var(--color-yellow); }
.chatbot-launcher { background: var(--color-coral); border: 3px solid var(--color-ink); }
```

Keep HTML body identical.

- [ ] **Step 2: Verify in browser, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/design/directions/v3-bold/index.html
kill %1 2>/dev/null || true

git add design/directions/v3-bold/index.html
git commit -m "feat(design): Direction C 'Bold' comparison demo"
```

---

## Task 9: Production CSS — tokens, base, components, motion (Direction B)

**Files:**
- Create: `urbane-ethos/assets/css/tokens.css`
- Create: `urbane-ethos/assets/css/base.css`
- Create: `urbane-ethos/assets/css/components.css`
- Create: `urbane-ethos/assets/css/motion.css`
- Create: `urbane-ethos/assets/fonts/` (download Source Serif 4 + Inter WOFF2)

Extract the Direction B tokens and base styles from Task 5/6 into shared files used by the 8 production pages.

- [ ] **Step 1: Download self-hosted fonts**

```bash
mkdir -p urbane-ethos/assets/fonts
# Source Serif 4 (variable weight, latin subset)
curl -L "https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjihdqrhxXD-wGvjU.woff2" -o urbane-ethos/assets/fonts/source-serif-4-var.woff2
# Inter (variable weight, latin subset)
curl -L "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2" -o urbane-ethos/assets/fonts/inter-var.woff2
ls -lh urbane-ethos/assets/fonts/
```

If a font URL 404s (Google updates them), replace with the latest URL from fonts.google.com → download via "Get embed code".

- [ ] **Step 2: Write `assets/css/tokens.css`**

```css
@layer tokens {
  @font-face {
    font-family: "Source Serif 4";
    src: url("../fonts/source-serif-4-var.woff2") format("woff2-variations");
    font-weight: 200 900;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: "Inter";
    src: url("../fonts/inter-var.woff2") format("woff2-variations");
    font-weight: 100 900;
    font-style: normal;
    font-display: swap;
  }

  :root {
    /* Palette */
    --color-cream: #F6EFE3;
    --color-cream-soft: #FBF6EC;
    --color-ink: #2B1F14;
    --color-ink-soft: #4A372A;
    --color-ink-muted: #7A6A5C;
    --color-sage: #8FA68A;
    --color-sage-deep: #5C7758;
    --color-terracotta: #C77B5C;
    --color-terracotta-deep: #A05A3D;
    --color-sun: #E6B25C;
    --color-line: #E2D4BD;
    --color-error: #B5403B;
    --color-success: #4A6B3A;

    /* Type */
    --font-serif: "Source Serif 4", "Cormorant Garamond", Georgia, serif;
    --font-sans: "Inter", "Helvetica Neue", system-ui, sans-serif;
    --type-h1: clamp(2.5rem, 5vw + 1rem, 4.5rem);
    --type-h2: clamp(2rem, 3vw + 1rem, 3rem);
    --type-h3: clamp(1.5rem, 1.5vw + 1rem, 2rem);
    --type-h4: 1.25rem;
    --type-body: clamp(1rem, 0.3vw + 0.95rem, 1.125rem);
    --type-small: 0.875rem;
    --type-eyebrow: 0.875rem;
    --line-tight: 1.15;
    --line-body: 1.6;
    --tracking-tight: -0.02em;
    --tracking-loose: 0.15em;

    /* Spacing — 8px ramp */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-10: 2.5rem;
    --space-12: 3rem;
    --space-16: 4rem;
    --space-20: 5rem;
    --space-24: 6rem;
    --space-32: 8rem;

    /* Radii */
    --radius-1: 6px;
    --radius-2: 14px;
    --radius-3: 28px;
    --radius-pill: 999px;

    /* Shadow */
    --shadow-1: 0 1px 2px rgba(43,31,20,0.08);
    --shadow-2: 0 10px 30px -10px rgba(43,31,20,0.18);
    --shadow-3: 0 24px 60px -20px rgba(43,31,20,0.25);

    /* Motion */
    --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
    --dur-1: 180ms;
    --dur-2: 320ms;
    --dur-3: 520ms;

    /* Layout */
    --wrap-max: 80rem;
    --content-max: 44rem;

    /* Font-size scale (a11y toggle) */
    --fs-scale: 1;
  }

  html[data-fs="1"] { --fs-scale: 1; }
  html[data-fs="2"] { --fs-scale: 1.125; }
  html[data-fs="3"] { --fs-scale: 1.25; }
  body { font-size: calc(var(--type-body) * var(--fs-scale)); }
}
```

- [ ] **Step 3: Write `assets/css/base.css`**

```css
@layer base {
  *, *::before, *::after { box-sizing: border-box; }
  html { color-scheme: light; -webkit-text-size-adjust: 100%; }
  body { margin: 0; font-family: var(--font-sans); line-height: var(--line-body); color: var(--color-ink); background: var(--color-cream); }
  h1, h2, h3, h4 { font-family: var(--font-serif); font-weight: 600; letter-spacing: var(--tracking-tight); line-height: var(--line-tight); margin: 0 0 var(--space-4); color: var(--color-ink); }
  h1 { font-size: var(--type-h1); }
  h2 { font-size: var(--type-h2); }
  h3 { font-size: var(--type-h3); }
  h4 { font-size: var(--type-h4); font-family: var(--font-sans); font-weight: 700; }
  p { margin: 0 0 var(--space-4); }
  a { color: var(--color-terracotta-deep); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  a:hover { text-decoration-thickness: 2px; }
  a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible, [tabindex]:focus-visible {
    outline: 3px solid var(--color-sun);
    outline-offset: 3px;
    border-radius: 4px;
  }
  img, picture, video, svg { max-width: 100%; height: auto; display: block; }
  ul, ol { padding-inline-start: 1.5rem; margin: 0 0 var(--space-4); }
  ::selection { background: var(--color-sun); color: var(--color-ink); }

  .visually-hidden {
    position: absolute !important;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0);
    white-space: nowrap; border: 0;
  }
  .skip-link {
    position: absolute; top: 0; left: 0;
    transform: translateY(-120%);
    background: var(--color-ink); color: var(--color-cream-soft);
    padding: var(--space-3) var(--space-4);
    text-decoration: none;
    z-index: 1000;
    transition: transform var(--dur-1) var(--ease);
  }
  .skip-link:focus { transform: translateY(0); }

  .wrap { max-width: var(--wrap-max); margin-inline: auto; padding-inline: var(--space-6); }
  @media (min-width: 768px) { .wrap { padding-inline: var(--space-8); } }
}
```

- [ ] **Step 4: Write `assets/css/components.css`**

```css
@layer components {
  /* Header */
  .site-header {
    background: color-mix(in srgb, var(--color-cream-soft) 92%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--color-line);
    position: sticky; top: 0; z-index: 10;
  }
  .header-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--space-4) 0;
    gap: var(--space-4);
  }
  .brand { font-family: var(--font-serif); font-size: 1.125rem; color: var(--color-ink); text-decoration: none; line-height: 1.1; }
  .brand small { color: var(--color-ink-muted); font-size: 0.75rem; display: block; }
  .nav-list { display: flex; gap: var(--space-5); list-style: none; padding: 0; margin: 0; }
  .nav-list a { color: var(--color-ink); text-decoration: none; padding: var(--space-2); }
  .nav-list a:hover, .nav-list a[aria-current="page"] { color: var(--color-terracotta-deep); }
  .header-tools { display: flex; gap: var(--space-2); align-items: center; }
  .locale-toggle, .fs-toggle {
    background: transparent; border: 1px solid var(--color-line); border-radius: var(--radius-pill);
    padding: var(--space-1) var(--space-3); font: 500 0.875rem var(--font-sans); cursor: pointer;
  }
  .locale-toggle [aria-pressed="true"] { background: var(--color-ink); color: var(--color-cream-soft); border-radius: var(--radius-pill); }
  .locale-toggle button { background: transparent; border: none; padding: var(--space-1) var(--space-3); cursor: pointer; color: var(--color-ink); border-radius: var(--radius-pill); font: inherit; }

  /* Buttons */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-pill);
    border: none;
    font: 600 1rem var(--font-sans);
    cursor: pointer;
    text-decoration: none;
    transition: transform var(--dur-1) var(--ease), background var(--dur-1) var(--ease);
  }
  .btn--primary { background: var(--color-ink); color: var(--color-cream-soft); }
  .btn--primary:hover { transform: translateY(-1px); background: var(--color-ink-soft); }
  .btn--secondary { background: transparent; color: var(--color-ink); border: 1.5px solid var(--color-ink); }
  .btn--secondary:hover { background: var(--color-ink); color: var(--color-cream-soft); }
  .btn--ghost { background: transparent; color: var(--color-ink-soft); }
  .btn--ghost:hover { color: var(--color-ink); }

  /* Chip / pill */
  .chip-pill {
    display: inline-flex; padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill); border: 1.5px solid var(--color-ink);
    background: transparent; font: 500 0.9rem var(--font-sans); cursor: pointer;
  }
  .chip-pill[aria-pressed="true"] { background: var(--color-ink); color: var(--color-cream-soft); }

  /* Card */
  .card { background: var(--color-cream-soft); border-radius: var(--radius-3); padding: var(--space-8); box-shadow: var(--shadow-1); }
  .card h3 { margin-bottom: var(--space-3); }

  /* Hero */
  .hero { padding: var(--space-24) 0 var(--space-20); background: linear-gradient(180deg, var(--color-cream) 0%, var(--color-cream-soft) 100%); }
  .hero .eyebrow { font: 600 var(--type-eyebrow) var(--font-sans); letter-spacing: var(--tracking-loose); text-transform: uppercase; color: var(--color-terracotta-deep); margin: 0 0 var(--space-4); }
  .hero .lede { font-size: 1.25rem; color: var(--color-ink-soft); max-width: var(--content-max); margin-bottom: var(--space-8); }
  .cta-row { display: flex; gap: var(--space-3); flex-wrap: wrap; }

  /* Sections */
  .section { padding: var(--space-20) 0; }
  .section--alt { background: var(--color-cream-soft); }
  .section-eyebrow { font: 600 var(--type-eyebrow) var(--font-sans); letter-spacing: var(--tracking-loose); text-transform: uppercase; color: var(--color-ink-muted); margin: 0 0 var(--space-3); }

  /* Grids */
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-6); }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-8); }

  /* Forms */
  .form-field { display: grid; gap: var(--space-2); margin-bottom: var(--space-5); }
  .form-field label { font: 600 0.9rem var(--font-sans); }
  .form-field input, .form-field textarea, .form-field select {
    font: var(--type-body) var(--font-sans);
    padding: var(--space-3); border: 1.5px solid var(--color-line); border-radius: var(--radius-2);
    background: var(--color-cream-soft); color: var(--color-ink);
  }
  .form-field [aria-invalid="true"] { border-color: var(--color-error); }
  .form-error { color: var(--color-error); font-size: 0.875rem; }

  /* Footer */
  .site-footer { background: var(--color-ink); color: var(--color-cream); padding: var(--space-16) 0 var(--space-8); }
  .site-footer a { color: var(--color-cream); }
  .site-footer .grid { display: grid; gap: var(--space-8); grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .site-footer h4 { color: var(--color-cream-soft); margin-bottom: var(--space-3); }

  /* Chatbot launcher */
  .chatbot-launcher {
    position: fixed; bottom: var(--space-6); right: var(--space-6);
    width: 56px; height: 56px; border-radius: var(--radius-pill);
    background: var(--color-ink); color: var(--color-cream-soft); border: none;
    font-size: 1.5rem; cursor: pointer; box-shadow: var(--shadow-2);
    display: flex; align-items: center; justify-content: center;
  }
  .chatbot-panel {
    position: fixed; bottom: var(--space-20); right: var(--space-6);
    width: min(380px, calc(100vw - var(--space-12)));
    height: min(560px, calc(100vh - var(--space-32)));
    background: var(--color-cream-soft);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-3);
    display: flex; flex-direction: column;
    z-index: 20;
  }
  .chatbot-panel[hidden] { display: none; }
  .chatbot-header { padding: var(--space-4); border-bottom: 1px solid var(--color-line); display: flex; align-items: center; justify-content: space-between; }
  .chatbot-log { flex: 1; overflow-y: auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .chat-bubble { padding: var(--space-3) var(--space-4); border-radius: var(--radius-2); max-width: 85%; }
  .chat-bubble--bot { background: var(--color-cream); color: var(--color-ink); align-self: flex-start; }
  .chat-bubble--user { background: var(--color-ink); color: var(--color-cream-soft); align-self: flex-end; }
  .chatbot-options { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: 0 var(--space-4) var(--space-3); }
  .chatbot-input { padding: var(--space-3) var(--space-4); border-top: 1px solid var(--color-line); display: flex; gap: var(--space-2); }
  .chatbot-input input { flex: 1; border: 1px solid var(--color-line); border-radius: var(--radius-pill); padding: var(--space-2) var(--space-4); }

  /* Consent banner */
  .consent-banner {
    position: fixed; left: 0; right: 0; bottom: 0;
    background: var(--color-ink); color: var(--color-cream-soft);
    padding: var(--space-5) var(--space-6);
    box-shadow: 0 -10px 30px -10px rgba(0,0,0,0.3);
    z-index: 30;
  }
  .consent-banner[hidden] { display: none; }
  .consent-row { display: flex; gap: var(--space-4); align-items: center; flex-wrap: wrap; max-width: var(--wrap-max); margin-inline: auto; }
  .consent-body { flex: 1; min-width: 240px; }
  .consent-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
  .consent-actions .btn--primary { background: var(--color-sun); color: var(--color-ink); }
  .consent-actions .btn--secondary { color: var(--color-cream-soft); border-color: var(--color-cream-soft); }
  .consent-detail { margin-top: var(--space-4); display: grid; gap: var(--space-3); }
  .consent-toggle { display: flex; gap: var(--space-3); align-items: flex-start; }
  .consent-toggle input[type="checkbox"] { margin-top: 0.25rem; transform: scale(1.2); }

  /* Personalization micro-survey */
  .personalization-card { background: var(--color-cream-soft); border-radius: var(--radius-3); padding: var(--space-8); box-shadow: var(--shadow-1); margin-block: var(--space-12); }
  .personalization-row { margin-bottom: var(--space-5); }
  .personalization-row legend { font: 600 0.95rem var(--font-sans); margin-bottom: var(--space-2); }
  .personalization-chips { display: flex; gap: var(--space-2); flex-wrap: wrap; }

  /* Staff card */
  .staff-grid { display: grid; gap: var(--space-12); grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  .staff-card { background: var(--color-cream-soft); border-radius: var(--radius-3); overflow: hidden; box-shadow: var(--shadow-1); }
  .staff-photo { background: var(--color-line); aspect-ratio: 4/5; display: flex; align-items: center; justify-content: center; color: var(--color-ink-muted); font-size: 0.75rem; text-align: center; padding: var(--space-4); }
  .staff-body { padding: var(--space-6); }
  .staff-greeting { font-family: var(--font-serif); font-size: 1.5rem; margin: 0 0 var(--space-2); }
  .staff-role { color: var(--color-ink-muted); margin: 0 0 var(--space-3); }
  .staff-video-btn { background: transparent; border: 1px dashed var(--color-line); padding: var(--space-2) var(--space-4); border-radius: var(--radius-pill); cursor: pointer; color: var(--color-ink-soft); font: 500 0.875rem var(--font-sans); }

  /* Locale notice (blog) */
  .locale-notice { background: var(--color-sun); color: var(--color-ink); padding: var(--space-3) var(--space-4); border-radius: var(--radius-2); margin-bottom: var(--space-6); }

  /* Service block */
  .service-block { padding-block: var(--space-12); border-top: 1px solid var(--color-line); }
  .service-block:first-of-type { border-top: 0; }
  .faq summary { cursor: pointer; padding: var(--space-3) 0; font-weight: 600; }
  .faq[open] summary { color: var(--color-terracotta-deep); }

  /* Analytics demo */
  .stat-grid { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); margin-bottom: var(--space-12); }
  .stat-card { background: var(--color-cream-soft); border-radius: var(--radius-2); padding: var(--space-6); }
  .stat-value { font: 700 2rem var(--font-serif); }
}
```

- [ ] **Step 5: Write `assets/css/motion.css`**

```css
@layer motion {
  @media (prefers-reduced-motion: no-preference) {
    .fade-in-up { opacity: 0; transform: translateY(12px); transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out); }
    .fade-in-up.is-in { opacity: 1; transform: none; }
    .chatbot-panel { animation: panel-in var(--dur-2) var(--ease) both; }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to   { opacity: 1; transform: none; }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
}
```

- [ ] **Step 6: Sanity test with a throwaway HTML**

```bash
cat > /tmp/css-check.html <<'EOF'
<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/motion.css">
</head><body>
<a href="#main" class="skip-link">Skip to content</a>
<main id="main" class="wrap"><h1>Tokens loaded</h1>
<button class="btn btn--primary">Primary</button>
<button class="btn btn--secondary">Secondary</button>
<div class="card"><h3>Card</h3><p>Sample body copy in Direction B.</p></div>
</main></body></html>
EOF
cp /tmp/css-check.html urbane-ethos/css-check.html

cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
open http://localhost:8080/css-check.html
```

Verify: warm cream background, serif headings, button shapes correct, focus ring visible on Tab, skip-link slides in when focused.

- [ ] **Step 7: Clean up, commit**

```bash
rm urbane-ethos/css-check.html
kill %1 2>/dev/null || true
git add assets/
git commit -m "feat(css): tokens, base, components, motion (Direction B)"
```

---

## Task 10: i18n.js module + smoke test page

**Files:**
- Create: `urbane-ethos/assets/js/i18n.js`
- Create: `urbane-ethos/test/smoke/i18n.html`

- [ ] **Step 1: Write `assets/js/i18n.js`**

```javascript
const STORAGE_KEY = "urbane-ethos:locale";
const DEFAULT_LOCALE = "en";
const SUPPORTED = new Set(["en", "ms"]);

const cache = new Map();

async function loadNamespace(locale, namespace) {
  const key = `${locale}:${namespace}`;
  if (cache.has(key)) return cache.get(key);
  const url = `/content/${locale}/${namespace}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`i18n: failed to load ${url} (${res.status})`);
  const data = await res.json();
  cache.set(key, data);
  return data;
}

function readPath(obj, path) {
  return path.split(".").reduce((acc, seg) => (acc == null ? acc : acc[seg]), obj);
}

function namespaceFromKey(key) {
  return key.split(".", 1)[0];
}

function pathAfterNamespace(key) {
  return key.split(".").slice(1).join(".");
}

async function resolve(locale, key) {
  const ns = namespaceFromKey(key);
  const data = await loadNamespace(locale, ns);
  const value = readPath(data, pathAfterNamespace(key));
  if (value == null && locale !== DEFAULT_LOCALE) {
    return resolve(DEFAULT_LOCALE, key);
  }
  return value;
}

async function applyToElement(el, locale) {
  const key = el.dataset.i18n;
  if (key) {
    const value = await resolve(locale, key);
    if (value != null) el.textContent = value;
  }
  const attrSpec = el.dataset.i18nAttr;
  if (attrSpec) {
    for (const pair of attrSpec.split(",")) {
      const [attr, attrKey] = pair.split(":").map(s => s.trim());
      const value = await resolve(locale, attrKey);
      if (value != null) el.setAttribute(attr, value);
    }
  }
}

export function getLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED.has(stored) ? stored : DEFAULT_LOCALE;
}

export async function setLocale(locale) {
  if (!SUPPORTED.has(locale)) return;
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  await translatePage(locale);
  document.dispatchEvent(new CustomEvent("i18n:changed", { detail: { locale } }));
}

export async function translatePage(locale = getLocale()) {
  document.documentElement.lang = locale;
  const els = document.querySelectorAll("[data-i18n], [data-i18n-attr]");
  await Promise.all([...els].map(el => applyToElement(el, locale)));
}

export async function t(key, locale = getLocale()) {
  return resolve(locale, key);
}

export function initLocaleToggle(root = document) {
  const buttons = root.querySelectorAll("[data-locale-set]");
  const current = getLocale();
  buttons.forEach(btn => {
    btn.setAttribute("aria-pressed", btn.dataset.localeSet === current ? "true" : "false");
    btn.addEventListener("click", async () => {
      await setLocale(btn.dataset.localeSet);
      buttons.forEach(b => b.setAttribute("aria-pressed", b.dataset.localeSet === btn.dataset.localeSet ? "true" : "false"));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  translatePage();
  initLocaleToggle();
});
```

- [ ] **Step 2: Write `test/smoke/i18n.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>i18n smoke test</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
</head>
<body>
<main class="wrap">
<h1>i18n smoke test</h1>
<p>
  <span class="locale-toggle">
    <button data-locale-set="en">EN</button>
    <button data-locale-set="ms">BM</button>
  </span>
</p>
<h2 data-i18n="home.hero.title">[fallback heading]</h2>
<p data-i18n="home.hero.subtitle">[fallback subtitle]</p>
<button class="btn btn--primary" data-i18n="common.cta.findOutMore"
        data-i18n-attr="aria-label:common.a11y.openChatbot">Fallback</button>

<h3>Assertions</h3>
<ul id="assertions"></ul>

<script type="module">
import { setLocale, t } from "/assets/js/i18n.js";

async function check(name, fn) {
  const li = document.createElement("li");
  try {
    await fn();
    li.textContent = `PASS — ${name}`;
    li.style.color = "var(--color-success)";
  } catch (e) {
    li.textContent = `FAIL — ${name}: ${e.message}`;
    li.style.color = "var(--color-error)";
  }
  document.getElementById("assertions").append(li);
}

(async () => {
  await setLocale("en");
  await check("EN hero title is a non-empty string", async () => {
    const v = await t("home.hero.title");
    if (typeof v !== "string" || !v.length) throw new Error(`got ${JSON.stringify(v)}`);
  });
  await setLocale("ms");
  await check("BM hero title differs from EN", async () => {
    const en = await t("home.hero.title", "en");
    const ms = await t("home.hero.title", "ms");
    if (en === ms) throw new Error("EN == MS — translation missing?");
  });
  await check("html lang attribute updates", async () => {
    if (document.documentElement.lang !== "ms") throw new Error(document.documentElement.lang);
  });
})();
</script>
</main>
</body>
</html>
```

- [ ] **Step 3: Run smoke**

```bash
bin/server &
sleep 1
open http://localhost:8080/test/smoke/i18n.html
```

Verify: three "PASS" lines under "Assertions". Heading swaps when clicking BM.

- [ ] **Step 4: Commit**

```bash
kill %1 2>/dev/null || true
git add assets/js/i18n.js test/smoke/i18n.html
git commit -m "feat(js): i18n module with smoke test"
```

---

## Task 11: a11y.js — font-size toggle, skip-link, motion prefs

**Files:**
- Create: `urbane-ethos/assets/js/a11y.js`
- Create: `urbane-ethos/test/smoke/a11y.html`

- [ ] **Step 1: Write `assets/js/a11y.js`**

```javascript
const FS_KEY = "urbane-ethos:font-size";
const FS_VALUES = ["1", "2", "3"];

function readFs() {
  const v = localStorage.getItem(FS_KEY);
  return FS_VALUES.includes(v) ? v : "1";
}

function applyFs(value) {
  document.documentElement.dataset.fs = value;
}

export function cycleFontSize() {
  const cur = readFs();
  const next = FS_VALUES[(FS_VALUES.indexOf(cur) + 1) % FS_VALUES.length];
  localStorage.setItem(FS_KEY, next);
  applyFs(next);
  return next;
}

export function initA11y() {
  applyFs(readFs());

  document.querySelectorAll("[data-fs-cycle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const next = cycleFontSize();
      btn.setAttribute("aria-label", `Text size: step ${next} of ${FS_VALUES.length}`);
    });
  });

  const skip = document.querySelector(".skip-link");
  if (skip) {
    skip.addEventListener("click", e => {
      const targetId = skip.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: false });
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initA11y);
```

- [ ] **Step 2: Write `test/smoke/a11y.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>a11y smoke</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<main id="main" class="wrap">
  <h1>a11y smoke</h1>
  <p>Body text scales with the toggle.</p>
  <button class="btn btn--secondary" data-fs-cycle aria-label="Text size">A↕</button>
  <ul id="assertions"></ul>
</main>
<script type="module">
import { cycleFontSize } from "/assets/js/a11y.js";
const log = msg => {
  const li = document.createElement("li");
  li.textContent = msg;
  document.getElementById("assertions").append(li);
};
log(`Initial data-fs: ${document.documentElement.dataset.fs}`);
const first = cycleFontSize();
log(`After cycle 1: data-fs=${document.documentElement.dataset.fs} (expected ${first})`);
const second = cycleFontSize();
log(`After cycle 2: data-fs=${document.documentElement.dataset.fs} (expected ${second})`);
</script>
</body>
</html>
```

- [ ] **Step 3: Smoke + commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/test/smoke/a11y.html
# Verify text resizes on click; data-fs cycles 1→2→3→1
kill %1 2>/dev/null || true
git add assets/js/a11y.js test/smoke/a11y.html
git commit -m "feat(js): a11y module (font-size toggle, skip-link)"
```

---

## Task 12: Consent banner + privacy page

**Files:**
- Create: `urbane-ethos/assets/js/consent.js`
- Create: `urbane-ethos/privacy.html`
- Modify: `urbane-ethos/content/en/consent.json` (drafted in Task 3, finalized here)
- Modify: `urbane-ethos/content/en/privacy.json` (drafted in Task 3, finalized here)
- Modify: matching `content/ms/consent.json` and `content/ms/privacy.json`
- Create: `urbane-ethos/test/smoke/consent.html`

- [ ] **Step 1: Write `assets/js/consent.js`**

```javascript
const CONSENT_KEY = "urbane-ethos:consent";
const CONSENT_VERSION = 1;

const DEFAULT = {
  necessary: true,
  analytics: false,
  personalization: false,
  chatbot: false,
  ts: null,
  version: CONSENT_VERSION
};

export function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(consent) {
  const next = { ...DEFAULT, ...consent, necessary: true, ts: new Date().toISOString(), version: CONSENT_VERSION };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  document.dispatchEvent(new CustomEvent("consent:changed", { detail: next }));
  return next;
}

export function hasConsented() {
  return readConsent() !== null;
}

export function isAllowed(category) {
  const c = readConsent();
  if (!c) return category === "necessary";
  return Boolean(c[category]);
}

function buildBanner() {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <aside class="consent-banner" role="region" aria-label="Cookie preferences" aria-live="polite">
      <div class="consent-row">
        <div class="consent-body">
          <strong data-i18n="consent.banner.heading"></strong>
          <p data-i18n="consent.banner.body" style="margin:0.25rem 0 0"></p>
        </div>
        <div class="consent-actions">
          <button class="btn btn--ghost" data-consent-action="customize" data-i18n="consent.banner.customize"></button>
          <button class="btn btn--secondary" data-consent-action="necessary" data-i18n="consent.banner.necessaryOnly"></button>
          <button class="btn btn--primary" data-consent-action="all" data-i18n="consent.banner.acceptAll"></button>
        </div>
      </div>
      <div class="consent-detail" hidden>
        ${["necessary", "analytics", "personalization", "chatbot"].map(cat => `
          <label class="consent-toggle">
            <input type="checkbox" data-consent-toggle="${cat}" ${cat === "necessary" ? "checked disabled" : ""}>
            <span>
              <strong data-i18n="consent.toggles.${cat}.label"></strong><br>
              <small data-i18n="consent.toggles.${cat}.description"></small>
            </span>
          </label>
        `).join("")}
        <div>
          <a href="/privacy.html" data-i18n="consent.banner.readFullNotice"></a>
        </div>
        <div>
          <button class="btn btn--primary" data-consent-action="save" data-i18n="consent.banner.save"></button>
        </div>
      </div>
    </aside>
  `;
  return tpl.content.firstElementChild;
}

function trapFocus(container, e) {
  const focusables = container.querySelectorAll("button, a[href], input:not([disabled])");
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.key !== "Tab") return;
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}

function attachBanner() {
  if (document.querySelector(".consent-banner")) return;
  const banner = buildBanner();
  document.body.append(banner);
  // i18n translate is fired by i18n.js on DOMContentLoaded; we manually re-run if it's already past.
  document.dispatchEvent(new CustomEvent("consent:banner-mounted"));

  const detail = banner.querySelector(".consent-detail");

  banner.addEventListener("click", e => {
    const action = e.target.dataset.consentAction;
    if (!action) return;
    if (action === "customize") {
      const hidden = detail.hasAttribute("hidden");
      detail.toggleAttribute("hidden");
      if (hidden) detail.querySelector("input[type=checkbox]:not([disabled])").focus();
      return;
    }
    if (action === "all") {
      writeConsent({ necessary: true, analytics: true, personalization: true, chatbot: true });
    } else if (action === "necessary") {
      writeConsent({ necessary: true, analytics: false, personalization: false, chatbot: false });
    } else if (action === "save") {
      const chosen = {};
      detail.querySelectorAll("[data-consent-toggle]").forEach(cb => {
        chosen[cb.dataset.consentToggle] = cb.checked;
      });
      writeConsent(chosen);
    }
    banner.remove();
  });

  banner.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      writeConsent({ necessary: true, analytics: false, personalization: false, chatbot: false });
      banner.remove();
    }
    trapFocus(banner, e);
  });

  // Auto-focus customize button on first appearance for keyboard users.
  banner.querySelector('[data-consent-action="customize"]').focus({ preventScroll: true });
}

export function initConsent() {
  if (!hasConsented()) attachBanner();
  document.querySelectorAll("[data-consent-manage]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      localStorage.removeItem(CONSENT_KEY);
      attachBanner();
    });
  });
}

document.addEventListener("DOMContentLoaded", initConsent);
```

- [ ] **Step 2: Verify `content/en/consent.json` and `content/ms/consent.json` have every key the banner references**

Run a quick eyeball:

```bash
ruby -rjson -e 'd=JSON.parse(File.read("content/en/consent.json")); puts d.dig("banner","heading"), d.dig("toggles","analytics","label")'
ruby -rjson -e 'd=JSON.parse(File.read("content/ms/consent.json")); puts d.dig("banner","heading"), d.dig("toggles","analytics","label")'
```

Both must print non-empty strings. If any are missing, add them (and re-run `bin/check-i18n-parity.rb`).

- [ ] **Step 3: Write `privacy.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title data-i18n="privacy.header.title">Privacy notice — Urbane Ethos</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/motion.css">
</head>
<body>
<a class="skip-link" href="#main" data-i18n="common.nav.skipToContent">Skip to content</a>

<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="/">Urbane Ethos<small data-i18n="common.nav.about">Early Intervention Center</small></a>
    <span class="locale-toggle" aria-label="Language">
      <button data-locale-set="en">EN</button>
      <button data-locale-set="ms">BM</button>
    </span>
  </div>
</header>

<main id="main" class="wrap" style="padding-block: var(--space-16); max-width: var(--content-max)">
  <h1 data-i18n="privacy.header.title">Privacy notice</h1>
  <p><small data-i18n="privacy.header.lastUpdated"></small></p>
  <p class="locale-notice" data-i18n="privacy.header.disclaimer"></p>

  <div id="privacy-sections"></div>
</main>

<footer class="site-footer">
  <div class="wrap">
    <p>
      <a href="#" data-consent-manage data-i18n="common.footer.manageCookies">Manage cookies</a>
      &middot; <a href="/privacy.html" data-i18n="common.footer.privacy">Privacy notice</a>
    </p>
  </div>
</footer>

<script type="module">
import { getLocale, t } from "/assets/js/i18n.js";
import "/assets/js/consent.js";

async function renderSections() {
  const locale = getLocale();
  const data = await (await fetch(`/content/${locale}/privacy.json`)).json();
  const wrap = document.getElementById("privacy-sections");
  wrap.replaceChildren();
  for (const sec of data.sections) {
    const h2 = document.createElement("h2"); h2.textContent = sec.heading;
    const p  = document.createElement("p");  p.textContent  = sec.body;
    wrap.append(h2, p);
  }
}
renderSections();
document.addEventListener("i18n:changed", renderSections);
</script>
</body>
</html>
```

- [ ] **Step 4: Write `test/smoke/consent.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>consent smoke</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
</head>
<body>
<main class="wrap">
<h1>Consent smoke</h1>
<button class="btn btn--secondary" data-consent-manage>Manage cookies</button>
<ul id="log"></ul>
</main>
<script type="module">
import "/assets/js/i18n.js";
import { readConsent, isAllowed } from "/assets/js/consent.js";

const log = (m) => { const li = document.createElement("li"); li.textContent = m; document.getElementById("log").append(li); };

document.addEventListener("consent:changed", e => {
  log(`consent saved: analytics=${e.detail.analytics} personalization=${e.detail.personalization} chatbot=${e.detail.chatbot}`);
  log(`isAllowed("analytics"): ${isAllowed("analytics")}`);
});

log("Initial consent: " + JSON.stringify(readConsent()));
</script>
</body>
</html>
```

- [ ] **Step 5: Smoke**

```bash
bin/server &
sleep 1
open http://localhost:8080/test/smoke/consent.html
# Click "Manage cookies", expand "Customize", toggle two checkboxes, "Save my choices"
# Verify log shows the saved values and isAllowed reflects them.
# Reload page → banner should NOT reappear. Click "Manage cookies" → banner returns.
open http://localhost:8080/privacy.html
# Verify all 10 sections render; toggle EN/BM verifies bilingual.
kill %1 2>/dev/null || true
```

- [ ] **Step 6: Commit**

```bash
git add assets/js/consent.js privacy.html test/smoke/consent.html content/en/consent.json content/en/privacy.json content/ms/consent.json content/ms/privacy.json
git commit -m "feat(consent): PDPA consent banner + privacy notice page"
```

---

## Task 13: Chatbot module

**Files:**
- Create: `urbane-ethos/assets/js/chatbot.js`
- Modify: `urbane-ethos/content/en/chatbot.json` (drafted Task 3; finalize service blurbs verbatim from scrape)
- Modify: `urbane-ethos/content/ms/chatbot.json` (mirror)
- Create: `urbane-ethos/test/smoke/chatbot.html`

- [ ] **Step 1: Replace `<VERBATIM ...>` placeholders in chatbot.json**

Open `content/en/chatbot.json`, find the six `service.<key>.say` nodes, replace with verbatim 2-sentence summaries from `content/en/services.json` (`items[].whatItIs` first sentence + `whoItsFor` first sentence). Mirror in `content/ms/chatbot.json`.

Run parity:

```bash
bin/check-i18n-parity.rb content/en content/ms
```

Expected: exit 0.

- [ ] **Step 2: Write `assets/js/chatbot.js`**

```javascript
import { getLocale } from "/assets/js/i18n.js";
import { isAllowed } from "/assets/js/consent.js";

const TRANSCRIPT_KEY = "urbane-ethos:chatbot-transcript";
let panel, log, optionsBar, inputBar, micBtn, ttsBtn;
let flow = null;
let state = { node: "start", context: {} };

async function loadFlow() {
  const locale = getLocale();
  const res = await fetch(`/content/${locale}/chatbot.json`);
  flow = await res.json();
}

function readTranscript() {
  if (!isAllowed("chatbot")) return [];
  try { return JSON.parse(sessionStorage.getItem("session-chat") || "[]"); }
  catch { return []; }
}

function persistTurn(turn) {
  if (isAllowed("chatbot")) {
    const all = JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || "[]");
    all.push(turn);
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(all));
  }
  const session = readTranscript();
  session.push(turn);
  sessionStorage.setItem("session-chat", JSON.stringify(session));
}

function appendBubble(text, role) {
  const div = document.createElement("div");
  div.className = `chat-bubble chat-bubble--${role}`;
  div.textContent = text;
  log.append(div);
  log.scrollTop = log.scrollHeight;
  persistTurn({ role, text, ts: Date.now() });
}

function clearOptions() { optionsBar.replaceChildren(); }

function renderOptions(opts) {
  clearOptions();
  for (const opt of opts) {
    const b = document.createElement("button");
    b.className = "chip-pill";
    b.textContent = opt.label;
    b.addEventListener("click", () => choose(opt));
    optionsBar.append(b);
  }
}

function speak(text) {
  if (!ttsBtn.dataset.active) return;
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = getLocale() === "ms" ? "ms-MY" : "en-US";
  window.speechSynthesis.speak(u);
}

function go(nodeId) {
  const node = flow.flow[nodeId];
  if (!node) { appendBubble(`(missing node: ${nodeId})`, "bot"); return; }
  state.node = nodeId;
  appendBubble(node.say, "bot");
  speak(node.say);
  if (node.options) renderOptions(node.options);
  else clearOptions();
  if (node.input === "free" || node.input === "name+phone") {
    inputBar.hidden = false;
    inputBar.querySelector("input").placeholder = node.input === "name+phone"
      ? "Your name and phone number"
      : flow.ui.inputPlaceholder;
  } else {
    inputBar.hidden = true;
  }
}

function choose(opt) {
  appendBubble(opt.label, "user");
  if (opt.set) Object.assign(state.context, opt.set);
  go(opt.next);
}

function submitFreeInput(text) {
  if (!text.trim()) return;
  appendBubble(text, "user");
  const node = flow.flow[state.node];
  if (node?.next) go(node.next);
}

function attachVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.hidden = true; return; }
  const rec = new SR();
  rec.lang = getLocale() === "ms" ? "ms-MY" : "en-US";
  rec.onresult = e => {
    const t = e.results[0][0].transcript;
    inputBar.querySelector("input").value = t;
  };
  micBtn.addEventListener("click", () => rec.start());
}

function buildPanel() {
  const wrap = document.createElement("div");
  wrap.className = "chatbot-panel";
  wrap.hidden = true;
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "false");
  wrap.setAttribute("aria-label", flow.ui.panelTitle);
  wrap.innerHTML = `
    <header class="chatbot-header">
      <div>
        <strong>${flow.ui.panelTitle}</strong>
        <div style="font-size:0.8rem;color:var(--color-ink-muted)">${flow.ui.subtitle}</div>
      </div>
      <div>
        <button class="btn btn--ghost" data-tts aria-label="${flow.ui.ttsAria}">🔊</button>
        <button class="btn btn--ghost" data-close aria-label="${flow.ui.close}">✕</button>
      </div>
    </header>
    <div class="chatbot-log" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="chatbot-options"></div>
    <form class="chatbot-input" hidden>
      <button type="button" class="btn btn--ghost" data-mic aria-label="${flow.ui.micAria}">🎤</button>
      <input type="text" aria-label="${flow.ui.inputPlaceholder}" placeholder="${flow.ui.inputPlaceholder}">
      <button type="submit" class="btn btn--primary">${flow.ui.send}</button>
    </form>
  `;
  return wrap;
}

function open() {
  panel.hidden = false;
  setTimeout(() => panel.querySelector("button, input")?.focus(), 0);
}
function close() { panel.hidden = true; }

export async function initChatbot() {
  await loadFlow();
  panel = buildPanel();
  document.body.append(panel);

  log = panel.querySelector(".chatbot-log");
  optionsBar = panel.querySelector(".chatbot-options");
  inputBar = panel.querySelector(".chatbot-input");
  micBtn = panel.querySelector("[data-mic]");
  ttsBtn = panel.querySelector("[data-tts]");

  ttsBtn.addEventListener("click", () => {
    ttsBtn.dataset.active = ttsBtn.dataset.active ? "" : "1";
    ttsBtn.setAttribute("aria-pressed", ttsBtn.dataset.active ? "true" : "false");
  });

  panel.querySelector("[data-close]").addEventListener("click", close);
  panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  inputBar.addEventListener("submit", e => {
    e.preventDefault();
    const input = inputBar.querySelector("input");
    submitFreeInput(input.value);
    input.value = "";
  });

  document.querySelectorAll(".chatbot-launcher").forEach(btn => btn.addEventListener("click", open));

  attachVoice();
  go("start");

  document.addEventListener("i18n:changed", async () => {
    await loadFlow();
    log.replaceChildren();
    go("start");
  });
}

if (document.readyState !== "loading") initChatbot();
else document.addEventListener("DOMContentLoaded", initChatbot);
```

- [ ] **Step 3: Write `test/smoke/chatbot.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>chatbot smoke</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/motion.css">
</head>
<body>
<main class="wrap"><h1>Chatbot smoke</h1>
<p>Click the bubble bottom-right. Try: Ask about a service → Speech Therapy → back. Try Pricing → walk all 3 questions.</p>
<button class="chatbot-launcher" aria-label="Open chat assistant">💬</button>
</main>
<script type="module">
import "/assets/js/i18n.js";
import "/assets/js/consent.js";
import "/assets/js/chatbot.js";
</script>
</body>
</html>
```

- [ ] **Step 4: Manually verify 4 flows**

```bash
bin/server &
sleep 1
open http://localhost:8080/test/smoke/chatbot.html
```

Walk through:
1. Click bubble → greeting + 4 options.
2. "Ask about a service" → service picker → "Speech Therapy" → bot replies → "Back to start" (via start option).
3. "Pricing indication" → 3 qualifying chips → price range message → "Confirm with team" → handoff.
4. "Talk to a human" → free-text input visible → type "Test Name +60123456789" → confirm message.

If `consent.chatbot === true`, reload and verify the bot remembers transcript via `localStorage.getItem("urbane-ethos:chatbot-transcript")`.

- [ ] **Step 5: Commit**

```bash
kill %1 2>/dev/null || true
git add assets/js/chatbot.js test/smoke/chatbot.html content/en/chatbot.json content/ms/chatbot.json
git commit -m "feat(chatbot): decision-tree chatbot with voice + TTS + i18n"
```

---

## Task 14: Personalization module

**Files:**
- Create: `urbane-ethos/assets/js/personalization.js`
- Create: `urbane-ethos/test/smoke/personalization.html`

- [ ] **Step 1: Write `assets/js/personalization.js`**

```javascript
import { isAllowed } from "/assets/js/consent.js";

const KEY = "urbane-ethos:personalization";

const RULES = {
  concernToService: {
    "Speech": "speech",
    "Motor skills": "ot",
    "Behaviour": "psych",
    "Learning": "specialed",
    "Not sure": "screening"
  },
  concernToBlogTags: {
    "Speech": ["Speech"],
    "Motor skills": ["Motor"],
    "Behaviour": ["Behaviour"],
    "Learning": ["Speech", "Parenting"],
    "Not sure": ["Parenting"]
  },
  concernToStaff: {
    "Speech": "speech-lead",
    "Motor skills": "ot-lead",
    "Behaviour": "psych-lead",
    "Learning": "specialed-lead",
    "Not sure": "screening-lead"
  }
};

export function read() {
  if (!isAllowed("personalization")) return null;
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function write(values) {
  if (!isAllowed("personalization")) return null;
  const next = { ...values, ts: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  document.dispatchEvent(new CustomEvent("personalization:changed", { detail: next }));
  return next;
}

export function reset() {
  sessionStorage.removeItem(KEY);
  document.dispatchEvent(new CustomEvent("personalization:reset"));
}

export function reorderServices(container) {
  const data = read();
  if (!data?.concern) return;
  const priorityKey = RULES.concernToService[data.concern];
  if (!priorityKey) return;
  const cards = [...container.querySelectorAll("[data-service-key]")];
  const priority = cards.find(c => c.dataset.serviceKey === priorityKey);
  if (priority && container.firstElementChild !== priority) {
    container.prepend(priority);
  }
}

export function recommendedBlog(posts) {
  const data = read();
  if (!data?.concern) return posts.slice(0, 3);
  const tags = RULES.concernToBlogTags[data.concern] || [];
  const tagged = posts.filter(p => p.tags?.some(t => tags.includes(t)));
  return tagged.length ? tagged.slice(0, 2) : posts.slice(0, 2);
}

export function recommendedStaffId() {
  const data = read();
  if (!data?.concern) return null;
  return RULES.concernToStaff[data.concern] || null;
}

function attachSurvey(form) {
  if (!isAllowed("personalization")) { form.hidden = true; return; }
  form.addEventListener("change", e => {
    if (e.target.matches("[data-personalize-skip]")) return;
  });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = new FormData(form);
    write({
      age: data.get("age"),
      concern: data.get("concern"),
      stage: data.get("stage")
    });
    form.querySelector("[data-personalize-feedback]")?.removeAttribute("hidden");
  });
  form.querySelectorAll("[data-personalize-skip]").forEach(btn =>
    btn.addEventListener("click", () => form.toggleAttribute("hidden")));
}

export function initPersonalization() {
  const form = document.querySelector("[data-personalize-form]");
  if (form) attachSurvey(form);

  const servicesGrid = document.querySelector("[data-services-grid]");
  if (servicesGrid) reorderServices(servicesGrid);

  document.querySelectorAll("[data-personalize-reset]").forEach(btn =>
    btn.addEventListener("click", e => { e.preventDefault(); reset(); location.reload(); }));
}

document.addEventListener("DOMContentLoaded", initPersonalization);
document.addEventListener("consent:changed", initPersonalization);
```

- [ ] **Step 2: Write `test/smoke/personalization.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>personalization smoke</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
</head>
<body>
<main class="wrap">
<h1>Personalization smoke</h1>
<form data-personalize-form class="personalization-card">
  <fieldset class="personalization-row">
    <legend>Age</legend>
    <div class="personalization-chips">
      <label><input type="radio" name="age" value="3–5" checked> 3–5</label>
      <label><input type="radio" name="age" value="6–9"> 6–9</label>
    </div>
  </fieldset>
  <fieldset class="personalization-row">
    <legend>Concern</legend>
    <div class="personalization-chips">
      <label><input type="radio" name="concern" value="Speech" checked> Speech</label>
      <label><input type="radio" name="concern" value="Behaviour"> Behaviour</label>
    </div>
  </fieldset>
  <fieldset class="personalization-row">
    <legend>Stage</legend>
    <div class="personalization-chips">
      <label><input type="radio" name="stage" value="Looking to assess" checked> Looking to assess</label>
    </div>
  </fieldset>
  <button class="btn btn--primary">Show me what's relevant</button>
  <p data-personalize-feedback hidden>Saved.</p>
</form>

<div data-services-grid class="grid-3" style="margin-top:2rem">
  <div class="card" data-service-key="screening"><h3>Screening</h3></div>
  <div class="card" data-service-key="ot"><h3>OT</h3></div>
  <div class="card" data-service-key="speech"><h3>Speech</h3></div>
  <div class="card" data-service-key="psych"><h3>Psych</h3></div>
</div>
</main>
<script type="module">
import "/assets/js/i18n.js";
import "/assets/js/consent.js";
import "/assets/js/personalization.js";
</script>
</body>
</html>
```

- [ ] **Step 3: Verify**

```bash
bin/server &
sleep 1
open http://localhost:8080/test/smoke/personalization.html
```

Walk: accept all consent → submit form → verify "Speech" card jumps to first position. Reload → still first (sessionStorage). Click "Manage cookies" → revoke personalization → reload smoke page → form hidden.

- [ ] **Step 4: Commit**

```bash
kill %1 2>/dev/null || true
git add assets/js/personalization.js test/smoke/personalization.html
git commit -m "feat(personalization): client-side rules + micro-survey + grid reorder"
```

---

## Task 15: Analytics demo page + data module

**Files:**
- Create: `urbane-ethos/assets/js/analytics-demo-data.js`
- Create: `urbane-ethos/analytics.html`

- [ ] **Step 1: Write `assets/js/analytics-demo-data.js`**

```javascript
export const seedData = {
  totalVisits30d: 1842,
  topPages: [
    { path: "/", views: 1130 },
    { path: "/services", views: 412 },
    { path: "/staff", views: 188 },
    { path: "/blog", views: 92 },
    { path: "/contact", views: 80 }
  ],
  chatbot: { opens: 297, completions: 144, intents: [
    { label: "Pricing", value: 102 },
    { label: "Service", value: 88 },
    { label: "Booking", value: 71 },
    { label: "Human", value: 36 }
  ] },
  microSurvey: { shown: 1842, started: 612, completed: 388, concerns: [
    { label: "Speech", value: 142 },
    { label: "Motor", value: 71 },
    { label: "Behaviour", value: 61 },
    { label: "Learning", value: 58 },
    { label: "Not sure", value: 56 }
  ] },
  localeSplit: [
    { label: "EN", value: 1391 },
    { label: "BM", value: 451 }
  ],
  funnel: [
    { label: "Visit", value: 1842 },
    { label: "Survey", value: 388 },
    { label: "Chatbot", value: 144 },
    { label: "Contact submit", value: 41 }
  ]
};

export function liveSessionEvents() {
  // Read this session's events (recorded by future analytics-recording hooks).
  try { return JSON.parse(sessionStorage.getItem("urbane-ethos:session-events") || "[]"); }
  catch { return []; }
}
```

- [ ] **Step 2: Write `analytics.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Analytics demo — Urbane Ethos</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap header-row"><a class="brand" href="/">Urbane Ethos<small>Analytics demo</small></a></div></header>

<main id="main" class="wrap" style="padding-block: var(--space-12)">
  <p class="locale-notice"><strong>Demo dashboard.</strong> Illustrates what data we'd collect if analytics is wired in production. No real telemetry runs.</p>

  <h1>Last 30 days</h1>

  <section class="stat-grid">
    <div class="stat-card"><div class="stat-value" id="stat-visits">—</div><div>Total visits</div></div>
    <div class="stat-card"><div class="stat-value" id="stat-chat-opens">—</div><div>Chatbot opens</div></div>
    <div class="stat-card"><div class="stat-value" id="stat-survey-complete">—</div><div>Surveys completed</div></div>
    <div class="stat-card"><div class="stat-value" id="stat-locale-ms-pct">—</div><div>BM share</div></div>
  </section>

  <section>
    <h2>Top pages</h2>
    <svg id="chart-pages" width="100%" height="200" role="img" aria-label="Top pages bar chart"></svg>
  </section>

  <section>
    <h2>Survey concerns</h2>
    <svg id="chart-concerns" width="100%" height="200" role="img" aria-label="Concerns bar chart"></svg>
  </section>

  <section>
    <h2>Conversion funnel</h2>
    <svg id="chart-funnel" width="100%" height="200" role="img" aria-label="Funnel chart"></svg>
  </section>

  <section>
    <h2>This session (live)</h2>
    <pre id="session-events" style="background:var(--color-cream-soft);padding:var(--space-4);border-radius:var(--radius-2);overflow:auto">—</pre>
  </section>
</main>

<script type="module">
import { seedData, liveSessionEvents } from "/assets/js/analytics-demo-data.js";

document.getElementById("stat-visits").textContent = seedData.totalVisits30d.toLocaleString();
document.getElementById("stat-chat-opens").textContent = seedData.chatbot.opens.toLocaleString();
document.getElementById("stat-survey-complete").textContent = seedData.microSurvey.completed.toLocaleString();
const msPct = Math.round(100 * seedData.localeSplit.find(x => x.label === "BM").value / seedData.totalVisits30d);
document.getElementById("stat-locale-ms-pct").textContent = `${msPct}%`;

function barChart(svgId, data, accessor = d => d.value, labelKey = "label") {
  const svg = document.getElementById(svgId);
  const W = svg.clientWidth || 600, H = 200, pad = 30;
  const max = Math.max(...data.map(accessor));
  const bw = (W - pad * 2) / data.length - 8;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  data.forEach((d, i) => {
    const v = accessor(d);
    const h = (v / max) * (H - pad * 2);
    const x = pad + i * ((W - pad * 2) / data.length) + 4;
    const y = H - pad - h;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x); rect.setAttribute("y", y); rect.setAttribute("width", bw); rect.setAttribute("height", h);
    rect.setAttribute("fill", "var(--color-terracotta-deep)");
    rect.setAttribute("rx", "4");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + bw / 2); text.setAttribute("y", H - 12);
    text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "11"); text.setAttribute("fill", "var(--color-ink)");
    text.textContent = d[labelKey];
    const value = document.createElementNS("http://www.w3.org/2000/svg", "text");
    value.setAttribute("x", x + bw / 2); value.setAttribute("y", y - 4);
    value.setAttribute("text-anchor", "middle"); value.setAttribute("font-size", "11"); value.setAttribute("fill", "var(--color-ink-soft)");
    value.textContent = v;
    svg.append(rect, text, value);
  });
}

barChart("chart-pages", seedData.topPages, d => d.views, "path");
barChart("chart-concerns", seedData.microSurvey.concerns);
barChart("chart-funnel", seedData.funnel);

const events = liveSessionEvents();
document.getElementById("session-events").textContent = events.length
  ? JSON.stringify(events, null, 2)
  : "(No live events recorded this session — analytics consent off or no events fired.)";
</script>
</body>
</html>
```

- [ ] **Step 3: Verify, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/analytics.html
# Verify 4 stat cards populate, 3 SVG bar charts render, session pane shows the "no events" message.
kill %1 2>/dev/null || true

git add assets/js/analytics-demo-data.js analytics.html
git commit -m "feat(analytics): internal-facing analytics demo page"
```

---

## Task 16: Home page (`index.html`)

**Files:**
- Create: `urbane-ethos/index.html`

This page integrates everything: header, hero, micro-survey, services, testimonial, what-we-do, staff, events, recommended rail, blog cards, footer, chatbot.

- [ ] **Step 1: Write the page**

```html
<!doctype html>
<html lang="en" data-fs="1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Urbane Ethos — Early Intervention Center</title>
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/motion.css">
</head>
<body>
<a class="skip-link" href="#main" data-i18n="common.nav.skipToContent">Skip to content</a>

<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="/">
      <span>Urbane Ethos</span>
      <small data-i18n="home.hero.title">Early Intervention Center</small>
    </a>
    <nav aria-label="Primary">
      <ul class="nav-list">
        <li><a href="/about.html" data-i18n="common.nav.about">About</a></li>
        <li><a href="/staff.html" data-i18n="common.nav.staff">Staff</a></li>
        <li><a href="/services.html" data-i18n="common.nav.services">Services</a></li>
        <li><a href="/blog.html" data-i18n="common.nav.blog">Blog</a></li>
        <li><a href="/contact.html" data-i18n="common.nav.contact">Contact</a></li>
      </ul>
    </nav>
    <div class="header-tools">
      <span class="locale-toggle" aria-label="Language">
        <button data-locale-set="en">EN</button>
        <button data-locale-set="ms">BM</button>
      </span>
      <button class="fs-toggle" data-fs-cycle aria-label="Text size">A↕</button>
      <a class="btn btn--primary" href="/contact.html" data-i18n="common.cta.bookSession">Book Now</a>
    </div>
  </div>
</header>

<main id="main">
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow" data-i18n="home.hero.eyebrow">Urbane Ethos</p>
      <h1 data-i18n="home.hero.title">Early Intervention Center</h1>
      <p class="lede" data-i18n="home.hero.subtitle">Subtitle</p>
      <div class="cta-row">
        <a class="btn btn--primary" href="/services.html" data-i18n="home.hero.primaryCta">Find Out More</a>
        <button class="btn btn--secondary" data-i18n="home.hero.secondaryCta">Watch our intro</button>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <form data-personalize-form class="personalization-card" hidden>
        <h2 data-i18n="home.personalization.heading">Tell us a little about your child</h2>
        <p data-i18n="home.personalization.subheading">Skip if you'd rather browse on your own.</p>
        <fieldset class="personalization-row">
          <legend data-i18n="home.personalization.ageLabel">Child's age</legend>
          <div class="personalization-chips" data-personalize-chips="age"></div>
        </fieldset>
        <fieldset class="personalization-row">
          <legend data-i18n="home.personalization.concernLabel">Main area of concern</legend>
          <div class="personalization-chips" data-personalize-chips="concern"></div>
        </fieldset>
        <fieldset class="personalization-row">
          <legend data-i18n="home.personalization.stageLabel">Where are you in your journey?</legend>
          <div class="personalization-chips" data-personalize-chips="stage"></div>
        </fieldset>
        <div class="cta-row">
          <button class="btn btn--primary" data-i18n="home.personalization.submit">Show me what's relevant</button>
          <button type="button" class="btn btn--ghost" data-personalize-skip data-i18n="home.personalization.skip">Skip</button>
        </div>
        <p data-personalize-feedback hidden>Saved.</p>
      </form>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <h2 data-i18n="home.location.title">Visit us</h2>
      <p data-i18n="home.location.address"></p>
      <ul id="home-hours"></ul>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <h2 data-i18n="home.services.heading">How we can help</h2>
      <div class="grid-3" data-services-grid id="home-services"></div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap" style="max-width:var(--content-max)">
      <p class="section-eyebrow">A word from a parent</p>
      <blockquote style="font-family:var(--font-serif);font-size:1.5rem;line-height:1.4" data-i18n="home.testimonial.quote">[quote]</blockquote>
      <p style="color:var(--color-ink-muted)" data-i18n="home.testimonial.attribution">[attribution]</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap" style="max-width:var(--content-max)">
      <h2 data-i18n="home.whatWeDo.heading">What can we do for you?</h2>
      <p data-i18n="home.whatWeDo.body"></p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <h2 data-i18n="home.staffFeatured.heading">Meet the people who'll be there</h2>
      <div class="staff-grid" id="home-staff"></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <h2 data-i18n="home.events.heading">Events</h2>
      <p data-i18n="home.events.blurb"></p>
      <a class="btn btn--secondary" href="/contact.html" data-i18n="home.events.cta">Get in touch</a>
    </div>
  </section>

  <section class="section section--alt" id="recommended" hidden>
    <div class="wrap">
      <p class="section-eyebrow" data-i18n="home.recommendedRail.subheading"></p>
      <h2 data-i18n="home.recommendedRail.heading">Recommended for you</h2>
      <div class="grid-3" id="recommended-grid"></div>
      <p><a href="#" data-personalize-reset data-i18n="home.recommendedRail.resetLabel">Reset preferences</a></p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <h2 data-i18n="home.blog.heading">From the blog</h2>
      <div class="grid-3" id="home-blog"></div>
      <p><a href="/blog.html" data-i18n="home.blog.viewAll">View all articles</a></p>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap grid">
    <div>
      <h4 data-i18n="common.footer.address">Address</h4>
      <p data-i18n="common.footer.address"></p>
      <p data-i18n="common.footer.phone1"></p>
    </div>
    <div>
      <h4 data-i18n="common.footer.hoursLabel">Hours</h4>
      <ul id="footer-hours"></ul>
    </div>
    <div>
      <h4>Site</h4>
      <ul>
        <li><a href="/services.html" data-i18n="common.nav.services">Services</a></li>
        <li><a href="/staff.html" data-i18n="common.nav.staff">Staff</a></li>
        <li><a href="/blog.html" data-i18n="common.nav.blog">Blog</a></li>
        <li><a href="/contact.html" data-i18n="common.nav.contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <h4>Privacy</h4>
      <ul>
        <li><a href="/privacy.html" data-i18n="common.footer.privacy">Privacy notice</a></li>
        <li><a href="#" data-consent-manage data-i18n="common.footer.manageCookies">Manage cookies</a></li>
        <li><a href="/analytics.html" data-i18n="common.footer.analyticsDemo">Analytics demo</a></li>
      </ul>
    </div>
  </div>
</footer>

<button class="chatbot-launcher" aria-label="Open chat assistant" data-i18n-attr="aria-label:common.a11y.openChatbot">💬</button>

<script type="module">
import { getLocale, t, translatePage } from "/assets/js/i18n.js";
import "/assets/js/consent.js";
import "/assets/js/a11y.js";
import { isAllowed } from "/assets/js/consent.js";
import { read as readPers, recommendedBlog, recommendedStaffId } from "/assets/js/personalization.js";
import "/assets/js/personalization.js";
import "/assets/js/chatbot.js";

async function fetchJson(path) { return (await fetch(path)).json(); }

async function renderHome() {
  const locale = getLocale();
  const [home, common, blog, staff] = await Promise.all([
    fetchJson(`/content/${locale}/home.json`),
    fetchJson(`/content/${locale}/common.json`),
    fetchJson(`/content/blog.json`),
    fetchJson(`/content/${locale}/staff.json`)
  ]);

  // Hours
  const fmtUl = (sel, items) => {
    const ul = document.querySelector(sel);
    if (!ul) return;
    ul.replaceChildren(...items.map(s => { const li = document.createElement("li"); li.textContent = s; return li; }));
  };
  fmtUl("#home-hours", home.location.hours);
  fmtUl("#footer-hours", common.footer.hours);

  // Personalization chips (driven by JSON options for both languages)
  const chips = (group, opts) => {
    const wrap = document.querySelector(`[data-personalize-chips="${group}"]`);
    wrap.replaceChildren();
    opts.forEach((opt, i) => {
      const label = document.createElement("label");
      label.className = "chip-pill";
      label.innerHTML = `<input type="radio" name="${group}" value="${opt}" ${i === 0 ? "checked" : ""} class="visually-hidden"> ${opt}`;
      wrap.append(label);
    });
  };
  chips("age", home.personalization.ageOptions);
  chips("concern", home.personalization.concernOptions);
  chips("stage", home.personalization.stageOptions);

  // Show survey if consent allowed
  const surveyForm = document.querySelector("[data-personalize-form]");
  if (surveyForm) surveyForm.hidden = !isAllowed("personalization");

  // Services grid
  const svcGrid = document.getElementById("home-services");
  svcGrid.replaceChildren(...home.services.items.map(item => {
    const a = document.createElement("a");
    a.href = "/services.html#" + item.key;
    a.className = "card";
    a.dataset.serviceKey = item.key;
    a.innerHTML = `<h3>${item.title}</h3><p>${item.blurb ?? ""}</p>`;
    return a;
  }));

  // Staff featured (uses staff.json for names + home.json for greeting/personalLine)
  const homeStaff = document.getElementById("home-staff");
  homeStaff.replaceChildren(...home.staffFeatured.map(f => {
    const m = staff.members.find(x => x.id === f.id) || { name: f.id, role: "", photo: "assets/img/placeholders/staff-default.jpg" };
    const card = document.createElement("article");
    card.className = "staff-card";
    card.innerHTML = `
      <div class="staff-photo" role="img" aria-label="[REAL PHOTO REQUIRED] ${m.name}">${m.name.split(" ").map(s=>s[0]).join("")}</div>
      <div class="staff-body">
        <p class="staff-greeting">${f.greeting}</p>
        <p class="staff-role">${m.role}</p>
        <p>${f.personalLine}</p>
      </div>`;
    return card;
  }));

  // Recommended rail (if personalization data)
  const pers = readPers();
  if (pers?.concern) {
    document.getElementById("recommended").hidden = false;
    const recBlog = recommendedBlog(blog.posts);
    const recStaffId = recommendedStaffId();
    const recStaff = staff.members.find(m => m.id === recStaffId);
    const recGrid = document.getElementById("recommended-grid");
    recGrid.replaceChildren();
    recBlog.forEach(p => {
      const a = document.createElement("a");
      a.href = p.externalUrl; a.className = "card";
      a.innerHTML = `<h3>${p.title}</h3><p>${p.excerpt}</p>`;
      recGrid.append(a);
    });
    if (recStaff) {
      const a = document.createElement("a");
      a.href = "/staff.html#" + recStaff.id; a.className = "card";
      a.innerHTML = `<h3>${recStaff.name}</h3><p>${recStaff.role}</p>`;
      recGrid.append(a);
    }
  }

  // Blog (3 latest)
  const blogWrap = document.getElementById("home-blog");
  blogWrap.replaceChildren(...blog.posts.slice(0, 3).map(p => {
    const a = document.createElement("a");
    a.href = p.externalUrl; a.className = "card";
    a.innerHTML = `<small>${p.date} · ${p.category}</small><h3>${p.title}</h3><p>${p.excerpt}</p>`;
    return a;
  }));

  await translatePage(locale);
}

renderHome();
document.addEventListener("i18n:changed", renderHome);
document.addEventListener("personalization:changed", renderHome);
document.addEventListener("personalization:reset", renderHome);
</script>
</body>
</html>
```

- [ ] **Step 2: Verify**

```bash
bin/server &
sleep 1
open http://localhost:8080/
```

Verify all sections render with real scraped content. Toggle BM → all swap. Accept consent → fill survey → "Recommended for you" rail appears, services grid reorders. Chatbot bubble opens.

- [ ] **Step 3: Commit**

```bash
kill %1 2>/dev/null || true
git add index.html
git commit -m "feat(home): index.html with all sections, i18n, personalization, chatbot"
```

---

## Task 17: About page (`about.html`)

**Files:**
- Create: `urbane-ethos/about.html`

- [ ] **Step 1: Write the page**

Mirror the header/footer/chatbot pattern from `index.html`. Replace the body of `<main>` with:

```html
<main id="main">
  <section class="hero">
    <div class="wrap" style="max-width:var(--content-max)">
      <h1 data-i18n="about.hero.title">About</h1>
      <p class="lede" data-i18n="about.hero.subtitle"></p>
    </div>
  </section>

  <section class="section">
    <div class="wrap" style="max-width:var(--content-max)">
      <h2 data-i18n="about.mission.heading">Our mission</h2>
      <p data-i18n="about.mission.body"></p>
      <h2 data-i18n="about.story.heading">Our story</h2>
      <p data-i18n="about.story.body"></p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <h2 data-i18n="about.values.heading">What we stand for</h2>
      <div class="grid-3" id="about-values"></div>
    </div>
  </section>

  <section class="section">
    <div class="wrap cta-row">
      <a class="btn btn--primary" href="/services.html" data-i18n="about.ctas.services">View services</a>
      <a class="btn btn--secondary" href="/contact.html" data-i18n="about.ctas.contact">Get in touch</a>
    </div>
  </section>
</main>
```

Add at the end of the `<script type="module">` block (replacing the home-specific `renderHome` body):

```javascript
import { getLocale, translatePage } from "/assets/js/i18n.js";
import "/assets/js/consent.js"; import "/assets/js/a11y.js"; import "/assets/js/chatbot.js";

async function renderAbout() {
  const locale = getLocale();
  const data = await (await fetch(`/content/${locale}/about.json`)).json();
  const grid = document.getElementById("about-values");
  grid.replaceChildren(...data.values.items.map(v => {
    const c = document.createElement("article");
    c.className = "card";
    c.innerHTML = `<h3>${v.title}</h3><p>${v.body}</p>`;
    return c;
  }));
  await translatePage(locale);
}
renderAbout();
document.addEventListener("i18n:changed", renderAbout);
```

(Use the same header + footer + chatbot launcher markup as index.html.)

- [ ] **Step 2: Verify, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/about.html
kill %1 2>/dev/null || true
git add about.html
git commit -m "feat(about): about.html"
```

---

## Task 18: Staff page (`staff.html`)

**Files:**
- Create: `urbane-ethos/staff.html`

- [ ] **Step 1: Write the page**

Header/footer/chatbot identical to index.html. Main:

```html
<main id="main">
  <section class="hero">
    <div class="wrap">
      <h1 data-i18n="staff.hero.title">Meet our team</h1>
      <p class="lede" data-i18n="staff.hero.subtitle"></p>
    </div>
  </section>
  <section class="section">
    <div class="wrap"><div class="staff-grid" id="staff-grid"></div></div>
  </section>
</main>

<dialog id="video-dialog">
  <p data-i18n="common.a11y.videoUnavailable">Video coming soon</p>
  <button autofocus onclick="this.closest('dialog').close()">Close</button>
</dialog>
```

Script:

```javascript
import { getLocale, translatePage } from "/assets/js/i18n.js";
import "/assets/js/consent.js"; import "/assets/js/a11y.js"; import "/assets/js/chatbot.js";

async function renderStaff() {
  const locale = getLocale();
  const data = await (await fetch(`/content/${locale}/staff.json`)).json();
  const grid = document.getElementById("staff-grid");
  grid.replaceChildren(...data.members.map(m => {
    const c = document.createElement("article");
    c.className = "staff-card";
    c.id = m.id;
    c.innerHTML = `
      <div class="staff-photo" role="img" aria-label="[REAL PHOTO REQUIRED] ${m.name}">${m.name.split(" ").map(x=>x[0]).join("")}</div>
      <div class="staff-body">
        <p class="staff-greeting">${m.greeting}</p>
        <p class="staff-role">${m.role}</p>
        <p><small>${(m.credentials || []).join(" · ")}</small></p>
        <p>${m.personalLine || ""}</p>
        <p>${m.bio || ""}</p>
        <button class="staff-video-btn" data-video data-i18n="common.a11y.playVideoPlaceholder">Play intro video</button>
      </div>`;
    return c;
  }));
  grid.querySelectorAll("[data-video]").forEach(btn => btn.addEventListener("click", () => document.getElementById("video-dialog").showModal()));
  await translatePage(locale);
}
renderStaff();
document.addEventListener("i18n:changed", renderStaff);
```

- [ ] **Step 2: Verify, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/staff.html
kill %1 2>/dev/null || true
git add staff.html
git commit -m "feat(staff): staff.html with video-placeholder modal"
```

---

## Task 19: Services page (`services.html`)

**Files:**
- Create: `urbane-ethos/services.html`

- [ ] **Step 1: Write the page**

Header/footer/chatbot identical. Main:

```html
<main id="main">
  <section class="hero">
    <div class="wrap"><h1 data-i18n="services.hero.title">Services</h1><p class="lede" data-i18n="services.hero.subtitle"></p></div>
  </section>
  <section class="section"><div class="wrap" id="services-blocks"></div></section>
</main>
```

Script:

```javascript
import { getLocale, translatePage } from "/assets/js/i18n.js";
import "/assets/js/consent.js"; import "/assets/js/a11y.js"; import "/assets/js/chatbot.js";

async function renderServices() {
  const locale = getLocale();
  const data = await (await fetch(`/content/${locale}/services.json`)).json();
  const root = document.getElementById("services-blocks");
  root.replaceChildren(...data.items.map(item => {
    const sec = document.createElement("article");
    sec.className = "service-block";
    sec.id = item.key;
    sec.innerHTML = `
      <h2>${item.title}</h2>
      <p><strong>What it is:</strong> ${item.whatItIs}</p>
      <p><strong>Who it's for:</strong> ${item.whoItsFor}</p>
      <p><strong>What to expect:</strong> ${item.whatToExpect}</p>
      ${(item.faqs || []).map(f => `<details class="faq"><summary>${f.q}</summary><p>${f.a}</p></details>`).join("")}
      <a class="btn btn--primary" href="/contact.html?service=${item.key}">${item.cta}</a>`;
    return sec;
  }));
  await translatePage(locale);
}
renderServices();
document.addEventListener("i18n:changed", renderServices);
```

- [ ] **Step 2: Verify, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/services.html
kill %1 2>/dev/null || true
git add services.html
git commit -m "feat(services): services.html with per-service FAQ accordion"
```

---

## Task 20: Blog page (`blog.html`)

**Files:**
- Create: `urbane-ethos/blog.html`

- [ ] **Step 1: Write the page**

Header/footer/chatbot identical. Main:

```html
<main id="main">
  <section class="hero"><div class="wrap"><h1 data-i18n="blog.hero.title">From the blog</h1></div></section>
  <section class="section">
    <div class="wrap">
      <p class="locale-notice" id="locale-notice" hidden data-i18n="common.locale.blogNotice">Site navigation translates; blog articles remain in English.</p>
      <div id="blog-filters" class="cta-row" style="margin-bottom:var(--space-8)"></div>
      <div class="grid-3" id="blog-grid"></div>
    </div>
  </section>
</main>
```

Script:

```javascript
import { getLocale, translatePage } from "/assets/js/i18n.js";
import "/assets/js/consent.js"; import "/assets/js/a11y.js"; import "/assets/js/chatbot.js";

async function renderBlog() {
  const locale = getLocale();
  const data = await (await fetch(`/content/blog.json`)).json();
  document.getElementById("locale-notice").hidden = locale === "en";

  const filtersWrap = document.getElementById("blog-filters");
  let active = "All";
  filtersWrap.replaceChildren();
  data.categories.forEach(cat => {
    const b = document.createElement("button");
    b.className = "chip-pill";
    b.textContent = cat;
    b.setAttribute("aria-pressed", cat === "All" ? "true" : "false");
    b.addEventListener("click", () => { active = cat; filtersWrap.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.textContent === cat ? "true" : "false")); paint(); });
    filtersWrap.append(b);
  });

  function paint() {
    const items = active === "All" ? data.posts : data.posts.filter(p => p.category === active);
    const grid = document.getElementById("blog-grid");
    grid.replaceChildren(...items.map(p => {
      const a = document.createElement("a");
      a.href = p.externalUrl; a.className = "card"; a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = `<small>${p.date} · ${p.category}</small><h3>${p.title}</h3><p>${p.excerpt}</p>`;
      return a;
    }));
  }
  paint();
  await translatePage(locale);
}
renderBlog();
document.addEventListener("i18n:changed", renderBlog);
```

- [ ] **Step 2: Verify, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/blog.html
# Toggle BM → verify locale-notice appears. Click each category chip → grid filters.
kill %1 2>/dev/null || true
git add blog.html
git commit -m "feat(blog): blog.html with category filter + BM locale notice"
```

---

## Task 21: Contact page (`contact.html`)

**Files:**
- Create: `urbane-ethos/contact.html`

- [ ] **Step 1: Write the page**

Header/footer/chatbot identical. Main:

```html
<main id="main">
  <section class="hero"><div class="wrap"><h1 data-i18n="contact.hero.title">Get in touch</h1><p class="lede" data-i18n="contact.hero.subtitle"></p></div></section>
  <section class="section">
    <div class="wrap grid-2">
      <div>
        <h2 data-i18n="contact.address.heading">Our centre</h2>
        <address>
          <p><span data-i18n="contact.address.line1"></span><br><span data-i18n="contact.address.line2"></span></p>
        </address>
        <ul id="contact-phones"></ul>
        <ul id="contact-hours"></ul>
        <iframe id="map" loading="lazy" title="Map of Urbane Ethos centre" width="100%" height="260" style="border:0;border-radius:var(--radius-2);"></iframe>
      </div>
      <div>
        <h2 data-i18n="contact.form.heading">Send us a message</h2>
        <p data-i18n="contact.form.subheading"></p>
        <form id="contact-form" novalidate>
          <div class="form-field">
            <label for="cf-name" data-i18n="contact.form.fields.nameLabel">Your name</label>
            <input id="cf-name" name="name" required data-i18n-attr="placeholder:contact.form.fields.namePlaceholder">
            <p class="form-error" id="cf-name-err" hidden data-i18n="contact.form.errors.nameRequired"></p>
          </div>
          <div class="form-field">
            <label for="cf-email" data-i18n="contact.form.fields.emailLabel">Email</label>
            <input id="cf-email" name="email" type="email" required data-i18n-attr="placeholder:contact.form.fields.emailPlaceholder">
            <p class="form-error" id="cf-email-err" hidden data-i18n="contact.form.errors.emailRequired"></p>
          </div>
          <div class="form-field">
            <label for="cf-phone" data-i18n="contact.form.fields.phoneLabel">Phone (optional)</label>
            <input id="cf-phone" name="phone" type="tel" data-i18n-attr="placeholder:contact.form.fields.phonePlaceholder">
          </div>
          <div class="form-field">
            <label for="cf-concern" data-i18n="contact.form.fields.concernLabel">What's on your mind?</label>
            <textarea id="cf-concern" name="concern" rows="5" required data-i18n-attr="placeholder:contact.form.fields.concernPlaceholder"></textarea>
            <p class="form-error" id="cf-concern-err" hidden data-i18n="contact.form.errors.concernRequired"></p>
          </div>
          <button class="btn btn--primary" data-i18n="contact.form.fields.submit">Send</button>
        </form>
        <p style="margin-top:var(--space-4)"><small data-i18n="contact.form.successNote"></small></p>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap" style="max-width:var(--content-max)">
      <h2 data-i18n="contact.chatbotCta.heading">Prefer to chat?</h2>
      <p data-i18n="contact.chatbotCta.body"></p>
      <button class="btn btn--primary chatbot-launcher-inline" data-i18n="contact.chatbotCta.button">Chat with us</button>
    </div>
  </section>
</main>
```

Script:

```javascript
import { getLocale, t, translatePage } from "/assets/js/i18n.js";
import "/assets/js/consent.js"; import "/assets/js/a11y.js"; import "/assets/js/chatbot.js";

async function renderContact() {
  const locale = getLocale();
  const data = await (await fetch(`/content/${locale}/contact.json`)).json();
  const ul = (sel, items, fn) => {
    const el = document.querySelector(sel);
    el.replaceChildren(...items.map(fn));
  };
  ul("#contact-phones", data.phones, p => { const li = document.createElement("li"); li.innerHTML = `${p.label}: <a href="tel:${p.number.replace(/\s/g,"")}">${p.number}</a>`; return li; });
  ul("#contact-hours", data.hours, s => { const li = document.createElement("li"); li.textContent = s; return li; });

  document.getElementById("map").src = data.address.mapEmbedSrc;

  const form = document.getElementById("contact-form");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    let ok = true;
    const validate = (id, errId, cond) => {
      const err = document.getElementById(errId);
      err.hidden = cond;
      document.getElementById(id).setAttribute("aria-invalid", cond ? "false" : "true");
      if (!cond) ok = false;
    };
    const nameOk = form.name.value.trim().length > 0;
    const emailOk = /\S+@\S+\.\S+/.test(form.email.value);
    const concernOk = form.concern.value.trim().length > 0;
    validate("cf-name", "cf-name-err", nameOk);
    validate("cf-email", "cf-email-err", emailOk);
    validate("cf-concern", "cf-concern-err", concernOk);
    if (!ok) return;
    const body = encodeURIComponent(`Hi Urbane Ethos,\n\n${form.concern.value}\n\n— ${form.name.value} (${form.email.value}${form.phone.value ? `, ${form.phone.value}` : ""})`);
    location.href = `mailto:hello@urbaneethos.center?subject=Enquiry%20from%20website&body=${body}`;
  });

  document.querySelector(".chatbot-launcher-inline")?.addEventListener("click", () => document.querySelector(".chatbot-launcher")?.click());
  await translatePage(locale);
}
renderContact();
document.addEventListener("i18n:changed", renderContact);
```

> Replace `hello@urbaneethos.center` in the mailto with the actual address from the scrape if different.

- [ ] **Step 2: Verify, commit**

```bash
bin/server &
sleep 1
open http://localhost:8080/contact.html
# Submit empty form → 3 inline errors render. Fill, submit → mail client opens.
# Click "Chat with us" → chatbot opens.
kill %1 2>/dev/null || true
git add contact.html
git commit -m "feat(contact): contact.html with form, mailto, chatbot CTA"
```

---

## Task 22: A11y audit + fixes

**Files:**
- Modify: any of the 8 HTML pages depending on findings
- Update: `README.md` (Known a11y gaps section)

- [ ] **Step 1: Start dev server**

```bash
cd /Users/deepsight/code/urbane-ethos
bin/server &
sleep 1
```

- [ ] **Step 2: Run axe-core CLI on every page**

```bash
for path in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  echo "=== /$path ==="
  npx @axe-core/cli "http://localhost:8080/$path" --tags wcag2a,wcag2aa,wcag22aa --exit
done
```

Each page should report violations to stdout. The `--exit` flag exits non-zero on violation.

- [ ] **Step 3: Fix every serious/critical violation**

Common fixes likely needed:
- Missing `<label>` for survey radio chips → wrap each `<input>` in `<label class="chip-pill">…</label>` (already done in Task 16).
- Color contrast: re-check `color-ink-muted` against background; if below 4.5:1 darken to `#5C4F40` and update `tokens.css`.
- `<iframe>` missing `title`: already set on map iframe; verify on every page.
- Buttons without accessible name: add `aria-label` or visible text.
- Heading-level skipping: ensure every page has exactly one `<h1>` and no skipped levels.

For each fix:
1. Edit the relevant file.
2. Re-run axe for that page.
3. Repeat until zero serious/critical.

- [ ] **Step 4: Manual keyboard sweep**

For each page, navigate by Tab. Confirm:
- Skip-link is first focusable, jumps to `#main`.
- Focus order matches visual order.
- Every interactive element reachable.
- Esc closes chatbot + consent banner.
- Forms announce errors via `aria-live`.

- [ ] **Step 5: VoiceOver smoke (Home + Contact)**

`Cmd+F5` (VoiceOver on). Navigate Home: headings, landmarks, links. Navigate Contact: form fields announce labels + errors after submit.

- [ ] **Step 6: Document any leftover gaps in README**

Add to `README.md` under "Known a11y gaps" any minor violations or third-party issues (e.g. Google Maps iframe lacking title — set explicitly so it shouldn't appear).

- [ ] **Step 7: Commit fixes**

```bash
kill %1 2>/dev/null || true
git add -u
git commit -m "fix(a11y): resolve axe-core serious/critical findings across all pages"
```

---

## Task 23: README finalization + repo handoff

**Files:**
- Modify: `urbane-ethos/README.md`

- [ ] **Step 1: Replace README with the full version**

```markdown
# Urbane Ethos — Website Revamp Prototype

A Phase 2 interactive HTML prototype for the urbaneethos.center revamp. Real scraped content (EN), draft Bahasa Malaysia translations, mocked-but-interactive chatbot + personalization, PDPA consent banner + privacy notice, WCAG 2.2 AA accessibility, and three design-direction comparison demos (B is the committed direction; A & C are artifacts).

Live site (current): https://www.urbaneethos.center/
Spec: `docs/superpowers/specs/2026-06-08-urbane-ethos-revamp-design.md`
Plan: `docs/superpowers/plans/2026-06-08-urbane-ethos-revamp.md`

## Status

Phase 2 prototype. Not production. EN content is verbatim; BM is machine-translated and needs human review.

## Run locally

```
bundle install
bin/server          # http://localhost:8080
```

Requires Ruby ≥ 3.1. No Node required for the prototype runtime. The one-off a11y audit uses `npx @axe-core/cli` (no install) — Node is only needed if you want to re-run that audit.

## Structure

```
index.html  about.html  staff.html  services.html  blog.html  contact.html
analytics.html  privacy.html
assets/      tokens / base / components / motion CSS, JS modules, fonts, images
content/en   verbatim English content (mirrored to /ms)
content/ms   draft Bahasa Malaysia translations
content/blog.json   EN-only blog index (articles link out)
design/directions/  v1-quiet, v2-warm (committed), v3-bold
bin/         server + i18n parity check
test/        smoke pages + parity fixtures
docs/        spec + plan
```

## Design principles realized

1. **Personalization** — home micro-survey reorders the services grid and surfaces a "Recommended for you" rail. Client-side rules, gated by consent.
2. **Conversational design** — floating chatbot with scripted decision tree (Book / Service / Pricing / Human), voice input + TTS, bilingual.
3. **More personal** — real human photographs front and center; placeholders marked `[REAL PHOTO REQUIRED]`. Staff video slots labeled honestly ("Video coming soon").
4. **Accessibility** — WCAG 2.2 AA with AAA contrast where cheap; font-size toggle, skip-link, `prefers-reduced-motion`, semantic landmarks, focus-visible everywhere.

## What's real vs draft vs mocked

- **Real:** all EN copy (scraped verbatim from urbaneethos.center).
- **Draft:** BM translations — machine-generated; needs human review. Glossary at `content/glossary.md`.
- **Mocked:** chatbot replies (decision tree, no LLM), personalization rules (no ML), staff video thumbnails, analytics data, contact form (mailto only).
- **Placeholder:** every image flagged `[REAL PHOTO REQUIRED]` in `alt`.

## Browser support

Modern only — Safari 16+, Chrome 110+, Firefox 110+.

## i18n parity check

```
bin/check-i18n-parity.rb
```

Exit 0 = all keys mirrored. `chatbot.json` is in scope. `blog.json` is intentionally EN-only.

## Known a11y gaps

(populate from Task 22 findings)

## Out of scope (Phase 3)

- Hosting / deploy pipeline
- Individual blog article pages (currently link out)
- Real chatbot LLM backend
- Real server-side personalization
- BM human + legal review (especially `privacy.html`)
- Real staff intro videos
- Contact form backend (currently `mailto:`)
- Image optimization automation
- Real analytics wiring
- Standalone Events page (currently a home teaser + contact CTA)

## Credits

Original site: https://www.urbaneethos.center/
Revamp prototype: built 2026-06.
```

- [ ] **Step 2: Run final acceptance checks**

```bash
cd /Users/deepsight/code/urbane-ethos

# i18n parity
bin/check-i18n-parity.rb
# Expect: "i18n parity OK"

# All JSON parses
for f in content/en/*.json content/ms/*.json content/blog.json; do
  ruby -rjson -e "JSON.parse(File.read('$f'))" || echo "BROKEN: $f"
done

# Server boots
bin/server &
sleep 1
for path in "" about.html staff.html services.html blog.html contact.html analytics.html privacy.html; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/$path")
  echo "$code  /$path"
done
kill %1 2>/dev/null || true
```

Expected: all `200`s.

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: finalize README with run/structure/status/scope"
git log --oneline
```

Expected: clean linear history, ~23 commits, no Anthropic/Claude trailers.

---

## Self-Review (post-write)

**Spec coverage check:**
- §3 Phased workflow → Tasks 1, 3, 4, 5–8, 9–22, deferred Phase 3 in §11 ✓
- §4 Repo layout → Tasks 1, 9, 10–14, 16–21 cover every entry ✓
- §5 Page-by-page → Tasks 16–21 cover the 6 main pages; 12 covers privacy; 15 covers analytics ✓
- §6.1 Personalization → Task 14 + Task 16 (home integration) ✓
- §6.2 Conversational → Task 13 ✓
- §6.3 More personal → Tasks 16 (home staff), 18 (staff page video placeholders, alt text discipline) ✓
- §6.4 Accessibility → Tasks 9 (tokens for contrast), 11 (font-size + skip-link), 22 (audit) ✓
- §7 i18n → Tasks 2, 3, 4, 10 ✓
- §8 PDPA → Tasks 3 (consent.json draft), 4 (BM mirror), 12 (banner + privacy page) ✓
- §9 Direction → Tasks 5–8 ✓
- §10 Tech stack → Tasks 1 (Ruby+WEBrick), 9 (CSS), 10–15 (JS) ✓
- §11 Out of scope → README in Task 23 ✓
- §12 Acceptance → Task 22 (axe) + Task 23 (final checks) ✓

**Placeholder scan:** No "TBD/TODO/handle edge cases" — `<VERBATIM ...>` markers in JSON files are explicit content-fill instructions inside Task 3 steps, not unfinished plan items.

**Type consistency check:**
- `data-i18n` attribute pattern: namespace.key.path — consistent across i18n.js + all HTML pages ✓
- `data-i18n-attr` "attr:key" comma-separated — consistent ✓
- `data-fs-cycle` button hook — consistent ✓
- `data-consent-manage` / `data-consent-action` / `data-consent-toggle` — consistent ✓
- `data-services-grid` + `data-service-key` — consistent across components ✓
- `data-personalize-form` / `data-personalize-chips` / `data-personalize-skip` / `data-personalize-reset` — consistent ✓
- Storage keys all prefixed `urbane-ethos:` — consistent ✓
- JS module exports: `getLocale`, `setLocale`, `t`, `translatePage` from i18n.js consumed in all pages — consistent ✓
- `readConsent`, `writeConsent`, `isAllowed` from consent.js used by chatbot.js + personalization.js — consistent ✓

No issues found. Plan is ready.

---

## Execution Handoff

Plan complete and saved to `urbane-ethos/docs/superpowers/plans/2026-06-08-urbane-ethos-revamp.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a 23-task plan with diverse work (scraping, translation, design, JS modules, HTML pages, a11y audit).
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
