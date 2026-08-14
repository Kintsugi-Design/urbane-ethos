import { get, set } from "./storage.js";

const STORAGE_KEY = "urbane-ethos:locale";
const DEFAULT_LOCALE = "en";
const SUPPORTED = new Set(["en", "ms"]);

// BM-DEFERRED — Bahasa Malaysia is drafted but unreviewed. Every content/ms/*.json
// carries `_meta.reviewedBy: null`, and privacy.html MS is a legal surface. Until
// that review lands, the site serves English only.
//
// The lock sits HERE rather than in CSS because six modules read getLocale()
// directly — chatbot.js, map-embed.js, enquiry.js, nav.js, consent.js, yt-embed.js —
// and the locale persists in localStorage under STORAGE_KEY. Hiding the toggle alone
// would strand a visitor who picked BM on an earlier visit on a fully-BM site (copy,
// chatbot, map labels) with no visible way back to English.
//
// SUPPORTED keeps both locales on purpose: the BM path is described, not deleted.
//
// To ship BM: flip this to true and delete the matching `.locale-toggle` rule in
// assets/css/components.css. `grep -rn BM-DEFERRED` finds both sites.
export const LOCALES_ENABLED = false;

function activeLocales() {
  return LOCALES_ENABLED ? SUPPORTED : new Set([DEFAULT_LOCALE]);
}

const cache = new Map();

// Prototype content flags unsourced copy with this sentinel (greppable in
// content/*.json for the pre-launch swap). It must never render to a viewer —
// strip it at the render layer so placeholder slots read as empty, not "Lorem
// ipsum". Required elements (e.g. the hero H1) get real copy instead.
const PLACEHOLDER_SENTINEL = "⟪PLACEHOLDER⟫";

export function stripPlaceholder(value) {
  return (typeof value === "string" && value.startsWith(PLACEHOLDER_SENTINEL)) ? "" : value;
}

// Namespaces that live OUTSIDE the locale subdir — intentionally EN-only
// (blog articles are not translated, per project scope). These map to
// content/<namespace>.json regardless of current locale.
const LOCALE_AGNOSTIC_NAMESPACES = new Set(["blog"]);

// Content lives at <deploy-root>/content/. Resolve it against THIS MODULE's own
// URL (assets/js/i18n.js → ../../content/) rather than against the document.
//
// A document-relative `content/…` only works for pages that sit at the deploy
// root. Every production page does, so this was invisible — but it silently
// 404s for any page in a subdirectory, which is why test/smoke/i18n.html has
// been rendering zero assertions (setLocale() rejected before the first
// check() ran, so it reported neither PASS nor FAIL).
//
// import.meta.url keeps the project's relative-path guarantee: the module's
// position relative to content/ is fixed, so this resolves correctly at the
// repo root, at a custom-domain root, AND at a repo subpath such as
// kintsugi-design.github.io/urbane-ethos/. No root-absolute literal is
// introduced. Verified against all three plus /test/smoke/.
const CONTENT_BASE = new URL("../../content/", import.meta.url);

async function loadNamespace(locale, namespace) {
  const isAgnostic = LOCALE_AGNOSTIC_NAMESPACES.has(namespace);
  const cacheKey = isAgnostic ? `*:${namespace}` : `${locale}:${namespace}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const url = new URL(isAgnostic ? `${namespace}.json` : `${locale}/${namespace}.json`, CONTENT_BASE);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`i18n: failed to load ${url} (${res.status})`);
  const data = await res.json();
  cache.set(cacheKey, data);
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
    if (value != null) el.textContent = stripPlaceholder(value);
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

// The locale is stored as a bare "en"/"ms", not JSON. `raw: true` is mandatory
// on both sides: a JSON-decoding read of the string `en` throws, which would
// silently reset an existing visitor's language on first load after migration.
export function getLocale() {
  const stored = get(STORAGE_KEY, { raw: true });
  return activeLocales().has(stored) ? stored : DEFAULT_LOCALE;
}

export async function setLocale(locale) {
  if (!activeLocales().has(locale)) return;
  set(STORAGE_KEY, locale, { raw: true });
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
  // BM-DEFERRED: nothing to wire while EN is the only active locale. The toggle is
  // hidden in components.css, so its buttons are out of the tab order and the a11y
  // tree; binding click handlers to them would be dead code.
  if (!LOCALES_ENABLED) return;
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
