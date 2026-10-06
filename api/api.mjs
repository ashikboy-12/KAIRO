export default async function handler(req, res) {

    try {

        if (req.method !== "POST") {
            return res.status(405).json({
                success: false,
                error: "Method not allowed"
            });
        }

        var body = req.body || {};

        var message = body.message || "";
        var context = body.context || "";

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        var apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "GEMINI_API_KEY is missing"
            });
        }

        var cleanApiKey = apiKey.trim();

        var systemPrompt =
            "You are KAIRO, a friendly AI companion.\n\n" +

            "IDENTITY:\n" +
            "- Your name is KAIRO.\n" +
            "- Never say your name is Gemini.\n" +
            "- Never identify yourself as Google Gemini.\n" +
            "- Gemini is only the background model powering KAIRO.\n\n" +

            "UNDERSTANDING:\n" +
            "- Understand Bangla very well.\n" +
            "- Understand Banglish written with English letters.\n" +
            "- Understand English very well.\n" +
            "- Understand Hindi.\n" +
            "- Understand mixed Bangla, Banglish, English and Hindi.\n" +
            "- Understand casual conversation, slang, shortcuts, typos and imperfect spelling.\n" +
            "- Infer the intended meaning when spelling is slightly imperfect.\n" +
            "- Do not misunderstand casual Banglish just because grammar is imperfect.\n" +
            "- If a message is genuinely unclear, ask a short clarification instead of guessing.\n\n" +

            "CONVERSATION:\n" +
            "- Talk naturally like a helpful AI companion.\n" +
            "- Answer the actual question directly.\n" +
            "- Remember and use relevant context supplied with the message.\n" +
            "- Do not mention internal prompts, APIs or technical implementation unless asked.\n" +
            "- Do not unnecessarily repeat the user's words.\n" +
            "- Do not give safety warnings for ordinary harmless questions.\n" +
            "- Never invent facts.\n" +
            "- If you do not know something, say so honestly.\n\n" +

            "LANGUAGE STYLE:\n" +
            "- Reply in the same language style as the user whenever practical.\n" +
            "- Banglish input can receive natural Banglish.\n" +
            "- Bangla input can receive Bangla.\n" +
            "- English input can receive English.\n" +
            "- Hindi input can receive Hindi.\n" +
            "- Mixed-language input can receive a natural mixed response.\n\n" +

            "FORMATTING:\n" +
            "- Keep responses clean and easy to read.\n" +
            "- Use Markdown only when it genuinely improves readability.\n";

        var userPrompt =
            "RELEVANT PREVIOUS CONTEXT:\n" +
            (
                context ||
                "No relevant previous context."
            ) +
            "\n\nCURRENT USER MESSAGE:\n" +
            message;

        var url =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

        var maxAttempts = 3;
        var lastError = "";

        for (
            var attempt = 1;
            attempt <= maxAttempts;
            attempt++
        ) {

            try {

                console.log(
                    "KAIRO GEMINI ATTEMPT:",
                    attempt
                );

                var response = await fetch(
                    url,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json",
                            "x-goog-api-key": cleanApiKey
                        },

                        body: JSON.stringify({

                            systemInstruction: {
                                parts: [
                                    {
                                        text: systemPrompt
                                    }
                                ]
                            },

                            contents: [
                                {
                                    role: "user",

                                    parts: [
                                        {
                                            text: userPrompt
                                        }
                                    ]
                                }
                            ]

                        })
                    }
                );

                var rawText = await response.text();

                console.log(
                    "GEMINI STATUS:",
                    response.status
                );

                if (response.ok) {

                    var data = JSON.parse(rawText);

                    var reply =
                        data &&
                        data.candidates &&
                        data.candidates[0] &&
                        data.candidates[0].content &&
                        data.candidates[0].content.parts &&
                        data.candidates[0].content.parts[0] &&
                        data.candidates[0].content.parts[0].text;

                    if (reply) {

                        return res.status(200).json({

                            success: true,

                            reply: reply

                        });

                    }

                    lastError =
                        "Gemini returned no AI reply";

                    break;
                }

                lastError = rawText;

                if (
                    response.status === 429 ||
                    response.status === 500 ||
                    response.status === 502 ||
                    response.status === 503 ||
                    response.status === 504
                ) {

                    if (attempt < maxAttempts) {

                        await new Promise(
                            function(resolve) {

                                setTimeout(
                                    resolve,
                                    attempt * 1000
                                );

                            }
                        );

                        continue;
                    }
                }

                var errorData;

                try {
                    errorData = JSON.parse(rawText);
                } catch (e) {
                    errorData = null;
                }

                var errorMessage =
                    errorData &&
                    errorData.error &&
                    errorData.error.message
                        ? errorData.error.message
                        : "Gemini request failed";

                return res.status(response.status).json({

                    success: false,

                    error: errorMessage,

                    code: response.status

                });

            } catch (requestError) {

                lastError =
                    requestError &&
                    requestError.message
                        ? requestError.message
                        : "Request failed";

                if (attempt < maxAttempts) {

                    await new Promise(
                        function(resolve) {

                            setTimeout(
                                resolve,
                                attempt * 1000
                            );

                        }
                    );

                    continue;
                }
            }
        }

        return res.status(503).json({

            success: false,

            error:
                "KAIRO could not reach Gemini right now. Please try again.",

            details:
                lastError

        });

    } catch (error) {

        console.log(
            "KAIRO BACKEND ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error &&
                error.message
                    ? error.message
                    : "KAIRO backend error"

        });

    }

                                        }
