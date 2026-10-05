// ======================================================
// KAIRO AI - APP.JS
// Voice + Chat + History + Memory Context
// ======================================================

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const micButton = document.getElementById("micButton");
const chat = document.getElementById("chat");
const statusEl = document.getElementById("status");

const historyButton = document.getElementById("historyButton");
const historyPanel = document.getElementById("historyPanel");
const closeHistory = document.getElementById("closeHistory");
const historyBackdrop = document.getElementById("historyBackdrop");
const historySearch = document.getElementById("historySearch");
const historyList = document.getElementById("historyList");
const floatingKairo = document.getElementById("floatingKairo");


// ======================================================
// STORAGE
// ======================================================

const HISTORY_KEY = "kairo_conversations";
const MEMORY_KEY = "kairo_memories";

let conversations = JSON.parse(
    localStorage.getItem(HISTORY_KEY) || "[]"
);

let memories = JSON.parse(
    localStorage.getItem(MEMORY_KEY) || "[]"
);


// ======================================================
// VOICE STATE
// ======================================================

let recognition = null;
let isListening = false;
let lastInputWasVoice = false;


// ======================================================
// STATUS
// ======================================================

function setStatus(text) {
    if (statusEl) {
        statusEl.textContent = text;
    }
}


// ======================================================
// CHAT MESSAGE
// ======================================================

function addMessage(role, text) {
    const message = document.createElement("div");

    message.className =
        role === "user"
            ? "message user-message"
            : "message ai-message";

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    bubble.textContent = text;

    message.appendChild(bubble);

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


// ======================================================
// WELCOME SCREEN
// ======================================================

function removeWelcome() {
    const welcome = chat.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }
}


// ======================================================
// SAVE CONVERSATION
// ======================================================

function saveConversation(userMessage, aiReply) {

    conversations.push({
        id: Date.now(),
        user: userMessage,
        assistant: aiReply,
        time: new Date().toISOString()
    });

    // Keep local history manageable
    if (conversations.length > 300) {
        conversations = conversations.slice(-300);
    }

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(conversations)
    );
}


// ======================================================
// BUILD RELEVANT CONTEXT
// ======================================================

function buildContext(message) {

    const queryWords = message
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);

    const relevantHistory = conversations
        .map(item => {

            const text = (
                item.user +
                " " +
                item.assistant
            ).toLowerCase();

            let score = 0;

            for (const word of queryWords) {

                if (text.includes(word)) {
                    score++;
                }
            }

            return {
                ...item,
                score
            };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);


    const relevantMemories = memories
        .filter(memory => {

            const text =
                typeof memory === "string"
                    ? memory
                    : JSON.stringify(memory);

            const lower = text.toLowerCase();

            return queryWords.some(word =>
                lower.includes(word)
            );
        })
        .slice(0, 10);


    let context = "";


    if (relevantHistory.length) {

        context += "RELEVANT CONVERSATION HISTORY:\n";

        relevantHistory.forEach(item => {

            context +=
                "User: " +
                item.user +
                "\nKAIRO: " +
                item.assistant +
                "\n\n";
        });
    }


    if (relevantMemories.length) {

        context += "\nRELEVANT MEMORY:\n";

        relevantMemories.forEach(memory => {

            context +=
                typeof memory === "string"
                    ? memory
                    : JSON.stringify(memory);

            context += "\n";
        });
    }


    if (!context) {
        context = "No relevant previous context found.";
    }

    return context;
}


// ======================================================
// SEND MESSAGE TO KAIRO
// ======================================================

async function sendMessage() {

    const message =
        messageInput.value.trim();

    if (!message) {
        return;
    }


    removeWelcome();

    addMessage("user", message);

    messageInput.value = "";

    messageInput.style.height = "auto";

    sendButton.disabled = true;

    setStatus("Thinking...");


    // Save whether this message came from voice
    const shouldSpeakReply = lastInputWasVoice;

    // Reset immediately
    lastInputWasVoice = false;


    try {

        const context =
            buildContext(message);


        const response = await fetch(
            "/api/api",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message,
                    context: context
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data?.error ||
                "KAIRO API error"
            );
        }


        const reply =
            data?.reply;


        if (!reply) {

            throw new Error(
                "No AI reply received"
            );
        }


        addMessage(
            "assistant",
            reply
        );


        saveConversation(
            message,
            reply
        );


        setStatus("Ready");


        // IMPORTANT:
        // Only speak when user used microphone.
        if (shouldSpeakReply) {

            speakText(reply);

        }


    } catch (error) {

        console.error(
            "KAIRO error:",
            error
        );


        const errorText =
            "Sorry, KAIRO AI connection-e ekta problem hoyeche. Ektu pore abar try koro.";


        addMessage(
            "assistant",
            errorText
        );


        setStatus("Connection problem");


        if (shouldSpeakReply) {
            speakText(errorText);
        }


    } finally {

        sendButton.disabled = false;

        messageInput.focus();

    }
}


// ======================================================
// ENTER KEY
// ======================================================

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


// ======================================================
// AUTO RESIZE TEXTAREA
// ======================================================

messageInput.addEventListener(
    "input",
    function() {

        this.style.height = "auto";

        this.style.height =
            Math.min(
                this.scrollHeight,
                140
            ) + "px";

    }
);


// ======================================================
// SEND BUTTON
// ======================================================

sendButton.addEventListener(
    "click",
    function() {

        lastInputWasVoice = false;

        sendMessage();

    }
);


// ======================================================
// VOICE RECOGNITION
// ======================================================

function setupRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        console.log(
            "Speech recognition is not supported."
        );

        return;

    }


    recognition =
        new SpeechRecognition();


    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = "bn-BD";


    recognition.onstart = function() {

        isListening = true;

        micButton.classList.add(
            "listening"
        );

        setStatus("Listening...");

    };


    recognition.onresult = function(event) {

        const result =
            event.results[0][0].transcript;


        if (!result) {
            return;
        }


        messageInput.value = result;

        messageInput.dispatchEvent(
            new Event("input")
        );


        // Mark this message as voice input
        lastInputWasVoice = true;


        // Automatically send voice message
        setTimeout(
            sendMessage,
            250
        );

    };


    recognition.onerror = function(event) {

        console.log(
            "Speech recognition error:",
            event.error
        );

        isListening = false;

        micButton.classList.remove(
            "listening"
        );

        setStatus("Ready");

    };


    recognition.onend = function() {

        isListening = false;

        micButton.classList.remove(
            "listening"
        );

        if (
            statusEl &&
            statusEl.textContent ===
                "Listening..."
        ) {

            setStatus("Ready");

        }

    };

}


// ======================================================
// MICROPHONE BUTTON
// ======================================================

micButton.addEventListener(
    "click",
    function() {

        if (!recognition) {

            setupRecognition();

        }


        if (!recognition) {

            alert(
                "Voice input ei browser/device-e support korche na."
            );

            return;

        }


        if (isListening) {

            recognition.stop();

            return;

        }


        try {

            recognition.lang =
                detectSpeechLanguage(
                    messageInput.value
                );


            recognition.start();

        } catch (error) {

            console.log(
                "Recognition start error:",
                error
            );

        }

    }
);


// ======================================================
// LANGUAGE DETECTION FOR VOICE
// ======================================================

function detectSpeechLanguage(text) {

    const value =
        (text || "").toLowerCase();


    // Bangla characters
    if (
        /[\u0980-\u09FF]/.test(value)
    ) {

        return "bn-BD";

    }


    // Hindi / Devanagari
    if (
        /[\u0900-\u097F]/.test(value)
    ) {

        return "hi-IN";

    }


    // Banglish usually contains common Bangla
    // transliteration words.
    const banglishWords = [
        "ami",
        "amar",
        "tumi",
        "tomar",
        "kemon",
        "ki",
        "keno",
        "kivabe",
        "korbo",
        "hobe",
        "ache",
        "nai",
        "bhai",
        "bujhi",
        "bujhte",
        "ekhon",
        "ajke",
        "kalke",
        "valo",
        "bhalo"
    ];


    const words =
        value.split(/\s+/);


    const banglishScore =
        words.filter(
            word =>
                banglishWords.includes(
                    word.replace(
                        /[^a-z]/g,
                        ""
                    )
                )
        ).length;


    if (banglishScore >= 1) {

        return "bn-BD";

    }


    return "en-US";

}


// ======================================================
// HIGHER QUALITY BROWSER VOICE
// ======================================================

function getBestVoice(language) {

    if (
        !("speechSynthesis" in window)
    ) {

        return null;

    }


    const voices =
        speechSynthesis.getVoices();


    if (!voices.length) {

        return null;

    }


    const target =
        language.toLowerCase();


    const exact =
        voices.filter(
            voice =>
                voice.lang &&
                voice.lang.toLowerCase() === target
        );


    if (exact.length) {

        return exact[0];

    }


    const base =
        target.split("-")[0];


    const sameLanguage =
        voices.filter(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith(base)
        );


    if (sameLanguage.length) {

        return sameLanguage[0];

    }


    return voices[0];

}


// ======================================================
// DETECT REPLY LANGUAGE
// ======================================================

function detectReplyLanguage(text) {

    if (!text) {
        return "en-US";
    }


    const banglaCharacters =
        (text.match(
            /[\u0980-\u09FF]/g
        ) || []).length;


    const hindiCharacters =
        (text.match(
            /[\u0900-\u097F]/g
        ) || []).length;


    if (banglaCharacters > 3) {
        return "bn-BD";
    }


    if (hindiCharacters > 3) {
        return "hi-IN";
    }


    // Check common Banglish words
    const lower =
        text.toLowerCase();


    const banglishWords = [
        "ami",
        "tumi",
        "apni",
        "amar",
        "tomar",
        "bhai",
        "bujhte",
        "koro",
        "korbo",
        "hobe",
        "ache",
        "nai",
        "ekhon",
        "karon",
        "valo",
        "bhalo"
    ];


    let score = 0;


    banglishWords.forEach(
        word => {

            if (
                lower.includes(
                    word
                )
            ) {

                score++;

            }

        }
    );


    if (score >= 1) {
        return "bn-BD";
    }


    return "en-US";

}


// ======================================================
// SPEAK TEXT
// ======================================================

function speakText(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    if (!text) {
        return;
    }


    speechSynthesis.cancel();


    const language =
        detectReplyLanguage(text);


    const voice =
        getBestVoice(language);


    // Clean markdown a little for natural speech
    const cleanText =
        text
            .replace(
                /```[\s\S]*?```/g,
                ""
            )
            .replace(
                /[*_#>`]/g,
                ""
            )
            .replace(
                /\[([^\]]+)\]\([^)]+\)/g,
                "$1"
            )
            .trim();


    const utterance =
        new SpeechSynthesisUtterance(
            cleanText
        );


    utterance.lang =
        language;


    if (voice) {

        utterance.voice =
            voice;

    }


    // Natural speaking settings
    utterance.rate = 0.92;

    utterance.pitch = 1.0;

    utterance.volume = 1.0;


    utterance.onstart =
        function() {

            setStatus("Speaking...");

        };


    utterance.onend =
        function() {

            setStatus("Ready");

        };


    utterance.onerror =
        function() {

            setStatus("Ready");

        };


    speechSynthesis.speak(
        utterance
    );

}


// Load voices when Android provides them
if (
    "speechSynthesis" in window
) {

    speechSynthesis.onvoiceschanged =
        function() {

            speechSynthesis.getVoices();

        };

}


// ======================================================
// HISTORY PANEL
// ======================================================

function openHistoryPanel() {

    historyPanel.classList.add(
        "open"
    );

    historyBackdrop.classList.add(
        "show"
    );

    historyPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    renderHistory();

}


function closeHistoryPanel() {

    historyPanel.classList.remove(
        "open"
    );

    historyBackdrop.classList.remove(
        "show"
    );

    historyPanel.setAttribute(
        "aria-hidden",
        "true"
    );

}


historyButton.addEventListener(
    "click",
    openHistoryPanel
);


closeHistory.addEventListener(
    "click",
    closeHistoryPanel
);


historyBackdrop.addEventListener(
    "click",
    closeHistoryPanel
);


// ======================================================
// RENDER HISTORY
// ======================================================

function renderHistory(
    searchTerm = ""
) {

    const term =
        searchTerm
            .trim()
            .toLowerCase();


    const filtered =
        conversations
            .slice()
            .reverse()
            .filter(item => {

                if (!term) {
                    return true;
                }


                return (
                    item.user
                        .toLowerCase()
                        .includes(term) ||
                    item.assistant
                        .toLowerCase()
                        .includes(term)
                );

            });


    if (!filtered.length) {

        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">◷</div>
                <h3>No conversations found</h3>
                <p>Your matching conversations will appear here.</p>
            </div>
        `;

        return;

    }


    historyList.innerHTML = "";


    filtered.forEach(item => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "history-item";


        const user =
            document.createElement(
                "div"
            );


        user.className =
            "history-user";


        user.textContent =
            item.user;


        const answer =
            document.createElement(
                "div"
            );


        answer.className =
            "history-answer";


        answer.textContent =
            item.assistant;


        card.appendChild(user);

        card.appendChild(answer);


        card.addEventListener(
            "click",
            function() {

                closeHistoryPanel();

                removeWelcome();

                addMessage(
                    "user",
                    item.user
                );

                addMessage(
                    "assistant",
                    item.assistant
                );

            }
        );


        historyList.appendChild(card);

    });

}


// ======================================================
// HISTORY SEARCH
// ======================================================

historySearch.addEventListener(
    "input",
    function() {

        renderHistory(
            this.value
        );

    }
);


// ======================================================
// FLOATING KAIRO BUTTON
// ======================================================

floatingKairo.addEventListener(
    "click",
    function() {

  
