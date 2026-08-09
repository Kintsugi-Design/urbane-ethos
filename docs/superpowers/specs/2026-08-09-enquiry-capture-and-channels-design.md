# Enquiry capture, pre-fill, and contact channels — design

**Date:** 2026-08-09
**Status:** Approved, ready for implementation
**Supersedes nothing.** Extends the contact surface shipped in `2026-06-08-urbane-ethos-revamp-design.md`.

## 1. Why

A technical usability review of the contact surface found one live defect and three gaps.

**The defect.** `contact.html:298` submits every enquiry to `mailto:info@urbaneethos.center`. That address appears **nowhere else in the repository**. Every other surface — the contact card (`contact.html:114`), the footer (`:198`), the JSON-LD `MedicalBusiness` block (`:37`), `content/{en,ms}/contact.json`, `content/careers.json`, `privacy.html`, `README.md` — says `urbaneethos@yahoo.com`. It is a hand-substitution for the original `hello@urbaneethos.center` placeholder that was never reconciled against the authoritative source. `docs/HANDOVER.md:127` claims the placeholder "is gone", but the grep gate that verified it (`2026-07-27-authoritative-content-replacement.md:602`) only scanned `content/`, never the page markup.

Consequence: every enquiry submitted through the form since that change has gone to a mailbox the centre does not read. On `careers.html` the effect is visible in a single viewport — the primary CTA (`:92`) routes into the form and therefore to `info@`, while the secondary link directly beneath it (`:93`) goes to `urbaneethos@yahoo.com`.

**Gap 1 — no interest capture.** The form's five fields are name, email, phone, concern, tellmore. It has no field for *which service the enquiry is about*. `services.html` emits `?service=<key>` on all seven CTAs in both its static and JS render paths, but `contact.html:296` reads that param only at submit time, only to build a mailto subject, and injects the raw slug (`Enquiry about ot`).

**Gap 2 — nothing is pre-filled.** The site already holds high-intent signals it discards: the personalization survey (`age`, `concern[]`, `stage`) in `sessionStorage`, and the chatbot's `state.context` (`{service, age, freq}`), which is accumulated in memory at `chatbot.js:87` and destroyed on unload.

**Gap 3 — WhatsApp is data, never a link.** `content/en/contact.json:24` holds `+6013-249 0069` labelled "WhatsApp", and `contact.html:260` gives that row a chat icon — then renders `href="tel:+60132490069"`. Tapping "WhatsApp" places a phone call. There is no `wa.me` link anywhere on the site.

## 2. Decisions taken

| Question | Decision |
|---|---|
| Delivery mechanism | Stay on `mailto:` — no backend. Fix the address, enrich the payload. |
| Second channel | WhatsApp, offered alongside email at the point of send. |
| WhatsApp placement | **No separate floating bubble.** WhatsApp folds into the existing chat launcher and panel. |
| Pre-fill sources | `?service=` (no consent), personalization survey, chatbot context. Page-journey tracking is **out of scope**. |
| Response-time copy | **Prohibited.** The centre has no dedicated customer service line and will not commit to a reply window. |
| Fix scope | All four audit groups: form correctness, consent/storage, contact-page content, number/address hygiene. |

Two further requirements added during review:

- The chatbot's human-handoff nodes are renamed from the `human.*` namespace to `customer.*`.
- Visitors get an explicit control to clear everything the site has stored about them before they leave.

**Copy note on the clear-data control.** The site sets no cookies — `document.cookie` has zero occurrences across `assets/`. All state is `localStorage` / `sessionStorage`. The control is therefore labelled "Clear my data" and enumerates what it wipes. Calling it "cookies" would be inaccurate on a site that also publishes a PDPA notice.

## 3. Architecture

### 3.1 `assets/js/enquiry.js` (new)

The root cause of the wrong-address defect is that a page hardcoded a channel. One module becomes the only place that knows how to reach the centre and what is known about a visitor.

```js
export function readInterest()            // → { service, serviceSource, age, concerns[], stage, name, phone, locale }
export function composeEnquiry(payload)   // → { subject, body }   one message, transport-agnostic
export async function channels()          // → { email, whatsapp: { display, e164 } }
```

`channels()` derives from the `contact` i18n namespace (`email`, `phones[]`) — already authoritative, already parity-gated. The `wa.me` target is *computed* (`+6013-249 0069` → `60132490069`), never stored a second time. A future address or number change becomes a one-line content edit that propagates to every consumer.

Consumers: the inline script in `contact.html`, and `chatbot.js`. Nothing else imports it.

**This is not a canggih-layer module.** Like `yt-embed.js` and `map-embed.js` it is page-specific, so the "must be imported in all 10 pages" rule in `CLAUDE.md` does not apply.

### 3.2 `assets/js/storage.js` (new)

A thin consent-aware, exception-safe wrapper:

```js
export function get(key, { category = "necessary", fallback = null })
export function set(key, value, { category = "necessary" })
export function remove(key)
export function clearAll()                // every urbane-ethos:* key + the legacy "session-chat"
```

Every module that touches storage migrates onto it. This is what makes the `chatbot.js:29` ungated-write defect structurally impossible to reintroduce, and it closes the "no try/catch on storage writes" backlog item from `HANDOVER.md:68` in the same pass.

`clearAll()` is the engine behind the new clear-data control.

### 3.3 `bin/check-contact-channels.rb` (new, CI-gated)

Scans every `mailto:` / `wa.me` / `tel:` literal across the production pages and asserts each matches `content/en/contact.json`. This is precisely the drift class that produced `info@urbaneethos.center`, and precisely what the previous `content/`-only grep gate could not see. It also catches the legacy `urbaneethoseic@gmail.com` still present in two archival posts.

Wired into **both** `.github/workflows/pages.yml` and `.gitlab-ci.yml`, alongside `bin/check-i18n-parity.rb`.

## 4. Interest capture

A new `<select id="cf-service" name="service">` is added to the form, positioned above the concern textarea.

Options are built at render time from the `services` i18n namespace (`items[].key` + `items[].title` — all seven: `screening`, `assessment`, `ot`, `speech`, `specialed`, `eip`, `psych`), plus a leading "Not sure yet" option which is also the static no-JS fallback in markup. Building from the live namespace rather than duplicating labels into `contact.json` means both locales come free and the option set cannot drift from the services page.

Note the home grid (`content/en/home.json`) exposes only six keys and merges "Screening & Assessment" — the form deliberately uses the seven-key `services.json` vocabulary, which is the superset.

The selected service reaches the message as a human title, not a slug: `Enquiry about Speech Language Therapy (SLP)`, not `Enquiry about speech`.

## 5. Pre-fill

### 5.1 Precedence

Highest-intent signal wins:

1. **`?service=` from a services CTA.** Explicit and just-clicked. Requires no consent — it is user-initiated navigation with no storage read. Validated against the `services.json` key set; unrecognised values are ignored rather than injected.
2. **Chatbot context.** `state.context.service` from the pricing branch. Requires persisting what is currently discarded.
3. **Personalization survey.** `concern[]` mapped through the existing `RULES.concernToService` table in `personalization.js:14`. Inferred rather than stated, so lowest priority.

The age gate is inherited, not re-implemented: `eip` is never suggested when `age` is `adult` or `older-adult` (`personalization.js:52-53`).

### 5.2 Name and phone

These come only from the chatbot's human-handoff branch. Today that branch collects both as a single unparsed free-text blob (`input: "name+phone"`, `chatbot.js:75-79`). Regexing a blob is locale-fragile and unreliable, so the fix is at the source: the branch is split into two sequential steps that capture each value cleanly.

This is also where the `human.*` → `customer.*` rename lands:

| Before | After |
|---|---|
| `human` | `customer` |
| `human.collect` | `customer.name` → `customer.phone` (split) |
| `human.confirm` | `customer.confirm` |

Both `content/en/chatbot.json` and `content/ms/chatbot.json` are updated; the id set must stay identical across locales.

### 5.3 What is deliberately NOT pre-filled

**The concern textarea.** It holds sensitive child-health free text. Silently re-presenting it reads as surveillance even where consent technically covers it, and `content/en/consent.json` explicitly frames the personalization category as *"sensitive personal data; explicit consent only."*

Instead, survey-derived context surfaces as a visible, labelled line above the form:

> We've filled some of this in from your earlier answers · **Clear**

The clear action wipes the pre-filled values and the stored survey. A visitor can always see what the site knew about them and undo it in one click. This is the same principle as the §7 clear-data control, applied locally.

### 5.4 Upstream content fix required

`personalization.stage` is stored as a **localised display string** with no stable slug (`"Just exploring"` / `"Sekadar melihat-lihat"`), unlike `age` and `concern` which both carry slugs. Any consumer reading it must otherwise compare against both locales' literals.

`stageOptions` in `content/{en,ms}/home.json` gains the same `{key, label}` shape already used by `ageOptions` and `concernOptions`. `personalization.js` gains a tolerant read that accepts the legacy bare-string shape, mirroring how `asConcerns()` (`:58`) already normalises legacy `concern` values.

## 6. Send flow

Submit validates, then swaps the form for a success panel. **The form has no success state at all today** — a visitor with no registered mail handler currently gets total silence, with no way to tell whether anything happened.

```
┌─ Thanks, Aisyah ────────────────┐
│ Your enquiry about Speech       │
│ Therapy is ready to send.       │
│                                 │
│  [ Continue on WhatsApp ]       │
│  [ Send by email instead ]      │
│  copy message                   │
└─────────────────────────────────┘
```

Both buttons carry the identical `composeEnquiry()` output — one message, two transports. Nothing navigates until the visitor chooses, so no popup blocker can intercept it, and the copy-to-clipboard fallback covers devices with neither handler registered.

The panel carries `role="status"` so the transition is announced. Focus moves to the panel heading on swap.

**No response-time text.** This also removes existing copy: `content/en/chatbot.json:103` currently promises *"We'll WhatsApp you within 1 business day"*, and `content/ms/chatbot.json:106` mirrors it. Both are rewritten.

## 7. WhatsApp placement

The floating corner keeps exactly one anchor — the existing `.chatbot-launcher`, unmoved at `bottom/right: 1.5rem`. WhatsApp appears in three places instead:

1. **Chatbot panel footer** — a persistent "Continue on WhatsApp" action composing from whatever `state.context` holds at that moment.
2. **The `customer.confirm` node** — becomes a real `wa.me` deep link rather than a promise of future contact.
3. **The contact page WhatsApp row** (`contact.html:260`) — stops being a `tel:` link.

The row also needs a distinct `whatsapp` icon in `icons.js`; it currently borrows `chat`, which is the chatbot launcher's own icon.

**One defensive CSS fix.** `.chatbot-launcher` (`components.css:627`) has no `z-index` whatsoever, so it stacks by DOM order alone and the consent banner (`z-index: 15`) paints over it — full-bleed below 640px (`components.css:691`). That is a pre-existing bug and is closed here since the corner is being touched anyway.

## 8. Clear-my-data control

The footer's Privacy column already carries `[data-consent-manage]` ("Manage cookies") on every page. A sibling entry is added:

```html
<li><a href="#" data-consent-clear data-i18n="common.footer.clearData">Clear my data</a></li>
```

Clicking it opens a native `<dialog>` confirmation — **not** `window.confirm()`, which would block the page. The dialog enumerates exactly what will be removed: language preference, font-size preference, consent choices, personalization answers, and chat transcripts. Confirming calls `storage.clearAll()`, which removes every `urbane-ethos:*` key plus the legacy unprefixed `session-chat`, then reloads so the consent banner re-presents from a clean state.

The same action is also exposed inside the consent modal, so a visitor already managing their preferences does not have to hunt for it.

The footer appears in 10 production pages, `404.html`, and `content/blog/_post.html.erb`. Blog pages are updated **by regenerating** via `bin/build-blog.rb` — never by hand-editing `post-*.html`.

New keys in `content/{en,ms}/common.json`: `footer.clearData`, `clearData.title`, `clearData.body`, `clearData.itemsList`, `clearData.confirm`, `clearData.cancel`, `clearData.done`.

## 9. Consent

Pre-filling a form from chat answers exceeds what the `chatbot` category currently promises (*"Keep your chat transcripts between visits"*). Both the `chatbot` and `personalization` descriptions in `content/{en,ms}/consent.json` are widened to cover reuse-for-enquiry, and `CONSENT_VERSION` goes `1 → 2` (`consent.js:5`) so existing visitors are re-prompted rather than silently re-scoped.

`HANDOVER.md:65` already flags the consent-banner copy as needing a pre-launch rewrite (G3 — *"the banner implies control it doesn't have and the 'Analytics' toggle gates nothing real"*). That rewrite rides along here rather than becoming a second re-prompt event for the same visitors.

No new consent category is introduced, because page-journey tracking was dropped from scope.

## 10. Correctness fixes

**Group A — form.**
- Submit listener is registered once. Today `renderContact()` re-runs on every `i18n:changed` (`contact.html:311`) and attaches an additional listener each time, so a visitor who toggles language twice fires the handler three times.
- `contact.form.errors.emailInvalid` is wired to the invalid case. It exists in both locales but is referenced nowhere, so a visitor typing `bob@bob` is told *"We need an email to reply to"* — which is wrong; they supplied one.
- Focus moves to the first invalid field on failed submit. Errors are currently announced via `role="alert"` but keyboard and screen-reader users are left standing on the submit button.
- `autocomplete="name" | "email" | "tel"` added. There is currently not one `autocomplete` attribute anywhere in the repository.

**Group B — consent and storage.**
- `chatbot.js:29` writes the session transcript *outside* its consent gate. Because the gated read at `:16` returns `[]` when consent is absent, each ungated write also clobbers prior history. Both are fixed by routing through `storage.js`.

**Group C — contact page content.**
- `data-i18n="contact.hero.title"` on `<title>` (`contact.html:6`) makes `translatePage()` overwrite the SEO title with a bare `"CONTACT"`, losing `"— Urbane Ethos"`. Document titles need a distinct binding that does not collide with visible-text translation.
- The same key renders `<h1>CONTACT</h1>` directly above a `"Contact Us"` lede (`contact.html:101`), so the page reads "CONTACT / Contact Us".
- `hours[]` in `content/ms/contact.json:29-32` is verbatim English (`"Monday: 12PM – 5PM"`, `"Closed Sunday & Public Holidays"`), as is the footer mirror in `content/ms/common.json`. The BM contact page displays English opening hours.

**Group D — number and address hygiene.**
- Phone formats across archival blog posts are inconsistent and in two cases malformed: `+013-249 0069` (`post-mental-health-awareness-on-secondary-school-students.md`, `post-anak-dah-masuk-sekolah.md`) and `+613-249 0069` (`post-understanding-improving-mental-health-services-for-people-with-disabilities-pwd.md`). Normalised to `+6013-249 0069`.
- The legacy `urbaneethoseic@gmail.com` in `registrations-eip-2020-are-now-open.md` and `can-my-child-benefit-from-aac.md` is reconciled to `urbaneethos@yahoo.com`.
- Both edit `content/blog/posts/*.md` and regenerate through `bin/build-blog.rb`.

## 11. Verification

| Check | Gate |
|---|---|
| `bin/check-i18n-parity.rb` | CI — must stay green across all 9 mirrored namespaces |
| `bin/check-contact-channels.rb` | CI — new |
| axe-core, all 10 production pages | Manual — 0-violation ratchet held; the form gains a `<select>` and a live-region panel |
| `test/smoke/enquiry.html` | Manual — exercises each pre-fill source and both transports |
| EN/BM toggle on `contact.html` | Manual — pre-fill and the success panel must survive a locale change |
| Canggih import counts | Unchanged: `nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3` |

## 12. Out of scope

- Any form backend. Delivery stays `mailto:` / `wa.me`.
- Page-journey capture and the `urbane-ethos:session-events` key, which remains read-but-never-written by `analytics-demo-data.js:36`.
- Replacing the scripted chatbot with a real LLM (`HANDOVER.md:284`).
- The remaining launch-checklist items: real staff photos, real pricing, BM human and legal review, DNS and custom domain.
