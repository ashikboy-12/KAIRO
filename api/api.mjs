export default async function handler(req, res) {

    try {

        if (req.method !== "POST") {
            return res.status(405).json({
                success: false,
                error: "Method not allowed"
            });
        }

        const body = req.body || {};

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";

        const context =
            typeof body.context === "string"
                ? body.context.trim()
                : "";

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }


        /*
        =====================================================
        KAIRO AI PROVIDER CONFIG
        =====================================================
        Add future API keys in Vercel Environment Variables.

        Currently supported:
        GEMINI_API_KEY
        GROQ_API_KEY

        Future:
        CEREBRAS_API_KEY
        MISTRAL_API_KEY
        OPENROUTER_API_KEY
        etc.
        =====================================================
        */


        const providers = [

            {
                name: "Gemini",
                key: process.env.GEMINI_API_KEY,
                type: "gemini"
            },

            {
                name: "Groq",
                key: process.env.GROQ_API_KEY,
                type: "groq"
            },

            {
                name: "Cerebras",
                key: process.env.CEREBRAS_API_KEY,
                type: "cerebras"
            },

            {
                name: "Mistral",
                key: process.env.MISTRAL_API_KEY,
                type: "mistral"
            },

            {
                name: "OpenRouter",
                key: process.env.OPENROUTER_API_KEY,
                type: "openrouter"
            },

            {
                name: "HuggingFace",
                key: process.env.HUGGINGFACE_API_KEY,
                type: "huggingface"
            },

            {
                name: "Cohere",
                key: process.env.COHERE_API_KEY,
                type: "cohere"
            },

            {
                name: "Cloudflare",
                key: process.env.CLOUDFLARE_API_KEY,
                type: "cloudflare"
            },

            {
                name: "Fireworks",
                key: process.env.FIREWORKS_API_KEY,
                type: "fireworks"
            },

            {
                name: "Together",
                key: process.env.TOGETHER_API_KEY,
                type: "together"
            },

            {
                name: "DeepInfra",
                key: process.env.DEEPINFRA_API_KEY,
                type: "deepinfra"
            },

            {
                name: "AI21",
                key: process.env.AI21_API_KEY,
                type: "ai21"
            },

            {
                name: "SambaNova",
                key: process.env.SAMBANOVA_API_KEY,
                type: "sambanova"
            },

            {
                name: "NVIDIA",
                key: process.env.NVIDIA_API_KEY,
                type: "nvidia"
            },

            {
                name: "Backup",
                key: process.env.BACKUP_AI_API_KEY,
                type: "backup"
            }

        ];


        /*
        =====================================================
        KAIRO SYSTEM PROMPT
        =====================================================
        */

        const systemPrompt =

            "You are KAIRO, a friendly AI companion.\n\n" +

            "IDENTITY:\n" +
            "- Your name is KAIRO.\n" +
            "- Never say your name is Gemini, Groq, OpenAI or another provider.\n" +
            "- The underlying AI providers are only infrastructure powering KAIRO.\n\n" +

            "LANGUAGE:\n" +
            "- Understand Bangla.\n" +
            "- Understand Banglish written with English letters.\n" +
            "- Understand English.\n" +
            "- Understand Hindi.\n" +
            "- Understand mixed Bangla, Banglish, English and Hindi.\n" +
            "- Understand casual conversation, slang, shortcuts, typos and imperfect spelling.\n\n" +

            "CONVERSATION:\n" +
            "- Talk naturally like a helpful AI companion.\n" +
            "- Answer the user's actual question directly.\n" +
            "- Use relevant previous context when provided.\n" +
            "- Do not unnecessarily repeat the user's words.\n" +
            "- Do not give unnecessary safety warnings for harmless questions.\n" +
            "- Never invent facts.\n" +
            "- If you do not know something, say so honestly.\n\n" +

            "STYLE:\n" +
            "- Reply in the same language style as the user whenever practical.\n" +
            "- Keep answers clear and natural.\n";


        const userPrompt =

            "RELEVANT PREVIOUS CONTEXT:\n" +

            (
                context ||
                "No relevant previous context."
            ) +

            "\n\nCURRENT USER MESSAGE:\n" +

            message;


        /*
        =====================================================
        PROVIDER REQUEST FUNCTIONS
        =====================================================
        */


        async function callGemini(key) {

            const url =
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";


            const response = await fetch(
                url,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": key.trim()
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


            const raw = await response.text();


            if (!response.ok) {

                throw new Error(
                    "Gemini " +
                    response.status +
                    ": " +
                    raw
                );

            }


            const data =
                JSON.parse(raw);


            const reply =

                data?.candidates?.[0]
                    ?.content?.parts?.[0]?.text;


            if (!reply) {

                throw new Error(
                    "Gemini returned no reply"
                );

            }


            return reply;

        }


        async function callGroq(key) {

            const url =
                "https://api.groq.com/openai/v1/chat/completions";


            const response = await fetch(
                url,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            key.trim()

                    },

                    body: JSON.stringify({

                        model:
                            "openai/gpt-oss-120b",

                        messages: [

                            {
                                role: "system",
                                content:
                                    systemPrompt
                            },

                            {
                                role: "user",
                                content:
                                    userPrompt
                            }

                        ],

                        temperature: 0.7,

                        max_tokens: 1000

                    })
                }
            );


            const raw =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    "Groq " +
                    response.status +
                    ": " +
                    raw
                );

            }


            const data =
                JSON.parse(raw);


            const reply =

                data?.choices?.[0]
                    ?.message?.content;


            if (!reply) {

                throw new Error(
                    "Groq returned no reply"
                );

            }


            return reply;

        }


        /*
        =====================================================
        FUTURE PROVIDERS
        =====================================================
        */

        async function callUnsupportedProvider(provider) {

            throw new Error(
                provider.name +
                " adapter not installed yet"
            );

        }


        /*
        =====================================================
        SMART ROUTER
        =====================================================
        */

        let lastError = "";


        for (
            const provider of providers
        ) {


            if (!provider.key) {

                console.log(
                    "KAIRO SKIP:",
                    provider.name,
                    "NO KEY"
                );

                continue;

            }


            console.log(
                "KAIRO TRY:",
                provider.name
            );


            try {

                let reply;


                if (
                    provider.type ===
                    "gemini"
                ) {

                    reply =
                        await callGemini(
                            provider.key
                        );

                }


                else if (
                    provider.type ===
                    "groq"
                ) {

                    reply =
                        await callGroq(
                            provider.key
                        );

                }


                else {

                    reply =
                        await callUnsupportedProvider(
                            provider
                        );

                }


                console.log(
                    "KAIRO SUCCESS:",
                    provider.name
                );


                return res.status(200).json({

                    success: true,

                    reply: reply,

                    provider:
                        provider.name

                });


            }

            catch (error) {


                lastError =

                    error?.message ||
                    "Provider failed";


                console.log(
                    "KAIRO PROVIDER FAILED:",
                    provider.name,
                    lastError
                );


                continue;

            }

        }


        /*
        =====================================================
        ALL PROVIDERS FAILED
        =====================================================
        */

        return res.status(503).json({

            success: false,

            error:
                "KAIRO could not reach an available AI provider right now.",

            details:
                lastError

        });


    }

    catch (error) {

        console.log(
            "KAIRO BACKEND ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                error?.message ||
                "KAIRO backend error"

        });

    }

            }
