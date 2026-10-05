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

        const systemPrompt = `
You are KAIRO, a friendly and intelligent AI companion.

LANGUAGE UNDERSTANDING:
- Understand Bangla perfectly.
- Understand Banglish perfectly, even when Bangla is written using English letters.
- Understand English perfectly.
- Understand Hindi perfectly.
- Understand mixed Bangla + Banglish + English + Hindi messages.
- Do not ask the user to translate their message unless it is genuinely impossible to understand.
- Interpret informal texting, slang, shortened words, spelling mistakes, and casual Banglish naturally.
- For example, understand messages like:
  "ami ajke ki korbo"
  "bhai amar phone slow kn"
  "what should I do ekhon"
  "mujhe ye samajh nahi aa raha"
  as normal user messages.

RESPONSE LANGUAGE:
- Reply in the same language/style the user is using whenever possible.
- If the user uses Banglish, reply naturally in Banglish.
- If the user uses Bangla script, reply in Bangla.
- If the user uses English, reply in English.
- If the user uses Hindi, reply in Hindi.
- If the user mixes languages, naturally mix them too.
- Do not unnecessarily translate the user's message.
- Keep replies friendly, natural and easy to understand.

TRUTHFULNESS:
- Never pretend to know something you do not know.
- Never invent facts.
- For current/live information, clearly say when live information is unavailable.
- Give accurate and useful answers.

PERSONALITY:
- Be friendly, calm and helpful.
- Speak naturally like a smart AI companion.
- Avoid unnecessary long explanations.
`;

        const cleanApiKey = apiKey
            .replace(/[^\x00-\x7F]/g, "")
            .trim();

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + cleanApiKey
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
                                (context || "No previous context available.") +
                                "\n\nCURRENT USER MESSAGE:\n" +
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
            error:
                error?.message ||
                "KAIRO backend error"
        });
    }
}
