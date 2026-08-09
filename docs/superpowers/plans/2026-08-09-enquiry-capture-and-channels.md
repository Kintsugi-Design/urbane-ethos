# Enquiry capture, pre-fill, and contact channels — implementation plan

**Date:** 2026-08-09
**Design:** `docs/superpowers/specs/2026-08-09-enquiry-capture-and-channels-design.md` (authoritative)
**Execution model:** parallel subagents. Work-units below are file-disjoint — no two units write the same file.

---

## 0. Read this first (all agents)

- Every path in shipped markup/JS stays **relative** (`./assets/js/foo.js`). Root-absolute `/assets/…` is permitted **only** in `test/smoke/*.html`, matching the existing convention there.
- No build step, no polyfill, no transpile, no new runtime dependency.
- All CSS goes inside an `@layer components { … }` block in `assets/css/components.css`.
- `post-*.html` and `content/blog.json` are **generated**. Only work-unit **U11** may touch them, and only by running `ruby bin/build-blog.rb`.
- `bin/check-i18n-parity.rb` must exit 0 at the end of every batch. Only **U7** edits locale JSON.
- Do not invent names. §1 (Shared contract) is the single source of truth for class names, `data-*` attributes, storage keys and i18n key paths. If a name you need is missing there, stop and escalate rather than coining one.

### Facts verified against the tree (do not re-derive)

| Fact | Value |
|---|---|
| `components.css` structure | 5 separate `@layer components { … }` blocks; last ends line 1195 |
| Existing `.chatbot-panel` z-index | 20 |
| Existing `.consent-banner` z-index | 15 |
| Existing `.consent-modal-root` z-index | 50 |
| `.chatbot-launcher` z-index | **none** (the §7 defect) |
| `analytics.html` | has **no `<footer>`** and does not import `consent.js` |
| `404.html` footer | copyright-only `<p>`, no Privacy column |
| `privacy.html` footer | single `<p>` with inline `·`-separated links |
| `post-year-end-promo.html` | a production page **and** generated output |
| `index.html` `chips()` | already accepts `"string"` **and** `{value,label}` (lines 433-434) |
| parity script + arrays | arrays are **not** walked → `stageOptions`/`phones[]`/`options[]` are parity-invisible |
| parity script + `_note` | `_note` **is** walked (only `_meta`/`_draft`/`_correction` are stripped) → mirror any new `_note` |
| `mailto:` literals in root HTML | 51 × `urbaneethos@yahoo.com`, 2 × `urbaneethoseic@gmail.com` (generated posts), 1 × `info@urbaneethos.center` (`contact.html:298`), 1 × `mailto:${data.outro.email}` (careers.html) |

---

## 1. Shared contract — FROZEN before any unit starts

Nothing in this section may be changed by a single unit. If it must change, it changes here first and every affected unit is told.

### 1.1 CSS class names

| Class | Owner (CSS) | Owner (markup/JS) | Purpose |
|---|---|---|---|
| `.enquiry-success` | U6 | U4 | success panel container |
| `.enquiry-success-title` | U6 | U4 | `<h3>` inside the panel |
| `.enquiry-success-body` | U6 | U4 | one-sentence body |
| `.enquiry-success-actions` | U6 | U4 | button stack |
| `.enquiry-copy` | U6 | U4 | "copy message" tertiary control |
| `.enquiry-copy-feedback` | U6 | U4 | "Copied." live text |
| `.form-field--select` | U6 | U4 | modifier on the `.form-field` wrapping `#cf-service` |
| `.prefill-notice` | U6 | U4 | the "We've filled some of this in…" line |
| `.prefill-notice-text` | U6 | U4 | text span |
| `.prefill-notice-clear` | U6 | U4 | inline "Clear" button |
| `.clear-data-dialog` | U6 | U2 | on the native `<dialog>` |
| `.clear-data-title` | U6 | U2 | `<h2>` inside the dialog |
| `.clear-data-body` | U6 | U2 | explanatory `<p>` |
| `.clear-data-items` | U6 | U2 | `<ul>` enumerating what is wiped |
| `.clear-data-actions` | U6 | U2 | button row |
| `.chatbot-footer` | U6 | U3 | persistent chatbot panel footer strip |
| `.chatbot-wa` | U6 | U3 | "Continue on WhatsApp" anchor inside it |

Existing classes reused unchanged: `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.form-field`, `.form-error`, `.form-actions`, `.contact-row`, `.contact-row-label`, `.visually-hidden`.

**Stacking ladder** (U6 enforces): `.consent-banner` 15 → `.chatbot-launcher` **20 (new)** = `.chatbot-panel` 20 → `.consent-modal-root` 50 → `.clear-data-dialog` (native top layer via `showModal()`, no `z-index` needed).

### 1.2 `data-*` attributes

| Attribute | Values | Set by | Read by |
|---|---|---|---|
| `data-consent-clear` | (boolean) | U4 (contact.html), U8 (other pages), U2 (in-modal button) | U2 (`consent.js`) |
| `data-clear-data-dialog` | (boolean) | U2 | U2, U12 |
| `data-clear-data-action` | `"confirm"` \| `"cancel"` | U2 | U2 |
| `data-enquiry-success` | (boolean) | U4 | U4, U12 |
| `data-enquiry-action` | `"whatsapp"` \| `"email"` \| `"copy"` | U4 | U4, U12 |
| `data-prefill-notice` | (boolean) | U4 | U4, U12 |
| `data-prefill-clear` | (boolean) | U4 | U4 |
| `data-service-select` | (boolean) | U4 | U4, U12, U10 |
| `data-chatbot-wa` | (boolean) | U3 | U3, U12 |
| `data-icon="whatsapp"` | icon slot name | U3, U4 | U5 (`icons.js`) |

Existing attributes reused unchanged: `data-consent-manage`, `data-consent-action`, `data-consent-toggle`, `data-i18n`, `data-i18n-attr`, `data-personalize-*`, `data-service-key`.

### 1.3 Element IDs (contact.html, owned by U4)

`cf-service` (the `<select>`), `enquiry-success-title` (focus + `aria-labelledby` target).
Existing IDs unchanged: `contact-form`, `cf-name`, `cf-email`, `cf-phone`, `cf-concern`, `cf-tellmore`, `cf-name-err`, `cf-email-err`, `cf-concern-err`, `contact-phones`, `contact-hours`, `footer-hours`.

### 1.4 Storage keys (the complete registry — U0 encodes this in `storage.js`)

| Key | Scope | Encoding | Consent category | Current owner |
|---|---|---|---|---|
| `urbane-ethos:consent` | local | JSON | necessary | `consent.js` |
| `urbane-ethos:locale` | local | **raw string** | necessary | `i18n.js` |
| `urbane-ethos:font-size` | local | **raw string** (`"1"\|"2"\|"3"`) | necessary | `a11y.js` |
| `urbane-ethos:bloomed` | session | **raw string** (`"1"`) | necessary | `page-load.js` |
| `urbane-ethos:personalization` | session | JSON | `personalization` | `personalization.js` |
| `urbane-ethos:chatbot-transcript` | local | JSON | `chatbot` | `chatbot.js` |
| `urbane-ethos:chat-context` | session | JSON | `chatbot` | **NEW** — `chatbot.js` (U3) |
| `urbane-ethos:session-events` | session | JSON | `analytics` | `analytics-demo-data.js` (read-only) |
| `session-chat` | session | JSON | `chatbot` | **LEGACY, unprefixed** — `chatbot.js` |

The three **raw string** keys must be read/written with `{ raw: true }` so existing visitors' values survive the migration (a JSON-decoding read of `en` would throw and silently reset their language).

### 1.5 i18n key paths (owned exclusively by U7)

**`common`** — new:
```
common.footer.clearData          "Clear my data"
common.clearData.title
common.clearData.body
common.clearData.itemsList       (array of 5 strings: language preference, text-size
                                  preference, consent choices, personalization answers,
                                  chat transcripts)
common.clearData.confirm         "Clear my data"
common.clearData.cancel          "Cancel"
common.clearData.done            "Cleared."
```
**`common`** — corrected: `common.footer.hours[]` in `content/ms/common.json` translated to BM.

**`consent`** — new: `consent.modal.clearData` (button label inside the consent modal).
**`consent`** — rewritten in place (no key changes): `consent.banner.heading`, `consent.banner.body` (the HANDOVER G3 rewrite), `consent.toggles.personalization.description` and `consent.toggles.chatbot.description` (widened to cover reuse-for-enquiry), `consent.toggles.analytics.description` (must not imply control it doesn't have).

**`contact`** — new:
```
contact.meta.docTitle            "Contact — Urbane Ethos" / BM equivalent
contact.form.fields.serviceLabel "What is this about? (Optional)"
contact.form.fields.serviceAny   "Not sure yet"
contact.form.success.heading     "Thanks, {name}"                  ← token {name}
contact.form.success.body        "Your enquiry about {service} is ready to send."  ← token {service}
contact.form.success.bodyNoService "Your enquiry is ready to send."
contact.form.success.whatsapp    "Continue on WhatsApp"
contact.form.success.email       "Send by email instead"
contact.form.success.copy        "Copy message"
contact.form.success.copied      "Copied."
contact.form.success.unavailable "We couldn't load our contact details. Copy your message and send it to us."
contact.form.prefill.notice      "We've filled some of this in from your earlier answers"
contact.form.prefill.clear       "Clear"
```
**`contact`** — corrected: `contact.hero.title` `"CONTACT"` → `"Get in touch"` (BM: `"Hubungi kami"`); `contact.hours[]` in `content/ms/contact.json` translated to BM.

**Token rule (critical, binds U4 and U7):** `{name}` and `{service}` are substituted **in JavaScript** by `contact.html`. i18n.js has no interpolation. Therefore the success panel and the pre-fill notice are rendered by JS from the already-fetched namespace object and **carry no `data-i18n` attribute** — `translatePage()` would otherwise clobber the substituted text on the next locale toggle. Token spelling is exactly `{name}` / `{service}`, single braces, no spaces.

**`chatbot`** — node id rename (both locales, identical id sets):

| Before | After |
|---|---|
| `flow.human` | `flow.customer` |
| `flow.human.collect` | `flow.customer.name` **and** `flow.customer.phone` (split) |
| `flow.human.confirm` | `flow.customer.confirm` |

Edge rewiring: `flow.start.options[3].next` → `"customer"`; `flow.book.next` → `"customer.name"`; `flow.price.show.options[0].next` → `"customer"`; `flow.customer.next` → `"customer.phone"`; `flow.customer.name.next` → `"customer.phone"`; `flow.customer.phone.next` → `"customer.confirm"`.

Node input contract: `flow.customer.name` and `flow.customer.phone` each carry `"input": "free"` plus a new sibling `"capture": "name"` / `"capture": "phone"` telling `chatbot.js` which `state.context` field to store the typed value under. The string `"name+phone"` is **retired** — no node may carry it.

**`chatbot`** — new: `ui.whatsapp` ("Continue on WhatsApp"), `ui.whatsappAria`.
**`chatbot`** — rewritten: `flow.customer.say` and `flow.customer.confirm.say` must contain **no response-time promise** (removes "We'll WhatsApp you within 1 business day" in EN and its BM mirror).

**`home`** — reshaped: `home.personalization.stageOptions` becomes `[{value,label}]` with slugs **`exploring`**, **`assessing`**, **`booking`**, identical in both locales. Parity-invisible (arrays aren't walked), so U7 verifies by eye + `ruby -rjson -e` assertion.

### 1.6 Transport-message language

The subject line and message scaffolding produced by `composeEnquiry()` are **English-only and hard-coded in `enquiry.js`** — the message is addressed to the centre, not to the visitor, and the visitor's own free text passes through verbatim. **No agent may add `contact.enquiry.*` i18n keys.** This is a deliberate decision to keep the parity surface small.

---

## 2. Work-unit U0 — Foundations (lands alone, batch 1)

**Owns (creates):** `assets/js/storage.js`, `assets/js/enquiry.js`
**Owns (modifies):** nothing. No consumer is rewired in this unit.

Both modules are **leaves at creation time**: nothing imports them yet, and neither imports any existing project module except `i18n.js` (see below). This is what lets every batch-2 unit proceed in parallel.

### 2.1 `assets/js/storage.js`

**Imports: none.** This is deliberate and load-bearing.

The obvious shape — `storage.js` importing `isAllowed` from `consent.js` — creates an ESM cycle (`consent.js → storage.js → consent.js`, and a three-hop cycle once `i18n.js` migrates). Instead the dependency is **inverted**: `storage.js` owns the consent record's key, version and parse, and `consent.js` imports those from `storage.js`. There is exactly one implementation of the gate and zero cycles.

```js
export const PREFIX = "urbane-ethos:";
export const CONSENT_KEY = "urbane-ethos:consent";
export const CONSENT_VERSION = 2;              // 1 → 2 per design §9
export const LEGACY_KEYS = ["session-chat"];   // unprefixed, pre-dates the namespace

export function allowed(category)
export function get(key, opts)
export function set(key, value, opts)
export function remove(key, opts)
export function clearAll()
```

**`allowed(category) → boolean`**
- `"necessary"` → always `true`, without touching storage.
- Otherwise: read `CONSENT_KEY` from `localStorage`, `JSON.parse`, return `Boolean(parsed[category])`.
- Absent record, `parsed.version !== CONSENT_VERSION`, parse failure, or a throwing `localStorage` → `false`.
- **Never throws.**

**`get(key, { category = "necessary", fallback = null, scope = "local", raw = false } = {}) → any`**
- `scope` is `"local"` or `"session"`; anything else is treated as `"local"`.
- Returns `fallback` if: `allowed(category)` is false; the key is absent; the storage accessor throws (Safari private mode); or `JSON.parse` fails (when `raw` is false).
- `raw: true` returns the stored string verbatim with no JSON decode.
- **Never throws.**

**`set(key, value, { category = "necessary", scope = "local", raw = false } = {}) → boolean`**
- Returns `false` without writing if `allowed(category)` is false. This is the structural fix for `chatbot.js:29`: an ungated write becomes impossible to express.
- Returns `false` if the write throws (quota, private mode).
- Returns `true` on success. `raw: true` writes `String(value)`; otherwise `JSON.stringify(value)`.
- **Never throws.**

**`remove(key, { scope = "local" } = {}) → boolean`** — `true` if the removal ran, `false` if storage threw. Not consent-gated (removal is always permitted). **Never throws.**

**`clearAll() → { removed: string[] }`**
- Iterates **both** `localStorage` and `sessionStorage`, snapshotting key names first (never mutate while iterating an index-based `Storage`).
- Removes every key starting with `PREFIX`, plus every key in `LEGACY_KEYS`, from both scopes.
- Returns the list of removed names (prefixed `"local:"` / `"session:"`) so the caller and `test/smoke/enquiry.html` can assert on it.
- **Never throws**; a throwing scope is skipped and simply contributes nothing to `removed`.

### 2.2 `assets/js/enquiry.js`

**Imports:** `{ t, getLocale } from "./i18n.js"` and `{ get } from "./storage.js"` only. **Not** a canggih-layer module (design §3.1) — no 10-page wiring, no import-count change.

```js
export function readInterest(options)      // sync
export function composeEnquiry(payload)    // sync
export async function channels()
export function mailtoUrl(message, email)
export function whatsappUrl(message, e164)
```

**`readInterest({ serviceKeys = null } = {}) → Interest`** (synchronous)

```js
Interest = {
  service:       string | null,   // a services.json key, or null
  serviceSource: "param" | "chat" | "survey" | null,
  age:           string | null,   // personalization age slug
  concerns:      string[],        // always an array, possibly empty
  stage:         string | null,   // slug; tolerant of the legacy display string
  name:          string | null,
  phone:         string | null,
  locale:        "en" | "ms"
}
```

Precedence for `service`, highest-intent first (design §5.1):
1. `new URLSearchParams(location.search).get("service")` → `serviceSource: "param"`. **No consent required** — user-initiated navigation, no storage read.
2. `get("urbane-ethos:chat-context", { category: "chatbot", scope: "session", fallback: null })?.service` → `"chat"`.
3. `get("urbane-ethos:personalization", { category: "personalization", scope: "session", fallback: null })` → map the **first** entry of `concerns` through the same `concernToService` table `personalization.js` uses → `"survey"`.

`serviceKeys`: when a non-empty `Array`/`Set` is supplied, a candidate not in it is **dropped and the next source is tried**. When omitted (`null`), no validation is applied. `contact.html` passes the seven keys it already fetched from `services.json`; `chatbot.js` omits it.

**Age gate, inherited not re-implemented:** if `age` is `"adult"` or `"older-adult"`, `"eip"` is never returned as `service` — it falls through to the next source.

`name` / `phone` come **only** from the chat context (`category: "chatbot"`). `age` / `concerns` / `stage` come **only** from the personalization record (`category: "personalization"`). Consent off ⇒ `null` / `[]`.

`stage` tolerant read: accepts the new `"exploring"|"assessing"|"booking"` slugs verbatim; if the stored value is a legacy localised display string it is normalised by matching against a small internal EN+BM literal table, and anything unrecognised yields `null`. Mirrors how `asConcerns()` normalises legacy `concern` values.

**Never throws.** Every failure path yields `null` / `[]`.

**`composeEnquiry(payload) → { subject, body, text }`** (synchronous)

```js
payload = { name, email, phone, serviceTitle, concern, tellmore }
```
- `serviceTitle` is the **human title** (`"Speech Language Therapy (SLP)"`), never the slug. Resolving slug → title is the caller's job.
- `subject` = `` `Enquiry about ${serviceTitle}` `` when `serviceTitle` is a non-empty string, else `"Enquiry from website"`. Unencoded.
- `text` = the single plain-text message, `\n`-joined, used identically for WhatsApp, the mailto body, and the clipboard. Missing/blank fields are omitted (no `"undefined"`, no empty parenthetical).
- `body` = `text` (kept as a distinct field so a future divergence doesn't break callers).
- `payload` may be `null`/`undefined` — treated as `{}`.
- **Never throws.**

**`channels() → Promise<{ email, whatsapp, error }>`**

```js
{ email:    "urbaneethos@yahoo.com" | null,
  whatsapp: { display: "+6013-249 0069",
              e164:    "60132490069",
              url:     "https://wa.me/60132490069" } | null,
  error:    Error | null }
```
- `email` from `t("contact.email")`. `whatsapp` from `t("contact.phones")` — the first entry whose `label` matches `/whatsapp/i`. No WhatsApp row ⇒ `whatsapp: null`.
- `e164` normalisation: strip every non-digit; if the result starts with `"0"`, replace that leading `0` with `"60"`. `+6013-249 0069` → `60132490069`. The `wa.me` target is **computed, never stored a second time.**
- **Never rejects.** On namespace-load failure it resolves `{ email: null, whatsapp: null, error }`.
- **Consumer obligation (binds U3 and U4):** `email === null` means *cannot send*. Callers must surface the copy-message fallback and must **never** substitute a hard-coded address. Hard-coding a channel is the exact defect this module exists to eliminate.

**`mailtoUrl(message, email)` / `whatsappUrl(message, e164)`** — the only sanctioned URL builders. `mailtoUrl` returns `` `mailto:${email}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}` ``; `whatsappUrl` returns `` `https://wa.me/${e164}?text=${encodeURIComponent(message.text)}` ``. Both return `null` if the address/number argument is falsy. They exist so U3 and U4 cannot hand-roll two different encodings.

### 2.3 Migration register (informational for U0, binding on U1/U2/U3)

| Module | Migrates to | Unit |
|---|---|---|
| `consent.js` | imports `CONSENT_KEY`, `CONSENT_VERSION`, `get`, `set`, `remove`, `clearAll`; re-exports `isAllowed` as `allowed` for back-compat | U2 |
| `chatbot.js` | `get`/`set` for transcript, `session-chat`, and the new `chat-context` | U3 |
| `personalization.js` | `get`/`set`/`remove` (session, `personalization`) | U1 |
| `i18n.js` | `get`/`set` (`raw: true`, necessary) | U1 |
| `a11y.js` | `get`/`set` (`raw: true`, necessary) | U1 |
| `page-load.js` | `get`/`set` (session, `raw: true`, necessary) | U1 |
| `analytics-demo-data.js` | `get` (session, `analytics`) | U1 |

**Back-compat requirement:** `consent.js` must keep exporting `isAllowed` with its current signature. `chatbot.js`, `personalization.js` and `index.html` all import it; breaking it breaks pages no unit owns.

### U0 acceptance criteria

```bash
node --input-type=module --check < assets/js/storage.js && echo OK
node --input-type=module --check < assets/js/enquiry.js  && echo OK
# storage.js must import nothing:
grep -c '^import' assets/js/storage.js            # → 0
# enquiry.js imports only i18n + storage:
grep '^import' assets/js/enquiry.js               # → exactly ./i18n.js and ./storage.js
# no consumer rewired yet:
git diff --name-only                              # → exactly the 2 new files
ruby bin/check-i18n-parity.rb                     # → "i18n parity OK (9 files)"
```
Plus, in a browser console on `bin/server`:
`import("./assets/js/storage.js").then(s => console.log(s.clearAll()))` returns `{removed: [...]}` without throwing, on a page with **no** consent record set.

---

## 3. Batch 2 — seven mutually independent units

Every unit below depends **only** on U0 and §1. None reads another's output.

### U1 — Storage migration (mechanical) + stage tolerant read

**Owns:** `assets/js/a11y.js`, `assets/js/i18n.js`, `assets/js/page-load.js`, `assets/js/analytics-demo-data.js`, `assets/js/personalization.js`
**Must not touch:** `consent.js` (U2), `chatbot.js` (U3).

- Replace every direct `localStorage`/`sessionStorage` call with the `storage.js` equivalent, using the exact scope/encoding/category from §1.4. The `raw: true` flag is mandatory on `urbane-ethos:locale`, `urbane-ethos:font-size`, `urbane-ethos:bloomed`.
- `personalization.js` additionally: `read()` returns a record whose `stage` is normalised through the §2.2 tolerant table (accept the new slugs, accept legacy EN/BM display strings, else `null`); export the normaliser as `asStage(value)` so `enquiry.js`'s smoke test and future consumers share one table.
- `personalization.js` keeps `read()`/`write()`/`reset()` signatures and the `personalization:changed` / `personalization:reset` events unchanged — `index.html` depends on both and no unit owns `index.html`'s survey code.
- Update the now-stale comment in `personalization.js:56-57` only if it becomes wrong; otherwise leave prose alone.

**Acceptance:**
```bash
grep -n 'localStorage\|sessionStorage' assets/js/a11y.js assets/js/i18n.js \
  assets/js/page-load.js assets/js/analytics-demo-data.js assets/js/personalization.js
# → no matches (comments referring to sessionStorage semantics are fine; code is not)
for f in a11y i18n page-load analytics-demo-data personalization; do
  node --input-type=module --check < assets/js/$f.js || echo "FAIL $f"; done
```
Browser on `http://localhost:8080/`: set language to BM, reload → still BM. Cycle text size twice, reload → size persists. Open `test/smoke/personalization.html` and `test/smoke/i18n.html` → both behave as before.

### U2 — Consent, version bump, clear-my-data engine

**Owns:** `assets/js/consent.js`

- Import `CONSENT_KEY`, `CONSENT_VERSION`, `allowed`, `get`, `set`, `remove`, `clearAll` from `./storage.js`. **Delete** the local `CONSENT_KEY`/`CONSENT_VERSION` constants — `storage.js` is now the single definition, and `CONSENT_VERSION` is already `2` there. Keep `export function isAllowed(category) { return allowed(category); }` for back-compat (§2.3).
- Route `readConsent`, `writeConsent` and the `[data-consent-manage]` reset through `get`/`set`/`remove`.
- **Clear-data dialog.** Build a native `<dialog class="clear-data-dialog" data-clear-data-dialog>` lazily on first use, append to `document.body`, open with `.showModal()`. It contains `.clear-data-title` (`common.clearData.title`), `.clear-data-body` (`common.clearData.body`), `.clear-data-items` (a `<ul>` built from the `common.clearData.itemsList` array), and `.clear-data-actions` with `data-clear-data-action="cancel"` (`common.clearData.cancel`) and `data-clear-data-action="confirm"` (`common.clearData.confirm`).
  - Static strings use `data-i18n`; the `itemsList` `<li>`s are built in JS from the fetched array (arrays cannot be bound with `data-i18n`) and rebuilt on `i18n:changed`.
  - `.showModal()` gives a native top-layer + focus trap + Escape — **do not** reuse the hand-rolled `trapFocus`, and **do not** use `window.confirm()`.
  - Confirm → `clearAll()`, announce `common.clearData.done` in a `role="status"` region, then `location.reload()` on a short timeout so the consent banner re-presents clean.
- Wire `document.querySelectorAll("[data-consent-clear]")` in `initConsent()`, with `e.preventDefault()` (the footer entries are `<a href="#">`).
- Add a `data-consent-clear` button inside `buildModal()`'s `.consent-modal-actions`, labelled `consent.modal.clearData`, so a visitor already managing preferences doesn't have to hunt.
- **Do not** touch `consent.json` copy — U7 owns it.

**Acceptance:**
```bash
node --input-type=module --check < assets/js/consent.js && echo OK
grep -c 'localStorage\|sessionStorage' assets/js/consent.js   # → 0
grep -c 'CONSENT_VERSION = ' assets/js/consent.js             # → 0 (now imported)
grep -c 'window.confirm' assets/js/consent.js                 # → 0
grep -c 'showModal' assets/js/consent.js                      # → ≥1
```
Browser on `test/smoke/consent.html`: an existing v1 consent record causes the banner to re-present (version bump works). Clicking a `[data-consent-clear]` element opens a real `<dialog>`; Escape cancels without wiping; Confirm empties every `urbane-ethos:*` key **and** `session-chat` in both scopes (verify with `Object.keys(localStorage)` + `Object.keys(sessionStorage)` before/after) and reloads.

### U3 — Chatbot: storage, `customer.*`, WhatsApp

**Owns:** `assets/js/chatbot.js`

- Route `readTranscript` / `persistTurn` through `storage.js` (§1.4). The ungated `sessionStorage.setItem("session-chat", …)` at line 29 becomes `set("session-chat", …, { category: "chatbot", scope: "session" })`, which no-ops when consent is absent — closing both the ungated-write and the clobber-prior-history defects.
- **Persist context.** After `choose()` merges `opt.set` into `state.context`, write the whole context to `urbane-ethos:chat-context` (session, category `chatbot`). Restore it on `initChatbot()` so a visitor who chats then navigates to `/contact.html` carries their `{service, age, freq, name, phone}` with them.
- **Node rename + input split.** `go()` must accept `node.input === "free"` plus an optional `node.capture` of `"name"` or `"phone"`; `submitFreeInput()` stores the typed value into `state.context[node.capture]` when present, then persists. **Remove** every reference to the string `"name+phone"` and the hard-coded English placeholder at lines 76-79 (it was never translated) — the placeholder now always comes from `flow.ui.inputPlaceholder`.
- **Panel footer.** Append `<div class="chatbot-footer">` containing `<a class="chatbot-wa" data-chatbot-wa target="_blank" rel="noopener">` with `<span data-icon="whatsapp">` and the `ui.whatsapp` label. Its `href` is refreshed from `whatsappUrl(composeEnquiry({...state.context}), (await channels()).whatsapp?.e164)` whenever the context changes. If `channels().whatsapp` is `null`, the footer element is `hidden` — no hard-coded number.
- **`customer.confirm`** renders a real `wa.me` deep link built the same way, not a promise of future contact.
- **Do not** touch `chatbot.json` (U7) or `icons.js` (U5). Reference `data-icon="whatsapp"` and the `customer.*` ids per §1 — they will exist by the time the batch closes.

**Acceptance:**
```bash
node --input-type=module --check < assets/js/chatbot.js && echo OK
grep -c 'name+phone' assets/js/chatbot.js            # → 0
grep -c 'human\.' assets/js/chatbot.js               # → 0
grep -c 'localStorage\|sessionStorage' assets/js/chatbot.js   # → 0
grep -c 'wa\.me' assets/js/chatbot.js                # → 0 (must go through enquiry.js)
```
Browser (after U5 and U7 land): open the chat, walk `start → Talk to a human`, answer name then phone as two turns; `sessionStorage["urbane-ethos:chat-context"]` contains both. `bin/axe-chatbot.mjs` reports 0 violations.

### U4 — Contact page and enquiry surface

**Owns:** `contact.html` — and **only** `contact.html`. This unit, not U8, applies the footer `[data-consent-clear]` `<li>` to this page.

Markup:
- `<title data-i18n="contact.meta.docTitle">Contact — Urbane Ethos</title>` (Group C: the current `contact.hero.title` binding overwrites the SEO title with a bare `"CONTACT"`).
- Add, **above** the concern textarea:
  ```html
  <div class="form-field form-field--select">
    <label for="cf-service" data-i18n="contact.form.fields.serviceLabel">…</label>
    <select id="cf-service" name="service" data-service-select>
      <option value="" data-i18n="contact.form.fields.serviceAny">Not sure yet</option>
    </select>
  </div>
  ```
  The static `<option>` is the no-JS fallback. JS appends the seven `services.items[].key` / `.title` options from the live `services` namespace — never a duplicated label list.
- `autocomplete="name"` on `#cf-name`, `="email"` on `#cf-email`, `="tel"` on `#cf-phone`.
- `<div class="prefill-notice" data-prefill-notice hidden>` above the form, with `.prefill-notice-text` and a `<button type="button" class="prefill-notice-clear" data-prefill-clear>`.
- `<div class="enquiry-success" data-enquiry-success role="status" tabindex="-1" aria-labelledby="enquiry-success-title" hidden>` as a sibling of `<form>`, holding `.enquiry-success-title` (`<h3 id="enquiry-success-title">`), `.enquiry-success-body`, `.enquiry-success-actions` with `data-enquiry-action="whatsapp"` and `="email"`, plus `.enquiry-copy` (`data-enquiry-action="copy"`) and `.enquiry-copy-feedback`.
- Footer: insert `<li><a href="#" data-consent-clear data-i18n="common.footer.clearData">Clear my data</a></li>` immediately after the `data-consent-manage` `<li>`.

Script (`renderContact`):
- **Register the submit listener exactly once.** Hoist it out of `renderContact()` (which re-runs on every `i18n:changed`) or guard with a module-scope flag. Today two locale toggles fire the handler three times.
- Delete the hard-coded `mailto:info@urbaneethos.center`. Build the message with `composeEnquiry()` and the URLs with `mailtoUrl`/`whatsappUrl` against `await channels()`. If `channels().email` is `null`, render only the copy action and `contact.form.success.unavailable`.
- Validation: wire `contact.form.errors.emailInvalid` to the *malformed* case and `emailRequired` to the *empty* case (a visitor typing `bob@bob` is currently told they supplied no email). On failed submit, `.focus()` the first invalid control.
- Pre-fill from `readInterest({ serviceKeys })` where `serviceKeys` is the seven keys already fetched from `services.json`. Set `#cf-service`, `#cf-name`, `#cf-phone`. **Never pre-fill `#cf-concern`** (design §5.3). Show `.prefill-notice` only when at least one field was actually filled **from storage** — a bare `?service=` needs no notice, having just been clicked.
- `[data-prefill-clear]` empties the pre-filled controls, calls `personalization.reset()`, removes `urbane-ethos:chat-context`, and hides the notice.
- On successful submit: hide the `<form>`, unhide `.enquiry-success`, substitute `{name}`/`{service}` **in JS** (§1.5 token rule — no `data-i18n` on these nodes), and `.focus()` the panel. Nothing navigates until the visitor picks a transport.
- The WhatsApp `contact-phones` row: use `data-icon="whatsapp"` and `href` from `channels().whatsapp.url`, not `tel:`. Keep the Reception row on `tel:`.
- Preserve the existing `.chatbot-launcher-inline` bridge and the `i18n:changed` re-render, and make the success panel survive a locale toggle (re-render it in place if it is currently visible).

**Acceptance:**
```bash
grep -c 'info@urbaneethos.center' contact.html      # → 0
grep -c 'data-service-select'      contact.html      # → 1
grep -c 'data-enquiry-success'     contact.html      # → 1
grep -c 'data-consent-clear'       contact.html      # → 1
grep -c 'autocomplete='            contact.html      # → 3
grep -c 'data-i18n="contact.hero.title"' contact.html # → 1 (the <h1> only, not <title>)
grep -c 'enquiry.js'               contact.html      # → 1
grep -c 'tel:'                     contact.html      # → 1 code path (Reception only)
```
Browser: load `/contact.html?service=speech` → the select shows the **title** "Speech Language Therapy (SLP)", not `speech`; no pre-fill notice. Submit with `bob@bob` → "That email doesn't look right" and focus lands on `#cf-email`. Valid submit → success panel appears, is announced, receives focus, and shows both transports. Toggle EN↔BM twice, then submit → the handler fires **once** (assert with a `console.count` during dev). axe-core on `/contact.html` → 0 violations.

### U5 — WhatsApp icon

**Owns:** `assets/js/icons.js`

Add a `whatsapp` entry to `ICONS`. Heroicons has no WhatsApp glyph; use the official WhatsApp brand mark as a **filled** path (`fill="currentColor"`, no `stroke`) sized to the same `viewBox="0 0 24 24"`, with `aria-hidden="true"` — it must read as a distinct channel mark, not the borrowed `chat` bubble that is the chatbot launcher's own icon. Change nothing else.

**Acceptance:**
```bash
node --input-type=module --check < assets/js/icons.js && echo OK
grep -c '  whatsapp:\|"whatsapp":' assets/js/icons.js   # → 1
grep -c 'aria-hidden="true"' assets/js/icons.js         # → 12 (11 existing + 1)
git diff --stat assets/js/icons.js                      # → 1 file, additions only
```

### U6 — CSS

**Owns:** `assets/css/components.css` — the **only** unit that may write this file. All four new blocks land here in one pass, from §1.1.

Append **one** new `@layer components { … }` block after line 1195, with a comment header naming the design section, containing:
1. **Success panel** — `.enquiry-success` (card surface matching `.contact-form-card`), `.enquiry-success-title`, `.enquiry-success-body`, `.enquiry-success-actions` (stacked, full-width buttons below 640px mirroring `.form-actions .btn`), `.enquiry-copy`, `.enquiry-copy-feedback`. `[hidden] { display: none; }` on `.enquiry-success` (it carries `role="status"`, so the default `display` must be explicit).
2. **Service select** — `.form-field--select select { width: 100%; min-width: 0; }` plus an `appearance`-safe caret. The base `.form-field select` rules already exist at lines 576-584; **extend, don't duplicate**.
3. **Pre-fill notice** — `.prefill-notice` (quiet inline band above the card), `.prefill-notice-text`, `.prefill-notice-clear` (button styled as a text link, ≥24×24px hit area).
4. **Clear-data dialog** — `.clear-data-dialog` and `::backdrop`, `.clear-data-title`, `.clear-data-body`, `.clear-data-items`, `.clear-data-actions`. Reuse `.consent-modal`'s surface/radius/shadow tokens so the two dialogs read as one system. No `z-index` (native top layer).
5. **Chatbot footer** — `.chatbot-footer`, `.chatbot-wa`.
6. **Defensive fix** — `.chatbot-launcher { z-index: 20; }` added to the existing rule at line 627 (design §7). Verify the §1.1 ladder holds by inspection.

Use existing tokens only (`--space-*`, `--color-*`, `--radius-*`, `--shadow-*`, `--dur-*`, `--ease*`). Per the design doc, cut tokens when calibrating — never raise them. Honour `@media (prefers-reduced-motion: reduce)` for any transition added.

**Acceptance:**
```bash
grep -c '@layer components' assets/css/components.css       # → 6 (was 5)
grep -c 'z-index: 20' assets/css/components.css             # → 2 (.chatbot-panel + .chatbot-launcher)
awk '{o+=gsub(/{/,"{"); o-=gsub(/}/,"}")} END{print o}' assets/css/components.css  # → 0 (balanced)
# every contract class exists exactly once as a selector:
for c in enquiry-success enquiry-copy form-field--select prefill-notice \
         clear-data-dialog clear-data-items chatbot-footer chatbot-wa; do
  printf "%-22s" $c; grep -c "\.$c" assets/css/components.css; done   # all ≥1
```
Browser: with the consent banner showing on a ≤640px viewport, the `.chatbot-launcher` is **no longer** painted over by the banner.

### U7 — All locale content (single owner)

**Owns:** all 18 files — `content/en/{about,chatbot,common,consent,contact,home,privacy,services,staff}.json` and the `content/ms/` mirrors.

This unit exists **because two features collide here.** `common.json` is touched by both the clear-data control (`footer.clearData`, `clearData.*`) and the Group C BM-hours fix (`footer.hours[]`); `consent.json` is touched by both the §9 category widening and the HANDOVER-G3 banner rewrite. A naive per-feature split would have two agents editing the same JSON and the second silently clobbering the first — and because `bin/check-i18n-parity.rb` compares *key trees*, not values, a clobbered **value** would sail straight through the gate. One owner, one parity run.

Apply everything in §1.5. In addition:
- Any `_note` added must be mirrored in the other locale — the parity script strips only `_meta`/`_draft`/`_correction`, so `_note` is a live key.
- Any `_placeholder` map must stay key-identical across locales.
- Add new keys to `_draft` where the copy is drafted rather than client-supplied (the `clearData.*` set, the `consent` rewrite, the `contact.form.success.*` set).
- `home.personalization.stageOptions` reshape: EN and MS must carry the **same three `value` slugs** in the **same order**. Arrays are parity-invisible, so this is verified by assertion, not by the gate.
- `chatbot` node ids must be identical across locales after the `customer.*` rename — also parity-invisible inside `options[]`, so assert it.

**Acceptance:**
```bash
ruby bin/check-i18n-parity.rb                    # → "i18n parity OK (9 files)", exit 0
for f in content/en/*.json content/ms/*.json; do ruby -rjson -e \
  'JSON.parse(File.read(ARGV[0]))' "$f" || echo "BAD JSON $f"; done
# node-id set identical across locales:
ruby -rjson -e 'a=JSON.parse(File.read("content/en/chatbot.json"))["flow"].keys.sort;
                b=JSON.parse(File.read("content/ms/chatbot.json"))["flow"].keys.sort;
                abort("chatbot flow ids differ") unless a==b; puts "chatbot ids OK (#{a.size})"'
# stage slugs identical and in order:
ruby -rjson -e 'a=JSON.parse(File.read("content/en/home.json"))["personalization"]["stageOptions"].map{|o|o["value"]};
                b=JSON.parse(File.read("content/ms/home.json"))["personalization"]["stageOptions"].map{|o|o["value"]};
                abort("stage slugs differ") unless a==b && a==%w[exploring assessing booking]; puts "stage OK"'
grep -rc 'human\.' content/en/chatbot.json content/ms/chatbot.json     # → 0 0
grep -rc 'name+phone' content/en/chatbot.json content/ms/chatbot.json  # → 0 0
grep -c 'Monday: 12PM' content/ms/common.json content/ms/contact.json  # → 0 0
grep -rn 'business day\|hari perniagaan' content/en/chatbot.json content/ms/chatbot.json  # → no matches
```

### U8 — Footer markup across pages

**Owns:** `index.html`, `about.html`, `staff.html`, `services.html`, `blog.html`, `careers.html`, `privacy.html`, `404.html`, `content/blog/_post.html.erb`

**Explicitly NOT owned:**
- `contact.html` — U4 (it rewrites the whole page; two owners would collide).
- `analytics.html` — **has no `<footer>` at all** and does not import `consent.js`. The design's "10 production pages" is inaccurate here; the clear-data control reaches analytics users via the consent-modal entry (U2). Do not add a footer to it.
- `post-year-end-promo.html` and the other 37 `post-*.html` — **generated**. Editing the `.erb` is the correct and only change; U11 regenerates.

Per file:
- **Six standard footers** (`index`, `about`, `staff`, `services`, `blog`, `careers`) and **`_post.html.erb`**: insert, immediately after the `data-consent-manage` `<li>`:
  `<li><a href="#" data-consent-clear data-i18n="common.footer.clearData">Clear my data</a></li>`
- **`privacy.html`**: footer is a single `<p>` of `·`-separated links (line 73-76), not a `<ul>`. Append ` &middot; <a href="#" data-consent-clear data-i18n="common.footer.clearData">Clear my data</a>` in the same shape. Do not restructure it.
- **`404.html`**: footer is copyright-only. Add a minimal `<p>` above the copyright with the Privacy notice link, the manage-cookies link and the clear-data link, matching `privacy.html`'s shape. **404.html does not currently import `consent.js`** — verify before adding the control; if the import is absent, either add `consent.js` (404 is not one of the 10 production pages, so the canggih import-count matrix is unaffected) **or** omit the control from 404.html and record the decision. Do not ship a dead link.
- `index.html`: also correct the now-stale comment at lines 422-425 ("stage options are plain strings") — the `chips()` code already handles both shapes and needs **no** functional change.
- Touch nothing else in these files. No canggih import changes.

**Acceptance:**
```bash
for f in index about staff services blog careers privacy 404; do
  printf "%-10s" $f; grep -c 'data-consent-clear' $f.html; done      # each → 1
grep -c 'data-consent-clear' content/blog/_post.html.erb             # → 1
grep -c 'data-consent-clear' analytics.html                          # → 0 (intentional)
git diff --name-only | grep -c '^post-'                              # → 0 (no hand-edited posts)
# canggih matrix unchanged:
for m in nav icons page-load cursor i18n consent a11y chatbot parallax; do printf "%-14s" $m; \
  grep -l "assets/js/$m.js" index.html about.html staff.html services.html blog.html \
  contact.html analytics.html privacy.html careers.html post-year-end-promo.html | wc -l; done
# → nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3
```

### U9 — Blog source hygiene (Group D)

**Owns, and only these five Markdown files:**
- `content/blog/posts/anak-dah-masuk-sekolah.md` — `+013-249 0069` → `+6013-249 0069`
- `content/blog/posts/mental-health-awareness-on-secondary-school-students.md` — `+013-249 0069` → `+6013-249 0069`
- `content/blog/posts/understanding-improving-mental-health-services-for-people-with-disabilities-pwd.md` — `+613-249 0069` → `+6013-249 0069`
- `content/blog/posts/registrations-eip-2020-are-now-open.md` — `urbaneethoseic@gmail.com` → `urbaneethos@yahoo.com`
- `content/blog/posts/can-my-child-benefit-from-aac.md` — `urbaneethoseic@gmail.com` → `urbaneethos@yahoo.com`; also normalise `(+6013) 249 0069` → `+6013-249 0069` and `(+603) 7734 3044` → `+603-7734 3044`

**Do not run `bin/build-blog.rb`** — U11 owns regeneration. Editing markdown and regenerating in the same unit would make this unit a writer of all 38 `post-*.html`, colliding with U8's `.erb` change.

**Acceptance:**
```bash
grep -rn 'urbaneethoseic@gmail.com' content/blog/posts/   # → no matches
grep -rnE '\+013-|\+613-' content/blog/posts/             # → no matches
grep -roE '\+?6?0?13[- ]?249[- ]?0069|\(\+6013\)' content/blog/posts/ | \
  awk -F: '{print $2}' | sort -u                          # → only "+6013-249 0069"
git diff --name-only | grep -c '^post-'                   # → 0
```

### U10 — Contact-channel drift gate

**Owns (creates):** `bin/check-contact-channels.rb`
**Does not own** the CI workflow files — U13 wires them, so CI cannot go red mid-flight while `contact.html` and the generated posts are still stale.

Ruby, no gems beyond stdlib (`json`), `#!/usr/bin/env ruby`, executable-shebang style matching `bin/check-i18n-parity.rb`, exits 0/1 with a per-problem line on stderr and a one-line summary on stdout.

Allowlist built **from content, never hard-coded**:
- emails: `content/en/contact.json → email`, `content/en/common.json → footer.email`, `content/careers.json → outro.email`
- phones: `content/en/contact.json → phones[].number`, `content/en/common.json → footer.phone1|phone2`
- derived `wa.me` target: the `/whatsapp/i`-labelled phone, normalised to E.164 digits by the **same rule** as `enquiry.js` (strip non-digits; leading `0` → `60`)

Scan set: every `*.html` at the repo root (including generated `post-*.html`), `content/blog/_post.html.erb`, and `content/blog/posts/*.md`.

Assertions:
1. Every literal `mailto:<addr>` matches an allowlisted email. Template expressions (`mailto:${…}`, `<%= … %>`) are skipped, not failed.
2. Every literal `tel:<num>` normalises to an allowlisted phone.
3. Every `wa.me/<digits>` equals the derived WhatsApp E.164.
4. No bare `urbaneethoseic@gmail.com` or `info@urbaneethos.center` anywhere in the scan set.
5. Every `+`-prefixed Malaysian phone literal in `content/blog/posts/*.md` matches an allowlisted display format (catches `+013-`/`+613-`).

**Acceptance:**
```bash
ruby -c bin/check-contact-channels.rb                     # → "Syntax OK"
ruby bin/check-contact-channels.rb; echo "exit=$?"
# At the end of batch 2 this is EXPECTED to exit 1, naming exactly:
#   contact.html          info@urbaneethos.center       (fixed by U4, may already be green)
#   post-*.html × 2       urbaneethoseic@gmail.com      (fixed by U11)
#   post-*.html × 3       +013-/+613-                   (fixed by U11)
# Demonstrating the gate CATCHES the drift class is this unit's acceptance criterion.
# It must exit 0 after U11.
```

---

## 4. Batch 3 — serialization points

### U11 — Blog regeneration

**Owns:** all 38 `post-*.html` **and** `content/blog.json` — as **generated output only**.
**Depends on:** U8 (`_post.html.erb`) **and** U9 (`content/blog/posts/*.md`). Both must be merged first.

This unit is a serialization point purely because `bin/build-blog.rb` writes all 38 pages plus `content/blog.json` in one pass. Two units both regenerating would each claim ownership of the same 39 files.

The **entire** unit is:
```bash
ruby bin/build-blog.rb
```
No hand-edits. If the generator errors, fix the *source* (`.md` or `.erb`) — which means handing back to U8/U9, not patching output.

**Acceptance:**
```bash
ruby bin/build-blog.rb                                       # exits 0
grep -l 'data-consent-clear' post-*.html | wc -l             # → 38
grep -rn 'urbaneethoseic@gmail.com' post-*.html              # → no matches
grep -rnE '\+013-|\+613-' post-*.html                        # → no matches
ruby bin/check-contact-channels.rb; echo "exit=$?"           # → exit=0
ruby -rjson -e 'puts JSON.parse(File.read("content/blog.json"))["posts"].size'  # → 38
ruby bin/build-blog.rb && git diff --quiet && echo "IDEMPOTENT"  # re-run is a no-op
```

### U12 — Enquiry smoke page

**Owns (creates):** `test/smoke/enquiry.html`
**Depends on:** U0, U1, U2, U3, U4, U7.

Follows the existing `test/smoke/*` convention — **root-absolute** `/assets/…` paths (these pages are served from `/test/smoke/`, where relative specifiers do not resolve; the relative-paths rule applies to production pages). An `<ul id="log">` receiving one line per assertion.

Exercises (design §11):
1. `storage.set` under each category with consent on and off; assert the `false` return and that nothing was written when off.
2. `storage.clearAll()` after seeding all nine §1.4 keys in both scopes; assert `removed` covers every prefixed key **and** the unprefixed `session-chat`.
3. `readInterest()` against each of the three pre-fill sources in isolation, then all three together; assert the precedence order and `serviceSource`.
4. `readInterest({ serviceKeys })` with `?service=nonsense`; assert the value is dropped and the next source wins.
5. The age gate: `age: "adult"` with a survey pointing at `eip`; assert `eip` is never returned.
6. `asStage()` against a new slug, the EN legacy string, the BM legacy string, and garbage.
7. `composeEnquiry()` with a full payload and a `{}` payload; assert no `"undefined"`, no empty parenthetical, and identical `text` on both transports.
8. `channels()` happy path (assert the derived `e164` is `60132490069`), and a forced-failure path (assert `email === null` and no throw).
9. `mailtoUrl` / `whatsappUrl` round-trip encoding.

**Acceptance:** open `http://localhost:8080/test/smoke/enquiry.html` — every logged line reads `PASS`, none reads `FAIL`, and the browser console is free of uncaught errors.

---

## 5. Batch 4 — CI wiring, verification, docs

### U13 — CI, verification and documentation

**Owns:** `.github/workflows/pages.yml`, `.gitlab-ci.yml`, `docs/HANDOVER.md`, `docs/A11Y_NOTES.md`, `README.md`, `CLAUDE.md`
**Depends on:** everything.

- Add `ruby bin/check-contact-channels.rb` to the GH `ci` job (after the parity step) and to the GitLab `i18n-parity` job (or a sibling `contact-channels` job in the `test` stage that `pages` also `needs`). Both pipelines must run the same two gates in the same order. Do **not** change the rsync exclusion lists — `bin/` is already excluded from the artifact and still available in the test stage.
- `docs/HANDOVER.md`: close G3 (consent copy) and the "no try/catch on storage writes" item (line 68); correct the line-127 claim about the placeholder address, naming why the previous `content/`-only grep gate missed it.
- `docs/A11Y_NOTES.md`: record the re-audit, the `<select>` and the `role="status"` panel, and the native-`<dialog>` clear-data control.
- `CLAUDE.md`: JS module list goes from eleven to thirteen; add `storage.js` and `enquiry.js` with a note that neither is a canggih-layer module; document `bin/check-contact-channels.rb` under run/test commands.
- `README.md`: update the real-vs-mocked inventory — the contact form now offers two transports and a copy fallback, still with no backend.

**Acceptance (full gate sweep):**
```bash
ruby bin/check-i18n-parity.rb                     # → exit 0
ruby bin/check-contact-channels.rb                # → exit 0
ruby bin/build-blog.rb && git diff --quiet && echo "BLOG IDEMPOTENT"
for m in nav icons page-load cursor i18n consent a11y chatbot parallax; do printf "%-14s" $m; \
  grep -l "assets/js/$m.js" index.html about.html staff.html services.html blog.html \
  contact.html analytics.html privacy.html careers.html post-year-end-promo.html | wc -l; done
# → nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3
grep -rn 'localStorage\|sessionStorage' assets/js/ | grep -v 'assets/js/storage.js' | grep -v '^\S*:\s*//'
# → no code matches outside storage.js
grep -rn 'https\?://\|"/assets\|"/content\|src="/' *.html assets/js/ | grep -v '^test/'
# → no root-absolute internal paths introduced
bin/server &
for p in "" about.html staff.html services.html blog.html contact.html \
         analytics.html privacy.html careers.html post-year-end-promo.html; do
  echo "=== /$p ==="
  npx -y @axe-core/cli "http://localhost:8080/$p" --tags wcag2a,wcag2aa,wcag22aa 2>&1 | tail -5
done   # → 0 violations on all 10
node bin/axe-chatbot.mjs   # → 0 violations
```
Manual, per design §11: EN↔BM toggle on `/contact.html` with a pre-filled form and again with the success panel visible — both survive the locale change; the pre-fill notice and success copy re-render in the new locale with `{name}`/`{service}` still substituted.

---

## 6. Dependency graph and parallel batches

```
                          ┌──────────────────────────┐
  BATCH 1  (alone)        │ U0  storage.js + enquiry.js │
                          └────────────┬─────────────┘
                                       │
        ┌───────┬───────┬───────┬──────┼──────┬───────┬───────┐
        │       │       │       │      │      │       │       │
  BATCH 2 (7-way parallel, all file-disjoint)
       U1      U2      U3      U4     U5     U6      U7      U8      U9     U10
     storage  consent chatbot contact icons  CSS   content  footer  blog   channel
     migrate  +clear   +wa    page                  JSON    markup   .md    gate
        │       │       │       │      │      │       │       │       │       │
        └───────┴───────┴──┬────┴──────┴──────┴───────┴───┬───┴───┬───┘       │
                           │                              │       │           │
  BATCH 3                  │                        ┌─────┴───────┴────┐      │
                           │                        │ U11 build-blog.rb │      │
                    ┌──────┴─────────┐              └─────────┬────────┘      │
                    │ U12 smoke page │                        │               │
                    └──────┬─────────┘                        │               │
                           └──────────────┬───────────────────┴───────────────┘
  BATCH 4                                 │
                              ┌───────────┴────────────┐
                              │ U13 CI + verify + docs │
                              └────────────────────────┘
```

| Batch | Units | Parallelism | Blocking reason |
|---|---|---|---|
| 1 | U0 | none | every other unit imports these two modules |
| 2 | U1, U2, U3, U4, U5, U6, U7, U8, U9, U10 | **10-way** | all file-disjoint; coupled only through the frozen §1 contract |
| 3 | U11, U12 | 2-way | U11 needs U8+U9; U12 needs U0–U4 + U7 |
| 4 | U13 | none | needs every gate to be green before wiring CI |

### Collision map — where a naive split breaks

| Naive split | Collision | Resolution |
|---|---|---|
| "clear-data feature" + "contact content fix" | both write `content/{en,ms}/common.json` — and because the parity gate compares *keys*, a clobbered **value** passes CI silently | **U7 owns all 18 locale JSON files** |
| "consent widening" + "G3 banner rewrite" | both write `content/{en,ms}/consent.json` | same — U7 |
| "footer markup" + "contact page" | both write `contact.html` | `contact.html` is **U4-only**; U4 applies its own footer `<li>` |
| "footer markup" | would hand-edit `post-year-end-promo.html` (a production page **and** generated) | U8 edits `_post.html.erb`; U11 regenerates |
| "footer markup" + "blog hygiene" | both would run `bin/build-blog.rb` → both write 38 `post-*.html` + `blog.json` | **U11 is the sole regenerator**, sequenced after both |
| "success panel CSS" + "dialog CSS" + "select CSS" + "prefill CSS" | four units appending to `components.css` | **U6 owns the file**, writes all four blocks in one `@layer` |
| "chatbot rename" + "chatbot storage" + "chatbot WhatsApp" | three units in `chatbot.js` | **U3 owns the file**, all three concerns |
| "storage migration" including consent | `consent.js` needs the version bump + dialog too | `consent.js` is **U2-only**; U1 takes the other five modules |
| `storage.js` importing `consent.js` | ESM cycle, three-hop once `i18n.js` migrates | dependency **inverted**: `storage.js` is a zero-import leaf owning `CONSENT_KEY`/`CONSENT_VERSION`; `consent.js` imports them |
| "add WhatsApp icon" done twice | U3 and U4 both need it | **U5 owns `icons.js`**; both consume `data-icon="whatsapp"` |
| "wire the new CI gate" in batch 2 | CI goes red for the whole batch (posts still stale) | script in U10 (batch 2), workflow wiring in **U13** (batch 4) |

---

## 7. Constraint checklist (verify before declaring done)

- [ ] `bin/check-i18n-parity.rb` exits 0; every EN key mirrored in MS, `_placeholder` maps included, new `_note`s mirrored.
- [ ] `bin/check-contact-channels.rb` exits 0.
- [ ] No `post-*.html` appears in `git diff --name-only` for any unit except U11.
- [ ] `ruby bin/build-blog.rb` is idempotent (`git diff --quiet` after a second run).
- [ ] Every internal path in production markup/JS is relative. Root-absolute paths appear only in `test/smoke/`.
- [ ] No polyfill, no transpile, no new `package.json` / `Gemfile` dependency (`git diff --name-only` includes neither).
- [ ] axe-core: 0 violations on all 10 production pages, plus `bin/axe-chatbot.mjs`.
- [ ] Canggih import matrix unchanged: `nav 10 · icons 10 · page-load 10 · cursor 10 · i18n 9 · consent 9 · a11y 8 · chatbot 8 · parallax 3`. Neither `storage.js` nor `enquiry.js` is a canggih module.
- [ ] `assets/js/consent.js` still exports `isAllowed` with an unchanged signature (`chatbot.js`, `personalization.js`, `index.html` all import it).
- [ ] No `localStorage`/`sessionStorage` call survives outside `assets/js/storage.js`.
- [ ] No hard-coded `mailto:`, `tel:` or `wa.me` literal in any JS module — all channels flow through `enquiry.js`.
