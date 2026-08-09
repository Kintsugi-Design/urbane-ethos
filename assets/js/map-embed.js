// Privacy-preserving click-to-load Google Map.
//
// PDPA: a direct `output=embed` Google Maps iframe transmits the visitor's IP
// (plus a telemetry beacon) to Google the moment it renders — before any
// consent. This module keeps a static, network-silent facade in the DOM and
// only builds the real <iframe> on an explicit user click, mirroring the
// yt-embed.js pattern. No third-party request fires until the visitor asks.
//
// HTML shape expected on each map slot:
//   <figure class="media-card visit-map map-embed" data-map-embed>
//     <div class="map-embed-facade">
//       <span data-icon="map-pin" aria-hidden="true"></span>
//       <p class="map-embed-note" data-i18n="common.map.notice">…</p>
//       <button type="button" class="btn btn--secondary map-embed-load"
//               data-i18n="common.map.load">Load map</button>
//     </div>
//   </figure>
//
// The embed URL + accessible title are read from common.json at click time
// (same-origin, single source of truth — common.mapEmbedSrc), so there is no
// duplicated URL to drift and nothing loads until the gesture.

import { getLocale } from "./i18n.js";

async function loadMap(embed) {
  if (embed.dataset.mapState === "loaded") return;
  embed.dataset.mapState = "loaded";
  const locale = getLocale();
  let src, title;
  try {
    // Resolved against this module's URL, not the document — same reasoning as
    // i18n.js's CONTENT_BASE. Document-relative 404s from any subdirectory page.
    const common = await fetch(new URL(`../../content/${locale}/common.json`, import.meta.url)).then(r => r.json());
    src = common.mapEmbedSrc;
    title = common.a11y?.mapTitle;
  } catch {
    embed.dataset.mapState = "";  // allow a retry if the config fetch failed
    return;
  }
  if (!src) { embed.dataset.mapState = ""; return; }
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = title || "Map";
  iframe.className = "map-frame";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  embed.querySelector(".map-embed-facade")?.remove();
  embed.appendChild(iframe);
  iframe.focus({ preventScroll: true });
}

function handleClick(e) {
  const embed = e.target.closest("[data-map-embed]");
  if (!embed) return;
  e.preventDefault();
  loadMap(embed);
}

export function initMapEmbeds() {
  // The load control is a real <button>, so Enter/Space fire click natively —
  // click delegation alone covers pointer + keyboard.
  document.addEventListener("click", handleClick, { passive: false });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMapEmbeds, { once: true });
} else {
  initMapEmbeds();
}
