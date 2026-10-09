const $ = id => document.getElementById(id);

const chat = $("chat");
const input = $("messageInput");
const send = $("sendButton");
const mic = $("micButton");

const voice = $("voiceMode");
const status = $("voiceStatus");
const sub = $("voiceSubtitle");
const closeV = $("closeVoiceButton");

const mini = $("miniVoiceButton");
const floating = $("floatingKairo");

const newBtn = $("newChatButton");
const memBtn = $("memoryButton");
const hisBtn = $("historyButton");

const hp = $("historyPanel");
const hb = $("historyBackdrop");
const hl = $("historyList");
const hc = $("closeHistoryButton");
const hs = $("historySearch");

const mp = $("memoryPanel");
const mb = $("memoryBackdrop");
const ml = $("memoryList");
const mc = $("closeMemoryButton");
const clearM = $("clearMemoryButton");

let busy = false;
let voiceMode = false;
let listening = false;
let speaking = false;
let recognition = null;
let restartTimer = null;

let sessions = [];
let memory = [];
let current = "";

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

sessions = readStore("kairoSessions", []);
memory = readStore("kairoMemory", []);
current = localStorage.getItem("kairoCurrentSession") || "";

const uid = () =>
  Date.now().toString(36) +
  Math.random().toString(36).slice(2, 7);


/* SAVE */

function save() {
  localStorage.kairoSessions =
    JSON.stringify(sessions.slice(-100));

  localStorage.kairoMemory =
    JSON.stringify(memory.slice(-100));

  localStorage.kairoCurrentSession = current;
}


/* SESSION */

function newSession() {
  const s = {
    id: uid(),
    title: "New conversation",
    time: Date.now(),
    messages: []
  };

  sessions.push(s);
  current = s.id;
  save();

  return s;
}

function session() {
  return sessions.find(x => x.id === current);
}

function ensure() {
  return session() || newSession();
}


/* CLEAN AI TEXT */

function clean(t) {
  return String(t || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/[⭐🌟]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}


/* ADD MESSAGE */

function add(text, user = true, store = true) {
  text = String(text || "").trim();
  if (!text || !chat) return;

  const d = document.createElement("div");

  d.className = user
    ? "message user-message"
    : "message ai-message";

  d.textContent = user ? text : clean(text);

  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;

  if (store) {
    const s = ensure();

    s.messages.push({
      role: user ? "user" : "assistant",
      text,
      time: Date.now()
    });

    if (user && s.title === "New conversation") {
      s.title = text.slice(0, 42);
    }

    s.time = Date.now();
    save();
  }
}


/* RENDER CHAT */

function renderChat() {
  if (!chat) return;

  chat.innerHTML = "";

  const s = session();

  if (!s || !s.messages.length) {
    chat.innerHTML = `
      <div class="welcome">
        <div class="welcome-logo">
          <div class="welcome-core"></div>
        </div>
        <h1>Hello, I'm KAIRO</h1>
        <p>Your AI companion for conversation, answers and ideas.</p>
      </div>`;
    return;
  }

  s.messages.forEach(x => {
    add(x.text, x.role === "user", false);
  });

  chat.scrollTop = chat.scrollHeight;
}


/* MEMORY */

function addMemory(text) {
  text = String(text || "").trim();
  if (!text) return;

  if (memory.some(x => x.text.toLowerCase() === text.toLowerCase())) {
    return;
  }

  memory.push({
    id: uid(),
    text,
    time: Date.now()
  });

  save();
  renderMemory();
}

function autoMemory(text) {
  const t = String(text || "").trim();
  let value = "";

  const name = t.match(
    /(?:আমার নাম|my name is|mera naam)\s+(.+)/i
  );

  if (name) {
    value = "User's name is " + name[1].trim();
  }

  const game = t.match(
    /(?:আমার|amar|my)\s+(?:favorite|favourite|প্রিয়|পছন্দের)\s+(?:game|গেম)\s*(?:হলো|হল|is|hoilo|hocche)?\s*(.+)/i
  );

  if (game) {
    value = "User's favorite game is " + game[1].trim();
  }

  if (/মনে রাখ|মনে রাখবে|মনে রেখো|remember|save this/i.test(t)) {
    value = t.replace(
      /^(kairo[,\s]*)?(মনে রাখবে?|মনে রাখ|মনে রেখো|remember|save this)\s*[:,-]?\s*/i,
      ""
    ).trim();
  }

  if (value) addMemory(value);
}

function renderMemory() {
  if (!ml) return;

  ml.innerHTML = "";

  if (!memory.length) {
    ml.innerHTML =
      `<div class="memory-item">No saved Memory yet.</div>`;
    return;
  }

  memory.slice().reverse().forEach(x => {
    const d = document.createElement("div");
    d.className = "memory-item";

    const s = document.createElement("span");
    s.textContent = x.text;

    const b = document.createElement("button");
    b.className = "memory-delete";
    b.type = "button";
    b.textContent = "×";

    b.onclick = () => {
      memory = memory.filter(m => m.id !== x.id);
      save();
      renderMemory();
    };

    d.append(s, b);
    ml.appendChild(d);
  });
}


/* RELATED HISTORY */

function related(text) {
  const words = String(text)
    .toLowerCase()
    .split(/\s+/)
    .filter(x => x.length > 2);

  return sessions
    .flatMap(s => s.messages || [])
    .filter(m =>
      words.some(w => m.text.toLowerCase().includes(w))
    )
    .slice(-12);
}


/* AI — TEXT ONLY */

async function ask(text, speak = false) {
  text = String(text || "").trim();
  if (!text || busy) return;

  busy = true;

  if (send) send.disabled = true;

  autoMemory(text);

  if (voiceMode) abortListen();

  add(text, true);

  try {
    const r = await fetch("/api/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        memory,
        history: ensure().messages.slice(-12),
        relevantHistory: related(text),
        gameMode: "normal"
      })
    });

    if (!r.ok) throw new Error("API request failed");

    const data = await r.json();

    const reply = clean(
      data.reply || "আমি এখন উত্তর দিতে পারছি না।"
    );

    add(reply, false);

    if (speak && voiceMode) {
      speakText(reply);
    }

  } catch (e) {
    console.error("KAIRO CHAT ERROR:", e);

    add("Connection problem. আবার চেষ্টা করো।", false);

  } finally {
    busy = false;

    if (send) send.disabled = false;

    if (voiceMode && !speaking) {
      restartListening(300);
    }
  }
}


/* SEND */

send?.addEventListener("click", () => {
  const t = input.value.trim();
  if (!t) return;

  input.value = "";
  ask(t, false);
});

input?.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send?.click();
  }
});


/* VOICE INPUT */

const SR =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

const stopWords = t => [
  "থামো",
  "থাম",
  "চুপ",
  "চুপ কর",
  "বন্ধ কর",
  "stop",
  "stop talking",
  "be quiet",
  "shut up"
].some(x => t === x || t.includes(x));

function stopSpeaking() {
  try {
    speechSynthesis.cancel();
  } catch (e) {}

  speaking = false;

  if (status) status.textContent = "Listening...";

  restartListening(150);
}

function abortListen() {
  if (!recognition) return;

  try {
    recognition.abort();
  } catch (e) {}

  listening = false;
  mic?.classList.remove("listening");
}

function startListening() {
  if (!recognition || !voiceMode || busy || listening) return;

  try {
    recognition.start();
  } catch (e) {}
}

function restartListening(delay = 350) {
  clearTimeout(restartTimer);

  restartTimer = setTimeout(() => {
    if (voiceMode && !busy && !listening) {
      startListening();
    }
  }, delay);
}

if (SR) {
  recognition = new SR();
  recognition.lang = "bn-BD";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    listening = true;
    mic?.classList.add("listening");

    if (status) status.textContent = "Listening...";
  };

  recognition.onresult = e => {
    const t =
      e.results?.[0]?.[0]?.transcript?.trim() || "";

    listening = false;
    mic?.classList.remove("listening");

    if (!t) {
      restartListening();
      return;
    }

    if (stopWords(t)) {
      stopSpeaking();
      return;
    }

    if (voiceMode) {
      ask(t, true);
    } else if (input) {
      input.value = t;
      input.focus();
    }
  };

  recognition.onend = () => {
    listening = false;
    mic?.classList.remove("listening");

    if (voiceMode && !busy && !speaking) {
      restartListening(350);
    }
  };

  recognition.onerror = () => {
    listening = false;
    mic?.classList.remove("listening");

    if (voiceMode) restartListening(700);
  };
}


/* SPEECH OUTPUT */

function speakText(text) {
  if (!voiceMode || !window.speechSynthesis) return;

  speaking = true;
  abortListen();

  try {
    speechSynthesis.cancel();
  } catch (e) {}

  const u = new SpeechSynthesisUtterance(clean(text));

  u.lang =
    /[\u0980-\u09FF]/.test(text)
      ? "bn-BD"
      : /[\u0900-\u097F]/.test(text)
      ? "hi-IN"
      : "en-US";

  u.rate = 0.88;
  u.pitch = 1;

  u.onstart = () => {
    if (status) status.textContent = "Speaking...";
  };

  u.onend = () => {
    speaking = false;

    if (status) status.textContent = "Listening...";

    restartListening(250);
  };

  u.onerror = () => {
    speaking = false;

    if (status) status.textContent = "Listening...";

    restartListening(400);
  };

  speechSynthesis.speak(u);
}


/* VOICE MODE */

function openVoice() {
  clearTimeout(restartTimer);

  try {
    speechSynthesis.cancel();
  } catch (e) {}

  abortListen();
  speaking = false;
  voiceMode = true;

  voice?.setAttribute("aria-hidden", "false");
  document.body.classList.add("kairo-voice-active");

  if (status) status.textContent = "Listening...";
  if (sub) sub.textContent = "Talk to KAIRO";

  restartListening(500);
}

function closeVoice() {
  voiceMode = false;
  speaking = false;

  clearTimeout(restartTimer);

  try {
    speechSynthesis.cancel();
  } catch (e) {}

  abortListen();

  voice?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("kairo-voice-active");

  if (status) status.textContent = "Ready";
}

mini?.addEventListener("click", openVoice);
floating?.addEventListener("click", openVoice);
closeV?.addEventListener("click", closeVoice);

mic?.addEventListener("click", () => {
  if (voiceMode) return;

  if (listening) {
    abortListen();
  } else {
    try {
      recognition?.start();
    } catch (e) {}
  }
});


/* NEW CHAT */

newBtn?.addEventListener("click", () => {
  newSession();
  renderChat();

  if (input) {
    input.value = "";
    input.focus();
  }
});


/* HISTORY */

function renderHistory(q = "") {
  if (!hl) return;

  hl.innerHTML = "";
  q = q.toLowerCase();

  const list = sessions.slice().reverse().filter(s =>
    !q ||
    s.title.toLowerCase().includes(q) ||
    s.messages.some(m => m.text.toLowerCase().includes(q))
  );

  if (!list.length) {
    hl.innerHTML =
      `<div class="history-item">No conversations found.</div>`;
    return;
  }

  list.forEach(s => {
    const d = document.createElement("div");

    d.className = "history-item";
    d.textContent = `${s.title} · ${s.messages.length} messages`;

    d.onclick = () => {
      current = s.id;
      save();
      renderChat();
      closeHistory();
    };

    hl.appendChild(d);
  });
}

function openHistory() {
  renderHistory(hs?.value || "");

  hp?.setAttribute("aria-hidden", "false");
  hb?.setAttribute("aria-hidden", "false");
}

function closeHistory() {
  hp?.setAttribute("aria-hidden", "true");
  hb?.setAttribute("aria-hidden", "true");
}

hisBtn?.addEventListener("click", openHistory);
hc?.addEventListener("click", closeHistory);
hb?.addEventListener("click", closeHistory);

hs?.addEventListener("input", () => {
  renderHistory(hs.value);
});


/* MEMORY PANEL */

function openMemory() {
  renderMemory();

  mp?.setAttribute("aria-hidden", "false");
  mb?.setAttribute("aria-hidden", "false");
}

function closeMemory() {
  mp?.setAttribute("aria-hidden", "true");
  mb?.setAttribute("aria-hidden", "true");
}

memBtn?.addEventListener("click", openMemory);
mc?.addEventListener("click", closeMemory);
mb?.addEventListener("click", closeMemory);

clearM?.addEventListener("click", () => {
  memory = [];
  save();
  renderMemory();
});


/* DRAGGABLE IN-PAGE BUBBLES */

function dragBubble(el, key) {
  if (!el) return;

  let down = false;
  let moved = false;
  let dx = 0;
  let dy = 0;

  try {
    const p = JSON.parse(localStorage[key] || "null");

    if (p) {
      el.style.position = "fixed";
      el.style.left = p.x + "px";
      el.style.top = p.y + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
  } catch (e) {}

  el.addEventListener("pointerdown", e => {
    down = true;
    moved = false;

    const r = el.getBoundingClientRect();

    dx = e.clientX - r.left;
    dy = e.clientY - r.top;

    el.setPointerCapture?.(e.pointerId);
  });

  el.addEventListener("pointermove", e => {
    if (!down) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;

    const x = Math.max(4, Math.min(innerWidth - w - 4, e.clientX - dx));
    const y = Math.max(4, Math.min(innerHeight - h - 4, e.clientY - dy));

    const r = el.getBoundingClientRect();

    if (Math.abs(x - r.left) > 3 || Math.abs(y - r.top) > 3) {
      moved = true;
    }

    el.style.position = "fixed";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
  });

  el.addEventListener("pointerup", () => {
    const r = el.getBoundingClientRect();

    if (down) {
      localStorage[key] = JSON.stringify({
        x: r.left,
        y: r.top
      });
    }

    down = false;
  });

  el.addEventListener("click", e => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);
}

dragBubble(mini, "kairoBubblePosition");
dragBubble(floating, "kairoFloatingPosition");


/* UI POSITION */

const fix = document.createElement("style");

fix.textContent = `
.input-area {
  bottom: 45px !important;
}
.chat {
  padding-bottom: 130px !important;
}
.mini-voice-button,
.floating-kairo {
  touch-action: none;
}
`;

document.head.appendChild(fix);


/* START */

if (!current || !session()) {
  newSession();
}

renderChat();
renderMemory();

if (!localStorage.kairoGreeted) {
  localStorage.kairoGreeted = "true";

  setTimeout(() => {
    add("আসসালামু আলাইকুম! আমি KAIRO। কেমন আছো?", false);
  }, 500);
}


/* PUBLIC API */

window.KAIRO = {
  ask,
  openVoice,
  closeVoice,
  newChat: () => newBtn?.click(),
  addMemory: text => addMemory(text)
};
