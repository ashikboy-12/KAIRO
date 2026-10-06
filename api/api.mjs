export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const {
            message,
            context,
            mode = "chat"
        } = req.body || {};

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


        // =========================================
        // TEXT AI
        // =========================================

        if (mode === "chat") {

            const systemPrompt = `
You are KAIRO, a friendly AI companion.

LANGUAGE:
- Understand Bangla.
- Understand Banglish written with English letters.
- Understand English.
- Understand Hindi.
- Understand mixed Bangla + English + Hindi.
- Understand casual slang and spelling mistakes.

RESPONSE:
- Reply in the same language/style as the user.
- If the user uses Banglish, reply naturally in Banglish.
- Keep normal conversation concise.
- Do not repeat the user's question.
- Do not add unnecessary warnings.
- Do not add dramatic or overly formal language.
- Do not say "Hi, I'm KAIRO" unless the user asks.
- Talk naturally like a friend.
- If the user asks something simple, give a simple answer.
- If you don't know something, say so.
- Never invent facts.

VOICE:
- When the response will be spoken aloud, write naturally.
- Use short conversational sentences.
- Avoid excessive punctuation.
- Avoid long lists unless necessary.
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
                                        "No previous context.") +
                                    "\n\nCURRENT USER MESSAGE:\n" +
                                    message
                            }
                        ]
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                console.error(
                    "OpenRouter error:",
                    data
                );

                return res.status(
                    response.status
                ).json({
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
                reply
            });
        }


        // =========================================
        // TEXT TO SPEECH
        // =========================================

        if (mode === "tts") {

            const response = await fetch(
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
                            "deepgram/flux-tts:free",

                        input:
                            message,

                        voice:
                            "aura-asteria-en",

                        response_format:
                            "mp3"
                    })
                }
            );


            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "TTS error:",
                    errorText
                );

                return res.status(
                    response.status
                ).json({
                    error:
                        "TTS generation failed"
                });
            }


            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";


            if (
                !contentType.includes(
                    "audio"
                )
            ) {

                const errorText =
                    await response.text();

                console.error(
                    "Unexpected TTS response:",
                    errorText
                );

                return res.status(500).json({
                    error:
                        "TTS did not return audio"
                });
            }


            const buffer =
                Buffer.from(
                    await response.arrayBuffer()
                );


            res.statusCode = 200;

            res.setHeader(
                "Content-Type",
                "audio/mpeg"
            );

            res.setHeader(
                "Content-Length",
                buffer.length
            );

            res.setHeader(
                "Cache-Control",
                "no-store"
            );

            return res.end(buffer);
        }


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
