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

const HISTORY_KEY = "kairo_conversations";

let conversations = [];
let recognition = null;

let voiceActive = false;
let listening = false;
let speaking = false;
let thinking = false;
let shouldContinueVoice = false;

let currentAudio = null;


// ==========================================
// HISTORY
// ==========================================

try {
    conversations = JSON.parse(
        localStorage.getItem(HISTORY_KEY) || "[]"
    );

    if (!Array.isArray(conversations)) {
        conversations = [];
    }
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

    if (conversations.length > 300) {
        conversations = conversations.slice(-300);
    }

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(conversations)
    );
}


function contextFor(text) {

    if (!conversations.length) {
        return "No previous conversation available.";
    }

    const words = text
        .toLowerCase()
        .split(/\s+/)
        .filter(x => x.length >= 3);

    return conversations
        .map(item => {

            const old = (
                item.user +
                " " +
                item.assistant
            ).toLowerCase();

            let score = 0;

            words.forEach(word => {
                if (old.includes(word)) {
                    score++;
                }
            });

            return {
                item,
                score
            };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(x =>
            `User: ${x.item.user}\nKAIRO: ${x.item.assistant}`
        )
        .join("\n\n") ||
        "No relevant previous conversation available.";
}


// ==========================================
// CHAT UI
// ==========================================

function addMessage(role, text) {

    const welcome =
        chat.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }

    const box =
        document.createElement("div");

    box.className =
        role === "user"
            ? "message user-message"
            : "message ai-message";

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    bubble.textContent = text;

    box.appendChild(bubble);

    chat.appendChild(box);

    chat.scrollTop =
        chat.scrollHeight;
}


// ==========================================
// AI REQUEST
// ==========================================

async function askKairo(
    text,
    speakReply = false
) {

    if (!text) return null;

    try {

        thinking = true;

        status.textContent =
            "Thinking...";

        if (voiceActive) {

            voiceStatus.textContent =
                "Thinking...";

            voiceSubtitle.textContent =
                "KAIRO is thinking";

            voiceLogo.classList.remove(
                "listening"
            );
        }


        const response =
            await fetch(
                "/api/api",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message: text,

                        context:
                            contextFor(text),

                        mode: "chat"
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "API error"
            );
        }


        if (!data.reply) {

            throw new Error(
                "No AI reply"
            );
        }


        addMessage(
            "assistant",
            data.reply
        );

        saveHistory(
            text,
            data.reply
        );


        thinking = false;

        status.textContent =
            "Ready";


        if (speakReply) {

            await speakWithKairoVoice(
                data.reply
            );

        } else if (voiceActive) {

            continueVoiceListening();

        }


        return data.reply;


    } catch (error) {

        console.error(
            "KAIRO error:",
            error
        );

        thinking = false;

        const msg =
            "KAIRO connection-e problem hoyeche. Ektu pore abar try koro.";

        addMessage(
            "assistant",
            msg
        );

        status.textContent =
            "Connection error";


        if (voiceActive) {

            voiceStatus.textContent =
                "Connection error";

            voiceSubtitle.textContent =
                "Try again";

            setTimeout(
                continueVoiceListening,
                1500
            );
        }


        return null;
    }
}


// ==========================================
// NORMAL SEND
// ==========================================

async function sendMessage() {

    const text =
        input.value.trim();

    if (!text) return;


    addMessage(
        "user",
        text
    );


    input.value = "";

    input.style.height =
        "auto";


    send.disabled = true;
    mic.disabled = true;


    await askKairo(
        text,
        false
    );


    send.disabled = false;
    mic.disabled = false;

    input.focus();
}


send.onclick =
    sendMessage;


input.onkeydown =
    e => {

        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {

            e.preventDefault();

            sendMessage();
        }
    };


input.oninput =
    () => {

        input.style.height =
            "auto";

        input.style.height =
            Math.min(
                input.scrollHeight,
                140
            ) + "px";
    };


// ==========================================
// SPEECH RECOGNITION
// ==========================================

function setupRecognition() {

    const Speech =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!Speech) {

        return false;
    }


    recognition =
        new Speech();


    recognition.lang =
        "bn-BD";

    recognition.continuous =
        false;

    recognition.interimResults =
        false;

    recognition.maxAlternatives =
        1;


    recognition.onstart =
        () => {

            listening = true;

            voiceLogo.classList.add(
                "listening"
            );

            if (voiceActive) {

                voiceStatus.textContent =
                    "Listening...";

                voiceSubtitle.textContent =
                    "KAIRO is listening";
            }
        };


    recognition.onresult =
        async e => {

            const text =
                e.results[0][0]
                    .transcript
                    .trim();


            if (!text) {

                continueVoiceListening();

                return;
            }


            listening = false;


            voiceLogo.classList.remove(
                "listening"
            );


            if (voiceActive) {

                voiceStatus.textContent =
                    "Thinking...";

                voiceSubtitle.textContent =
                    text;

                addMessage(
                    "user",
                    text
                );


                await askKairo(
                    text,
                    true
                );

            } else {

                input.value =
                    text;

                input.dispatchEvent(
                    new Event("input")
                );

                setTimeout(
                    sendMessage,
                    100
                );
            }
        };


    recognition.onerror =
        error => {

            console.log(
                "Speech error:",
                error.error
            );

            listening = false;

            voiceLogo.classList.remove(
                "listening"
            );


            if (voiceActive) {

                voiceStatus.textContent =
                    "Ready";

                voiceSubtitle.textContent =
                    "Listening again...";

                setTimeout(
                    continueVoiceListening,
                    800
                );
            }
        };


    recognition.onend =
        () => {

            listening = false;

            voiceLogo.classList.remove(
                "listening"
            );


            if (
                voiceActive &&
                shouldContinueVoice &&
                !speaking &&
                !thinking
            ) {

                setTimeout(
                    continueVoiceListening,
                    500
                );
            }
        };


    return true;
}


// ==========================================
// START LISTENING
// ==========================================

function startListening() {

    if (!recognition) {

        if (!setupRecognition()) {

            alert(
                "Ei browser-e voice input support nei."
            );

            return;
        }
    }


    if (
        listening ||
        speaking ||
        thinking
    ) {
        return;
    }


    try {

        recognition.start();

    } catch (error) {

        console.log(
            "Recognition start:",
            error
        );
    }
}


// ==========================================
// CONTINUOUS VOICE LISTENING
// ==========================================

function continueVoiceListening() {

    if (!voiceActive) {
        return;
    }

    if (!shouldContinueVoice) {
        return;
    }

    if (
        listening ||
        speaking ||
        thinking
    ) {
        return;
    }


    voiceStatus.textContent =
        "Listening...";

    voiceSubtitle.textContent =
        "Your turn";


    setTimeout(
        startListening,
        300
    );
}


// ==========================================
// REAL KAIRO TTS
// ==========================================

async function speakWithKairoVoice(text) {

    if (!voiceActive) {
        return;
    }


    try {

        speaking = true;

        voiceStatus.textContent =
            "Speaking...";

        voiceSubtitle.textContent =
            "KAIRO is replying";


        if (currentAudio) {

            currentAudio.pause();

            currentAudio.src = "";
        }


        const response =
            await fetch(
                "/api/api",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message: text,

                        mode: "tts"
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                "TTS failed"
            );
        }


        const blob =
            await response.blob();


        const audioURL =
            URL.createObjectURL(blob);


        currentAudio =
            new Audio(audioURL);


        currentAudio.volume =
            1;


        currentAudio.onended =
            () => {

                URL.revokeObjectURL(
                    audioURL
                );

                currentAudio = null;

                speaking = false;


                if (voiceActive) {

                    voiceStatus.textContent =
                        "Ready";

                    voiceSubtitle.textContent =
                        "Your turn";

                    continueVoiceListening();
                }
            };


        currentAudio.onerror =
            () => {

                URL.revokeObjectURL(
                    audioURL
                );

                currentAudio = null;

                speaking = false;

                continueVoiceListening();
            };


        await currentAudio.play();


    } catch (error) {

        console.error(
            "KAIRO TTS error:",
            error
        );

        speaking = false;


        if (voiceActive) {

            voiceStatus.textContent =
                "Voice unavailable";

            voiceSubtitle.textContent =
                "Trying again...";


            setTimeout(
                continueVoiceListening,
                1000
            );
        }
    }
}


// ==========================================
// VOICE MODE
// ==========================================

function openVoice() {

    voiceActive = true;

    shouldContinueVoice = true;


    voiceMode.classList.add(
        "open"
    );

    voiceMode.setAttribute(
        "aria-hidden",
        "false"
    );


    miniVoice.classList.remove(
        "show"
    );


    voiceStatus.textContent =
        "Listening...";

    voiceSubtitle.textContent =
        "KAIRO is listening";


    startListening();
}


function closeVoice() {

    voiceActive = false;

    shouldContinueVoice = false;


    if (
        recognition &&
        listening
    ) {

        try {
            recognition.stop();
        } catch {}
    }


    if (currentAudio) {

        currentAudio.pause();

        currentAudio.src = "";

        currentAudio = null;
    }


    speaking = false;
    listening = false;
    thinking = false;


    voiceMode.classList.remove(
        "open"
    );

    voiceMode.setAttribute(
        "aria-hidden",
        "true"
    );


    miniVoice.classList.remove(
        "show"
    );


    voiceLogo.classList.remove(
        "listening"
    );
}


function minimizeVoice() {

    voiceMode.classList.remove(
        "open"
    );

    miniVoice.classList.add(
        "show"
    );
}


function restoreVoice() {

    voiceMode.classList.add(
        "open"
    );

    miniVoice.classList.remove(
        "show"
    );


    if (
        voiceActive &&
        !listening &&
        !speaking &&
        !thinking
    ) {

        shouldContinueVoice = true;

        continueVoiceListening();
    }
}


// ==========================================
// VOICE BUTTONS
// ==========================================

floating.onclick =
    openVoice;


// Compatibility with current HTML.
// Voice Mode itself automatically starts listening,
// so these buttons are no longer needed for normal use.

if (voiceTalk) {

    voiceTalk.onclick =
        () => {

            if (!voiceActive) {
                openVoice();
                return;
            }

            if (
                !listening &&
                !speaking &&
                !thinking
            ) {

                startListening();
            }
        };
}


if (voiceClose) {

    voiceClose.onclick =
        closeVoice;
}


if (voiceMin) {

    voiceMin.onclick =
        minimizeVoice;
}


if (miniVoice) {

    miniVoice.onclick =
        restoreVoice;
}


mic.onclick =
    startListening;


// ==========================================
// HISTORY UI
// ==========================================

function renderHistory(term = "") {

    const q =
        term.toLowerCase().trim();


    const list =
        conversations
            .slice()
            .reverse()
            .filter(item =>
                !q ||
                item.user
                    .toLowerCase()
                    .includes(q) ||
                item.assistant
                    .toLowerCase()
                    .includes(q)
            );


    historyList.innerHTML =
        "";


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

        const card =
            document.createElement("div");

        card.className =
            "history-item";


        card.innerHTML = `
            <div class="history-user"></div>
            <div class="history-answer"></div>
        `;


        card.querySelector(
            ".history-user"
        ).textContent =
            item.user;


        card.querySelector(
            ".history-answer"
        ).textContent =
            item.assistant;


        card.onclick =
            () => {

                closeHistory.click();

                addMessage(
                    "user",
                    item.user
                );

                addMessage(
                    "assistant",
                    item.assistant
                );
            };


        historyList.appendChild(
            card
        );
    });
}


historyBtn.onclick =
    () => {

        historyPanel.classList.add(
            "open"
        );

        historyBack.classList.add(
            "show"
        );

        historyPanel.setAttribute(
            "aria-hidden",
            "false"
        );

        renderHistory();
    };


closeHistory.onclick =
historyBack.onclick =
    () => {

        historyPanel.classList.remove(
            "open"
        );

        historyBack.classList.remove(
            "show"
        );

        historyPanel.setAttribute(
            "aria-hidden",
            "true"
        );
    };


historySearch.oninput =
    () =>
        renderHistory(
            historySearch.value
        );


// ==========================================
// FLOATING KAIRO DRAG
// ==========================================

let dragging = false;
let moved = false;

let offsetX = 0;
let offsetY = 0;


floating.addEventListener(
    "pointerdown",
    e => {

        dragging = true;
        moved = false;


        const rect =
            floating.getBoundingClientRect();


        offsetX =
            e.clientX -
            rect.left;

        offsetY =
            e.clientY -
            rect.top;


        floating.setPointerCapture(
            e.pointerId
        );
    }
);


floating.addEventListener(
    "pointermove",
    e => {

        if (!dragging) return;


        moved = true;


        floating.style.left =
            (
                e.clientX -
                offsetX
            ) + "px";


        floating.style.top =
            (
                e.clientY -
                offsetY
            ) + "px";


        floating.style.right =
            "auto";

        floating.style.bottom =
            "auto";
    }
);


floating.addEventListener(
    "pointerup",
    () => {

        dragging = false;
    }
);


// ==========================================
// START
// ==========================================

status.textContent =
    "Ready";

console.log(
    "KAIRO Voice 2.0 loaded."
);
