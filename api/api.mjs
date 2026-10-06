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

        var mode = body.mode || "chat";


        if (!message) {

            return res.status(400).json({
                error: "Message is required"
            });
        }


        var apiKey =
            process.env.OPENROUTER_API_KEY;


        if (!apiKey) {

            return res.status(500).json({
                error:
                    "OPENROUTER_API_KEY is missing"
            });
        }


        var cleanApiKey =
            apiKey
                .replace(/[^\x00-\x7F]/g, "")
                .trim();


        if (mode !== "chat") {

            return res.status(400).json({
                error:
                    "Chat mode only for now"
            });
        }


        var systemPrompt =
            "You are KAIRO, a friendly AI companion.\n\n" +

            "Understand Bangla, Banglish, English and Hindi.\n" +

            "Understand casual messages, slang and imperfect spelling.\n\n" +

            "Reply naturally in the user's language.\n\n" +

            "Be friendly, concise and helpful.\n\n" +

            "Never invent information.\n\n" +

            "If you do not know something, say so honestly.\n\n" +

            "Do not give unnecessary safety warnings for normal harmless questions.";


        var response =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            cleanApiKey,

                        "HTTP-Referer":
                            "https://kairo.vercel.app",

                        "X-Title":
                            "KAIRO AI"
                    },

                    body: JSON.stringify({

                        model:
                            "openrouter/free",

                        messages: [

                            {
                                role:
                                    "system",

                                content:
                                    systemPrompt
                            },

                            {
                                role:
                                    "user",

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


        var data =
            await response.json();


        if (!response.ok) {

            console.log(
                "OPENROUTER ERROR:",
                JSON.stringify(data)
            );


            return res.status(
                response.status
            ).json({

                error:
                    data &&
                    data.error &&
                    data.error.message
                        ? data.error.message
                        : "OpenRouter request failed",

                code:
                    data &&
                    data.error &&
                    data.error.code
                        ? data.error.code
                        : response.status
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
                error:
                    "OpenRouter returned no AI reply"
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

            error:
                error &&
                error.message
                    ? error.message
                    : "KAIRO backend error"
        });
    }
                }
