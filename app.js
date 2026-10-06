// ========================================
// KAIRO APP.JS
// CHAT + HISTORY + FLOATING BUBBLE
// ========================================


// ========================================
// ELEMENTS
// ========================================

var input = document.getElementById("messageInput");
var sendButton = document.getElementById("sendButton");
var chat = document.getElementById("chat");
var status = document.getElementById("status");

var historyButton = document.getElementById("historyButton");
var historyPanel = document.getElementById("historyPanel");
var closeHistory = document.getElementById("closeHistory");
var historyBackdrop = document.getElementById("historyBackdrop");

var floatingKairo = document.getElementById("floatingKairo");

var voiceMode = document.getElementById("voiceMode");
var voiceCloseButton = document.getElementById("voiceCloseButton");
var voiceMinimizeButton = document.getElementById("voiceMinimizeButton");
var miniVoiceButton = document.getElementById("miniVoiceButton");


// ========================================
// STATE
// ========================================

var isSending = false;

var historyItems = [];

var isDraggingBubble = false;
var bubbleMoved = false;

var dragStartX = 0;
var dragStartY = 0;

var bubbleStartX = 0;
var bubbleStartY = 0;


// ========================================
// CHAT MESSAGE
// ========================================

function addMessage(type, text) {

    var message = document.createElement("div");

    if (type === "user") {
        message.className = "message user-message";
    } else {
        message.className = "message ai-message";
    }

    var bubble = document.createElement("div");

    bubble.className = "message-bubble";

    bubble.textContent = text;

    message.appendChild(bubble);

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


// ========================================
// HISTORY SAVE
// ========================================

function saveHistory(userText, aiText) {

    var item = {
        user: userText,
        ai: aiText,
        time: new Date().toLocaleString()
    };

    historyItems.unshift(item);

    renderHistory();
}


// ========================================
// RENDER HISTORY
// ========================================

function renderHistory(searchText) {

    var list = document.getElementById("historyList");

    if (!list) {
        return;
    }

    list.innerHTML = "";

    var search =
        searchText
            ? searchText.toLowerCase()
            : "";


    var filtered =
        historyItems.filter(function(item) {

            return (
                item.user
                    .toLowerCase()
                    .includes(search)
                ||
                item.ai
                    .toLowerCase()
                    .includes(search)
            );

        });


    if (filtered.length === 0) {

        var empty =
            document.createElement("div");

        empty.className =
            "empty-history";

        empty.innerHTML =
            "<div class='empty-icon'>◷</div>" +
            "<h3>No conversations yet</h3>" +
            "<p>Your conversations will appear here.</p>";

        list.appendChild(empty);

        return;
    }


    filtered.forEach(function(item) {

        var historyItem =
            document.createElement("div");

        historyItem.className =
            "history-item";


        historyItem.innerHTML =
            "<div class='history-user'>" +
            escapeHtml(item.user) +
            "</div>" +

            "<div class='history-ai'>" +
            escapeHtml(item.ai) +
            "</div>" +

            "<div class='history-time'>" +
            escapeHtml(item.time) +
            "</div>";


        list.appendChild(historyItem);

    });
}


// ========================================
// HTML ESCAPE
// ========================================

function escapeHtml(text) {

    var div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ========================================
// OPEN HISTORY
// ========================================

function openHistoryPanel() {

    if (!historyPanel) {
        return;
    }

    historyPanel.classList.add("open");

    historyPanel.setAttribute(
        "aria-hidden",
        "false"
    );


    if (historyBackdrop) {

        historyBackdrop.classList.add("open");

    }


    renderHistory();
}


// ========================================
// CLOSE HISTORY
// ========================================

function closeHistoryPanel() {

    if (!historyPanel) {
        return;
    }

    historyPanel.classList.remove("open");

    historyPanel.setAttribute(
        "aria-hidden",
        "true"
    );


    if (historyBackdrop) {

        historyBackdrop.classList.remove("open");

    }
}


// ========================================
// HISTORY BUTTON
// ========================================

if (historyButton) {

    historyButton.addEventListener(
        "click",
        function() {

            openHistoryPanel();

        }
    );

}


// ========================================
// CLOSE HISTORY BUTTON
// ========================================

if (closeHistory) {

    closeHistory.addEventListener(
        "click",
        function() {

            closeHistoryPanel();

        }
    );

}


// ========================================
// HISTORY BACKDROP
// ========================================

if (historyBackdrop) {

    historyBackdrop.addEventListener(
        "click",
        function() {

            closeHistoryPanel();

        }
    );

}


// ========================================
// HISTORY SEARCH
// ========================================

var historySearch =
    document.getElementById("historySearch");


if (historySearch) {

    historySearch.addEventListener(
        "input",
        function() {

            renderHistory(
                historySearch.value
            );

        }
    );

}


// ========================================
// ASK KAIRO
// ========================================

async function askKairo(message) {

    status.textContent =
        "Thinking...";


    try {

        var response =
            await fetch(
                "/api/api",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        message: message,

                        context: "",

                        mode: "chat"

                    })
                }
            );


        var rawText =
            await response.text();


        console.log(
            "KAIRO RESPONSE STATUS:",
            response.status
        );


        console.log(
            "KAIRO RESPONSE:",
            rawText
        );


        var data;


        try {

            data =
                JSON.parse(rawText);

        } catch (jsonError) {

            throw new Error(
                "Server returned an invalid response."
            );

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "AI request failed."
            );

        }


        if (
            !data.reply ||
            typeof data.reply !== "string"
        ) {

            throw new Error(
                "KAIRO returned no reply."
            );

        }


        addMessage(
            "assistant",
            data.reply
        );


        saveHistory(
            message,
            data.reply
        );


        status.textContent =
            "Ready";


    } catch (error) {

        console.log(
            "KAIRO ERROR:",
            error
        );


        status.textContent =
            "Error";


        var errorMessage =
            error &&
            error.message
                ? error.message
                : "Unknown error";


        addMessage(
            "assistant",
            "KAIRO: " +
            errorMessage
        );

    }

}


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    if (isSending) {
        return;
    }


    var message =
        input.value.trim();


    if (!message) {
        return;
    }


    isSending = true;


    sendButton.disabled =
        true;


    addMessage(
        "user",
        message
    );


    input.value = "";


    await askKairo(message);


    isSending = false;


    sendButton.disabled =
        false;


    input.focus();

}


// ========================================
// SEND BUTTON
// ========================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        sendMessage
    );

}


// ========================================
// ENTER TO SEND
// ========================================

if (input) {

    input.addEventListener(
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

}


// ========================================
// VOICE MODE
// ========================================

function openVoiceMode() {

    if (!voiceMode) {
        return;
    }

    voiceMode.classList.add("active");

    voiceMode.setAttribute(
        "aria-hidden",
        "false"
    );

}


// ========================================
// CLOSE VOICE MODE
// ========================================

function closeVoiceMode() {

    if (!voiceMode) {
        return;
    }

    voiceMode.classList.remove("active");

    voiceMode.setAttribute(
        "aria-hidden",
        "true"
    );

}


// ========================================
// VOICE CLOSE
// ========================================

if (voiceCloseButton) {

    voiceCloseButton.addEventListener(
        "click",
        closeVoiceMode
    );

}


// ========================================
// VOICE MINIMIZE
// ========================================

if (voiceMinimizeButton) {

    voiceMinimizeButton.addEventListener(
        "click",
        function() {

            closeVoiceMode();

        }
    );

}


// ========================================
// MINI VOICE BUTTON
// ========================================

if (miniVoiceButton) {

    miniVoiceButton.addEventListener(
        "click",
        function() {

            openVoiceMode();

        }
    );

}


// ========================================
// FLOATING KAIRO BUBBLE
// ========================================

if (floatingKairo) {


    floatingKairo.addEventListener(
        "pointerdown",
        function(event) {

            isDraggingBubble =
                true;

            bubbleMoved =
                false;


            dragStartX =
                event.clientX;

            dragStartY =
                event.clientY;


            var rect =
                floatingKairo.getBoundingClientRect();


            bubbleStartX =
                rect.left;

            bubbleStartY =
                rect.top;


            floatingKairo.setPointerCapture(
                event.pointerId
            );


            floatingKairo.style.cursor =
                "grabbing";

        }
    );


    floatingKairo.addEventListener(
        "pointermove",
        function(event) {

            if (!isDraggingBubble) {
                return;
            }


            var dx =
                event.clientX -
                dragStartX;


            var dy =
                event.clientY -
                dragStartY;


            if (
                Math.abs(dx) > 5 ||
                Math.abs(dy) > 5
            ) {

                bubbleMoved =
                    true;

            }


            if (!bubbleMoved) {
                return;
            }


            var newX =
                bubbleStartX + dx;


            var newY =
                bubbleStartY + dy;


            var maxX =
                window.innerWidth -
                floatingKairo.offsetWidth -
                5;


            var maxY =
                window.innerHeight -
                floatingKairo.offsetHeight -
                5;


            newX =
                Math.max(
                    5,
                    Math.min(
                        newX,
                        maxX
                    )
                );


            newY =
                Math.max(
                    5,
                    Math.min(
                        newY,
                        maxY
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
        function(event) {

            if (!isDraggingBubble) {
                return;
            }


            isDraggingBubble =
                false;


            floatingKairo.style.cursor =
                "grab";


            try {

                floatingKairo.releasePointerCapture(
                    event.pointerId
                );

            } catch (e) {}


            if (!bubbleMoved) {

                openVoiceMode();

            }

        }
    );


    floatingKairo.addEventListener(
        "pointercancel",
        function() {

            isDraggingBubble =
                false;

            floatingKairo.style.cursor =
                "grab";

        }
    );

}


// ========================================
// START
// ========================================

renderHistory();

status.textContent =
    "Ready";

console.log(
    "KAIRO APP READY"
);
