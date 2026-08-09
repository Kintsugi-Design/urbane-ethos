import { getLocale, stripPlaceholder, t } from "./i18n.js";
import { get, set } from "./storage.js";
import { channels, composeEnquiry, whatsappUrl } from "./enquiry.js";

// Storage keys, per the plan's §1.4 registry. Every read and write goes through
// storage.js, so the "chatbot" consent category gates both directions and an
// ungated write is impossible to express.
const TRANSCRIPT_KEY = "urbane-ethos:chatbot-transcript"; // local, JSON
const SESSION_TRANSCRIPT_KEY = "session-chat";            // session, JSON, legacy unprefixed
const CONTEXT_KEY = "urbane-ethos:chat-context";          // session, JSON

const CHATBOT_CATEGORY = { category: "chatbot" };
const CHATBOT_SESSION = { category: "chatbot", scope: "session" };

// Frozen node id (plan §1.5). The confirmation step ends in a real WhatsApp
// hand-off rather than a promise of future contact.
const CONFIRM_NODE = "customer.confirm";

let panel, log, optionsBar, inputBar, micBtn, ttsBtn, waFooter, waLink, waLabel;
let renderIcons = null;
let flow = null;
let state = { node: "start", context: {} };
// Guards the async WhatsApp href refresh: a later context change must always
// win, whatever order the channel lookups happen to resolve in.
let waSeq = 0;

function text(value) {
  return value == null ? "" : String(value).trim();
}

async function loadFlow() {
  const locale = getLocale();
  // Resolved against this module's URL, not the document — same reasoning as
  // i18n.js's CONTENT_BASE. Document-relative 404s from any subdirectory page
  // (it was silently breaking test/smoke/chatbot.html).
  const res = await fetch(new URL(`../../content/${locale}/chatbot.json`, import.meta.url));
  flow = await res.json();
}

function readList(key, opts) {
  const stored = get(key, { ...opts, fallback: [] });
  return Array.isArray(stored) ? stored : [];
}

function readTranscript() {
  return readList(SESSION_TRANSCRIPT_KEY, CHATBOT_SESSION);
}

function persistTurn(turn) {
  const all = readList(TRANSCRIPT_KEY, CHATBOT_CATEGORY);
  all.push(turn);
  set(TRANSCRIPT_KEY, all, CHATBOT_CATEGORY);

  const session = readTranscript();
  session.push(turn);
  set(SESSION_TRANSCRIPT_KEY, session, CHATBOT_SESSION);
}

// The collected answers — {service, age, freq, name, phone} — travel with the
// visitor: contact.html reads this record through enquiry.js readInterest() so a
// chat that ends on another page still pre-fills the enquiry form.
function restoreContext() {
  const saved = get(CONTEXT_KEY, { ...CHATBOT_SESSION, fallback: null });
  if (saved && typeof saved === "object" && !Array.isArray(saved)) {
    state.context = { ...saved };
  }
}

function contextChanged() {
  set(CONTEXT_KEY, { ...state.context }, CHATBOT_SESSION);
  refreshWhatsApp();
}

function appendBubble(body, role) {
  const div = document.createElement("div");
  div.className = `chat-bubble chat-bubble--${role}`;
  div.textContent = body;
  log.append(div);
  log.scrollTop = log.scrollHeight;
  persistTurn({ role, text: body, ts: Date.now() });
}

function clearOptions() { optionsBar.replaceChildren(); }

function renderOptions(opts) {
  clearOptions();
  for (const opt of opts) {
    const b = document.createElement("button");
    b.className = "chip-pill";
    b.textContent = opt.label;
    b.addEventListener("click", () => choose(opt));
    optionsBar.append(b);
  }
}

function speak(body) {
  if (!ttsBtn.dataset.active) return;
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(body);
  u.lang = getLocale() === "ms" ? "ms-MY" : "en-US";
  window.speechSynthesis.speak(u);
}

// Slug → display title. composeEnquiry() wants the title ("Speech Language
// Therapy (SLP)"), never the slug the flow stores; resolving it is the caller's
// job. t() caches the namespace, so repeat lookups cost nothing.
async function serviceTitleFor(key) {
  if (!key) return "";
  try {
    const items = await t("services.items");
    if (!Array.isArray(items)) return "";
    return text(items.find(item => item?.key === key)?.title);
  } catch {
    return "";
  }
}

async function enquiryPayload() {
  return { ...state.context, serviceTitle: await serviceTitleFor(state.context.service) };
}

// The one place a WhatsApp target is built. The number itself comes from the
// contact namespace via channels() — never a literal in this file. A null
// channel means we cannot reach WhatsApp, and the affordance is withdrawn
// rather than pointed at a guessed number.
async function currentWhatsAppUrl() {
  try {
    const { whatsapp } = await channels();
    if (!whatsapp) return null;
    return whatsappUrl(composeEnquiry(await enquiryPayload()), whatsapp.e164);
  } catch {
    return null;
  }
}

async function refreshWhatsApp() {
  if (!waFooter || !waLink) return;
  const seq = ++waSeq;
  const label = text(flow?.ui?.whatsapp);
  const aria = text(flow?.ui?.whatsappAria);
  const url = label ? await currentWhatsAppUrl() : null;
  if (seq !== waSeq) return; // a newer refresh already landed

  if (!url) {
    waFooter.hidden = true;
    waLink.removeAttribute("href");
    return;
  }
  waLabel.textContent = label;
  if (aria) waLink.setAttribute("aria-label", aria);
  else waLink.removeAttribute("aria-label");
  waLink.href = url;
  waFooter.hidden = false;
}

async function appendWhatsAppAction() {
  const label = text(flow?.ui?.whatsapp);
  if (!label) return;
  const url = await currentWhatsAppUrl();
  if (!url) return;
  if (state.node !== CONFIRM_NODE) return; // the visitor moved on while we waited

  const a = document.createElement("a");
  a.className = "chip-pill chatbot-wa";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  const icon = document.createElement("span");
  icon.dataset.icon = "whatsapp";
  const span = document.createElement("span");
  span.textContent = label;
  a.append(icon, span);
  const aria = text(flow?.ui?.whatsappAria);
  if (aria) a.setAttribute("aria-label", aria);
  optionsBar.prepend(a);
  renderIcons?.(a);
}

function go(nodeId) {
  const node = flow.flow[nodeId];
  if (!node) { appendBubble(`(missing node: ${nodeId})`, "bot"); return; }
  state.node = nodeId;
  // Never surface an unsourced ⟪PLACEHOLDER⟫ sentinel to a visitor (i18n.js
  // strips it in the DOM render path, but the chatbot writes textContent
  // directly, so strip here too). Nodes whose copy is still a placeholder
  // carry a real fallback in chatbot.json instead of a blanked bubble.
  const say = stripPlaceholder(node.say);
  appendBubble(say, "bot");
  speak(say);
  if (node.options) renderOptions(node.options);
  else clearOptions();
  if (nodeId === CONFIRM_NODE) appendWhatsAppAction();
  // One free-text shape, one placeholder source. The node's optional `capture`
  // says which context field the typed value lands in; it never changes how the
  // field is labelled, so the placeholder is always the translated one.
  if (node.input === "free") {
    inputBar.hidden = false;
    inputBar.querySelector("input").placeholder = flow.ui.inputPlaceholder;
  } else {
    inputBar.hidden = true;
  }
}

function choose(opt) {
  appendBubble(opt.label, "user");
  if (opt.set) Object.assign(state.context, opt.set);
  contextChanged();
  go(opt.next);
}

function submitFreeInput(value) {
  const body = text(value);
  if (!body) return;
  appendBubble(body, "user");
  const node = flow.flow[state.node];
  if (node?.capture) {
    state.context[node.capture] = body;
    contextChanged();
  }
  if (node?.next) go(node.next);
}

function attachVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.hidden = true; return; }
  const rec = new SR();
  rec.lang = getLocale() === "ms" ? "ms-MY" : "en-US";
  rec.onresult = e => {
    const transcript = e.results[0][0].transcript;
    inputBar.querySelector("input").value = transcript;
  };
  micBtn.addEventListener("click", () => rec.start());
}

function buildPanel() {
  const wrap = document.createElement("div");
  wrap.className = "chatbot-panel";
  wrap.hidden = true;
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "false");
  wrap.setAttribute("aria-label", flow.ui.panelTitle);
  wrap.innerHTML = `
    <header class="chatbot-header">
      <div>
        <strong>${flow.ui.panelTitle}</strong>
        <div style="font-size:0.8rem;color:var(--color-ink-muted)">${flow.ui.subtitle}</div>
      </div>
      <div class="chatbot-header-actions">
        <button class="btn btn--icon" data-tts aria-label="${flow.ui.ttsAria}"><span data-icon="speaker"></span></button>
        <button class="btn btn--icon" data-close aria-label="${flow.ui.close}"><span data-icon="x-mark"></span></button>
      </div>
    </header>
    <div class="chatbot-log" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="chatbot-options"></div>
    <form class="chatbot-input" hidden>
      <button type="button" class="btn btn--icon" data-mic aria-label="${flow.ui.micAria}"><span data-icon="microphone"></span></button>
      <input type="text" aria-label="${flow.ui.inputPlaceholder}" placeholder="${flow.ui.inputPlaceholder}">
      <button type="submit" class="btn btn--primary"><span data-icon="send"></span><span class="visually-hidden">${flow.ui.send}</span></button>
    </form>
    <div class="chatbot-footer" hidden>
      <a class="chatbot-wa" data-chatbot-wa target="_blank" rel="noopener"><span data-icon="whatsapp"></span><span class="chatbot-wa-label"></span></a>
    </div>
  `;
  return wrap;
}

function open() {
  panel.hidden = false;
  setTimeout(() => panel.querySelector("button, input")?.focus(), 0);
}
function close() { panel.hidden = true; }

export async function initChatbot() {
  await loadFlow();
  restoreContext();
  panel = buildPanel();
  document.body.append(panel);
  ({ renderIcons } = await import("./icons.js"));
  renderIcons(panel);

  log = panel.querySelector(".chatbot-log");
  optionsBar = panel.querySelector(".chatbot-options");
  inputBar = panel.querySelector(".chatbot-input");
  micBtn = panel.querySelector("[data-mic]");
  ttsBtn = panel.querySelector("[data-tts]");
  waFooter = panel.querySelector(".chatbot-footer");
  waLink = panel.querySelector("[data-chatbot-wa]");
  waLabel = panel.querySelector(".chatbot-wa-label");

  ttsBtn.addEventListener("click", () => {
    ttsBtn.dataset.active = ttsBtn.dataset.active ? "" : "1";
    ttsBtn.setAttribute("aria-pressed", ttsBtn.dataset.active ? "true" : "false");
  });

  panel.querySelector("[data-close]").addEventListener("click", close);
  panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  inputBar.addEventListener("submit", e => {
    e.preventDefault();
    const input = inputBar.querySelector("input");
    submitFreeInput(input.value);
    input.value = "";
  });

  document.querySelectorAll(".chatbot-launcher").forEach(btn => {
    btn.classList.add("is-idle");
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chatbot-launcher").forEach(b => b.classList.remove("is-idle"));
      open();
    });
  });

  attachVoice();
  refreshWhatsApp();
  go("start");

  document.addEventListener("i18n:changed", async () => {
    await loadFlow();
    log.replaceChildren();
    refreshWhatsApp();
    go("start");
  });
}

if (document.readyState !== "loading") initChatbot();
else document.addEventListener("DOMContentLoaded", initChatbot);
