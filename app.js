/* =====================================================
   KAIRO - COMPACT AI ENGINE
   Voice + Memory + History + Game Modes
===================================================== */

const $ = id => document.getElementById(id);

const chat = $("chat");
const input = $("messageInput");
const sendBtn = $("sendButton");
const micBtn = $("micButton");

const voiceMode = $("voiceMode");
const voiceStatus = $("voiceStatus");
const voiceSubtitle = $("voiceSubtitle");
const closeVoiceButton = $("closeVoiceButton");

const miniVoiceButton = $("miniVoiceButton");
const floatingKairo = $("floatingKairo");

const historyBackdrop = $("historyBackdrop");
const historyPanel = $("historyPanel");
const historyList = $("historyList");

let voiceOn = false;
let listening = false;
let speaking = false;
let thinking = false;
let requestRunning = false;
let recognition = null;

let gameMode = "NORMAL";

const GAME = {
    NORMAL: "NORMAL",
    LISTEN: "LISTEN_ONLY",
    OBSERVE: "OBSERVE",
    GUIDE: "GUIDE"
};

let history = JSON.parse(
    localStorage.getItem("kairo_history") || "[]"
);

let memory = JSON.parse(
    localStorage.getItem("kairo_memory") || "[]"
);


/* =====================================================
   STORAGE
===================================================== */

function saveData() {
    localStorage.setItem(
        "kairo_history",
        JSON.stringify(history.slice(-100))
    );

    localStorage.setItem(
        "kairo_memory",
        JSON.stringify(memory.slice(-50))
    );
}


/* =====================================================
   TEXT CLEAN
===================================================== */

function cleanText(text) {
    return String(text || "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[•●▪■□◆◇※]/g, " ")
        .replace(/[`*_#~>|]/g, "")
        .replace(/[-_=]{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function cleanSpeech(text) {
    let x = cleanText(text);

    x = x
        .replace(/\bK[- ]?A[- ]?I[- ]?R[- ]?O\b/gi, "কাইরো")
        .replace(/\bAI\b/gi, "এআই")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/[{}[\]<>]/g, " ")
        .replace(/[|\\\/]+/g, " ")
        .replace(/\s+/g, " ");

    return x.trim();
}


/* =====================================================
   LANGUAGE
===================================================== */

function hasBangla(t) {
    return /[\u0980-\u09FF]/.test(t);
}

function detectLanguage(t) {
    if (hasBangla(t)) return "bn";

    if (/[अ-ह]/.test(t)) {
        return "hi";
    }

    return "en";
}


/* =====================================================
   HISTORY
===================================================== */

function addHistory(role, text) {
    history.push({
        role,
        text: String(text),
        time: Date.now()
    });

    history = history.slice(-100);
    saveData();
}


function addMessage(text, role = "assistant") {
    if (!chat) return;

    const box = document.createElement("div");

    box.className =
        role === "user"
            ? "message user-message"
            : "message ai-message";

    box.textContent = text;

    chat.appendChild(box);
    chat.scrollTop = chat.scrollHeight;
}


function showHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    history.slice().reverse().forEach(item => {
        const div = document.createElement("div");

        div.className = "history-item";
        div.textContent = item.text;

        historyList.appendChild(div);
    });

    if (historyBackdrop) {
        historyBackdrop.style.display = "flex";
    }

    if (historyPanel) {
        historyPanel.style.display = "block";
    }
}


function hideHistory() {
    if (historyBackdrop) {
        historyBackdrop.style.display = "none";
    }

    if (historyPanel) {
        historyPanel.style.display = "none";
    }
}


/* =====================================================
   RELEVANT HISTORY
===================================================== */

function getRelevantHistory(message) {
    const words = message
        .toLowerCase()
        .split(/\s+/)
        .filter(x => x.length > 2);

    if (!words.length) {
        return history.slice(-4);
    }

    const scored = history.map(item => {
        const text = item.text.toLowerCase();

        let score = 0;

        words.forEach(word => {
            if (text.includes(word)) score++;
        });

        return {
            ...item,
            score
        };
    });

    return scored
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
}


/* =====================================================
   MEMORY
===================================================== */

function remember(text) {
    if (!text || text.length < 5) return;

    if (!memory.includes(text)) {
        memory.push(text);
        memory = memory.slice(-50);
        saveData();
    }
}


function memoryText() {
    return memory.slice(-20).join("\n");
}


/* =====================================================
   LOCAL COMMANDS
===================================================== */

function localCommand(text) {
    const t = text.toLowerCase().trim();

    if (
        t.includes("চুপ করো") ||
        t.includes("চুপ কর") ||
        t === "stop" ||
        t.includes("be quiet") ||
        t.includes("shut up")
    ) {
        stopSpeaking();
        stopListening();

        voiceOn = false;

        if (voiceStatus) {
            voiceStatus.textContent = "Stopped";
        }

        return true;
    }

    if (
        t.includes("তুমি বলো") ||
        t.includes("আবার বলো") ||
        t.includes("speak") ||
        t.includes("continue")
    ) {
        voiceOn = true;

        stopListening();

        setTimeout(startListening, 250);

        return true;
    }

    if (
        t.includes("listen only") ||
        t.includes("শুধু শোন") ||
        t.includes("শুধু শুন")
    ) {
        gameMode = GAME.LISTEN;
        return true;
    }

    if (
        t.includes("observe game") ||
        t.includes("game observe") ||
        t.includes("গেম observe")
    ) {
        gameMode = GAME.OBSERVE;
        return true;
    }

    if (
        t.includes("guide me") ||
        t.includes("game guide") ||
        t.includes("আমাকে guide কর")
    ) {
        gameMode = GAME.GUIDE;
        return true;
    }

    return false;
}


/* =====================================================
   API
===================================================== */

async function askAI(message, voice = false) {

    if (!message || thinking) return;

    if (localCommand(message)) return;

    thinking = true;
    requestRunning = true;

    stopListening();

    addMessage(message, "user");
    addHistory("user", message);

    const relevant = getRelevantHistory(message);

    const payload = {
        message: message,

        memory: memoryText(),

        history: history
            .slice(-8)
            .map(x => `${x.role}: ${x.text}`)
            .join("\n"),

        relevantHistory: relevant
            .map(x => `${x.role}: ${x.text}`)
            .join("\n"),

        gameMode: gameMode,

        language: detectLanguage(message)
    };

    try {

        const res = await fetch("/api/api", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.reply) {
            throw new Error("API failed");
        }

        const reply = cleanText(data.reply);

        addMessage(reply, "assistant");
        addHistory("assistant", reply);

        remember(message);

        /*
          Text message কখনো automatically speak করবে না।
          শুধু voice=true হলে speak করবে।
        */

        if (voice && voiceOn) {
            speak(reply);
        }

    } catch (err) {

        console.error("KAIRO ERROR:", err);

        const errorText =
            "Sorry, connection problem hocche. Abar try koro.";

        addMessage(errorText, "assistant");
        addHistory("assistant", errorText);

    } finally {

        thinking = false;
        requestRunning = false;

        if (
            voiceOn &&
            !speaking &&
            !listening
        ) {
            setTimeout(startListening, 400);
        }
    }
}


/* =====================================================
   SEND
===================================================== */

function sendMessage() {

    if (!input) return;

    const text = input.value.trim();

    if (!text || thinking) return;

    input.value = "";

    askAI(text, false);
}


if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}


if (input) {
    input.addEventListener("keydown", e => {

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }

    });
}


/* =====================================================
   TEXT TO SPEECH
===================================================== */

function chooseVoice(text) {

    const voices = speechSynthesis.getVoices();

    if (!voices.length) return null;

    if (hasBangla(text)) {

        return (
            voices.find(v =>
                v.lang.toLowerCase().startsWith("bn")
            ) ||
            voices.find(v =>
                v.lang.toLowerCase().includes("bn")
            )
        );
    }

    return (
        voices.find(v =>
            v.lang.toLowerCase().startsWith("en")
        ) || voices[0]
    );
}


function speak(text) {

    if (!voiceOn) return;

    stopSpeaking();

    const clean = cleanSpeech(text);

    if (!clean) return;

    speaking = true;

    if (voiceStatus) {
        voiceStatus.textContent = "KAIRO is speaking...";
    }

    const utterance =
        new SpeechSynthesisUtterance(clean);

    utterance.lang =
        hasBangla(clean) ? "bn-BD" : "en-US";

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = chooseVoice(clean);

    if (voice) {
        utterance.voice = voice;
    }

    utterance.onend = () => {

        speaking = false;

        if (voiceStatus) {
            voiceStatus.textContent =
                "Listening...";
        }

        if (voiceOn && !thinking) {
            setTimeout(startListening, 200);
        }
    };

    utterance.onerror = () => {

        speaking = false;

        if (voiceOn && !thinking) {
            setTimeout(startListening, 300);
        }
    };

    speechSynthesis.speak(utterance);
}


function stopSpeaking() {

    try {
        speechSynthesis.cancel();
    } catch (e) {}

    speaking = false;
}


/* =====================================================
   SPEECH RECOGNITION
===================================================== */

function startListening() {

    if (
        !voiceOn ||
        listening ||
        speaking ||
        thinking
    ) {
        return;
    }

    if (!("webkitSpeechRecognition" in window)) {

        if (voiceStatus) {
            voiceStatus.textContent =
                "Voice recognition not supported";
        }

        return;
    }

    stopListening();

    recognition =
        new webkitSpeechRecognition();

    recognition.lang = "bn-BD";

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    listening = true;

    if (voiceStatus) {
        voiceStatus.textContent = "Listening...";
    }

    recognition.onresult = event => {

        const text =
            event.results[0][0].transcript.trim();

        listening = false;

        if (text) {
            askAI(text, true);
        }
    };

    recognition.onerror = event => {

        console.log(
            "Voice error:",
            event.error
        );

        listening = false;

        if (
            voiceOn &&
            !thinking &&
            !speaking
        ) {
            setTimeout(startListening, 500);
        }
    };

    recognition.onend = () => {

        listening = false;

        if (
            voiceOn &&
            !thinking &&
            !speaking
        ) {
            setTimeout(startListening, 300);
        }
    };

    try {
        recognition.start();
    } catch (e) {
        listening = false;
    }
}


function stopListening() {

    if (recognition) {

        try {
            recognition.stop();
        } catch (e) {}

        recognition = null;
    }

    listening = false;
}


/* =====================================================
   VOICE MODE
===================================================== */

function openVoice() {

    voiceOn = true;

    stopSpeaking();
    stopListening();

    if (voiceMode) {
        voiceMode.style.display = "flex";
    }

    if (miniVoiceButton) {
        miniVoiceButton.style.display = "block";
    }

    setTimeout(startListening, 250);
}


function closeVoiceMode() {

    voiceOn = false;

    stopSpeaking();
    stopListening();

    if (voiceMode) {
        voiceMode.style.display = "none";
    }

    if (miniVoiceButton) {
        miniVoiceButton.style.display = "none";
    }
}


if (micBtn) {
    micBtn.addEventListener("click", openVoice);
}


if (floatingKairo) {
    floatingKairo.addEventListener(
        "click",
        openVoice
    );
}


if (miniVoiceButton) {
    miniVoiceButton.addEventListener(
        "click",
        openVoice
    );
}


if (closeVoiceButton) {
    closeVoiceButton.addEventListener(
        "click",
        closeVoiceMode
    );
}


/* =====================================================
   HISTORY BUTTON
===================================================== */

const historyButton =
    document.getElementById("historyButton");

if (historyButton) {
    historyButton.addEventListener(
        "click",
        showHistory
    );
}


if (historyBackdrop) {
    historyBackdrop.addEventListener(
        "click",
        e => {

            if (e.target === historyBackdrop) {
                hideHistory();
            }

        }
    );
}


/* =====================================================
   FLOATING KAIRO DRAG
===================================================== */

if (floatingKairo) {

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let oldX = 0;
    let oldY = 0;

    floatingKairo.style.touchAction = "none";

    floatingKairo.addEventListener(
        "pointerdown",
        e => {

            dragging = true;
            moved = false;

            startX = e.clientX;
            startY = e.clientY;

            const r =
                floatingKairo.getBoundingClientRect();

            oldX = r.left;
            oldY = r.top;

            floatingKairo.setPointerCapture(e.pointerId);
        }
    );

    floatingKairo.addEventListener(
        "pointermove",
        e => {

            if (!dragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (
                Math.abs(dx) > 6 ||
                Math.abs(dy) > 6
            ) {
                moved = true;
            }

            floatingKairo.style.left =
                Math.max(
                    0,
                    oldX + dx
                ) + "px";

            floatingKairo.style.top =
                Math.max(
                    0,
                    oldY + dy
                ) + "px";

            floatingKairo.style.right = "auto";
            floatingKairo.style.bottom = "auto";
        }
    );

    floatingKairo.addEventListener(
        "pointerup",
        e => {

            dragging = false;

            if (moved) {
                e.preventDefault();
            }
        }
    );
}


/* =====================================================
   GAME MODE API
===================================================== */

window.KAIRO = {

    openVoice,

    closeVoice: closeVoiceMode,

    speak,

    stopSpeaking,

    startListening,

    stopListening,

    getGameMode: () => gameMode,

    setGameMode: mode => {

        if (
            Object.values(GAME).includes(mode)
        ) {
            gameMode = mode;
            return true;
        }

        return false;
    },

    remember,

    getMemory: () => [...memory],

    getHistory: () => [...history]

};


/* =====================================================
   START
===================================================== */

speechSynthesis.onvoiceschanged = () => {};

console.log("KAIRO ready.");
