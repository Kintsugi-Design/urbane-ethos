// A2 custom cursor — small sage ink-dot at rest, scales on interactive
// elements. Hidden on touch and prefers-reduced-motion. The OS cursor stays
// visible underneath; this dot is decorative.

// Selectors are deliberate — keep in sync if new interactive widgets are added.
// Known omissions (silent at present, may need adding later): [role="switch"],
// [role="tab"], [role="menuitem"], [contenteditable], [tabindex]:not([tabindex="-1"]).
const INTERACTIVE_SEL = "a, button, [role=\"button\"], input, textarea, select, label, summary";
const TEXT_INPUT_SEL = "input[type=\"text\"], input[type=\"email\"], input[type=\"tel\"], input[type=\"search\"], input[type=\"url\"], input:not([type]), textarea";

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function initCanggihCursor() {
  if (isTouchDevice() || reducedMotion()) return;

  const dot = document.createElement("div");
  dot.className = "canggih-cursor";
  dot.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);

  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let rafId = 0;

  function render() {
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    rafId = 0;
  }

  document.addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    if (!rafId) rafId = requestAnimationFrame(render);
  }, { passive: true });

  document.addEventListener("pointerover", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.matches(TEXT_INPUT_SEL)) {
      dot.classList.add("canggih-cursor--fade");
      dot.classList.remove("canggih-cursor--active");
    } else if (t.matches(INTERACTIVE_SEL) || t.closest(INTERACTIVE_SEL)) {
      dot.classList.add("canggih-cursor--active");
      dot.classList.remove("canggih-cursor--fade");
    } else {
      dot.classList.remove("canggih-cursor--active", "canggih-cursor--fade");
    }
  }, { passive: true });

  document.addEventListener("pointerout", () => {
    dot.classList.remove("canggih-cursor--active", "canggih-cursor--fade");
  }, { passive: true });
}

// T5 wires this module into each page's <script type="module"> block.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCanggihCursor, { once: true });
} else {
  initCanggihCursor();
}
