import { isAllowed } from "/assets/js/consent.js";
import { renderSageStamp } from "/assets/js/sage-stamp.js";

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
