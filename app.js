/* =========================================
   KAIRO AI — CORE ENGINE
   ========================================= */

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


/* =========================================
   STORAGE
   ========================================= */

const STORAGE = {
    conversations: "kairo_conversations_v1",
    memories: "kairo_memories_v1"
};


let conversations =
    JSON.parse(
        localStorage.getItem(STORAGE.conversations) || "[]"
    );

let memories =
    JSON.parse(
        localStorage.getItem(STORAGE.memories) || "[]"
    );


let currentConversation = {
    id: createId(),
    title: "New conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
};


/* =========================================
   ID
   ========================================= */

function createId() {

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8)
    );
}


/* =========================================
   SAVE STORAGE
   ========================================= */

function saveStorage() {

    localStorage.setItem(
        STORAGE.conversations,
        JSON.stringify(conversations)
    );

    localStorage.setItem(
        STORAGE.memories,
        JSON.stringify(memories)
    );
}


/* =========================================
   STATUS
   ========================================= */

function setStatus(text) {

    if (statusBox) {
        statusBox.textContent = text;
    }
}


/* =========================================
   ADD MESSAGE TO UI
   ========================================= */

function addMessage(text, type) {

    const message = document.createElement("div");

    message.className =
        "message " +
        (type === "user"
            ? "user-message"
            : "ai-message");

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;

    return message;
}


/* =========================================
   SAVE MESSAGE
   ========================================= */

function saveMessage(role, text) {

    currentConversation.messages.push({
        role,
        text,
        time: Date.now()
    });

    currentConversation.updatedAt = Date.now();

    if (
        currentConversation.title ===
        "New conversation" &&
        role === "user"
    ) {

        currentConversation.title =
            text.length > 45
                ? text.substring(0, 45) + "..."
                : text;
    }

    saveCurrentConversation();
}


/* =========================================
   SAVE CURRENT CONVERSATION
   ========================================= */

function saveCurrentConversation() {

    if (
        currentConversation.messages.length === 0
    ) {
        return;
    }

    const index =
        conversations.findIndex(
            item =>
                item.id === currentConversation.id
        );

    if (index === -1) {

        conversations.unshift(
            currentConversation
        );

    } else {

        conversations[index] =
            currentConversation;
    }

    /*
       Keep latest conversations first.
    */

    conversations.sort(
        (a, b) =>
            b.updatedAt - a.updatedAt
    );

    saveStorage();

    renderHistory();
}


/* =========================================
   MEMORY
   ========================================= */

function addMemory(text) {

    if (!text || !text.trim()) {
        return;
    }

    const memory = {
        id: createId(),
        text: text.trim(),
        createdAt: Date.now()
    };

    memories.unshift(memory);

    /*
       Keep memory lightweight.
    */

    if (memories.length > 100) {
        memories =
            memories.slice(0, 100);
    }

    saveStorage();
}


/* =========================================
   SEARCH RELEVANT HISTORY
   ========================================= */

function findRelevantHistory(query) {

    if (!query || !query.trim()) {
        return [];
    }

    const words =
        query
            .toLowerCase()
            .split(/\s+/)
            .filter(
                word =>
                    word.length >= 3
            );

    if (!words.length) {
        return [];
    }

    const results = [];

    conversations.forEach(conversation => {

        let score = 0;

        conversation.messages.forEach(message => {

            const text =
                message.text.toLowerCase();

            words.forEach(word => {

                if (text.includes(word)) {
                    score++;
                }

            });

        });

        if (score > 0) {

            results.push({
                conversation,
                score
            });
        }

    });

    results.sort(
        (a, b) =>
            b.score - a.score
    );

    return results
        .slice(0, 5)
        .map(item => item.conversation);
}


/* =========================================
   GET MEMORY CONTEXT
   ========================================= */

function getRelevantMemory(query) {

    if (!memories.length) {
        return [];
    }

    const words =
        query
            .toLowerCase()
            .split(/\s+/)
            .filter(
                word =>
                    word.length >= 3
            );

    return memories
        .filter(memory => {

            const text =
                memory.text.toLowerCase();

            return words.some(
                word =>
                    text.includes(word)
            );

        })
        .slice(0, 10);
}


/* =========================================
   BUILD AI CONTEXT
   ========================================= */

function buildContext(userMessage) {

    const oldConversations =
        findRelevantHistory(
            userMessage
        );

    const oldMemories =
        getRelevantMemory(
            userMessage
        );

    return {

        currentConversation:
            currentConversation.messages,

        memories:
            oldMemories,

        relevantHistory:
            oldConversations

    };
}


/* =========================================
   SIMPLE LOCAL RESPONSE
   ========================================= */

function localResponse(message) {

    const text =
        message.toLowerCase().trim();


    if (
        text.includes("hello") ||
        text.includes("hi") ||
        text.includes("hey")
    ) {

        return "Hey! আমি KAIRO 🤖 তোমার সাথে কথা বলার জন্য ready আছি।";
    }


    if (
        text.includes("kairo")
    ) {

        return "আমি KAIRO। এখন আমার basic brain তৈরি হচ্ছে। পরের ধাপে আমাকে real AI-এর সাথে connect করা হবে।";
    }


    if (
        text.includes("history")
    ) {

        return "History system active. পুরোনো conversation save করার ব্যবস্থা আছে।";
    }


    if (
        text.includes("memory")
    ) {

        return "Memory system-ও তৈরি হচ্ছে। গুরুত্বপূর্ণ তথ্য আলাদাভাবে মনে রাখার ব্যবস্থা থাকবে।";
    }


    return (
        "আমি তোমার কথাটা বুঝেছি। " +
        "এখন KAIRO-এর local brain active আছে। " +
        "Real AI connection যোগ হলে আমি প্রশ্নের proper AI answer দিতে পারব।"
    );
}


/* =========================================
   SEND MESSAGE
   ========================================= */

async function sendMessage() {

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }


    /*
       Show user message
    */

    addMessage(
        text,
        "user"
    );

    saveMessage(
        "user",
        text
    );


    messageInput.value = "";

    setStatus("Thinking...");


    /*
       Search old history + memory
       before generating answer.
    */

    const context =
        buildContext(text);


    /*
       Temporary local response.
       Later this section will call
       the real KAIRO backend.
    */

    await wait(500);


    const answer =
        localResponse(text);


    addMessage(
        answer,
        "ai"
    );

    saveMessage(
        "ai",
        answer
    );


    setStatus("Ready");


    /*
       Voice reply foundation
    */

    speak(answer);
}


/* =========================================
   DELAY
   ========================================= */

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


/* =========================================
   HISTORY UI
   ========================================= */

function openHistoryPanel() {

    historyPanel.classList.add("open");

    historyBackdrop.classList.add("show");

    historyPanel.setAttribute(
        "aria-hidden",
        "false"
    );

    renderHistory();
}


function closeHistoryPanel() {

    historyPanel.classList.remove("open");

    historyBackdrop.classList.remove("show");

    historyPanel.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================
   RENDER HISTORY
   ========================================= */

function renderHistory(filter = "") {

    historyList.innerHTML = "";


    const search =
        filter
            .toLowerCase()
            .trim();


    const filtered =
        conversations.filter(
            conversation => {

                if (!search) {
                    return true;
                }

                return (
                    conversation.title
                        .toLowerCase()
                        .includes(search)
                    ||
                    conversation.messages.some(
                        message =>
                            message.text
                                .toLowerCase()
                                .includes(search)
                    )
                );

            }
        );


    if (!filtered.length) {

        historyList.innerHTML = `

            <div class="empty-history">

                <div class="empty-icon">
                    ◷
                </div>

                <h3>No conversations yet</h3>

                <p>
                    Your conversations will
                    appear here automatically.
                </p>

            </div>

        `;

        return;
    }


    filtered.forEach(
        conversation => {

            const item =
                document.createElement(
                    "button"
                );

            item.className =
                "history-item";

            item.type = "button";

            item.textContent =
                conversation.title;


            item.addEventListener(
                "click",
                () => {

                    loadConversation(
                        conversation.id
                    );

                    closeHistoryPanel();

                }
            );


            historyList.appendChild(
                item
            );

        }
    );
}


/* =========================================
   LOAD CONVERSATION
   ========================================= */

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
                message.role
            );

        });


    setStatus("Memory loaded");
}


/* =========================================
   NEW CONVERSATION
   ========================================= */

function newConversation() {

    currentConversation = {

        id: createId(),

        title:
            "New conversation",

        messages: [],

        createdAt:
            Date.now(),

        updatedAt:
            Date.now()

    };


    chat.innerHTML = "";


    const welcome =
        document.createElement(
            "div"
        );

    welcome.className =
        "welcome";


    welcome.innerHTML = `

        <div class="big-logo">
            K
        </div>

        <h2>Hello, I'm KAIRO</h2>

        <p>Your AI companion is ready.</p>

        <p class="small-text">
            Ask me anything or talk to me.
        </p>

    `;


    chat.appendChild(
        welcome
    );


    setStatus("Ready");
}


/* =========================================
   VOICE INPUT
   ========================================= */

let recognition = null;


if (
    "webkitSpeechRecognition" in window ||
    "SpeechRecognition" in window
) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    recognition =
        new SpeechRecognition();


    recognition.lang =
        "bn-BD";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.onstart =
        function () {

            micButton.classList.add(
                "listening"
            );

            setStatus(
                "Listening..."
            );

        };


    recognition.onend =
        function () {

            micButton.classList.remove(
                "listening"
            );

            setStatus(
                "Ready"
            );

        };


    recognition.onerror =
        function () {

            micButton.classList.remove(
                "listening"
            );

            setStatus(
                "Voice error"
            );

        };


    recognition.onresult =
        function (event) {

            const result =
                event.results[0][0].transcript;


            messageInput.value =
                result;


            messageInput.focus();

        };

}


/* =========================================
   START LISTENING
   ========================================= */

function startListening() {

    if (!recognition) {

        setStatus(
            "Voice unavailable"
        );

        return;
    }


    try {

        recognition.start();

    } catch (error) {

        /*
           Browser may already be listening.
        */

    }
}


/* =========================================
   TEXT TO SPEECH
   ========================================= */

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }


    speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang =
        "bn-BD";


    utterance.rate =
        0.95;


    utterance.pitch =
        1;


    speechSynthesis.speak(
        utterance
    );
}


/* =========================================
   EVENTS
   ========================================= */

sendButton.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
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


micButton.addEventListener(
    "click",
    startListening
);


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


historySearch.addEventListener(
    "input",
    event => {

        renderHistory(
            event.target.value
        );

    }
);


floatingKairo.addEventListener(
    "click",
    () => {

        messageInput.focus();

    }
);


/* =========================================
   INITIALIZE
   ========================================= */

renderHistory();

setStatus("Ready");