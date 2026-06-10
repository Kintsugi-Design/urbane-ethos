// Phase 2 — lazy YouTube embed.
//
// Each .yt-embed element renders as a static thumbnail (img) with a play
// button overlay until clicked. On first click/Enter/Space, the module
// swaps the inner content for a real <iframe> with autoplay=1. Click is a
// user gesture, so the browser allows autoplay with sound (no mute=1
// needed). Subsequent renders show the iframe directly via data-yt-state.
//
// HTML shape expected on each .yt-embed:
//   <div class="yt-embed" data-yt-id="ABC123" data-yt-title="...">
//     <img src="/assets/img/anchors/yt-thumb-X.jpg" alt="">
//     <p class="yt-caption">...</p>
//     <button class="yt-play" aria-label="Play video">▶</button>
//   </div>

function loadIframe(embed) {
  const id = embed.dataset.ytId;
  const title = embed.dataset.ytTitle || "YouTube video";
  if (!id) return;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  iframe.title = title;
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  // Replace static contents: remove img, caption, button.
  embed.querySelectorAll("img, .yt-caption, .yt-play").forEach(el => el.remove());
  embed.appendChild(iframe);
  embed.dataset.ytState = "playing";
  // Move focus into iframe so keyboard nav lands inside the video player.
  iframe.focus({ preventScroll: true });
}

function handleClick(e) {
  const embed = e.target.closest(".yt-embed");
  if (!embed) return;
  if (embed.dataset.ytState === "playing") return;
  // Allow click on img, caption, or button — all swap to iframe.
  e.preventDefault();
  loadIframe(embed);
}

function handleKey(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const embed = e.target.closest(".yt-embed");
  if (!embed) return;
  if (embed.dataset.ytState === "playing") return;
  e.preventDefault();
  loadIframe(embed);
}

export function initYouTubeEmbeds() {
  document.addEventListener("click", handleClick, { passive: false });
  // Keyboard fallback on the .yt-play button (which is focusable as <button>).
  document.addEventListener("keydown", handleKey);
}

// T5/T6/T7 of Phase 4 established the <script type="module"> defer pattern;
// by the time this module evaluates, DOM is parsed.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initYouTubeEmbeds, { once: true });
} else {
  initYouTubeEmbeds();
}
