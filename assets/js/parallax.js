// A4 parallax — rAF-throttled scroll-Y → CSS custom property on :root.
// Capped at --canggih-parallax-depth via clamp() in CSS, NOT here. Disabled
// on reduced-motion (no listener registered, no GPU layer activated).

let rafId = 0;

function update() {
  document.documentElement.style.setProperty("--scroll-y", String(window.scrollY));
  rafId = 0;
}

function onScroll() {
  if (!rafId) rafId = requestAnimationFrame(update);
}

export function initCanggihParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// T5 wires this module into each page's <script type="module"> block (deferred
// by default — by execution time the layout is parsed and scrollY is real).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCanggihParallax, { once: true });
} else {
  initCanggihParallax();
}
