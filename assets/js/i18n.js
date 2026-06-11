const STORAGE_KEY = "urbane-ethos:locale";
const DEFAULT_LOCALE = "en";
const SUPPORTED = new Set(["en", "ms"]);

const cache = new Map();

// Namespaces that live OUTSIDE the locale subdir — intentionally EN-only
// (blog articles are not translated, per project scope). These map to
// content/<namespace>.json regardless of current locale.
const LOCALE_AGNOSTIC_NAMESPACES = new Set(["blog"]);

async function loadNamespace(locale, namespace) {
  const isAgnostic = LOCALE_AGNOSTIC_NAMESPACES.has(namespace);
  const cacheKey = isAgnostic ? `*:${namespace}` : `${locale}:${namespace}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const url = isAgnostic ? `content/${namespace}.json` : `content/${locale}/${namespace}.json`;
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
    if (value != null) el.textContent = value;
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

export function getLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED.has(stored) ? stored : DEFAULT_LOCALE;
}

export async function setLocale(locale) {
  if (!SUPPORTED.has(locale)) return;
  localStorage.setItem(STORAGE_KEY, locale);
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
