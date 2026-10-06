// ===============================
// KAIRO - COMPACT APP.JS
// ===============================

const $ = id => document.getElementById(id);

const input = $("messageInput");
const send = $("sendButton");
const mic = $("micButton");
const chat = $("chat");
const status = $("status");

const historyBtn = $("historyButton");
const historyPanel = $("historyPanel");
const closeHistory = $("closeHistory");
const historyBack = $("historyBackdrop");
const historySearch = $("historySearch");
const historyList = $("historyList");

const floating = $("floatingKairo");

const voiceMode = $("voiceMode");
const voiceLogo = $("voiceLogo");
const voiceStatus = $("voiceStatus");
const voiceSubtitle = $("voiceSubtitle");
const voiceClose = $("voiceCloseButton");
const voiceTalk = $("voiceTalkButton");
const voiceMin = $("voiceMinimizeButton");
const miniVoice = $("miniVoiceButton");


// ===============================
// HISTORY
// ===============================

const HISTORY_KEY = "kairo_conversations";
let conversations = [];

try {
    conversations = JSON.parse(
        localStorage.getItem(HISTORY_KEY) || "[]"
    );

    if (!Array.isArray(conversations))
        conversations = [];

} catch {
    conversations = [];
}


function saveHistory(user, ai) {

    conversations.push({
        id: Date.now(),
        user,
        assistant: ai,
        time: new Date().toISOString()
    });

    if (conversations.length > 300)
        conversations = conversations.slice(-300);

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(conversations)
    );
}


function contextFor(text) {

    if (!conversations.length)
        return "No previous conversation available.";

    const words = text.toLowerCase()
        .split(/\s+/)
        .filter(x => x.length >= 3);

    return conversations
        .map(x => {

            const old = (
                x.user + " " + x.assistant
            ).toLowerCase();

            let score = 0;

            words.forEach(w => {
                if (old.includes(w)) score++;
            });

            return { x, score };

        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(x =>
            `User: ${x.x.user}\nKAIRO: ${x.x.assistant}`
        )
        .join("\n\n") ||
        "No relevant previous conversation available.";
}


// ===============================
// CHAT
// ===============================

function addMessage(role, text) {

    const welcome = chat.querySelector(".welcome");

    if (welcome) welcome.remove();

    const box = document.createElement("div");

    box.className =
        role === "user"
            ? "message user-message"
            : "message ai-message";

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";
    bubble.textContent = text;

    box.appendChild(bubble);
    chat.appendChild(box);

    chat.scrollTop = chat.scrollHeight;
}


async function askKairo(text, speakReply = false) {

    try {

        status.textContent = "Thinking...";

        if (voiceStatus)
            voiceStatus.textContent = "Thinking...";

        const response = await fetch("/api/api", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: text,
                context: contextFor(text)
            })

        });

        const data = await response.json();

        if (!response.ok)
            throw new Error(data.error || "API error");

        if (!data.reply)
            throw new Error("No reply");

        addMessage("assistant", data.reply);

        saveHistory(text, data.reply);

        status.textContent = "Ready";

        if (voiceStatus)
            voiceStatus.textContent = "KAIRO";

        if (speakReply)
            speak(data.reply);

        return data.reply;

    } catch (error) {

        console.error(error);

        const msg =
            "KAIRO connection-e problem hoyeche. Ektu pore abar try koro.";

        addMessage("assistant", msg);

        status.textContent = "Connection error";

        if (voiceStatus)
            voiceStatus.textContent = "Connection error";

        return null;
    }
}


async function sendMessage() {

    const text = input.value.trim();

    if (!text) return;

    addMessage("user", text);

    input.value = "";
    input.style.height = "auto";

    send.disabled = true;
    mic.disabled = true;

    await askKairo(text, false);

    send.disabled = false;
    mic.disabled = false;

    input.focus();
}


send.onclick = sendMessage;


input.onkeydown = e => {

    if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();
        sendMessage();

    }
};


input.oninput = () => {

    input.style.height = "auto";

    input.style.height =
        Math.min(input.scrollHeight, 140) + "px";
};


// ===============================
// VOICE RECOGNITION
// ===============================

let recognition = null;
let listening = false;
let voiceActive = false;
let speaking = false;


function setupRecognition() {

    const Speech =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!Speech) return false;

    recognition = new Speech();

    recognition.lang = "bn-BD";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        listening = true;

        mic.classList.add("listening");

        if (voiceActive) {

            voiceStatus.textContent = "Listening...";
            voiceSubtitle.textContent =
                "KAIRO is listening";

            voiceLogo.classList.add("listening");
            voiceTalk.classList.add("active");

        } else {

            status.textContent = "Listening...";

        }
    };


    recognition.onresult = async e => {

        const text =
            e.results[0][0].transcript.trim();

        if (!text) return;

        if (voiceActive) {

            voiceStatus.textContent = "Thinking...";
            voiceSubtitle.textContent = text;

            await askKairo(text, true);

        } else {

            input.value = text;
            input.dispatchEvent(new Event("input"));

            setTimeout(sendMessage, 150);
        }
    };


    recognition.onerror = e => {

        console.log("Voice:", e.error);

        listening = false;

        if (voiceActive) {

            voiceStatus.textContent = "Ready";
            voiceSubtitle.textContent =
                "Tap the microphone to talk";

        } else {

            status.textContent = "Ready";

        }
    };


    recognition.onend = () => {

        listening = false;

        mic.classList.remove("listening");
        voiceTalk.classList.remove("active");

        if (voiceActive && !speaking) {

            voiceLogo.classList.remove("listening");

            voiceStatus.textContent = "Ready";
            voiceSubtitle.textContent =
                "Tap the microphone to talk";

        }
    };

    return true;
}


function startListening() {

    if (!recognition && !setupRecognition()) {

        alert("Ei browser-e voice input support nei.");
        return;
    }

    if (listening) {

        recognition.stop();
        return;
    }

    try {
        recognition.start();
    } catch {}
}


mic.onclick = startListening;


// ===============================
// AI VOICE
// ===============================

function speak(text) {

    if (!("speechSynthesis" in window))
        return;

    speechSynthesis.cancel();

    speaking = true;

    voiceStatus.textContent = "Speaking...";
    voiceSubtitle.textContent =
        "KAIRO is replying";

    const u = new SpeechSynthesisUtterance(text);

    u.lang = "bn-BD";
    u.rate = 1;
    u.pitch = 1;

    u.onend = () => {

        speaking = false;

        if (voiceActive) {

            voiceStatus.textContent = "Ready";
            voiceSubtitle.textContent =
                "Your turn";

            setTimeout(startListening, 500);

        }
    };

    u.onerror = () => {

        speaking = false;

        if (voiceActive)
            setTimeout(startListening, 500);
    };

    speechSynthesis.speak(u);
}


// ===============================
// VOICE MODE
// ===============================

function openVoice() {

    voiceActive = true;

    voiceMode.classList.add("open");
    voiceMode.setAttribute("aria-hidden", "false");

    miniVoice.classList.remove("show");

    voiceStatus.textContent = "Ready";
    voiceSubtitle.textContent =
        "Tap the microphone to talk";
}


function closeVoice() {

    voiceActive = false;

    if (recognition && listening)
        recognition.stop();

    speechSynthesis.cancel();

    speaking = false;

    voiceMode.classList.remove("open");
    voiceMode.setAttribute("aria-hidden", "true");

    miniVoice.classList.remove("show");
}


function minimizeVoice() {

    voiceMode.classList.remove("open");
    miniVoice.classList.add("show");
}


function restoreVoice() {

    voiceMode.classList.add("open");
    miniVoice.classList.remove("show");
}


floating.onclick = openVoice;

voiceTalk.onclick = startListening;

voiceClose.onclick = closeVoice;

voiceMin.onclick = minimizeVoice;

miniVoice.onclick = restoreVoice;


// ===============================
// HISTORY UI
// ===============================

function renderHistory(term = "") {

    const q = term.toLowerCase().trim();

    const list = conversations
        .slice()
        .reverse()
        .filter(x =>
            !q ||
            x.user.toLowerCase().includes(q) ||
            x.assistant.toLowerCase().includes(q)
        );

    historyList.innerHTML = "";

    if (!list.length) {

        historyList.innerHTML = `
        <div class="empty-history">
            <div class="empty-icon">◷</div>
            <h3>No conversations yet</h3>
            <p>Your future conversations will appear here.</p>
        </div>`;

        return;
    }

    list.forEach(item => {

        const card = document.createElement("div");

        card.className = "history-item";

        card.innerHTML = `
            <div class="history-user"></div>
            <div class="history-answer"></div>
        `;

        card.querySelector(".history-user")
            .textContent = item.user;

        card.querySelector(".history-answer")
            .textContent = item.assistant;

        card.onclick = () => {

            closeHistory.click();

            addMessage("user", item.user);
            addMessage("assistant", item.assistant);
        };

        historyList.appendChild(card);
    });
}


historyBtn.onclick = () => {

    historyPanel.classList.add("open");
    historyBack.classList.add("show");

    historyPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    renderHistory();
};


closeHistory.onclick =
historyBack.onclick = () => {

    historyPanel.classList.remove("open");
    historyBack.classList.remove("show");

    historyPanel.setAttribute(
        "aria-hidden",
        "true"
    );
};


historySearch.oninput = () =>
    renderHistory(historySearch.value);


// ===============================
// DRAGGABLE FLOATING K
// ===============================

let dragging = false;
let offsetX = 0;
let offsetY = 0;


floating.addEventListener("pointerdown", e => {

    dragging = true;

    const r = floating.getBoundingClientRect();

    offsetX = e.clientX - r.left;
    offsetY = e.clientY - r.top;

    floating.setPointerCapture(e.pointerId);
});


floating.addEventListener("pointermove", e => {

    if (!dragging) return;

    floating.style.left =
        (e.clientX - offsetX) + "px";

    floating.style.top =
        (e.clientY - offsetY) + "px";

    floating.style.right = "auto";
    floating.style.bottom = "auto";
});


floating.addEventListener("pointerup", () => {

    dragging = false;
});


// ===============================
// START
// ===============================

status.textContent = "Ready";

console.log("KAIRO loaded.");
