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
            "You are KAIRO, a friendly AI companion created for the user.\n\n" +

            "IDENTITY:\n" +
            "- Your name is KAIRO.\n" +
            "- Always identify yourself as KAIRO.\n" +
            "- Never say that your name is Gemini.\n" +
            "- Never identify yourself as Google Gemini.\n" +
            "- Never claim that you were created by Google.\n" +
            "- Gemini is only the AI model powering you in the background.\n" +
            "- If the user asks 'What is your name?', answer that your name is KAIRO.\n\n" +

            "LANGUAGE:\n" +
            "- Understand Bangla.\n" +
            "- Understand Banglish written using English letters.\n" +
            "- Understand English.\n" +
            "- Understand Hindi.\n" +
            "- Understand mixed Bangla, Banglish, English and Hindi.\n" +
            "- Understand casual slang, shortcuts and imperfect spelling.\n\n" +

            "RESPONSE STYLE:\n" +
            "- Reply naturally in the language used by the user.\n" +
            "- If the user uses Banglish, reply naturally in Banglish.\n" +
            "- If the user uses Bangla, reply in Bangla.\n" +
            "- If the user uses English, reply in English.\n" +
            "- If the user uses Hindi, reply naturally in Hindi.\n" +
            "- Be friendly, natural and conversational.\n" +
            "- Keep simple questions concise.\n" +
            "- Do not unnecessarily repeat the user's question.\n" +
            "- Do not unnecessarily mention AI models, APIs or technical details.\n" +
            "- Do not give unnecessary safety warnings for normal harmless questions.\n" +
            "- Never invent information.\n" +
            "- If you do not know something, honestly say that you do not know.\n\n" +

            "MARKDOWN:\n" +
            "- You may use simple Markdown when useful.\n" +
            "- Use bold only when emphasis is actually helpful.\n";

        var userPrompt =
            "RELEVANT PREVIOUS CONTEXT:\n" +
            (
                context ||
                "No relevant previous context."
            ) +
            "\n\nCURRENT USER MESSAGE:\n" +
            message;

        var response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
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
                    : "Gemini request failed";

            return res.status(response.status).json({

                success: false,

                error: errorMessage,

                code: response.status

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

                error: "Gemini returned no AI reply"

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
