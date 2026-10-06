var input = document.getElementById("messageInput");
var sendButton = document.getElementById("sendButton");
var chat = document.getElementById("chat");
var status = document.getElementById("status");

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

async function askKairo(message) {

    status.textContent = "Thinking...";

    try {

        var response = await fetch("/api/api", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: message,
                context: "",
                mode: "chat"
            })
        });

        var data = await response.json();

        if (!response.ok) {
            throw new Error("AI request failed");
        }

        addMessage(
            "assistant",
            data.reply
        );

        status.textContent = "Ready";

    } catch (error) {

        console.log(error);

        status.textContent = "Error";

        addMessage(
            "assistant",
            "KAIRO connection-e problem hoyeche."
        );
    }
}

function sendMessage() {

    var message = input.value.trim();

    if (!message) {
        return;
    }

    addMessage(
        "user",
        message
    );

    input.value = "";

    askKairo(message);
}

sendButton.onclick = sendMessage;

input.onkeydown = function(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();
    }
};

status.textContent = "Ready";
