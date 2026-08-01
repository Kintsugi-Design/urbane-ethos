import { isAllowed } from "./consent.js";
import { renderSageStamp } from "./sage-stamp.js";

const KEY = "urbane-ethos:personalization";

// W5 fix: rules are keyed on locale-agnostic slugs (matching the
// concernOptions[].value in home.json). The chip <input value="…">
// is the slug, not the display label, so FormData.get("concern")
// returns the same string in EN and BM.
const RULES = {
  // "eip" (Early Intervention Programme) is age-gated — children ≤12 ONLY
  // (Appendix C). It is deliberately absent from concernToService; child age
  // bands surface it via ageToNoteKey instead.
  concernToService: {
    "speech": "speech",
    "motor-skills": "ot",
    "behaviour": "psych",
    "learning": "specialed",
    "daily-living": "ot",
    "not-sure": "screening"
  },
  // Tags must match content/blog.json posts[].tags verbatim.
  concernToBlogTags: {
    "speech": ["speech therapy"],
    "motor-skills": ["occupational therapy", "development"],
    "behaviour": ["development"],
    "learning": ["special needs", "Parenting Workshop"],
    "daily-living": ["occupational therapy", "development"],
    "not-sure": ["Parenting Workshop", "development"]
  },
  // Ids must match content/{en,ms}/staff.json members[].id verbatim.
  concernToStaff: {
    "speech": "ms-emalin-nasuha-hachim",
    "motor-skills": "mrs-norizzati-afiqah",
    "behaviour": "ms-liyana-tarmizi",
    "learning": "ms-nuraisyah-azman",
    "daily-living": "nasirah-zulkifli",
    "not-sure": "dr-norizan-rajak"
  },
  // Age band slug → subkey under home.personalization.ageNotes.
  ageToNoteKey: {
    "early-years": "child",
    "preschool": "child",
    "school-age": "child",
    "teen": "teen",
    "adult": "adult",
    "older-adult": "olderAdult"
  }
};

// Age guard: services never surfaced prominently to bands they don't serve.
const ADULT_BANDS = new Set(["adult", "older-adult"]);
const AGE_GATED_SERVICE_KEYS = ["eip"]; // children ≤12 only

// "concern" is multi-select: the survey stores an array of slugs. Older
// sessions (or a single-select fallback) may hold a bare string — normalize
// both to a slug array so every consumer can treat concern uniformly.
export function asConcerns(concern) {
  return Array.isArray(concern) ? concern.filter(Boolean) : (concern ? [concern] : []);
}

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
  const concerns = asConcerns(data?.concern);
  if (!concerns.length) return;
  const cards = [...container.querySelectorAll("[data-service-key]")];
  // Prepend the matched service for each concern. Dedupe by service key, then
  // prepend in reverse so the first-selected concern's service lands at front.
  const keys = [...new Set(concerns.map(c => RULES.concernToService[c]).filter(Boolean))];
  keys.reverse().forEach(priorityKey => {
    const priority = cards.find(c => c.dataset.serviceKey === priorityKey);
    if (priority) container.prepend(priority);
  });
  // Adults / older adults never see age-gated (children-only) services first.
  if (ADULT_BANDS.has(data.age)) {
    AGE_GATED_SERVICE_KEYS.forEach(key => {
      const gated = container.querySelector(`[data-service-key="${key}"]`);
      if (gated) container.append(gated);
    });
  }
}

export function recommendedBlog(posts) {
  const concerns = asConcerns(read()?.concern);
  if (!concerns.length) return posts.slice(0, 3);
  const tags = [...new Set(concerns.flatMap(c => RULES.concernToBlogTags[c] || []))];
  const tagged = posts.filter(p => p.tags?.some(t => tags.includes(t)));
  return tagged.length ? tagged.slice(0, 2) : posts.slice(0, 2);
}

// One staff match per selected concern, deduped, in selection order.
export function recommendedStaffIds() {
  const concerns = asConcerns(read()?.concern);
  return [...new Set(concerns.map(c => RULES.concernToStaff[c]).filter(Boolean))];
}

// Returns the home.json path (relative to the loaded namespace object) of the
// age-appropriate note, or null. The page's renderer resolves it against the
// already-fetched home JSON — this module stays i18n-free.
export function ageNoteKeyPath() {
  const data = read();
  const sub = data?.age ? RULES.ageToNoteKey[data.age] : null;
  return sub ? ["personalization", "ageNotes", sub] : null;
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
      concern: data.getAll("concern"),
      stage: data.get("stage")
    });
    const feedback = form.querySelector("[data-personalize-feedback]");
    if (feedback) {
      feedback.removeAttribute("hidden");
      if (!feedback.textContent.trim()) feedback.textContent = "Saved.";
      feedback.setAttribute("aria-live", "polite");
      renderSageStamp(feedback);
      // After 720ms (stamp completes ~480ms + brief pause), fade out then hide
      setTimeout(() => {
        feedback.style.transition = "opacity 200ms var(--ease-paper)";
        feedback.style.opacity = "0";
        setTimeout(() => {
          feedback.setAttribute("hidden", "");
          feedback.style.opacity = "";
          feedback.style.transition = "";
          feedback.querySelectorAll(".sage-stamp").forEach(el => el.remove());
        }, 200);
      }, 720);
    }
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
