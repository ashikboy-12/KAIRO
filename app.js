/* =========================================================
   KAIRO AI
   CHAT + MEMORY + HISTORY + VOICE INPUT
   + STRONG MOBILE DRAG BUBBLE
========================================================= */


/* =========================================================
   ELEMENTS
========================================================= */

const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const send = document.getElementById("sendButton");
const mic = document.getElementById("micButton");

const historyBtn =
    document.getElementById("historyButton");

const panel =
    document.getElementById("historyPanel");

const back =
    document.getElementById("historyBackdrop");

const list =
    document.getElementById("historyList");

const floatingKairo =
    document.getElementById("floatingKairo");


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


let current = null;

let listening = false;


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

    const t =
        text.toLowerCase();


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


    return (
        text.slice(0, 24) ||
        "New Chat"
    );
}


/* =========================================================
   MESSAGE BUBBLE
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
   MEMORY DETECTION
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

        const match =
            text.match(pattern);


        if (
            match &&
            match[1]
        ) {

            const memory =
                text.trim();


            if (
                !memories.includes(memory)
            ) {

                memories.push(memory);

                saveData();
            }


            break;
        }
    }
}


/* =========================================================
   MEMORY TEXT
========================================================= */

function getMemoryText() {

    if (!memories.length) {

        return "No saved memories yet.";
    }


    return memories

        .map(
            (memory, index) =>
                `${index + 1}. ${memory}`
        )

        .join("\n");
}


/* =========================================================
   OLD CHAT CONTEXT
========================================================= */

function getOldContext() {

    return chats

        .filter(
            chatItem =>
                !current ||
                chatItem.id !== current.id
        )

        .slice(0, 5)

        .map(chatItem => {

            const messages =
                chatItem.messages
                    .slice(-2)
                    .map(
                        message =>
                            message.text
                    )
                    .join(" | ");


            return (
                chatItem.title +
                ": " +
                messages
            );
        })

        .join("\n");
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

    const text =
        input.value.trim();


    if (!text)
        return;


    if (!current)
        newChat();


    if (
        current.title === "New Chat"
    ) {

        current.title =
            getTitle(text);
    }


    detectMemory(text);


    current.messages.push({

        role: "user",

        text: text
    });


    bubble(
        text,
        "user"
    );


    input.value = "";


    const thinking =
        document.createElement("div");


    thinking.className =
        "message ai";


    thinking.textContent =
        "Thinking...";


    chat.appendChild(
        thinking
    );


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

                            context:
                                getOldContext(),

                            memory:
                                getMemoryText()
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


        bubble(
            reply,
            "ai"
        );


        saveData();


    } catch (error) {

        console.error(
            "KAIRO ERROR:",
            error
        );


        thinking.textContent =
            "Connection problem.";
    }
}


/* =========================================================
   CLOSE HISTORY
========================================================= */

function closePanel() {

    if (panel) {

        panel.setAttribute(
            "aria-hidden",
            "true"
        );
    }


    if (back) {

        back.setAttribute(
            "aria-hidden",
            "true"
        );
    }
}


/* =========================================================
   OPEN HISTORY
========================================================= */

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


    list.appendChild(
        search
    );


    const newButton =
        document.createElement("button");


    newButton.className =
        "kairo-history-new";


    newButton.textContent =
        "+ New Chat";


    list.appendChild(
        newButton
    );


    const memoryButton =
        document.createElement("button");


    memoryButton.className =
        "kairo-history-new";


    memoryButton.textContent =
        "🧠 Memory";


    list.appendChild(
        memoryButton
    );


    const box =
        document.createElement("div");


    list.appendChild(
        box
    );


    function renderHistory(
        query = ""
    ) {

        box.innerHTML = "";


        chats

            .filter(item => {

                const content =
                    (
                        item.title +
                        " " +
                        item.messages
                            .map(
                                message =>
                                    message.text
                            )
                            .join(" ")
                    ).toLowerCase();


                return content.includes(
                    query.toLowerCase()
                );
            })


            .forEach(item => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.className =
                    "kairo-history-card";


                button.textContent =
                    item.title;


                button.onclick = () => {

                    loadChat(
                        item.id
                    );
                };


                box.appendChild(
                    button
                );
            });
    }


    search.oninput = () => {

        renderHistory(
            search.value
        );
    };


    newButton.onclick = () => {

        newChat();

        closePanel();
    };


    memoryButton.onclick =
        openMemory;


    renderHistory();


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


    list.appendChild(
        title
    );


    const subtitle =
        document.createElement("div");


    subtitle.className =
        "history-subtitle";


    subtitle.textContent =
        "Things KAIRO remembers";


    list.appendChild(
        subtitle
    );


    memories.forEach(
        (memory, index) => {

            const row =
                document.createElement(
                    "div"
                );


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


            list.appendChild(
                row
            );
        }
    );


    if (!memories.length) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "history-subtitle";


        empty.style.marginTop =
            "20px";


        empty.textContent =
            "No memories saved yet.";


        list.appendChild(
            empty
        );
    }
}


/* =========================================================
   LOAD CHAT
========================================================= */

function loadChat(id) {

    current =
        chats.find(
            item =>
                item.id === id
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
   VOICE INPUT
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

                const result =
                    event
                        .results[0][0]
                        .transcript;


                input.value =
                    result;


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
   BASIC BUTTON EVENTS
========================================================= */

if (send) {

    send.onclick =
        sendMessage;
}


if (historyBtn) {

    historyBtn.onclick =
        openHistory;
}


if (back) {

    back.onclick =
        closePanel;
}


/* =========================================================
   ENTER TO SEND
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
   KAIRO BUBBLE
   STRONG MOBILE TOUCH DRAG
========================================================= */

if (floatingKairo) {

    let dragging = false;

    let moved = false;


    let pointerStartX = 0;

    let pointerStartY = 0;


    let bubbleStartX = 0;

    let bubbleStartY = 0;


    function getBubblePosition() {

        const rect =
            floatingKairo.getBoundingClientRect();


        return {

            x: rect.left,

            y: rect.top,

            width: rect.width,

            height: rect.height
        };
    }


    floatingKairo.style.touchAction =
        "none";


    floatingKairo.style.userSelect =
        "none";


    floatingKairo.style.webkitUserSelect =
        "none";


    floatingKairo.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();


            const position =
                getBubblePosition();


            dragging = true;

            moved = false;


            pointerStartX =
                event.clientX;


            pointerStartY =
                event.clientY;


            bubbleStartX =
                position.x;


            bubbleStartY =
                position.y;


            floatingKairo.style.left =
                position.x + "px";


            floatingKairo.style.top =
                position.y + "px";


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


            const moveX =
                event.clientX -
                pointerStartX;


            const moveY =
                event.clientY -
                pointerStartY;


            if (
                Math.abs(moveX) > 3 ||
                Math.abs(moveY) > 3
            ) {

                moved = true;
            }


            const width =
                floatingKairo.offsetWidth;


            const height =
                floatingKairo.offsetHeight;


            const maxX =
                window.innerWidth -
                width;


            const maxY =
                window.innerHeight -
                height;


            let newX =
                bubbleStartX +
                moveX;


            let newY =
                bubbleStartY +
                moveY;


            newX =
                Math.max(
                    0,
                    Math.min(
                        maxX,
                        newX
                    )
                );


            newY =
                Math.max(
                    0,
                    Math.min(
                        maxY,
                        newY
                    )
                );


            floatingKairo.style.left =
                newX + "px";


            floatingKairo.style.top =
                newY + "px";


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


            /*
              Tap/Voice Mode আমরা পরের ধাপে
              আলাদাভাবে connect করব।
            */
        }
    );


    floatingKairo.addEventListener(
        "pointercancel",
        () => {

            dragging = false;
        }
    );


    floatingKairo.addEventListener(
        "lostpointercapture",
        () => {

            dragging = false;
        }
    );
}


/* =========================================================
   RESTORE LAST CHAT
========================================================= */

if (chats.length) {

    current =
        chats[0];
}


/* =========================================================
   DONE
========================================================= */

console.log(
    "KAIRO initialized successfully."
);
