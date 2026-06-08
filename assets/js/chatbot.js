import { getLocale } from "/assets/js/i18n.js";
import { isAllowed } from "/assets/js/consent.js";

const TRANSCRIPT_KEY = "urbane-ethos:chatbot-transcript";
let panel, log, optionsBar, inputBar, micBtn, ttsBtn;
let flow = null;
let state = { node: "start", context: {} };

async function loadFlow() {
  const locale = getLocale();
  const res = await fetch(`/content/${locale}/chatbot.json`);
  flow = await res.json();
}

function readTranscript() {
  if (!isAllowed("chatbot")) return [];
  try { return JSON.parse(sessionStorage.getItem("session-chat") || "[]"); }
  catch { return []; }
}

function persistTurn(turn) {
  if (isAllowed("chatbot")) {
    const all = JSON.parse(localStorage.getItem(TRANSCRIPT_KEY) || "[]");
    all.push(turn);
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(all));
  }
  const session = readTranscript();
  session.push(turn);
  sessionStorage.setItem("session-chat", JSON.stringify(session));
}

function appendBubble(text, role) {
  const div = document.createElement("div");
  div.className = `chat-bubble chat-bubble--${role}`;
  div.textContent = text;
  log.append(div);
  log.scrollTop = log.scrollHeight;
  persistTurn({ role, text, ts: Date.now() });
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

function speak(text) {
  if (!ttsBtn.dataset.active) return;
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = getLocale() === "ms" ? "ms-MY" : "en-US";
  window.speechSynthesis.speak(u);
}

function go(nodeId) {
  const node = flow.flow[nodeId];
  if (!node) { appendBubble(`(missing node: ${nodeId})`, "bot"); return; }
  state.node = nodeId;
  appendBubble(node.say, "bot");
  speak(node.say);
  if (node.options) renderOptions(node.options);
  else clearOptions();
  if (node.input === "free" || node.input === "name+phone") {
    inputBar.hidden = false;
    inputBar.querySelector("input").placeholder = node.input === "name+phone"
      ? "Your name and phone number"
      : flow.ui.inputPlaceholder;
  } else {
    inputBar.hidden = true;
  }
}

function choose(opt) {
  appendBubble(opt.label, "user");
  if (opt.set) Object.assign(state.context, opt.set);
  go(opt.next);
}

function submitFreeInput(text) {
  if (!text.trim()) return;
  appendBubble(text, "user");
  const node = flow.flow[state.node];
  if (node?.next) go(node.next);
}

function attachVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.hidden = true; return; }
  const rec = new SR();
  rec.lang = getLocale() === "ms" ? "ms-MY" : "en-US";
  rec.onresult = e => {
    const t = e.results[0][0].transcript;
    inputBar.querySelector("input").value = t;
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
      <div>
        <button class="btn btn--ghost" data-tts aria-label="${flow.ui.ttsAria}">🔊</button>
        <button class="btn btn--ghost" data-close aria-label="${flow.ui.close}">✕</button>
      </div>
    </header>
    <div class="chatbot-log" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="chatbot-options"></div>
    <form class="chatbot-input" hidden>
      <button type="button" class="btn btn--ghost" data-mic aria-label="${flow.ui.micAria}">🎤</button>
      <input type="text" aria-label="${flow.ui.inputPlaceholder}" placeholder="${flow.ui.inputPlaceholder}">
      <button type="submit" class="btn btn--primary">${flow.ui.send}</button>
    </form>
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
  panel = buildPanel();
  document.body.append(panel);

  log = panel.querySelector(".chatbot-log");
  optionsBar = panel.querySelector(".chatbot-options");
  inputBar = panel.querySelector(".chatbot-input");
  micBtn = panel.querySelector("[data-mic]");
  ttsBtn = panel.querySelector("[data-tts]");

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
  go("start");

  document.addEventListener("i18n:changed", async () => {
    await loadFlow();
    log.replaceChildren();
    go("start");
  });
}

if (document.readyState !== "loading") initChatbot();
else document.addEventListener("DOMContentLoaded", initChatbot);
