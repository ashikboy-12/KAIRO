const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const send = document.getElementById("sendButton");
const mic = document.getElementById("micButton");
const historyBtn = document.getElementById("historyButton");
const panel = document.getElementById("historyPanel");
const back = document.getElementById("historyBackdrop");
const list = document.getElementById("historyList");

const KEY = "kairo_history";
let chats = JSON.parse(localStorage.getItem(KEY) || "[]");
let current = null;
let listening = false;

function save() {
  localStorage.setItem(KEY, JSON.stringify(chats));
}

function title(text) {
  text = text.trim();
  if (/anime/i.test(text)) return "Anime";
  if (/trading|trade|forex/i.test(text)) return "Trading";
  if (/study|exam|ssc|math|physics|chemistry/i.test(text)) return "Study";
  if (/game|gaming|free fire|efootball/i.test(text)) return "Gaming";
  if (/code|coding|html|javascript|app/i.test(text)) return "Coding";
  return text.slice(0, 24) || "New Chat";
}

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

function bubble(text, who) {
  const d = document.createElement("div");
  d.className = "message " + who;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  if (!current) newChat();

  if (current.title === "New Chat")
    current.title = title(text);

  current.messages.push({ role: "user", text });
  bubble(text, "user");
  input.value = "";

  const thinking = document.createElement("div");
  thinking.className = "message ai";
  thinking.textContent = "Thinking...";
  chat.appendChild(thinking);

  try {
    const context = chats
      .filter(x => x.id !== current.id)
      .slice(0, 5)
      .map(x => x.title + ": " + x.messages.slice(-2).map(m => m.text).join(" | "))
      .join("\n");

    const r = await fetch("/api/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        context: context
      })
    });

    const data = await r.json();
    thinking.remove();

    const reply = data.reply || "Sorry, I couldn't answer that.";
    current.messages.push({ role: "assistant", text: reply });

    bubble(reply, "ai");
    save();
  } catch (e) {
    thinking.textContent = "Connection problem.";
  }
}

function openHistory() {
  list.innerHTML = "";

  const search = document.createElement("input");
  search.placeholder = "Search chats...";
  search.className = "kairo-history-search";
  list.appendChild(search);

  const newBtn = document.createElement("button");
  newBtn.textContent = "+ New Chat";
  newBtn.className = "kairo-history-new";
  list.appendChild(newBtn);

  const box = document.createElement("div");
  list.appendChild(box);

  function render(q = "") {
    box.innerHTML = "";

    chats
      .filter(c => (c.title + " " + c.messages.map(m => m.text).join(" "))
        .toLowerCase().includes(q.toLowerCase()))
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
    closeHistory();
  };

  render();
  panel.setAttribute("aria-hidden", "false");
  back.setAttribute("aria-hidden", "false");
}

function loadChat(id) {
  current = chats.find(c => c.id === id);
  chat.innerHTML = "";

  if (current) {
    current.messages.forEach(m =>
      bubble(m.text, m.role === "user" ? "user" : "ai")
    );
  }

  closeHistory();
}

function closeHistory() {
  panel.setAttribute("aria-hidden", "true");
  back.setAttribute("aria-hidden", "true");
}

send.onclick = sendMessage;
historyBtn.onclick = openHistory;
back.onclick = closeHistory;

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

mic.onclick = () => {
  if (!("webkitSpeechRecognition" in window)) return;

  if (listening) return;

  const r = new webkitSpeechRecognition();
  r.lang = "bn-BD";
  r.interimResults = false;
  listening = true;

  r.onresult = e => {
    input.value = e.results[0][0].transcript;
    sendMessage();
  };

  r.onend = () => listening = false;
  r.onerror = () => listening = false;

  r.start();
};

if (!current && chats.length) current = chats[0];
