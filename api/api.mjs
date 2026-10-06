export default async function handler(req, res) {

    try {

        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        var body = req.body || {};

        var message = body.message || "";
        var context = body.context || "";

        if (!message) {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        var apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OPENROUTER_API_KEY is missing"
            });
        }

        var cleanApiKey = apiKey
            .replace(/[^\x00-\x7F]/g, "")
            .trim();

        var systemPrompt =
            "You are KAIRO, a friendly AI companion.\n\n" +
            "Understand Bangla, Banglish, English and Hindi.\n" +
            "Understand casual messages, slang and imperfect spelling.\n" +
            "Reply naturally in the user's language.\n" +
            "Be friendly, concise and helpful.\n" +
            "Never invent information.\n" +
            "If you do not know something, say so honestly.";

        var response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + cleanApiKey,
                    "HTTP-Referer": "https://kairo.vercel.app",
                    "X-Title": "KAIRO AI"
                },

                body: JSON.stringify({
                    model: "openrouter/free",

                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content:
                                "RELEVANT PREVIOUS CONTEXT:\n" +
                                (
                                    context ||
                                    "No relevant previous conversation."
                                ) +
                                "\n\nCURRENT USER MESSAGE:\n" +
                                message
                        }
                    ]
                })
            }
        );

        var rawText = await response.text();

        console.log(
            "OPENROUTER STATUS:",
            response.status
        );

        console.log(
            "OPENROUTER RAW:",
            rawText
        );

        var data;

        try {
            data = JSON.parse(rawText);
        } catch (e) {
            data = {
                error: {
                    message: rawText
                }
            };
        }

        if (!response.ok) {

            var errorMessage =
                data &&
                data.error &&
                data.error.message
                    ? data.error.message
                    : rawText || "Unknown OpenRouter error";

            var errorCode =
                data &&
                data.error &&
                data.error.code
                    ? data.error.code
                    : response.status;

            console.log(
                "OPENROUTER ERROR MESSAGE:",
                errorMessage
            );

            console.log(
                "OPENROUTER ERROR CODE:",
                errorCode
            );

            return res.status(response.status).json({
                success: false,
                error: errorMessage,
                code: errorCode
            });
        }

        var reply =
            data &&
            data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            data.choices[0].message.content;

        if (!reply) {
            return res.status(500).json({
                error: "OpenRouter returned no AI reply",
                raw: rawText
            });
        }

        return res.status(200).json({
            success: true,
            reply: reply
        });

    } catch (error) {

        console.log(
            "KAIRO BACKEND ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error && error.message
                    ? error.message
                    : "KAIRO backend error"
        });
    }
}
