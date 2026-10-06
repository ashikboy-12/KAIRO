var input = document.getElementById("messageInput");
var sendButton = document.getElementById("sendButton");
var chat = document.getElementById("chat");
var status = document.getElementById("status");

var isSending = false;


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

        var response = await fetch(
            "/api/api",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message,
                    context: "",
                    mode: "chat"
                })
            }
        );


        var rawText = await response.text();

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

            data = JSON.parse(rawText);

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

        status.textContent = "Ready";


    } catch (error) {

        console.log(
            "KAIRO ERROR:",
            error
        );

        status.textContent = "Error";


        var errorMessage =
            error &&
            error.message
                ? error.message
                : "Unknown error";


        addMessage(
            "assistant",
            "KAIRO: " + errorMessage
        );

    }

}


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

    sendButton.disabled = true;


    addMessage(
        "user",
        message
    );


    input.value = "";


    await askKairo(message);


    isSending = false;

    sendButton.disabled = false;

    input.focus();

}


sendButton.onclick =
    sendMessage;


input.onkeydown =
    function(event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    };


status.textContent =
    "Ready";
