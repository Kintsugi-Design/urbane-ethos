// Consent-aware, exception-safe wrapper around Web Storage. Every module that
// touches storage goes through here, so an ungated write is impossible to
// express and Safari private mode / quota errors can never reach a caller.
//
// This module imports NOTHING, deliberately. The obvious shape — importing
// isAllowed from consent.js — would close an ESM cycle (consent.js → storage.js
// → consent.js, and a three-hop one once i18n.js migrates). The dependency is
// inverted instead: storage.js owns the consent record's key, version and
// parse; consent.js imports them from here.

export const PREFIX = "urbane-ethos:";
export const CONSENT_KEY = "urbane-ethos:consent";
export const CONSENT_VERSION = 2;
export const LEGACY_KEYS = ["session-chat"]; // unprefixed, pre-dates the namespace

function area(scope) {
  return scope === "session" ? sessionStorage : localStorage;
}

export function allowed(category) {
  // Answered without touching storage: "necessary" is true even in a context
  // where localStorage itself throws.
  if (category === "necessary") return true;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CONSENT_VERSION) return false;
    return Boolean(parsed[category]);
  } catch {
    return false;
  }
}

export function get(key, { category = "necessary", fallback = null, scope = "local", raw = false } = {}) {
  if (!allowed(category)) return fallback;
  try {
    const stored = area(scope).getItem(key);
    if (stored === null) return fallback;
    return raw ? stored : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

export function set(key, value, { category = "necessary", scope = "local", raw = false } = {}) {
  if (!allowed(category)) return false;
  try {
    area(scope).setItem(key, raw ? String(value) : JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Removal is never consent-gated — forgetting a visitor is always permitted.
export function remove(key, { scope = "local" } = {}) {
  try {
    area(scope).removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  const removed = [];
  for (const scope of ["local", "session"]) {
    let store;
    try {
      store = area(scope);
    } catch {
      continue; // a throwing scope simply contributes nothing
    }
    // Snapshot the names first: Storage is index-addressed, so removing during
    // the walk reindexes the remaining keys and silently skips half of them.
    const names = [];
    try {
      for (let i = 0; i < store.length; i += 1) {
        const name = store.key(i);
        if (name !== null) names.push(name);
      }
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.startsWith(PREFIX) && !LEGACY_KEYS.includes(name)) continue;
      try {
        store.removeItem(name);
        removed.push(`${scope}:${name}`);
      } catch {
        // key survives; leave it out of `removed` so the caller sees the truth
      }
    }
  }
  return { removed };
}
