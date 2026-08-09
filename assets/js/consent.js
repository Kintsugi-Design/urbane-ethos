import { translatePage, t } from "./i18n.js";
import { renderSageStamp } from "./sage-stamp.js";
import { CONSENT_KEY, CONSENT_VERSION, allowed, get, set, remove, clearAll } from "./storage.js";

// CONSENT_KEY / CONSENT_VERSION are deliberately NOT redefined here — storage.js
// is the single definition. Two copies of the version is exactly the drift this
// module's migration exists to eliminate.

const DEFAULT = {
  necessary: true,
  analytics: false,
  personalization: false,
  chatbot: false,
  ts: null,
  version: CONSENT_VERSION
};

export function readConsent() {
  const parsed = get(CONSENT_KEY, { fallback: null });
  if (!parsed || parsed.version !== CONSENT_VERSION) return null;
  return parsed;
}

export function writeConsent(consent) {
  const next = { ...DEFAULT, ...consent, necessary: true, ts: new Date().toISOString(), version: CONSENT_VERSION };
  set(CONSENT_KEY, next);
  document.dispatchEvent(new CustomEvent("consent:changed", { detail: next }));
  return next;
}

export function hasConsented() {
  return readConsent() !== null;
}

// Back-compat surface: chatbot.js, personalization.js and index.html all import
// isAllowed. Signature must not change.
export function isAllowed(category) {
  return allowed(category);
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
      <div class="consent-saved" hidden>
        <span class="consent-saved-text" aria-live="polite" data-i18n="consent.banner.saved"></span>
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
          <a href="./privacy.html" data-i18n="consent.banner.readFullNotice"></a>
        </p>
        <div class="consent-modal-actions">
          <button type="button" class="btn btn--ghost" data-consent-clear data-i18n="consent.modal.clearData"></button>
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

/* ------------------------------------------------------------------ *
 * Clear-my-data
 *
 * A native <dialog> opened with showModal(): the top layer, the focus
 * trap and Escape-to-cancel all come from the platform. The hand-rolled
 * trapFocus above is deliberately NOT reused here, and the blocking
 * built-in confirm prompt is not an option — it freezes the page.
 * ------------------------------------------------------------------ */

let clearDialog = null;
let clearOpener = null;

function buildClearDialog() {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <dialog class="clear-data-dialog" data-clear-data-dialog aria-labelledby="clear-data-title">
      <h2 id="clear-data-title" class="clear-data-title" data-i18n="common.clearData.title"></h2>
      <p class="clear-data-body" data-i18n="common.clearData.body"></p>
      <ul class="clear-data-items"></ul>
      <div class="clear-data-actions">
        <button type="button" class="btn btn--ghost" data-clear-data-action="cancel" data-i18n="common.clearData.cancel"></button>
        <button type="button" class="btn btn--primary" data-clear-data-action="confirm" data-i18n="common.clearData.confirm"></button>
      </div>
      <p role="status"></p>
    </dialog>
  `;
  return tpl.content.firstElementChild;
}

// common.clearData.itemsList is an ARRAY. data-i18n binds a single string to a
// single node, so it cannot express a list — the <li>s are built here and
// rebuilt on i18n:changed alongside the statics translatePage() handles.
async function renderClearItems() {
  if (!clearDialog) return;
  const list = clearDialog.querySelector(".clear-data-items");
  if (!list) return;
  let items = null;
  try {
    items = await t("common.clearData.itemsList");
  } catch {
    items = null;
  }
  list.textContent = "";
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (typeof item !== "string") continue;
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }
}

function ensureClearDialog() {
  if (clearDialog && clearDialog.isConnected) return clearDialog;
  clearDialog = buildClearDialog();
  document.body.append(clearDialog);

  clearDialog.addEventListener("click", e => {
    const action = e.target.closest("[data-clear-data-action]")?.dataset.clearDataAction;
    if (!action) return;
    if (action === "cancel") {
      clearDialog.close();
    } else if (action === "confirm") {
      confirmClear();
    }
  });

  // Escape and the cancel button land here alike; nothing is wiped on close.
  clearDialog.addEventListener("close", () => {
    if (clearOpener && clearOpener.isConnected) {
      clearOpener.focus({ preventScroll: true });
    }
    clearOpener = null;
  });

  return clearDialog;
}

async function confirmClear() {
  if (!clearDialog) return;
  clearAll();
  clearDialog.querySelectorAll("button").forEach(b => { b.disabled = true; });
  const status = clearDialog.querySelector('[role="status"]');
  if (status) {
    let done = null;
    try {
      done = await t("common.clearData.done");
    } catch {
      done = null;
    }
    status.textContent = typeof done === "string" ? done : "";
  }
  // Short pause so the status region is actually announced, then reload so the
  // consent banner re-presents against a clean slate.
  setTimeout(() => location.reload(), 900);
}

function openClearDialog(opener = null) {
  const dialog = ensureClearDialog();
  clearOpener = opener;
  translatePage();
  renderClearItems();
  if (!dialog.open) dialog.showModal();
}

// Wired from initConsent() for the footer/page entries, and again from
// openModal() for the in-modal entry (which does not exist at DOMContentLoaded).
// The WeakSet keeps the guard out of the DOM — §1.2 freezes the data-* names,
// so a bookkeeping attribute is not ours to coin.
const boundClearControls = new WeakSet();

function wireClearControls(root) {
  root.querySelectorAll("[data-consent-clear]").forEach(el => {
    if (boundClearControls.has(el)) return;
    boundClearControls.add(el);
    el.addEventListener("click", e => {
      e.preventDefault(); // the footer entries are <a href="#">
      openClearDialog(el);
    });
  });
}

document.addEventListener("i18n:changed", () => {
  if (clearDialog && clearDialog.isConnected) renderClearItems();
});

/* ------------------------------------------------------------------ */

function showSavedThenDismiss(card) {
  const body = card.querySelector(".consent-card-body");
  const saved = card.querySelector(".consent-saved");
  if (body && saved) {
    body.hidden = true;
    saved.hidden = false;
    renderSageStamp(saved);
  }
  card.classList.add("is-saving");
  setTimeout(() => dismissCard(card), 720);
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
  wireClearControls(modalRoot);

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
      remove(CONSENT_KEY);
      // Reopen the floating card (not the modal directly).
      if (activeModal) closeModal({ refocus: false });
      if (!activeCard) attachCard();
    });
  });
  wireClearControls(document);
}

document.addEventListener("DOMContentLoaded", initConsent);
