// Footer opening-hours renderer — the single implementation that replaces the
// near-identical inline scripts previously duplicated across 8 page scripts.
//
// content/{en,ms}/common.json footer.hours is a flat array of verbatim strings.
// Each row splits on the FIRST ": " into a day label + time value (both locales
// share the shape: "Monday: 12PM – 5PM" / "Isnin: 12PM – 5PM"). A string with
// no ": " ("Closed Sunday & Public Holidays" / "Tutup pada hari Ahad & Cuti
// Umum") renders as a full-width muted note. Do NOT restructure the content
// JSON into label/value objects — the strings are scraped verbatim and the
// split-in-JS pattern matches index.html's home.location.hours rendering.
//
// t() resolves through i18n.js: cached per namespace, locale-aware, and URL-
// resolved against import.meta.url — safe at any deploy root.
import { t } from "./i18n.js";

export async function renderFooterHours() {
  const el = document.getElementById("footer-hours");
  if (!el) return; // pages without the full footer (analytics, privacy, 404)
  const hours = (await t("common.footer.hours")) || [];
  el.replaceChildren(...hours.flatMap(s => {
    const i = s.indexOf(": ");
    if (i === -1) {
      const note = document.createElement("span");
      note.className = "footer-hours-note";
      note.textContent = s;
      return [note];
    }
    const day = document.createElement("span");
    day.className = "footer-hours-day";
    day.textContent = s.slice(0, i);
    const time = document.createElement("span");
    time.className = "footer-hours-time";
    time.textContent = s.slice(i + 2);
    return [day, time];
  }));
}

// Module scripts execute after the document is parsed, so #footer-hours exists.
renderFooterHours();
document.addEventListener("i18n:changed", () => renderFooterHours());
