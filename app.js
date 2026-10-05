// ==========================================
// KAIRO - AI COMPANION
// ==========================================

// DOM
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const micButton = document.getElementById("micButton");
const chat = document.getElementById("chat");
const statusBox = document.getElementById("status");

const historyButton = document.getElementById("historyButton");
const historyPanel = document.getElementById("historyPanel");
const historyBackdrop = document.getElementById("historyBackdrop");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");

const floatingKairo = document.getElementById("floatingKairo");


// ==========================================
// STORAGE
// ==========================================

const CONVERSATION_KEY = "kairo_conversations_v1";
const MEMORY_KEY = "kairo_memories_v1";

let conversations = JSON.parse(
    localStorage.getItem(CONVERSATION_KEY) || "[]"
);

let memories = JSON.parse(
    localStorage.getItem(MEMORY_KEY) || "[]"
);


// ==========================================
// CURRENT CONVERSATION
// ==========================================

let currentConversation = {
    id: createId(),
    title: "New conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
};


function createId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}


function saveStorage() {
    localStorage.setItem(
        CONVERSATION_KEY,
        JSON.stringify(conversations)
    );

    localStorage.setItem(
        MEMORY_KEY,
        JSON.stringify(memories)
    );
}


function setStatus(text) {
    statusBox.textContent = text;
}


// ==========================================
// CHAT UI
// ==========================================

function addMessage(text, type) {
    const div = document.createElement("div");

    div.className =
        "message " +
        (type === "user"
            ? "user-message"
            : "ai-message");

    div.textContent = text;

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;
}


function saveMessage(role, text) {
    currentConversation.messages.push({
        role,
        text,
        time: Date.now()
    });

    if (
        role === "user" &&
        currentConversation.title === "New conversation"
    ) {
        currentConversation.title =
            text.length > 32
                ? text.slice(0, 32) + "..."
                : text;
    }

    currentConversation.updatedAt = Date.now();

    saveCurrentConversation();
}


function saveCurrentConversation() {
    const index = conversations.findIndex(
        item => item.id === currentConversation.id
    );

    if (index >= 0) {
        conversations[index] = currentConversation;
    } else {
        conversations.unshift(currentConversation);
    }

    conversations.sort(
        (a, b) => b.updatedAt - a.updatedAt
    );

    saveStorage();

    renderHistory(historySearch.value);
}


// ==========================================
// MEMORY
// ==========================================

function addMemory(text) {
    memories.unshift({
        id: createId(),
        text,
        createdAt: Date.now()
    });

    if (memories.length > 100) {
        memories = memories.slice(0, 100);
    }

    saveStorage();
}


// ==========================================
// AUTOMATIC HISTORY SEARCH
// ==========================================

function findRelevantHistory(query) {

    const words = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);

    const results = [];

    for (const conversation of conversations) {

        let score = 0;

        for (const message of conversation.messages) {

            const text =
                message.text.toLowerCase();

            for (const word of words) {

                if (text.includes(word)) {
                    score++;
                }
            }
        }

        if (score > 0) {

            results.push({
                conversation,
                score
            });
        }
    }

    results.sort(
        (a, b) => b.score - a.score
    );

    return results
        .slice(0, 5)
        .map(item => item.conversation);
}


function getRelevantMemory(query) {

    const words = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2);

    return memories
        .filter(memory =>
            words.some(word =>
                memory.text
                    .toLowerCase()
                    .includes(word)
            )
        )
        .slice(0, 10);
}


function buildContext(userMessage) {

    const relevantHistory =
        findRelevantHistory(userMessage);

    const relevantMemory =
        getRelevantMemory(userMessage);


    const historyText =
        relevantHistory
            .map(conversation =>
                conversation.messages
                    .map(message =>
                        `${message.role}: ${message.text}`
                    )
                    .join("\n")
            )
            .join("\n---\n");


    const memoryText =
        relevantMemory
            .map(memory => memory.text)
            .join("\n");


    const currentText =
        currentConversation.messages
            .map(message =>
                `${message.role}: ${message.text}`
            )
            .join("\n");


    return `
CURRENT CONVERSATION:
${currentText}

RELEVANT MEMORY:
${memoryText || "None"}

RELEVANT OLD HISTORY:
${historyText || "None"}
`;
}


// ==========================================
// REAL AI REQUEST
// ==========================================

async function askKairo(message, context) {

    const response = await fetch(
        "/api/api",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message,
                context
            })
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data?.error ||
            "KAIRO AI request failed"
        );
    }


    if (!data.reply) {

        throw new Error(
            "KAIRO did not receive an AI reply"
        );
    }


    return data.reply;
}


// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {

    const message =
        messageInput.value.trim();


    if (!message) {
        return;
    }


    addMessage(
        message,
        "user"
    );


    saveMessage(
        "user",
        message
    );


    messageInput.value = "";


    setStatus(
        "Thinking..."
    );


    try {

        const context =
            buildContext(message);


        const reply =
            await askKairo(
                message,
                context
            );


        addMessage(
            reply,
            "ai"
        );


        saveMessage(
            "assistant",
            reply
        );


        speak(reply);


        setStatus(
            "Ready"
        );


    } catch (error) {

        console.error(
            "KAIRO error:",
            error
        );


        const errorMessage =
            "Sorry, KAIRO AI connection-e ekta problem hoyeche. Ektu pore abar try koro.";


        addMessage(
            errorMessage,
            "ai"
        );


        setStatus(
            "Connection error"
        );
    }
}


// ==========================================
// HISTORY
// ==========================================

function openHistory() {

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

    renderHistory(
        historySearch.value
    );
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


function renderHistory(filter = "") {

    const query =
        filter.trim().toLowerCase();


    const filtered =
        conversations.filter(
            conversation => {

                if (!query) {
                    return true;
                }


                return (
                    conversation.title
                        .toLowerCase()
                        .includes(query) ||

                    conversation.messages.some(
                        message =>
                            message.text
                                .toLowerCase()
                                .includes(query)
                    )
                );
            }
        );


    if (filtered.length === 0) {

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


    filtered.forEach(
        conversation => {

            const item =
                document.createElement(
                    "button"
                );


            item.className =
                "history-item";


            item.type =
                "button";


            item.innerHTML = `
                <strong>
                    ${escapeHtml(
                        conversation.title
                    )}
                </strong>

                <span>
                    ${conversation.messages.length}
                    messages
                </span>
            `;


            item.addEventListener(
                "click",
                () => {

                    loadConversation(
                        conversation.id
                    );

                }
            );


            historyList.appendChild(
                item
            );
        }
    );
}


function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


function loadConversation(id) {

    const conversation =
        conversations.find(
            item =>
                item.id === id
        );


    if (!conversation) {
        return;
    }


    currentConversation =
        JSON.parse(
            JSON.stringify(
                conversation
            )
        );


    chat.innerHTML = "";


    currentConversation.messages
        .forEach(message => {

            addMessage(
                message.text,
                message.role === "user"
                    ? "user"
                    : "ai"
            );

        });


    closeHistoryPanel();


    setStatus(
        "Conversation loaded"
    );
}


// ==========================================
// NEW CONVERSATION
// ==========================================

function newConversation() {

    currentConversation = {

        id: createId(),

        title: "New conversation",

        messages: [],

        createdAt: Date.now(),

        updatedAt: Date.now()

    };


    chat.innerHTML = `

        <div class="welcome">

            <div class="big-logo">
                K
            </div>

            <h2>
                Hello, I'm KAIRO
            </h2>

            <p>
                Your AI companion is ready.
            </p>

            <p class="small-text">
                Ask me anything or talk to me.
            </p>

        </div>

    `;


    setStatus(
        "Ready"
    );
}


// ==========================================
// VOICE INPUT
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


let recognition = null;

let isListening = false;


if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();


    recognition.lang =
        "bn-BD";


    recognition.interimResults =
        false;


    recognition.continuous =
        false;


    recognition.onstart = () => {

        isListening =
            true;

        micButton.classList.add(
            "listening"
        );

        setStatus(
            "Listening..."
        );
    };


    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                    .transcript;


            messageInput.value =
                transcript;


            setStatus(
                "Ready"
            );
        };


    recognition.onerror =
        error => {

            console.error(
                "Voice error:",
                error
            );


            isListening =
                false;


            micButton.classList.remove(
                "listening"
            );


            setStatus(
                "Voice error"
            );
        };


    recognition.onend =
        () => {

            isListening =
                false;


            micButton.classList.remove(
                "listening"
            );


            if (
                statusBox.textContent ===
                "Listening..."
            ) {

                setStatus(
                    "Ready"
                );
            }
        };
}


function startListening() {

    if (!recognition) {

        setStatus(
            "Voice not supported"
        );

        return;
    }


    if (isListening) {

        recognition.stop();

        return;
    }


    try {

        recognition.start();

    } catch (error) {

        console.error(
            error
        );

        setStatus(
            "Voice error"
        );
    }
}


// ==========================================
// VOICE OUTPUT
// ==========================================

function speak(text) {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {
        return;
    }


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang =
        "bn-BD";


    utterance.rate =
        1;


    utterance.pitch =
        1;


    window.speechSynthesis.speak(
        utterance
    );
}


// ==========================================
// EVENTS
// ==========================================

sendButton.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }
    }
);


micButton.addEventListener(
    "click",
    startListening
);


historyButton.addEventListener(
    "click",
    openHistory
);


closeHistory.addEventListener(
    "click",
    closeHistoryPanel
);


historyBackdrop.addEventListener(
    "click",
    closeHistoryPanel
);


historySearch.addEventListener(
    "input",
    () => {

        renderHistory(
            historySearch.value
        );
    }
);


floatingKairo.addEventListener(
    "click",
    () => {

        messageInput.focus();

    }
);


// ==========================================
// START
// ==========================================

renderHistory();

setStatus(
    "Ready"
);
