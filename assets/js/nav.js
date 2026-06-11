// W6.2 — Hamburger nav toggle.
//
// Wires the .nav-toggle button to #primary-nav.is-open with:
//   - aria-expanded + aria-label sync (label flips Open ↔ Close menu)
//   - focus trap while open (Tab cycles within the panel)
//   - Escape closes + returns focus to the toggle
//   - click-outside closes (no focus restore — user chose another target)
//   - viewport-resize close (e.g. user widens past 768px)
//
// No-ops cleanly on pages without a .nav-toggle (analytics, privacy).
// Reduced-motion is handled in CSS — this module is motion-agnostic.

import { t } from "./i18n.js";

const TOGGLE_SEL = ".nav-toggle";
const PANEL_SEL = "#primary-nav";
const MD_BP = 880;  // matches the components.css min-width breakpoint

function getFocusable(panel) {
  return [...panel.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
}

async function setAriaLabel(toggle, open) {
  const key = open ? "common.nav.menuClose" : "common.nav.menu";
  const label = await t(key);
  if (label) toggle.setAttribute("aria-label", label);
}

function open(toggle, panel) {
  toggle.setAttribute("aria-expanded", "true");
  panel.classList.add("is-open");
  setAriaLabel(toggle, true);
  // Move focus to the first focusable item for keyboard users.
  const focusables = getFocusable(panel);
  if (focusables[0]) focusables[0].focus({ preventScroll: true });
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onClickOutside, true);
  window.addEventListener("resize", onResize);
}

function close(toggle, panel, restoreFocus = true) {
  toggle.setAttribute("aria-expanded", "false");
  panel.classList.remove("is-open");
  setAriaLabel(toggle, false);
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("click", onClickOutside, true);
  window.removeEventListener("resize", onResize);
  if (restoreFocus) toggle.focus({ preventScroll: true });
}

function onKeydown(event) {
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;

  if (event.key === "Escape") {
    event.preventDefault();
    close(toggle, panel);
    return;
  }
  if (event.key !== "Tab") return;

  const focusables = getFocusable(panel);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function onClickOutside(event) {
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;
  if (panel.contains(event.target)) return;
  if (toggle.contains(event.target)) return;
  close(toggle, panel, false);
}

function onResize() {
  if (window.innerWidth < MD_BP) return;
  // Widened past breakpoint — panel becomes the desktop horizontal nav.
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;
  if (toggle.getAttribute("aria-expanded") === "true") {
    close(toggle, panel, false);
  }
}

function init() {
  const toggle = document.querySelector(TOGGLE_SEL);
  const panel = document.querySelector(PANEL_SEL);
  if (!toggle || !panel) return;
  // Sync the initial aria-label to current locale (i18n.translatePage may not
  // touch the attribute if it wasn't visible at parse time).
  setAriaLabel(toggle, false);
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    if (expanded) close(toggle, panel);
    else open(toggle, panel);
  });
  // Re-sync the toggle label when locale changes.
  document.addEventListener("i18n:changed", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    setAriaLabel(toggle, expanded);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
