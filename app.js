/* =====================================================
   KAIRO AI — STABLE COMPACT APP
===================================================== */

const $ = id => document.getElementById(id);

const chat = $("chat");
const input = $("messageInput");
const send = $("sendButton");
const mic = $("micButton");

const voiceMode = $("voiceMode");
const voiceStatus = $("voiceStatus");
const voiceSubtitle = $("voiceSubtitle");
const closeVoice = $("closeVoiceButton");

const floating = $("floatingKairo");
const mini = $("miniVoiceButton");

const historyBtn = $("historyButton");
const historyPanel = $("historyPanel");
const historyBack = $("historyBackdrop");
const historyList = $("historyList");

let history = JSON.parse(
    localStorage.getItem("kairo_history") || "[]"
);

let memory = JSON.parse(
    localStorage.getItem("kairo_memory") || "[]"
);

let voiceOn = false;
let listening = false;
let speaking = false;
let thinking = false;
let recognition = null;

let gameMode = "NORMAL";

const GAME = {
    NORMAL: "NORMAL",
    LISTEN_ONLY: "LISTEN_ONLY",
    OBSERVE: "OBSERVE",
    GUIDE: "GUIDE"
};


/* ================= STORAGE ================= */

function save() {
    localStorage.setItem(
        "kairo_history",
        JSON.stringify(history.slice(-100))
    );

    localStorage.setItem(
        "kairo_memory",
        JSON.stringify(memory.slice(-50))
    );
}


/* ================= CHAT ================= */

function addBubble(text, type) {
    if (!chat) return;

    const welcome = chat.querySelector(".welcome");
    if (welcome) welcome.remove();

    const bubble = document.createElement("div");

    bubble.className =
        type === "user"
            ? "message user-message"
            : "message ai-message";

    bubble.textContent = text;

    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
}


function saveHistory(role, text) {
    history.push({
        role: role,
        text: text,
        time: Date.now()
    });

    history = history.slice(-100);
    save();
}


/* ================= HISTORY ================= */

function renderHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    if (!history.length) {
        historyList.innerHTML =
            "<div class='history-item'>No conversation yet.</div>";
        return;
    }

    history.slice().reverse().forEach(item => {
        const div = document.createElement("div");

        div.className = "history-item";
        div.textContent = item.text;

        historyList.appendChild(div);
    });
}


function toggleHistory() {
    const open =
        historyPanel &&
        historyPanel.style.display !== "block";

    if (open) {
        renderHistory();

        historyPanel.style.display = "block";
        historyBack.style.display = "block";

        historyPanel.setAttribute(
            "aria-hidden",
            "false"
        );

    } else {
        closeHistory();
    }
}


function closeHistory() {
    if (historyPanel)
        historyPanel.style.display = "none";

    if (historyBack)
        historyBack.style.display = "none";

    if (historyPanel)
        historyPanel.setAttribute(
            "aria-hidden",
            "true"
        );
}


historyBtn?.addEventListener(
    "click",
    toggleHistory
);

historyBack?.addEventListener(
    "click",
    closeHistory
);


/* ================= TEXT CLEAN ================= */

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


function speechText(text) {
    return cleanText(text)
        .replace(/\bK[- ]?A[- ]?I[- ]?R[- ]?O\b/gi, "কাইরো")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/[{}[\]<>]/g, " ")
        .replace(/[|\\\/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/* ================= LANGUAGE ================= */

function isBangla(text) {
    return /[\u0980-\u09FF]/.test(text);
}


function language(text) {
    if (isBangla(text)) return "bn";

    if (/[अ-ह]/.test(text)) return "hi";

    return "en";
}


/* ================= MEMORY ================= */

function remember(text) {
    if (!text || text.length < 6) return;

    if (!memory.includes(text)) {
        memory.push(text);
        memory = memory.slice(-50);
        save();
    }
}


function relevantHistory(text) {
    const words = text
        .toLowerCase()
        .split(/\s+/)
        .filter(x => x.length > 2);

    return history
        .map(item => {
            let score = 0;

            words.forEach(word => {
                if (
                    item.text
                        .toLowerCase()
                        .includes(word)
                ) score++;
            });

            return {
                ...item,
                score
            };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
}


/* ================= LOCAL COMMANDS ================= */

function command(text) {
    const t = text.toLowerCase().trim();

    /* STOP */

    if (
        t.includes("চুপ করো") ||
        t.includes("চুপ কর") ||
        t === "stop" ||
        t.includes("be quiet")
    ) {
        voiceOn = false;

        stopSpeaking();
        stopListening();

        voiceStatus.textContent = "Stopped";
        voiceSubtitle.textContent =
            "Say 'তুমি বলো' to continue";

        return true;
    }


    /* RESUME */

    if (
        t.includes("তুমি বলো") ||
        t.includes("আবার বলো") ||
        t === "speak" ||
        t === "continue"
    ) {
        voiceOn = true;

        voiceStatus.textContent =
            "Listening...";

        stopListening();

        setTimeout(
            startListening,
            300
        );

        return true;
    }


    /* GAME MODES */

    if (
        t.includes("listen only") ||
        t.includes("শুধু শোন") ||
        t.includes("শুধু শুন")
    ) {
        gameMode = GAME.LISTEN_ONLY;
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
        t.includes("গাইড কর")
    ) {
        gameMode = GAME.GUIDE;
        return true;
    }

    return false;
}


/* ================= AI ================= */

async function askAI(text, fromVoice = false) {

    if (!text || thinking) return;

    if (command(text)) return;

    thinking = true;

    stopListening();

    addBubble(text, "user");
    saveHistory("user", text);

    const relevant = relevantHistory(text);

    const body = {
        message: text,

        memory: memory
            .slice(-20)
            .join("\n"),

        history: history
            .slice(-8)
            .map(x =>
                `${x.role}: ${x.text}`
            )
            .join("\n"),

        relevantHistory: relevant
            .map(x =>
                `${x.role}: ${x.text}`
            )
            .join("\n"),

        gameMode: gameMode,

        language: language(text)
    };


    try {

        const response =
            await fetch("/api/api", {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(body)
            });


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.reply
        ) {
            throw new Error("API failed");
        }


        const reply =
            cleanText(data.reply);


        addBubble(reply, "ai");
        saveHistory("assistant", reply);

        remember(text);


        /*
          IMPORTANT:
          Text chat never speaks automatically.
          Voice only speaks when request came from Voice Mode.
        */

        if (
            fromVoice &&
            voiceOn
        ) {
            speak(reply);
        }


    } catch (error) {

        console.error(
            "KAIRO API ERROR:",
            error
        );

        const msg =
            "Connection problem hocche. Abar try koro.";

        addBubble(msg, "ai");
        saveHistory("assistant", msg);

    } finally {

        /*
          IMPORTANT:
          Never leave the app permanently locked.
        */

        thinking = false;

        if (
            fromVoice &&
            voiceOn &&
            !speaking
        ) {
            setTimeout(
                startListening,
                500
            );
        }
    }
}


/* ================= SEND ================= */

function sendMessage() {

    if (!input || thinking) return;

    const text =
        input.value.trim();

    if (!text) return;

    input.value = "";

    askAI(text, false);
}


send?.addEventListener(
    "click",
    sendMessage
);


input?.addEventListener(
    "keydown",
    e => {

        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {
            e.preventDefault();
            sendMessage();
        }

    }
);


/* ================= SPEECH ================= */

function stopSpeaking() {

    try {
        speechSynthesis.cancel();
    } catch (e) {}

    speaking = false;
}


function getVoice(text) {

    const voices =
        speechSynthesis.getVoices();

    if (!voices.length)
        return null;

    if (isBangla(text)) {

        return (
            voices.find(v =>
                v.lang
                    .toLowerCase()
                    .startsWith("bn")
            ) || null
        );
    }

    return (
        voices.find(v =>
            v.lang
                .toLowerCase()
                .startsWith("en")
        ) || voices[0]
    );
}


function speak(text) {

    if (!voiceOn) return;

    stopSpeaking();

    const clean =
        speechText(text);

    if (!clean) return;

    speaking = true;

    voiceStatus.textContent =
        "KAIRO is speaking...";

    voiceSubtitle.textContent =
        "I'm talking with you";


    const u =
        new SpeechSynthesisUtterance(
            clean
        );

    u.lang =
        isBangla(clean)
            ? "bn-BD"
            : "en-US";

    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;

    const v = getVoice(clean);

    if (v) u.voice = v;


    u.onend = () => {

        speaking = false;

        if (!voiceOn) return;

        voiceStatus.textContent =
            "Listening...";

        voiceSubtitle.textContent =
            "Talk to KAIRO";

        setTimeout(
            startListening,
            250
        );
    };


    u.onerror = () => {

        speaking = false;

        if (voiceOn) {
            setTimeout(
                startListening,
                400
            );
        }
    };


    speechSynthesis.speak(u);
}


/* ================= LISTEN ================= */

function stopListening() {

    if (recognition) {

        try {
            recognition.abort();
        } catch (e) {}

        recognition = null;
    }

    listening = false;
}


function startListening() {

    if (
        !voiceOn ||
        listening ||
        speaking ||
        thinking
    ) return;


    if (
        !("webkitSpeechRecognition"
            in window)
    ) {

        voiceStatus.textContent =
            "Voice not supported";

        return;
    }


    stopListening();


    const R =
        new webkitSpeechRecognition();

    recognition = R;

    R.lang = "bn-BD";

    R.continuous = false;
    R.interimResults = false;
    R.maxAlternatives = 3;

    listening = true;


    voiceStatus.textContent =
        "Listening...";

    voiceSubtitle.textContent =
        "Talk to KAIRO";


    R.onresult = e => {

        const result =
            e.results[0][0]
                .transcript
                .trim();

        listening = false;
        recognition = null;

        if (result) {
            askAI(result, true);
        }
    };


    R.onerror = e => {

        console.log(
            "VOICE:",
            e.error
        );

        listening = false;
        recognition = null;

        if (
            voiceOn &&
            !thinking &&
            !speaking
        ) {
            setTimeout(
                startListening,
                500
            );
        }
    };


    R.onend = () => {

        listening = false;

        if (recognition === R)
            recognition = null;

        if (
            voiceOn &&
            !thinking &&
            !speaking
        ) {
            setTimeout(
                startListening,
                350
            );
        }
    };


    try {
        R.start();
    } catch (e) {

        listening = false;
        recognition = null;
    }
}


/* ================= VOICE MODE ================= */

function openVoice() {

    voiceOn = true;

    stopSpeaking();
    stopListening();

    voiceMode.style.display = "flex";

    voiceMode.setAttribute(
        "aria-hidden",
        "false"
    );

    mini.style.display = "block";

    voiceStatus.textContent =
        "Ready";

    voiceSubtitle.textContent =
        "Talk to KAIRO";


    setTimeout(
        startListening,
        500
    );
}


function closeVoiceMode() {

    voiceOn = false;

    stopSpeaking();
    stopListening();

    voiceMode.style.display =
        "none";

    voiceMode.setAttribute(
        "aria-hidden",
        "true"
    );

    mini.style.display =
        "none";
}


mic?.addEventListener(
    "click",
    openVoice
);

floating?.addEventListener(
    "click",
    openVoice
);

mini?.addEventListener(
    "click",
    openVoice
);

closeVoice?.addEventListener(
    "click",
    closeVoiceMode
);


/* ================= FLOATING BUTTON ================= */

if (floating) {

    let drag = false;
    let moved = false;

    let sx = 0;
    let sy = 0;
    let ox = 0;
    let oy = 0;


    floating.style.touchAction =
        "none";


    floating.addEventListener(
        "pointerdown",
        e => {

            drag = true;
            moved = false;

            sx = e.clientX;
            sy = e.clientY;

            const r =
                floating.getBoundingClientRect();

            ox = r.left;
            oy = r.top;

            floating.setPointerCapture(
                e.pointerId
            );
        }
    );


    floating.addEventListener(
        "pointermove",
        e => {

            if (!drag) return;

            const x =
                ox + e.clientX - sx;

            const y =
                oy + e.clientY - sy;


            if (
                Math.abs(
                    e.clientX - sx
                ) > 6 ||
                Math.abs(
                    e.clientY - sy
                ) > 6
            ) {
                moved = true;
            }


            floating.style.left =
                Math.max(0, x) + "px";

            floating.style.top =
                Math.max(0, y) + "px";

            floating.style.right =
                "auto";

            floating.style.bottom =
                "auto";
        }
    );


    floating.addEventListener(
        "pointerup",
        () => {
            drag = false;
        }
    );
}


/* ================= PUBLIC API ================= */

window.KAIRO = {

    openVoice,

    closeVoice: closeVoiceMode,

    speak,

    stopSpeaking,

    startListening,

    stopListening,

    remember,

    getHistory: () =>
        [...history],

    getMemory: () =>
        [...memory],

    getGameMode: () =>
        gameMode,

    setGameMode: mode => {

        if (
            Object.values(GAME)
                .includes(mode)
        ) {
            gameMode = mode;
            return true;
        }

        return false;
    }

};


/* ================= READY ================= */

console.log(
    "KAIRO AI READY"
);
