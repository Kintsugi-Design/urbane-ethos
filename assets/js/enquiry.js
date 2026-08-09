import { t, getLocale } from "./i18n.js";
import { get } from "./storage.js";

// The single place that knows how to reach the centre and what is known about a
// visitor. Every address and number is derived from the `contact` namespace —
// hard-coding a channel anywhere else is the defect this module exists to
// eliminate.

const CHAT_CONTEXT_KEY = "urbane-ethos:chat-context";
const PERSONALIZATION_KEY = "urbane-ethos:personalization";

// Mirrors RULES.concernToService in personalization.js. It is copied rather than
// imported because personalization.js pulls in consent.js, sage-stamp.js and a
// DOMContentLoaded survey binding — importing it would drag the whole home-page
// survey into chatbot.js. Keep the two tables in step.
const CONCERN_TO_SERVICE = {
  "speech": "speech",
  "motor-skills": "ot",
  "behaviour": "psych",
  "learning": "specialed",
  "daily-living": "ot",
  "not-sure": "screening"
};

const ADULT_BANDS = new Set(["adult", "older-adult"]);
const AGE_GATED_SERVICE_KEYS = new Set(["eip"]); // children ≤12 only

const STAGE_SLUGS = new Set(["exploring", "assessing", "booking"]);

// Sessions predating the stageOptions reshape stored a localised display string
// rather than a slug, so both locales' literals are accepted on read.
const LEGACY_STAGE_LABELS = {
  "just exploring": "exploring",
  "looking to assess": "assessing",
  "ready to book": "booking",
  "sekadar melihat-lihat": "exploring",
  "ingin membuat penilaian": "assessing",
  "sedia untuk menempah": "booking"
};

function text(value) {
  return value == null ? "" : String(value).trim();
}

function asStage(value) {
  const raw = text(value);
  if (!raw) return null;
  if (STAGE_SLUGS.has(raw)) return raw;
  return LEGACY_STAGE_LABELS[raw.toLowerCase()] ?? null;
}

function asConcerns(concern) {
  return Array.isArray(concern) ? concern.filter(Boolean) : (concern ? [concern] : []);
}

export function readInterest({ serviceKeys = null } = {}) {
  const chat = get(CHAT_CONTEXT_KEY, { category: "chatbot", scope: "session", fallback: null });
  const survey = get(PERSONALIZATION_KEY, { category: "personalization", scope: "session", fallback: null });

  const age = text(survey?.age) || null;
  const concerns = asConcerns(survey?.concern);

  let param = null;
  try {
    param = new URLSearchParams(location.search).get("service");
  } catch {
    param = null;
  }

  const keys = serviceKeys ? new Set(serviceKeys) : null;
  const validate = keys && keys.size ? key => keys.has(key) : () => true;
  // The age gate is inherited from personalization.js, not re-derived: an adult
  // is never routed to the children-only Early Intervention Programme, whatever
  // the source claimed.
  const permitted = key => !(AGE_GATED_SERVICE_KEYS.has(key) && ADULT_BANDS.has(age));

  const candidates = [
    ["param", text(param)],
    ["chat", text(chat?.service)],
    ["survey", text(CONCERN_TO_SERVICE[concerns[0]])]
  ];

  let service = null;
  let serviceSource = null;
  for (const [source, candidate] of candidates) {
    if (!candidate || !validate(candidate) || !permitted(candidate)) continue;
    service = candidate;
    serviceSource = source;
    break;
  }

  let locale = "en";
  try {
    locale = getLocale();
  } catch {
    locale = "en";
  }

  return {
    service,
    serviceSource,
    age,
    concerns,
    stage: asStage(survey?.stage),
    name: text(chat?.name) || null,
    phone: text(chat?.phone) || null,
    locale
  };
}

// English-only and hard-coded by design (plan §1.6): the message is addressed to
// the centre, not to the visitor, and the visitor's own free text passes through
// verbatim. No contact.enquiry.* i18n keys.
export function composeEnquiry(payload) {
  const p = payload ?? {};
  const name = text(p.name);
  const email = text(p.email);
  const phone = text(p.phone);
  const serviceTitle = text(p.serviceTitle);
  const concern = text(p.concern);
  const tellmore = text(p.tellmore);

  const subject = serviceTitle ? `Enquiry about ${serviceTitle}` : "Enquiry from website";

  const opening = serviceTitle
    ? `Hi Urbane Ethos, I'd like to enquire about ${serviceTitle}.`
    : "Hi Urbane Ethos, I'd like to make an enquiry.";

  const details = [
    name && `Name: ${name}`,
    email && `Email: ${email}`,
    phone && `Phone: ${phone}`
  ].filter(Boolean);

  const blocks = [
    [opening],
    details,
    concern ? [`Concern: ${concern}`] : [],
    tellmore ? [`More detail: ${tellmore}`] : []
  ].filter(block => block.length);

  const body = blocks.map(block => block.join("\n")).join("\n\n");
  return { subject, body, text: body };
}

// Strip every non-digit, then a leading 0 becomes the Malaysian country code:
// "+6013-249 0069" → "60132490069", "013-249 0069" → "60132490069".
function toE164(display) {
  const digits = text(display).replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
}

export async function channels() {
  try {
    const [email, phones] = await Promise.all([t("contact.email"), t("contact.phones")]);
    const row = Array.isArray(phones)
      ? phones.find(p => /whatsapp/i.test(text(p?.label)))
      : null;
    const display = text(row?.number);
    const e164 = toE164(display);
    return {
      email: text(email) || null,
      // The wa.me target is computed, never stored a second time.
      whatsapp: e164 ? { display, e164, url: `https://wa.me/${e164}` } : null,
      error: null
    };
  } catch (error) {
    // Never rejects. A null email means *cannot send* — the caller must offer
    // the copy-message fallback, never substitute a hard-coded address.
    return { email: null, whatsapp: null, error };
  }
}

export function mailtoUrl(message, email) {
  if (!email) return null;
  const m = message ?? {};
  return `mailto:${email}?subject=${encodeURIComponent(text(m.subject))}&body=${encodeURIComponent(text(m.body))}`;
}

export function whatsappUrl(message, e164) {
  if (!e164) return null;
  const m = message ?? {};
  return `https://wa.me/${e164}?text=${encodeURIComponent(text(m.text))}`;
}
