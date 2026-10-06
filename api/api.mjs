export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const body = req.body || {};
        const message = body.message;
        const context = body.context || "";
        const mode = body.mode || "chat";

        if (!message) {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "OPENROUTER_API_KEY is missing"
            });
        }

        const cleanApiKey = apiKey
            .replace(/[^\x00-\x7F]/g, "")
            .trim();

        // ==========================================
        // KAIRO AI BRAIN
        // ==========================================

        const systemPrompt = `
You are KAIRO, a friendly AI companion.

LANGUAGE:
- Understand Bangla.
- Understand Banglish.
- Understand English.
- Understand Hindi.
- Understand mixed language naturally.
- Understand casual slang and imperfect spelling.

RESPONSE STYLE:
- Reply naturally in the user's language.
- If user uses Banglish, reply in natural Banglish.
- If user uses Bangla, reply in Bangla.
- If user uses English, reply in English.
- Be concise and conversational.
- Do not repeat the question unnecessarily.
- Do not add unnecessary introductions or conclusions.
- Do not give long explanations unless the user asks.
- Talk like a smart friendly companion, not a formal customer-support bot.

IMPORTANT:
- Do not give unnecessary safety warnings for normal harmless questions.
- Only mention safety when the actual request genuinely requires it.
- Never invent information.
- If you don't know something, say that clearly.
- Do not pretend that you performed an action when you did not.

VOICE CONVERSATION:
- Voice replies should sound natural and conversational.
- Keep spoken answers relatively short.
- Avoid unnecessary lists when speaking.
- Do not repeatedly say "I'm KAIRO" or introduce yourself.
`;

        // ==========================================
        // TEXT CHAT
        // ==========================================

        if (mode === "chat") {
            const response = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            "Bearer " + cleanApiKey
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
                                    (context ||
                                        "No previous context available.") +
                                    "\n\nCURRENT USER MESSAGE:\n" +
                                    message
                            }
                        ]
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(
                    "OpenRouter text error:",
                    data
                );

                return res.status(response.status).json({
                    error:
                        data?.error?.message ||
                        "OpenRouter request failed"
                });
            }

            const reply =
                data?.choices?.[0]?.message?.content;

            if (!reply) {
                return res.status(500).json({
                    error: "No AI reply received"
                });
            }

            return res.status(200).json({
                success: true,
                reply: reply
            });
        }

        // ==========================================
        // KAIRO REALISTIC VOICE / TTS
        // ==========================================

        if (mode === "tts") {
            const speechResponse = await fetch(
                "https://openrouter.ai/api/v1/audio/speech",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            "Bearer " + cleanApiKey
                    },

                    body: JSON.stringify({
                        model:
                            "fish-audio/s2.1-pro-free:free",

                        input: message,

                        response_format: "mp3"
                    })
                }
            );

            if (!speechResponse.ok) {
                const errorText =
                    await speechResponse.text();

                console.error(
                    "OpenRouter TTS error:",
                    errorText
                );

                return res.status(
                    speechResponse.status
                ).json({
                    error:
                        "KAIRO voice generation failed"
                });
            }

            const audioBuffer =
                Buffer.from(
                    await speechResponse.arrayBuffer()
                );

            res.statusCode = 200;

            res.setHeader(
                "Content-Type",
                "audio/mpeg"
            );

            res.setHeader(
                "Content-Length",
                audioBuffer.length
            );

            res.setHeader(
                "Cache-Control",
                "no-store"
            );

            return res.end(audioBuffer);
        }

        // ==========================================
        // UNKNOWN MODE
        // ==========================================

        return res.status(400).json({
            error: "Unknown KAIRO mode"
        });

    } catch (error) {
        console.error(
            "KAIRO backend error:",
            error
        );

        return res.status(500).json({
            error:
                error?.message ||
                "KAIRO backend error"
        });
    }
}
