const $ = id => document.getElementById(id);

const input = $("messageInput");
const send = $("sendButton");
const chat = $("chat");
const status = $("status");

const voiceMode = $("voiceMode");
const voiceStatus = $("voiceStatus");
const voiceSubtitle = $("voiceSubtitle");
const voiceClose = $("voiceCloseButton");
const voiceMin = $("voiceMinimizeButton");

const floating = $("floatingKairo");
const miniVoice = $("miniVoiceButton");

const historyPanel = $("historyPanel");
const historyButton = $("historyButton");
const closeHistory = $("closeHistory");
const historyBack = $("historyBackdrop");
const historyList = $("historyList");
const historySearch = $("historySearch");

let busy = false;
let voiceOn = false;
let recognition = null;
let speaking = false;
let histories = [];

function message(type, text) {
    const box = document.createElement("div");
    box.className = "message " + (type === "user" ? "user-message" : "ai-message");

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    box.appendChild(bubble);
    chat.appendChild(box);
    chat.scrollTop = chat.scrollHeight;
}

function saveHistory(user, ai) {
    histories.unshift({
        user,
        ai,
        time: new Date().toLocaleString()
    });
    renderHistory();
}

function renderHistory(search = "") {
    if (!historyList) return;

    historyList.innerHTML = "";

    const q = search.toLowerCase();

    const items = histories.filter(x =>
        x.user.toLowerCase().includes(q) ||
        x.ai.toLowerCase().includes(q)
    );

    if (!items.length) {
        historyList.innerHTML =
            "<div class='empty-history'>" +
            "<div class='empty-icon'>◷</div>" +
            "<h3>No conversations yet</h3>" +
            "<p>Your future conversations will appear here.</p>" +
            "</div>";
        return;
    }

    items.forEach(x => {
        const item = document.createElement("div");
        item.className = "history-item";

        item.innerHTML =
            "<div class='history-user'>" +
            clean(x.user) +
            "</div>" +
            "<div class='history-ai'>" +
            clean(x.ai) +
            "</div>" +
            "<div class='history-time'>" +
            clean(x.time) +
            "</div>";

        historyList.appendChild(item);
    });
}

function clean(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
}

function openHistory() {
    historyPanel.classList.add("open");
    historyBack.classList.add("open");
    historyPanel.setAttribute("aria-hidden", "false");
    renderHistory();
}

function closeHistoryPanel() {
    historyPanel.classList.remove("open");
    historyBack.classList.remove("open");
    historyPanel.setAttribute("aria-hidden", "true");
}

historyButton?.addEventListener("click", openHistory);
closeHistory?.addEventListener("click", closeHistoryPanel);
historyBack?.addEventListener("click", closeHistoryPanel);

historySearch?.addEventListener("input", () => {
    renderHistory(historySearch.value);
});

async function askKairo(text) {
    status.textContent = "Thinking...";

    try {
        const res = await fetch("/api/api", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                context: "",
                mode: "chat"
            })
        });

        const data = await res.json();

        if (!res.ok || !data.reply) {
            throw new Error(data.error || "AI request failed.");
        }

        message("assistant", data.reply);
        saveHistory(text, data.reply);

        status.textContent = "Ready";

        return data.reply;

    } catch (err) {
        status.textContent = "Error";
        message("assistant", "KAIRO: " + err.message);
        return null;
    }
}

async function sendMessage() {
    if (busy) return;

    const text = input.value.trim();
    if (!text) return;

    busy = true;
    send.disabled = true;

    message("user", text);
    input.value = "";

    await askKairo(text);

    busy = false;
    send.disabled = false;
    input.focus();
}

send?.addEventListener("click", sendMessage);

input?.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});


/* =========================
   VOICE MODE
========================= */

function setVoice(text, sub) {
    if (voiceStatus) voiceStatus.textContent = text;
    if (voiceSubtitle) voiceSubtitle.textContent = sub;
}

function openVoice() {
    voiceOn = true;

    voiceMode.classList.add("active");
    voiceMode.setAttribute("aria-hidden", "false");

    setVoice("Listening...", "I'm listening");

    startListening();
}

function closeVoice() {
    voiceOn = false;

    stopListening();
    stopSpeaking();

    voiceMode.classList.remove("active");
    voiceMode.setAttribute("aria-hidden", "true");

    setVoice("Ready", "Talk to KAIRO");
}

voiceClose?.addEventListener("click", closeVoice);
voiceMin?.addEventListener("click", closeVoice);
miniVoice?.addEventListener("click", openVoice);

floating?.addEventListener("click", () => {
    if (!floating.dataset.moved) openVoice();
});


/* =========================
   SPEECH RECOGNITION
========================= */

const Speech =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

function startListening() {
    if (!voiceOn) return;

    if (!Speech) {
        setVoice(
            "Voice unavailable",
            "This browser does not support voice recognition"
        );
        return;
    }

    if (recognition) return;

    recognition = new Speech();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        setVoice("Listening...", "I'm listening");
    };

    recognition.onresult = async e => {
        const text =
            e.results[0][0].transcript.trim();

        if (!text || !voiceOn) return;

        setVoice("Thinking...", text);

        message("user", text);

        const reply = await askKairo(text);

        if (reply && voiceOn) {
            await speak(reply);
        }

        recognition = null;

        if (voiceOn) {
            setTimeout(startListening, 500);
        }
    };

    recognition.onerror = e => {
        console.log("Voice error:", e.error);

        recognition = null;

        if (voiceOn && e.error !== "not-allowed") {
            setTimeout(startListening, 800);
        }
    };

    recognition.onend = () => {
        recognition = null;

        if (voiceOn && !speaking) {
            setTimeout(startListening, 500);
        }
    };

    try {
        recognition.start();
    } catch (e) {
        recognition = null;
    }
}

function stopListening() {
    if (!recognition) return;

    try {
        recognition.stop();
    } catch (e) {}

    recognition = null;
}


/* =========================
   TEMPORARY VOICE OUTPUT
========================= */

function stopSpeaking() {
    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }

    speaking = false;
}

function speak(text) {
    return new Promise(resolve => {

        if (!voiceOn || !("speechSynthesis" in window)) {
            resolve();
            return;
        }

        stopSpeaking();

        const cleanText =
            text.replace(/[*#_`]/g, "").trim();

        if (!cleanText) {
            resolve();
            return;
        }

        const u =
            new SpeechSynthesisUtterance(cleanText);

        u.lang = "en-US";
        u.rate = 0.95;
        u.pitch = 1;
        u.volume = 1;

        u.onstart = () => {
            speaking = true;
            setVoice("Speaking...", "KAIRO is talking");
        };

        u.onend = () => {
            speaking = false;
            resolve();
        };

        u.onerror = () => {
            speaking = false;
            resolve();
        };

        speechSynthesis.speak(u);
    });
}


/* =========================
   FLOATING BUTTON DRAG
========================= */

let drag = false;
let moved = false;
let sx = 0;
let sy = 0;
let bx = 0;
let by = 0;

floating?.addEventListener("pointerdown", e => {
    drag = true;
    moved = false;

    sx = e.clientX;
    sy = e.clientY;

    const r = floating.getBoundingClientRect();

    bx = r.left;
    by = r.top;

    floating.setPointerCapture(e.pointerId);
});

floating?.addEventListener("pointermove", e => {
    if (!drag) return;

    const dx = e.clientX - sx;
    const dy = e.clientY - sy;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        moved = true;
        floating.dataset.moved = "true";
    }

    if (!moved) return;

    const maxX =
        window.innerWidth - floating.offsetWidth - 5;

    const maxY =
        window.innerHeight - floating.offsetHeight - 5;

    const x =
        Math.max(5, Math.min(bx + dx, maxX));

    const y =
        Math.max(5, Math.min(by + dy, maxY));

    floating.style.left = x + "px";
    floating.style.top = y + "px";
    floating.style.right = "auto";
    floating.style.bottom = "auto";
});

floating?.addEventListener("pointerup", e => {
    drag = false;

    if (!moved) {
        floating.dataset.moved = "";
        openVoice();
    }

    try {
        floating.releasePointerCapture(e.pointerId);
    } catch (x) {}
});


/* =========================
   START
========================= */

renderHistory();
status.textContent = "Ready";

console.log("KAIRO READY");
