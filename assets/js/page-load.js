// A1 page-load ink-bloom — sessionStorage-gated, runs once per tab session.
// Cross-tab limitation acknowledged: opening urbane-ethos in two tabs in the
// same browser session blooms both — sessionStorage is per-tab. Acceptable
// for prototype; swap to localStorage with TTL if it bothers in review.

const FLAG = "urbane-ethos:bloomed";

function shouldBloom() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try { return !sessionStorage.getItem(FLAG); } catch { return false; }
}

function markBloomed() {
  try { sessionStorage.setItem(FLAG, "1"); } catch { /* private mode */ }
}

export function initPageLoadBloom() {
  if (!shouldBloom()) return;
  // Bloom drives a body::before cream overlay (opacity fade) + body filter
  // saturate pulse — NOT opacity on <main>. Putting opacity<1 on main would
  // reduce inherited text contrast and fail axe-core WCAG AA during the
  // bloom window.
  document.body.classList.add("canggih-bloom-in");
  // After the bloom completes, remove the class and persist the flag.
  setTimeout(() => {
    document.body.classList.remove("canggih-bloom-in");
    markBloomed();
  }, 2100); // canggih-load-duration (2000ms) + safety margin
}

// T5 wires this module into each page's <script type="module"> block, which
// browsers defer by default — so by the time this file evaluates, <body> has
// been parsed.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPageLoadBloom, { once: true });
} else {
  initPageLoadBloom();
}
