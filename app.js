// =====================================================
// KAIRO APP.JS
// Stable Chat + Voice + History
// =====================================================

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


// =====================================================
// STORAGE
// =====================================================

const HISTORY_KEY = "kairo_conversations";

let conversations = [];

try {
    const saved = localStorage.getItem(HISTORY_KEY);

    if (saved) {
        conversations = JSON.parse(saved);
    }

    if (!Array.isArray(conversations)) {
        conversations = [];
    }

} catch (error) {
    conversations = [];
}


// =====================================================
// STATUS
// =====================================================

function setStatus(text) {

    if (statusEl) {
        statusEl.textContent = text;
    }

}


// =====================================================
// CHAT MESSAGE
// =====================================================

function addMessage(role, text) {

    if (!chat) return;

    const welcome = chat.querySelector(".welcome");

    if (welcome) {
        welcome.remove();
    }

    const wrapper = document.createElement("div");

    wrapper.className =
        role === "user"
            ? "message user-message"
            : "message ai-message";

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    bubble.textContent = String(text);

    wrapper.appendChild(bubble);

    chat.appendChild(wrapper);

    chat.scrollTop = chat.scrollHeight;
}


// =====================================================
// SAVE HISTORY
// =====================================================

function saveConversation(userText, aiText) {

    conversations.push({
        id: Date.now(),
        user: userText,
        assistant: aiText,
        time: new Date().toISOString()
    });

    if (conversations.length > 300) {
        conversations = conversations.slice(-300);
    }

    try {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(conversations)
        );
    } catch (error) {
        console.log("History error:", error);
    }
}


// =====================================================
// BUILD OLD CONTEXT
// =====================================================

function buildContext(message) {

    if (!conversations.length) {
        return "No previous conversation available.";
    }

    const words = String(message)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length >= 3);

    const matches = [];

    conversations.forEach(item => {

        const oldText = (
            String(item.user || "") +
            " " +
            String(item.assistant || "")
        ).toLowerCase();

        let score = 0;

        words.forEach(word => {

            if (oldText.includes(word)) {
                score++;
            }

        });

        if (score > 0) {
            matches.push({
                item: item,
                score: score
            });
        }

    });

    matches.sort((a, b) => b.score - a.score);

    const selected = matches.slice(0, 5);

    if (!selected.length) {
        return "No relevant previous conversation available.";
    }

    let context = "";

    selected.forEach(entry => {

        context +=
            "User: " +
            entry.item.user +
            "\n";

        context +=
            "KAIRO: " +
            entry.item.assistant +
            "\n\n";

    });

    return context;
}


// =====================================================
// SEND MESSAGE
// =====================================================

async function sendMessage() {

    if (!messageInput) return;

    const message = messageInput.value.trim();

    if (!message) return;

    addMessage("user", message);

    messageInput.value = "";
    messageInput.style.height = "auto";

    if (sendButton) {
        sendButton.disabled = true;
    }

    if (micButton) {
        micButton.disabled = true;
    }

    setStatus("Thinking...");

    try {

        const context = buildContext(message);

        const response = await fetch("/api/api", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message,
                context: context
            })

        });

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.error || "API request failed"
            );

        }

        if (!data.reply) {

            throw new Error(
                "No reply received"
            );

        }

        addMessage(
            "assistant",
            data.reply
        );

        saveConversation(
            message,
            data.reply
        );

        setStatus("Ready");

    } catch (error) {

        console.error(
            "KAIRO ERROR:",
            error
        );

        addMessage(
            "assistant",
            "KAIRO connection-e problem hoyeche. Ektu pore abar try koro."
        );

        setStatus("Connection error");

    }

    if (sendButton) {
        sendButton.disabled = false;
    }

    if (micButton) {
        micButton.disabled = false;
    }

    messageInput.focus();
}


// =====================================================
// SEND BUTTON
// =====================================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        function () {
            sendMessage();
        }
    );

}


// =====================================================
// ENTER TO SEND
// =====================================================

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


    messageInput.addEventListener(
        "input",
        function () {

            this.style.height = "auto";

            this.style.height =
                Math.min(
                    this.scrollHeight,
                    140
                ) + "px";

        }
    );

}


// =====================================================
// VOICE INPUT
// =====================================================

let recognition = null;
let listening = false;

function setupVoice() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        return false;
    }

    recognition = new SpeechRecognition();

    recognition.lang = "bn-BD";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    recognition.onstart = function () {

        listening = true;

        if (micButton) {
            micButton.classList.add("listening");
        }

        setStatus("Listening...");

    };


    recognition.onresult = function (event) {

        const text =
            event.results[0][0].transcript;

        if (!text) return;

        messageInput.value = text;

        messageInput.dispatchEvent(
            new Event("input")
        );

        setStatus("Processing...");

        setTimeout(
            function () {
                sendMessage();
            },
            200
        );

    };


    recognition.onerror = function (event) {

        console.log(
            "Voice error:",
            event.error
        );

        setStatus("Ready");

    };


    recognition.onend = function () {

        listening = false;

        if (micButton) {
            micButton.classList.remove("listening");
        }

        if (
            statusEl &&
            statusEl.textContent === "Listening..."
        ) {
            setStatus("Ready");
        }

    };

    return true;
}


if (micButton) {

    micButton.addEventListener(
        "click",
        function () {

            if (!recognition) {

                const ready = setupVoice();

                if (!ready) {

                    alert(
                        "Ei browser-e voice input support nei."
                    );

                    return;
                }

            }

            if (listening) {

                recognition.stop();

                return;

            }

            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Voice start error:",
                    error
                );

            }

        }
    );

}


// =====================================================
// HISTORY
// =====================================================

function renderHistory(search = "") {

    if (!historyList) return;

    const term =
        String(search).toLowerCase().trim();

    const list =
        conversations
            .slice()
            .reverse()
            .filter(item => {

                if (!term) return true;

                return (
                    String(item.user || "")
                        .toLowerCase()
                        .includes(term) ||

                    String(item.assistant || "")
                        .toLowerCase()
                        .includes(term)
                );

            });


    if (!list.length) {

        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">◷</div>
                <h3>No conversations yet</h3>
                <p>Your future conversations will appear here.</p>
            </div>
        `;

        return;
    }


    historyList.innerHTML = "";


    list.forEach(item => {

        const card =
            document.createElement("div");

        card.className = "history-item";


        const user =
            document.createElement("div");

        user.className = "history-user";

        user.textContent =
            item.user || "";


        const answer =
            document.createElement("div");

        answer.className = "history-answer";

        answer.textContent =
            item.assistant || "";


        card.appendChild(user);

        card.appendChild(answer);


        card.addEventListener(
            "click",
            function () {

                closeHistoryPanel();

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


function openHistoryPanel() {

    if (!historyPanel) return;

    historyPanel.classList.add("open");

    if (historyBackdrop) {
        historyBackdrop.classList.add("show");
    }

    historyPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    renderHistory();

}


function closeHistoryPanel() {

    if (historyPanel) {

        historyPanel.classList.remove("open");

        historyPanel.setAttribute(
            "aria-hidden",
            "true"
        );

    }

    if (historyBackdrop) {
        historyBackdrop.classList.remove("show");
    }

}


if (historyButton) {

    historyButton.addEventListener(
        "click",
        openHistoryPanel
    );

}


if (closeHistory) {

    closeHistory.addEventListener(
        "click",
        closeHistoryPanel
    );

}


if (historyBackdrop) {

    historyBackdrop.addEventListener(
        "click",
        closeHistoryPanel
    );

}


if (historySearch) {

    historySearch.addEventListener(
        "input",
        function () {

            renderHistory(
                this.value
            );

        }
    );

}


// =====================================================
// FLOATING KAIRO
// =====================================================

if (floatingKairo) {

    floatingKairo.addEventListener(
        "click",
        function () {

            if (messageInput) {
                messageInput.focus();
            }

        }
    );

}


// =====================================================
// START
// =====================================================

setStatus("Ready");

console.log(
    "KAIRO app.js loaded successfully."
);
