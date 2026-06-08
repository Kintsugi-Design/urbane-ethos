import { translatePage } from "/assets/js/i18n.js";

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
  translatePage();
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
