const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const send = document.getElementById("sendButton");
const mic = document.getElementById("micButton");
const historyBtn = document.getElementById("historyButton");
const panel = document.getElementById("historyPanel");
const back = document.getElementById("historyBackdrop");
const list = document.getElementById("historyList");

const HISTORY = "kairo_history";
const MEMORY = "kairo_memory";

let chats = JSON.parse(localStorage.getItem(HISTORY) || "[]");
let memories = JSON.parse(localStorage.getItem(MEMORY) || "[]");
let current = null;
let listening = false;

const save = () => {
  localStorage.setItem(HISTORY, JSON.stringify(chats));
  localStorage.setItem(MEMORY, JSON.stringify(memories));
};

function newChat() {
  current = {
    id: Date.now(),
    title: "New Chat",
    messages: []
  };
  chats.unshift(current);
  save();
  chat.innerHTML = "";
}

function getTitle(text) {
  if (/anime/i.test(text)) return "Anime";
  if (/trading|trade|forex/i.test(text)) return "Trading";
  if (/study|ssc|exam|math|physics|chemistry/i.test(text)) return "Study";
  if (/game|gaming|free fire|efootball/i.test(text)) return "Gaming";
  if (/code|coding|html|javascript|app/i.test(text)) return "Coding";
  return text.slice(0, 24) || "New Chat";
}

function bubble(text, who) {
  const d = document.createElement("div");
  d.className = "message " + who;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

function detectMemory(text) {
  const patterns = [
    /my name is (.+)/i,
    /amar nam (.+)/i,
    /i am (.+)/i,
    /i live in (.+)/i,
    /i like (.+)/i,
    /i love (.+)/i,
    /my favorite (.+)/i,
    /amar favourite (.+)/i,
    /amar favorite (.+)/i
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const memory = text.trim();

      if (!memories.includes(memory)) {
        memories.push(memory);
        save();
      }
      break;
    }
  }
}

function memoryText() {
  return memories.length
    ? memories.map((m, i) => `${i + 1}. ${m}`).join("\n")
    : "No saved memories yet.";
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  if (!current) newChat();

  if (current.title === "New Chat")
    current.title = getTitle(text);

  detectMemory(text);

  current.messages.push({
    role: "user",
    text
  });

  bubble(text, "user");
  input.value = "";

  const thinking = document.createElement("div");
  thinking.className = "message ai";
  thinking.textContent = "Thinking...";
  chat.appendChild(thinking);

  try {
    const oldContext = chats
      .filter(c => c.id !== current.id)
      .slice(0, 5)
      .map(c =>
        c.title + ": " +
        c.messages.slice(-2).map(m => m.text).join(" | ")
      )
      .join("\n");

    const r = await fetch("/api/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        context: oldContext,
        memory: memoryText()
      })
    });

    const data = await r.json();

    thinking.remove();

    const reply =
      data.reply || "Sorry, I couldn't answer that.";

    current.messages.push({
      role: "assistant",
      text: reply
    });

    bubble(reply, "ai");
    save();

  } catch (e) {
    thinking.textContent = "Connection problem.";
  }
}

function closePanel() {
  panel.setAttribute("aria-hidden", "true");
  back.setAttribute("aria-hidden", "true");
}

function openHistory() {
  list.innerHTML = "";

  const search = document.createElement("input");
  search.className = "kairo-history-search";
  search.placeholder = "Search chats...";
  list.appendChild(search);

  const newBtn = document.createElement("button");
  newBtn.className = "kairo-history-new";
  newBtn.textContent = "+ New Chat";
  list.appendChild(newBtn);

  const memoryBtn = document.createElement("button");
  memoryBtn.className = "kairo-history-new";
  memoryBtn.textContent = "🧠 Memory";
  list.appendChild(memoryBtn);

  const box = document.createElement("div");
  list.appendChild(box);

  function render(q = "") {
    box.innerHTML = "";

    chats
      .filter(c =>
        (c.title + " " +
        c.messages.map(m => m.text).join(" "))
        .toLowerCase()
        .includes(q.toLowerCase())
      )
      .forEach(c => {
        const b = document.createElement("button");
        b.className = "kairo-history-card";
        b.textContent = c.title;
        b.onclick = () => loadChat(c.id);
        box.appendChild(b);
      });
  }

  search.oninput = () => render(search.value);

  newBtn.onclick = () => {
    newChat();
    closePanel();
  };

  memoryBtn.onclick = openMemory;

  render();

  panel.setAttribute("aria-hidden", "false");
  back.setAttribute("aria-hidden", "false");
}

function openMemory() {
  list.innerHTML = "";

  const title = document.createElement("div");
  title.className = "history-title";
  title.textContent = "🧠 KAIRO Memory";
  list.appendChild(title);

  const info = document.createElement("div");
  info.className = "history-subtitle";
  info.textContent = "Things KAIRO remembers";
  list.appendChild(info);

  memories.forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "kairo-history-card";

    row.textContent = m;

    row.onclick = () => {
      if (confirm("Delete this memory?")) {
        memories.splice(i, 1);
        save();
        openMemory();
      }
    };

    list.appendChild(row);
  });

  if (!memories.length) {
    const empty = document.createElement("div");
    empty.className = "history-subtitle";
    empty.style.marginTop = "20px";
    empty.textContent = "No memories saved yet.";
    list.appendChild(empty);
  }
}

function loadChat(id) {
  current = chats.find(c => c.id === id);
  chat.innerHTML = "";

  if (current) {
    current.messages.forEach(m =>
      bubble(
        m.text,
        m.role === "user" ? "user" : "ai"
      )
    );
  }

  closePanel();
}

send.onclick = sendMessage;
historyBtn.onclick = openHistory;
back.onclick = closePanel;

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

mic.onclick = () => {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Voice recognition is not supported.");
    return;
  }

  if (listening) return;

  const r = new webkitSpeechRecognition();

  r.lang = "bn-BD";
  r.interimResults = false;
  r.continuous = false;

  listening = true;

  r.onresult = e => {
    input.value = e.results[0][0].transcript;
    sendMessage();
  };

  r.onerror = () => {
    listening = false;
  };

  r.onend = () => {
    listening = false;
  };

  r.start();
};

if (chats.length) {
  current = chats[0];
    }
