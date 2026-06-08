const FS_KEY = "urbane-ethos:font-size";
const FS_VALUES = ["1", "2", "3"];

function readFs() {
  const v = localStorage.getItem(FS_KEY);
  return FS_VALUES.includes(v) ? v : "1";
}

function applyFs(value) {
  document.documentElement.dataset.fs = value;
}

export function cycleFontSize() {
  const cur = readFs();
  const next = FS_VALUES[(FS_VALUES.indexOf(cur) + 1) % FS_VALUES.length];
  localStorage.setItem(FS_KEY, next);
  applyFs(next);
  return next;
}

export function initA11y() {
  applyFs(readFs());

  document.querySelectorAll("[data-fs-cycle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const next = cycleFontSize();
      btn.setAttribute("aria-label", `Text size: step ${next} of ${FS_VALUES.length}`);
    });
  });

  const skip = document.querySelector(".skip-link");
  if (skip) {
    skip.addEventListener("click", e => {
      const targetId = skip.getAttribute("href").slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: false });
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initA11y);
