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

        var apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "GEMINI_API_KEY is missing"
            });
        }

        var cleanApiKey = apiKey
            .replace(/[^\x00-\x7F]/g, "")
            .trim();

        var systemPrompt =
            "You are KAIRO, a friendly AI companion.\n\n" +

            "LANGUAGE:\n" +
            "- Understand Bangla perfectly.\n" +
            "- Understand Banglish written with English letters.\n" +
            "- Understand English.\n" +
            "- Understand Hindi.\n" +
            "- Understand mixed Bangla, Banglish, English and Hindi.\n" +
            "- Understand casual slang, shortcuts and imperfect spelling.\n\n" +

            "RESPONSE:\n" +
            "- Reply naturally in the user's language.\n" +
            "- If the user uses Banglish, reply naturally in Banglish.\n" +
            "- If the user uses Bangla, reply in Bangla.\n" +
            "- If the user uses English, reply in English.\n" +
            "- Be friendly, natural and concise.\n" +
            "- Do not unnecessarily repeat the user's question.\n" +
            "- Do not give unnecessary safety warnings for normal harmless questions.\n" +
            "- Never invent information.\n" +
            "- If you do not know something, say so honestly.";

        var userPrompt =
            "RELEVANT PREVIOUS CONTEXT:\n" +
            (
                context ||
                "No relevant previous conversation."
            ) +
            "\n\nCURRENT USER MESSAGE:\n" +
            message;

        var response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
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

        console.log(
            "GEMINI RAW:",
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
                    : rawText ||
                      "Unknown Gemini error";

            var errorCode =
                data &&
                data.error &&
                data.error.code
                    ? data.error.code
                    : response.status;

            console.log(
                "GEMINI ERROR MESSAGE:",
                errorMessage
            );

            console.log(
                "GEMINI ERROR CODE:",
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
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0] &&
            data.candidates[0].content.parts[0].text;

        if (!reply) {

            return res.status(500).json({
                success: false,
                error: "Gemini returned no AI reply",
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
                error &&
                error.message
                    ? error.message
                    : "KAIRO backend error"
        });

    }

                }
