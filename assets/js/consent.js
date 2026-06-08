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

function buildCard() {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <aside class="consent-banner" role="region" aria-label="Cookie preferences" aria-live="polite">
      <div class="consent-card-body">
        <strong class="consent-heading" data-i18n="consent.banner.heading"></strong>
        <p class="consent-body" data-i18n="consent.banner.body"></p>
        <div class="consent-actions">
          <button class="btn btn--ghost" data-consent-action="customize" data-i18n="consent.banner.customize"></button>
          <button class="btn btn--secondary" data-consent-action="necessary" data-i18n="consent.banner.necessaryOnly"></button>
          <button class="btn btn--primary" data-consent-action="all" data-i18n="consent.banner.acceptAll"></button>
        </div>
      </div>
      <div class="consent-saved" hidden aria-live="polite">
        <svg class="consent-saved-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span data-i18n="consent.banner.saved"></span>
      </div>
    </aside>
  `;
  return tpl.content.firstElementChild;
}

function buildModal() {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <div class="consent-modal-root">
      <div class="consent-modal-backdrop" data-consent-action="modal-close"></div>
      <div class="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-modal-title">
        <h2 id="consent-modal-title" class="consent-modal-title" data-i18n="consent.modal.title"></h2>
        <div class="consent-modal-toggles">
          ${["necessary", "analytics", "personalization", "chatbot"].map(cat => `
            <label class="consent-toggle">
              <input type="checkbox" data-consent-toggle="${cat}" ${cat === "necessary" ? "checked disabled" : ""}>
              <span>
                <strong data-i18n="consent.toggles.${cat}.label"></strong><br>
                <small data-i18n="consent.toggles.${cat}.description"></small>
              </span>
            </label>
          `).join("")}
        </div>
        <p class="consent-modal-link">
          <a href="/privacy.html" data-i18n="consent.banner.readFullNotice"></a>
        </p>
        <div class="consent-modal-actions">
          <button type="button" class="btn btn--ghost" data-consent-action="modal-close" data-i18n="consent.banner.cancel"></button>
          <button type="button" class="btn btn--primary" data-consent-action="save" data-i18n="consent.banner.save"></button>
        </div>
      </div>
    </div>
  `;
  return tpl.content.firstElementChild;
}

function focusables(container) {
  return [...container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.hasAttribute("hidden") && el.offsetParent !== null);
}

function trapFocus(container, e) {
  if (e.key !== "Tab") return;
  const f = focusables(container);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}

let activeCard = null;
let activeModal = null;
let cardKeyHandler = null;
let modalKeyHandler = null;

function showSavedThenDismiss(card) {
  const body = card.querySelector(".consent-card-body");
  const saved = card.querySelector(".consent-saved");
  if (body && saved) {
    body.hidden = true;
    saved.hidden = false;
  }
  card.classList.add("is-saving");
  setTimeout(() => dismissCard(card), 700);
}

function dismissCard(card) {
  if (!card || !card.isConnected) return;
  card.classList.add("is-leaving");
  if (cardKeyHandler) {
    card.removeEventListener("keydown", cardKeyHandler);
    cardKeyHandler = null;
  }
  setTimeout(() => {
    if (card.isConnected) card.remove();
    if (activeCard === card) activeCard = null;
  }, 240);
}

function closeModal({ refocus = true } = {}) {
  if (!activeModal) return;
  const modalRoot = activeModal;
  activeModal = null;
  if (modalKeyHandler) {
    modalRoot.removeEventListener("keydown", modalKeyHandler);
    modalKeyHandler = null;
  }
  modalRoot.classList.add("is-leaving");
  setTimeout(() => {
    if (modalRoot.isConnected) modalRoot.remove();
  }, 200);
  if (refocus && activeCard) {
    const customizeBtn = activeCard.querySelector('[data-consent-action="customize"]');
    if (customizeBtn) customizeBtn.focus({ preventScroll: true });
  }
}

function openModal() {
  if (activeModal) return;
  const modalRoot = buildModal();
  document.body.append(modalRoot);
  activeModal = modalRoot;
  translatePage();

  const modal = modalRoot.querySelector(".consent-modal");

  modalRoot.addEventListener("click", e => {
    const action = e.target.dataset.consentAction;
    if (!action) return;
    if (action === "modal-close") {
      closeModal();
    } else if (action === "save") {
      const chosen = {};
      modal.querySelectorAll("[data-consent-toggle]").forEach(cb => {
        chosen[cb.dataset.consentToggle] = cb.checked;
      });
      writeConsent(chosen);
      closeModal({ refocus: false });
      if (activeCard) showSavedThenDismiss(activeCard);
    }
  });

  modalKeyHandler = e => {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeModal();
      return;
    }
    trapFocus(modal, e);
  };
  modalRoot.addEventListener("keydown", modalKeyHandler);

  // Focus first non-disabled checkbox
  setTimeout(() => {
    const firstToggle = modal.querySelector('input[type="checkbox"]:not([disabled])');
    if (firstToggle) firstToggle.focus({ preventScroll: true });
  }, 0);
}

function attachCard() {
  if (activeCard) return;
  const card = buildCard();
  document.body.append(card);
  activeCard = card;
  translatePage();
  document.dispatchEvent(new CustomEvent("consent:banner-mounted"));

  card.addEventListener("click", e => {
    const action = e.target.dataset.consentAction;
    if (!action) return;
    if (action === "customize") {
      openModal();
      return;
    }
    if (action === "all") {
      writeConsent({ necessary: true, analytics: true, personalization: true, chatbot: true });
    } else if (action === "necessary") {
      writeConsent({ necessary: true, analytics: false, personalization: false, chatbot: false });
    }
    showSavedThenDismiss(card);
  });

  // Card's own keyboard handler: Escape is a no-op here (don't trap the user
  // into accidentally rejecting all consent). Focus stays trapped within the
  // card unless the modal is open (which has its own trap).
  cardKeyHandler = e => {
    if (activeModal) return;
    if (e.key === "Escape") return;
    trapFocus(card, e);
  };
  card.addEventListener("keydown", cardKeyHandler);

  // Initial focus on Customize button
  setTimeout(() => {
    const customizeBtn = card.querySelector('[data-consent-action="customize"]');
    if (customizeBtn) customizeBtn.focus({ preventScroll: true });
  }, 0);
}

export function initConsent() {
  if (!hasConsented()) attachCard();
  document.querySelectorAll("[data-consent-manage]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      localStorage.removeItem(CONSENT_KEY);
      // Reopen the floating card (not the modal directly).
      if (activeModal) closeModal({ refocus: false });
      if (!activeCard) attachCard();
    });
  });
}

document.addEventListener("DOMContentLoaded", initConsent);
