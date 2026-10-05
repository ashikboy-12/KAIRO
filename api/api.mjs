// ==========================================
// KAIRO - VERCEL API
// ==========================================

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const { message, context } = req.body || {};

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

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey.trim()
                },
                body: JSON.stringify({
                    model: "openrouter/free",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are KAIRO, a friendly AI companion. Answer truthfully. If you don't know something, say so. Respond in the user's language, preferably Bangla or Banglish when appropriate."
                        },
                        {
                            role: "user",
                            content:
                                "RELEVANT CONTEXT:\n" +
                                (context || "No previous context available.") +
                                "\n\nUSER MESSAGE:\n" +
                                message
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("OpenRouter error:", data);

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

    } catch (error) {
        console.error("KAIRO backend error:", error);

        return res.status(500).json({
            error: error?.message || "KAIRO backend error"
        });
    }
}
