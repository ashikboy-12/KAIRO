const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const send = document.getElementById("sendButton");
const mic = document.getElementById("micButton");

const historyBtn = document.getElementById("historyButton");
const panel = document.getElementById("historyPanel");
const back = document.getElementById("historyBackdrop");
const list = document.getElementById("historyList");

const floatingKairo = document.getElementById("floatingKairo");
const miniVoiceButton = document.getElementById("miniVoiceButton");

const voiceMode = document.getElementById("voiceMode");
const voiceLogo = document.getElementById("voiceLogo");
const voiceStatus = document.getElementById("voiceStatus");
const voiceSubtitle = document.getElementById("voiceSubtitle");
const closeVoiceButton =
    document.getElementById("closeVoiceButton");


/* =========================================================
   STORAGE
========================================================= */

const HISTORY_KEY = "kairo_history";
const MEMORY_KEY = "kairo_memory";

let chats =
    JSON.parse(
        localStorage.getItem(HISTORY_KEY) || "[]"
    );

let memories =
    JSON.parse(
        localStorage.getItem(MEMORY_KEY) || "[]"
    );

let current = chats[0] || null;

let listening = false;
let voiceRecognition = null;


/* =========================================================
   SAVE
========================================================= */

function saveData() {

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(chats)
    );

    localStorage.setItem(
        MEMORY_KEY,
        JSON.stringify(memories)
    );
}


/* =========================================================
   NEW CHAT
========================================================= */

function newChat() {

    current = {
        id: Date.now(),
        title: "New Chat",
        messages: []
    };

    chats.unshift(current);

    saveData();

    chat.innerHTML = "";
}


/* =========================================================
   CHAT TITLE
========================================================= */

function getTitle(text) {

    const t = text.toLowerCase();

    if (t.includes("anime"))
        return "Anime";

    if (
        t.includes("trading") ||
        t.includes("trade") ||
        t.includes("forex")
    )
        return "Trading";

    if (
        t.includes("study") ||
        t.includes("ssc") ||
        t.includes("exam") ||
        t.includes("math") ||
        t.includes("physics") ||
        t.includes("chemistry")
    )
        return "Study";

    if (
        t.includes("game") ||
        t.includes("gaming") ||
        t.includes("free fire") ||
        t.includes("efootball")
    )
        return "Gaming";

    if (
        t.includes("code") ||
        t.includes("coding") ||
        t.includes("html") ||
        t.includes("javascript") ||
        t.includes("app")
    )
        return "Coding";

    return text.slice(0, 24) || "New Chat";
}


/* =========================================================
   MESSAGE
========================================================= */

function bubble(text, who) {

    const element =
        document.createElement("div");

    element.className =
        "message " + who;

    element.textContent =
        text;

    chat.appendChild(element);

    chat.scrollTop =
        chat.scrollHeight;
}


/* =========================================================
   MEMORY
========================================================= */

function detectMemory(text) {

    const patterns = [
        /my name is (.+)/i,
        /amar nam (.+)/i,
        /i am (.+)/i,
        /i live in (.+)/i,
        /i like (.+)/i,
        /i love (.+)/i,
        /my favorite (.+)/i,
        /amar favourite (.+)/i,
        /amar favorite (.+)/i
    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match && match[1]) {

            const memory = text.trim();

            if (!memories.includes(memory)) {

                memories.push(memory);

                saveData();
            }

            break;
        }
    }
}


function getMemoryText() {

    if (!memories.length)
        return "No saved memories yet.";

    return memories
        .map(
            (memory, index) =>
                `${index + 1}. ${memory}`
        )
        .join("\n");
}


/* =========================================================
   OLD CONTEXT
========================================================= */

function getOldContext() {

    return chats
        .filter(
            item =>
                !current ||
                item.id !== current.id
        )
        .slice(0, 5)
        .map(item => {

            const recent =
                item.messages
                    .slice(-2)
                    .map(message => message.text)
                    .join(" | ");

            return item.title + ": " + recent;
        })
        .join("\n");
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage(textOverride = null) {

    const text =
        textOverride !== null
            ? textOverride.trim()
            : input.value.trim();

    if (!text)
        return;


    if (!current)
        newChat();


    if (current.title === "New Chat")
        current.title = getTitle(text);


    detectMemory(text);


    current.messages.push({
        role: "user",
        text: text
    });


    bubble(text, "user");


    if (textOverride === null)
        input.value = "";


    const thinking =
        document.createElement("div");

    thinking.className =
        "message ai";

    thinking.textContent =
        "Thinking...";

    chat.appendChild(thinking);

    chat.scrollTop =
        chat.scrollHeight;


    try {

        const response =
            await fetch(
                "/api/api",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            message: text,
                            context: getOldContext(),
                            memory: getMemoryText()
                        })
                }
            );


        const data =
            await response.json();


        thinking.remove();


        const reply =
            data.reply ||
            "Sorry, I couldn't answer that.";


        current.messages.push({
            role: "assistant",
            text: reply
        });


        bubble(reply, "ai");

        saveData();


    } catch (error) {

        console.error(
            "KAIRO:",
            error
        );

        thinking.textContent =
            "Connection problem.";
    }
}


/* =========================================================
   HISTORY
========================================================= */

function closePanel() {

    if (panel)
        panel.setAttribute(
            "aria-hidden",
            "true"
        );

    if (back)
        back.setAttribute(
            "aria-hidden",
            "true"
        );
}


function openHistory() {

    if (!list)
        return;


    list.innerHTML = "";


    const search =
        document.createElement("input");

    search.className =
        "kairo-history-search";

    search.placeholder =
        "Search chats...";

    list.appendChild(search);


    const newButton =
        document.createElement("button");

    newButton.className =
        "kairo-history-new";

    newButton.textContent =
        "+ New Chat";

    list.appendChild(newButton);


    const memoryButton =
        document.createElement("button");

    memoryButton.className =
        "kairo-history-new";

    memoryButton.textContent =
        "🧠 Memory";

    list.appendChild(memoryButton);


    const box =
        document.createElement("div");

    list.appendChild(box);


    function render(query = "") {

        box.innerHTML = "";


        chats
            .filter(item => {

                const content =
                    (
                        item.title +
                        " " +
                        item.messages
                            .map(m => m.text)
                            .join(" ")
                    ).toLowerCase();

                return content.includes(
                    query.toLowerCase()
                );
            })
            .forEach(item => {

                const button =
                    document.createElement("button");

                button.className =
                    "kairo-history-card";

                button.textContent =
                    item.title;

                button.onclick = () =>
                    loadChat(item.id);

                box.appendChild(button);
            });
    }


    search.oninput = () =>
        render(search.value);


    newButton.onclick = () => {

        newChat();

        closePanel();
    };


    memoryButton.onclick =
        openMemory;


    render();


    panel.setAttribute(
        "aria-hidden",
        "false"
    );

    back.setAttribute(
        "aria-hidden",
        "false"
    );
}


/* =========================================================
   MEMORY PANEL
========================================================= */

function openMemory() {

    list.innerHTML = "";


    const title =
        document.createElement("div");

    title.className =
        "history-title";

    title.textContent =
        "🧠 KAIRO Memory";

    list.appendChild(title);


    const info =
        document.createElement("div");

    info.className =
        "history-subtitle";

    info.textContent =
        "Things KAIRO remembers";

    list.appendChild(info);


    memories.forEach(
        (memory, index) => {

            const row =
                document.createElement("div");

            row.className =
                "kairo-history-card";

            row.textContent =
                memory;


            row.onclick = () => {

                if (
                    confirm(
                        "Delete this memory?"
                    )
                ) {

                    memories.splice(
                        index,
                        1
                    );

                    saveData();

                    openMemory();
                }
            };


            list.appendChild(row);
        }
    );


    if (!memories.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "history-subtitle";

        empty.style.marginTop =
            "20px";

        empty.textContent =
            "No memories saved yet.";

        list.appendChild(empty);
    }
}


/* =========================================================
   LOAD CHAT
========================================================= */

function loadChat(id) {

    current =
        chats.find(
            item => item.id === id
        );


    chat.innerHTML = "";


    if (current) {

        current.messages.forEach(
            message => {

                bubble(
                    message.text,
                    message.role === "user"
                        ? "user"
                        : "ai"
                );
            }
        );
    }


    closePanel();
}


/* =========================================================
   VOICE MODE UI
========================================================= */

function openVoiceMode() {

    if (!voiceMode)
        return;


    voiceMode.classList.add("active");

    voiceMode.setAttribute(
        "aria-hidden",
        "false"
    );


    if (voiceStatus)
        voiceStatus.textContent =
            "Listening...";


    if (voiceSubtitle)
        voiceSubtitle.textContent =
            "Talk to KAIRO";


    startVoiceListening();
}


function closeVoiceMode() {

    stopVoiceListening();


    if (!voiceMode)
        return;


    voiceMode.classList.remove(
        "active"
    );


    voiceMode.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================================================
   VOICE LISTENING
========================================================= */

function startVoiceListening() {

    if (
        !(
            "webkitSpeechRecognition"
            in window
        )
    ) {

        if (voiceStatus)
            voiceStatus.textContent =
                "Voice recognition unavailable.";

        return;
    }


    if (listening)
        return;


    voiceRecognition =
        new webkitSpeechRecognition();


    voiceRecognition.lang =
        "bn-BD";


    voiceRecognition.interimResults =
        false;


    voiceRecognition.continuous =
        false;


    listening = true;


    if (voiceStatus)
        voiceStatus.textContent =
            "Listening...";


    voiceRecognition.onresult =
        event => {

            const spokenText =
                event
                    .results[0][0]
                    .transcript
                    .trim();


            if (!spokenText)
                return;


            if (voiceStatus)
                voiceStatus.textContent =
                    "Thinking...";


            sendMessage(
                spokenText
            );
        };


    voiceRecognition.onerror =
        error => {

            console.log(
                "Voice error:",
                error
            );

            listening = false;


            if (voiceStatus)
                voiceStatus.textContent =
                    "Ready";
        };


    voiceRecognition.onend =
        () => {

            listening = false;
        };


    voiceRecognition.start();
}


function stopVoiceListening() {

    listening = false;


    if (voiceRecognition) {

        try {
            voiceRecognition.stop();
        } catch (error) {}

        voiceRecognition = null;
    }
}


/* =========================================================
   NORMAL MIC
========================================================= */

if (mic) {

    mic.onclick = () => {

        if (
            !(
                "webkitSpeechRecognition"
                in window
            )
        ) {

            alert(
                "Voice recognition is not supported."
            );

            return;
        }


        if (listening)
            return;


        const recognition =
            new webkitSpeechRecognition();


        recognition.lang =
            "bn-BD";


        recognition.interimResults =
            false;


        recognition.continuous =
            false;


        listening = true;


        recognition.onresult =
            event => {

                input.value =
                    event
                        .results[0][0]
                        .transcript;

                sendMessage();
            };


        recognition.onerror =
            () => {

                listening = false;
            };


        recognition.onend =
            () => {

                listening = false;
            };


        recognition.start();
    };
}


/* =========================================================
   BUTTONS
========================================================= */

if (send)
    send.onclick =
        () => sendMessage();


if (historyBtn)
    historyBtn.onclick =
        openHistory;


if (back)
    back.onclick =
        closePanel;


if (closeVoiceButton)
    closeVoiceButton.onclick =
        closeVoiceMode;


if (voiceLogo)
    voiceLogo.onclick =
        closeVoiceMode;


if (miniVoiceButton)
    miniVoiceButton.onclick =
        openVoiceMode;


/* =========================================================
   ENTER
========================================================= */

if (input) {

    input.addEventListener(
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
}


/* =========================================================
   DRAGGABLE KAIRO BUBBLE
========================================================= */

if (floatingKairo) {

    let dragging = false;

    let moved = false;

    let startX = 0;
    let startY = 0;

    let startLeft = 0;
    let startTop = 0;


    floatingKairo.style.touchAction =
        "none";


    floatingKairo.style.userSelect =
        "none";


    floatingKairo.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();


            const rect =
                floatingKairo.getBoundingClientRect();


            dragging = true;

            moved = false;


            startX =
                event.clientX;

            startY =
                event.clientY;


            startLeft =
                rect.left;

            startTop =
                rect.top;


            floatingKairo.style.left =
                rect.left + "px";

            floatingKairo.style.top =
                rect.top + "px";

            floatingKairo.style.right =
                "auto";

            floatingKairo.style.bottom =
                "auto";


            floatingKairo.setPointerCapture(
                event.pointerId
            );
        }
    );


    floatingKairo.addEventListener(
        "pointermove",
        event => {

            if (!dragging)
                return;


            event.preventDefault();


            const dx =
                event.clientX - startX;

            const dy =
                event.clientY - startY;


            if (
                Math.abs(dx) > 4 ||
                Math.abs(dy) > 4
            ) {

                moved = true;
            }


            const maxX =
                window.innerWidth -
                floatingKairo.offsetWidth;


            const maxY =
                window.innerHeight -
                floatingKairo.offsetHeight;


            let x =
                startLeft + dx;

            let y =
                startTop + dy;


            x =
                Math.max(
                    0,
                    Math.min(maxX, x)
                );


            y =
                Math.max(
                    0,
                    Math.min(maxY, y)
                );


            floatingKairo.style.left =
                x + "px";

            floatingKairo.style.top =
                y + "px";

            floatingKairo.style.right =
                "auto";

            floatingKairo.style.bottom =
                "auto";
        }
    );


    floatingKairo.addEventListener(
        "pointerup",
        event => {

            if (!dragging)
                return;


            dragging = false;


            try {

                floatingKairo.releasePointerCapture(
                    event.pointerId
                );

            } catch (error) {}


            if (!moved) {

                openVoiceMode();
            }
        }
    );


    floatingKairo.addEventListener(
        "pointercancel",
        () => {

            dragging = false;
        }
    );
}


/* =========================================================
   START
========================================================= */

if (chats.length) {

    current = chats[0];
}


console.log(
    "KAIRO Voice Mode ready."
);
