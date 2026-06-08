const STAMP_SVG = `
<span class="sage-stamp" aria-hidden="true" style="display:inline-block;transform:rotate(-2deg);margin-left:4px;margin-top:-2px;vertical-align:middle">
  <svg viewBox="0 0 32 32" width="22" height="22">
    <circle cx="16" cy="16" r="13" stroke="var(--color-sage-deep)" stroke-width="2" fill="none"
            stroke-dasharray="82" stroke-dashoffset="82">
      <animate attributeName="stroke-dashoffset" from="82" to="0" dur="0.36s" fill="freeze"/>
    </circle>
    <path d="M10 16 L14 20 L22 12" stroke="var(--color-sage-deep)" stroke-width="2" fill="none"
          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="20" stroke-dashoffset="20">
      <animate attributeName="stroke-dashoffset" from="20" to="0" begin="0.32s" dur="0.16s" fill="freeze"/>
    </path>
  </svg>
</span>
`;

/**
 * Render a sage circle + checkmark stamp into the target element.
 * The stamp is prepended (so existing text like "Saved." appears to its right).
 * SVG animations auto-start via inline <animate> elements on attach.
 * Forces a reflow before insertion to make timing deterministic on re-trigger.
 *
 * @param {HTMLElement} targetEl - element to prepend the stamp into
 * @returns {HTMLElement|null} the inserted stamp span, or null if target invalid
 */
export function renderSageStamp(targetEl) {
  if (!targetEl) return null;
  // Remove any prior stamp in this target (re-trigger safety)
  targetEl.querySelectorAll(".sage-stamp").forEach(el => el.remove());
  // Insert
  targetEl.insertAdjacentHTML("afterbegin", STAMP_SVG);
  const stamp = targetEl.querySelector(".sage-stamp");
  // Force reflow so the SMIL animations start deterministically
  if (stamp) void stamp.offsetWidth;
  return stamp;
}
