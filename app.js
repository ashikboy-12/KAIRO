const $ = id => document.getElementById(id);

/* =========================
   ELEMENTS
========================= */

const chat = $("chat");
const input = $("messageInput");
const sendButton = $("sendButton");
const micButton = $("micButton");

const voiceMode = $("voiceMode");
const voiceStatus = $("voiceStatus");
const voiceSubtitle = $("voiceSubtitle");

const miniVoice = $("miniVoiceButton");
const floating = $("floatingKairo");

const historyButton = $("historyButton");
const historyPanel = $("historyPanel");
const historyBackdrop = $("historyBackdrop");
const historyList = $("historyList");


/* =========================
   STATE
========================= */

let voiceOn = false;
let recognition = null;
let speaking = false;


/* =========================
   CHAT MESSAGE
========================= */

function message(type, text) {

    if (!chat) return;

    const welcome = chat.querySelector(".welcome");
    if (welcome) welcome.remove();

    const box = document.createElement("div");

    box.className =
        type === "user"
        ? "message user-message"
        : "message ai-message";

    box.textContent = text;

    chat.appendChild(box);

    chat.scrollTop = chat.scrollHeight;
}


/* =========================
   ASK KAIRO
========================= */

async function askKairo(text) {

    try {

        const response = await fetch("/api/api", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: text
            })

        });

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.error || "KAIRO API error"
            );

        }

        return data.reply || "";

    } catch (error) {

        console.error("KAIRO ERROR:", error);

        return "Sorry, I couldn't connect right now.";

    }
}


/* =========================
   SEND TEXT
========================= */

async function sendMessage() {

    if (!input) return;

    const text = input.value.trim();

    if (!text) return;

    input.value = "";

    message("user", text);

    const reply = await askKairo(text);

    if (reply) {

        message("ai", reply);

        /*
          Only speak when Voice Mode
          is actually active.
        */

        if (voiceOn) {
            await speak(reply);
        }

    }
}


/* =========================
   SEND BUTTON
========================= */

sendButton?.addEventListener(
    "click",
    sendMessage
);


/* =========================
   ENTER SEND
========================= */

input?.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


/* =========================
   VOICE RECOGNITION
========================= */

const Speech =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


/* =========================
   VOICE STATUS
========================= */

function setVoice(status, subtitle) {

    if (voiceStatus) {
        voiceStatus.textContent = status;
    }

    if (voiceSubtitle) {
        voiceSubtitle.textContent = subtitle;
    }

}


/* =========================
   START LISTENING
========================= */

function startListening() {

    if (!voiceOn) return;

    if (!Speech) {

        setVoice(
            "Voice unavailable",
            "Voice recognition is not supported here"
        );

        return;

    }

    if (speaking) return;

    if (recognition) return;


    recognition = new Speech();

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;

    /*
      English + Bangla/Banglish friendly.
      Browser will still determine the
      actual recognition language.
    */

    recognition.lang = "en-US";


    recognition.onstart = () => {

        setVoice(
            "Listening...",
            "I'm listening"
        );

    };


    recognition.onresult = async event => {

        const text =
            event.results[0][0].transcript.trim();

        recognition = null;

        if (!text || !voiceOn) return;


        setVoice(
            "Thinking...",
            "KAIRO is processing"
        );


        message(
            "user",
            text
        );


        const reply =
            await askKairo(text);


        if (!reply || !voiceOn) {

            if (voiceOn) {

                setVoice(
                    "Listening...",
                    "I'm listening"
                );

                setTimeout(
                    startListening,
                    500
                );

            }

            return;

        }


        message(
            "ai",
            reply
        );


        /*
          IMPORTANT:
          KAIRO speaks here.
        */

        await speak(reply);


        /*
          After speaking,
          automatically listen again.
        */

        if (voiceOn) {

            setTimeout(
                startListening,
                700
            );

        }

    };


    recognition.onerror = event => {

        console.log(
            "Voice recognition error:",
            event.error
        );

        recognition = null;


        if (!voiceOn) return;


        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {

            setVoice(
                "Microphone blocked",
                "Allow microphone permission"
            );

            return;

        }


        setTimeout(
            startListening,
            1000
        );

    };


    recognition.onend = () => {

        recognition = null;


        if (
            voiceOn &&
            !speaking
        ) {

            setTimeout(
                startListening,
                500
            );

        }

    };


    try {

        recognition.start();

    } catch (error) {

        recognition = null;

    }

}


/* =========================
   STOP LISTENING
========================= */

function stopListening() {

    if (!recognition) return;

    try {
        recognition.stop();
    } catch (error) {}

    recognition = null;

}


/* =========================
   SPEAK
========================= */

function speak(text) {

    return new Promise(resolve => {

        if (!voiceOn) {

            resolve();

            return;

        }


        if (
            !("speechSynthesis" in window)
        ) {

            setVoice(
                "Voice unavailable",
                "Speech output is not supported"
            );

            resolve();

            return;

        }


        speechSynthesis.cancel();


        const cleanText =
            String(text)
                .replace(/[*#_`]/g, "")
                .trim();


        if (!cleanText) {

            resolve();

            return;

        }


        const utterance =
            new SpeechSynthesisUtterance(
                cleanText
            );


        /*
          Try to use a natural English voice.
        */

        const voices =
            speechSynthesis.getVoices();


        const preferred =
            voices.find(v =>
                /en-US|en-GB/i.test(v.lang)
            );


        if (preferred) {

            utterance.voice =
                preferred;

        }


        utterance.lang =
            preferred?.lang || "en-US";


        utterance.rate = 0.92;

        utterance.pitch = 1;

        utterance.volume = 1;


        utterance.onstart = () => {

            speaking = true;

            setVoice(
                "Speaking...",
                "KAIRO is talking"
            );

        };


        utterance.onend = () => {

            speaking = false;

            resolve();

        };


        utterance.onerror = () => {

            speaking = false;

            resolve();

        };


        speechSynthesis.speak(
            utterance
        );

    });

}


/* =========================
   OPEN VOICE MODE
========================= */

function openVoice() {

    if (!voiceMode) return;


    voiceOn = true;


    voiceMode.classList.add(
        "active"
    );


    voiceMode.setAttribute(
        "aria-hidden",
        "false"
    );


    setVoice(
        "Listening...",
        "I'm listening"
    );


    stopListening();


    setTimeout(
        startListening,
        300
    );

}


/* =========================
   CLOSE VOICE MODE
========================= */

function closeVoice() {

    voiceOn = false;


    stopListening();


    if (
        "speechSynthesis" in window
    ) {

        speechSynthesis.cancel();

    }


    speaking = false;


    voiceMode?.classList.remove(
        "active"
    );


    voiceMode?.setAttribute(
        "aria-hidden",
        "true"
    );


    setVoice(
        "Ready",
        "Talk to KAIRO"
    );

}


/* =========================
   CHAT MIC
========================= */

micButton?.addEventListener(
    "click",
    () => {

        if (voiceOn) return;

        openVoice();

    }
);


/* =========================
   MINI VOICE
========================= */

miniVoice?.addEventListener(
    "click",
    openVoice
);


/* =========================
   FLOATING KAIRO
========================= */

floating?.addEventListener(
    "click",
    () => {

        if (
            floating.dataset.moved !== "true"
        ) {

            openVoice();

        }

    }
);


/* =========================
   HISTORY
========================= */

function openHistory() {

    historyPanel?.classList.add(
        "active"
    );

    historyBackdrop?.classList.add(
        "active"
    );

}


function closeHistory() {

    historyPanel?.classList.remove(
        "active"
    );

    historyBackdrop?.classList.remove(
        "active"
    );

}


historyButton?.addEventListener(
    "click",
    openHistory
);


historyBackdrop?.addEventListener(
    "click",
    closeHistory
);


/* =========================
   LOAD VOICES
========================= */

if ("speechSynthesis" in window) {

    speechSynthesis.onvoiceschanged = () => {

        speechSynthesis.getVoices();

    };

}


/* =========================
   START
========================= */

console.log(
    "KAIRO initialized"
);
