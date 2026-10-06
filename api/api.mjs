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

        // =========================
        // CHAT MODE
        // =========================

        if (mode === "chat") {

            const systemPrompt = `
You are KAIRO, a friendly AI companion.

LANGUAGE:
- Understand Bangla.
- Understand Banglish.
- Understand English.
- Understand Hindi.
- Understand mixed Bangla + Banglish + English + Hindi.
- Understand casual slang, shortcuts and imperfect spelling.

RESPONSE:
- Reply naturally in the user's language.
- If the user uses Banglish, reply naturally in Banglish.
- If the user uses Bangla, reply in Bangla.
- If the user uses English, reply in English.
- Keep normal replies concise and conversational.
- Do not repeat the user's question.
- Do not add unnecessary warnings.
- Do not add unnecessary introductions.
- Do not pretend to perform actions you cannot perform.

VOICE:
- Replies may be spoken aloud.
- Keep spoken answers natural and reasonably short.
- Avoid unnecessary lists when answering in voice conversation.

TRUTH:
- Never invent facts.
- If something is unknown, say so.
- Do not claim live information unless live data is actually available.
`;

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
                    "OpenRouter chat error:",
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

        // =========================
        // TTS MODE
        // =========================

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
                        model: "deepgram/flux-tts:free",
                        input: message,
                        voice: "aura-asteria-en",
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
                        "KAIRO voice generation failed",
                    details: errorText
                });
            }

            const audioBuffer =
                Buffer.from(
                    await speechResponse.arrayBuffer()
                );

            if (!audioBuffer.length) {
                return res.status(500).json({
                    error: "Empty voice audio received"
                });
            }

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

        // =========================
        // UNKNOWN MODE
        // =========================

        return res.status(400).json({
            error: "Unknown mode"
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
