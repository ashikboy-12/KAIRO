// ==========================================
// KAIRO AI BACKEND
// Fast + Context-Aware + Multi-Provider
// Gemini → Groq → Mistral
// ==========================================

const PROVIDERS = [
    {
        name: "Gemini",
        key: "GEMINI_API_KEY",
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
        type: "gemini"
    },
    {
        name: "Groq",
        key: "GROQ_API_KEY",
        url: "https://api.groq.com/openai/v1/chat/completions",
        type: "openai",
        model: "openai/gpt-oss-120b"
    },
    {
        name: "Mistral",
        key: "MISTRAL_API_KEY",
        url: "https://api.mistral.ai/v1/chat/completions",
        type: "openai",
        model: "mistral-small-latest"
    }
];


// ==========================================
// KAIRO CORE PERSONALITY
// ==========================================

const SYSTEM_PROMPT = `
You are KAIRO, a fast, intelligent and friendly AI companion.

CORE RULES:
- Understand Bangla.
- Understand Banglish written with English letters.
- Understand English.
- Understand Hindi.
- Understand mixed Bangla + English naturally.
- Reply in the user's language/style whenever possible.
- Be natural, friendly and conversational.
- Do not sound robotic.
- Do not unnecessarily mention safety rules.
- Do not invent facts.
- If you do not know something, say that clearly.
- Keep answers concise unless the user asks for detail.
- For voice conversations, keep responses especially short and natural.
- Never treat random background conversation as a command unless the user clearly addresses KAIRO.
- If the user says "chup koro", "চুপ করো", "stop", "থামো" or equivalent, understand that they want KAIRO to stop speaking.
- If the user asks KAIRO to guide them, focus on the requested task.
- In game-guide situations, prioritize speed and short actionable guidance.
- Do not pretend to see a screen unless visual/screen data has actually been provided.
- Do not claim to have detected an enemy or object without actual visual information.

CONVERSATION:
Use the supplied recent conversation history to understand what the user means.
Use supplied long-term memory when it is relevant.
Do not repeat questions when the answer is already present in the context.

GAME GUIDE:
When a future game-guide mode is active, prioritize:
1. Immediate danger.
2. Enemy/object detection from actual visual input.
3. Very short tactical advice.
4. Speed over lengthy explanations.

Example style:
"Enemy সামনে।"
"দুইজন ডানে।"
"Cover নাও।"
"পেছনে একজন আছে।"

Do not give long explanations during urgent gameplay.
`;


// ==========================================
// JSON RESPONSE
// ==========================================

function jsonResponse(data, status = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store"
            }
        }
    );
}


// ==========================================
// READ REQUEST BODY
// ==========================================

async function readBody(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}


// ==========================================
// TIMEOUT FETCH
// ==========================================

async function fetchWithTimeout(url, options, timeout = 9000) {

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        timeout
    );

    try {

        return await fetch(
            url,
            {
                ...options,
                signal: controller.signal
            }
        );

    } finally {

        clearTimeout(timer);

    }
}


// ==========================================
// GEMINI
// ==========================================

async function askGemini(apiKey, userPrompt) {

    const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                system_instruction: {
                    parts: [
                        {
                            text: SYSTEM_PROMPT
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
                ],

                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 500
                }
            })
        },
        7000
    );

    const data = await response.json();

    if (!response.ok) {

        const error = new Error(
            data?.error?.message ||
            `Gemini HTTP ${response.status}`
        );

        error.status = response.status;

        throw error;
    }

    const reply =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

    if (!reply) {
        throw new Error("Gemini returned empty response");
    }

    return reply;
}


// ==========================================
// OPENAI-COMPATIBLE PROVIDERS
// Groq / Mistral
// ==========================================

async function askOpenAICompatible(
    apiKey,
    url,
    model,
    userPrompt
) {

    const response = await fetchWithTimeout(
        url,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },

            body: JSON.stringify({

                model,

                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],

                temperature: 0.7,

                max_tokens: 500

            })
        },
        8000
    );

    const data = await response.json();

    if (!response.ok) {

        const error = new Error(
            data?.error?.message ||
            `Provider HTTP ${response.status}`
        );

        error.status = response.status;

        throw error;
    }

    const reply =
        data?.choices?.[0]?.message?.content
            ?.trim();

    if (!reply) {
        throw new Error("Provider returned empty response");
    }

    return reply;
}


// ==========================================
// BUILD USER PROMPT
// ==========================================

function buildUserPrompt(body) {

    const message =
        String(body?.message || "").trim();

    const history =
        Array.isArray(body?.history)
            ? body.history
            : [];

    const memory =
        Array.isArray(body?.memory)
            ? body.memory
            : String(body?.memory || "")
                .split("\n")
                .filter(Boolean);


    let prompt = "";

    prompt += "CURRENT USER MESSAGE:\n";
    prompt += message;

    prompt += "\n\n";

    if (memory.length > 0) {

        prompt += "RELEVANT LONG-TERM MEMORY:\n";

        prompt += memory
            .slice(0, 30)
            .join("\n");

        prompt += "\n\n";
    }


    if (history.length > 0) {

        prompt += "RECENT CONVERSATION:\n";

        const recent =
            history.slice(-20);

        for (const item of recent) {

            if (!item) continue;

            const role =
                item.role === "assistant"
                    ? "KAIRO"
                    : "USER";

            const text =
                String(
                    item.text ||
                    item.content ||
                    ""
                ).trim();

            if (!text) continue;

            prompt += `${role}: ${text}\n`;
        }

        prompt += "\n";
    }


    prompt +=
        "Answer the CURRENT USER MESSAGE using the relevant context above.";

    return prompt;
}


// ==========================================
// MAIN HANDLER
// ==========================================

export default async function handler(request) {

    if (request.method !== "POST") {

        return jsonResponse(
            {
                success: false,
                error: "Method not allowed"
            },
            405
        );

    }


    const body =
        await readBody(request);


    if (!body) {

        return jsonResponse(
            {
                success: false,
                error: "Invalid JSON"
            },
            400
        );

    }


    const message =
        String(body.message || "").trim();


    if (!message) {

        return jsonResponse(
            {
                success: false,
                error: "Message is empty"
            },
            400
        );

    }


    const userPrompt =
        buildUserPrompt(body);


    let lastError = null;


    // ======================================
    // PROVIDER LOOP
    // ======================================

    for (const provider of PROVIDERS) {

        const apiKey =
            process.env[provider.key];


        // No key = skip immediately
        if (!apiKey) {
            continue;
        }


        try {

            let reply;


            // ------------------------------
            // GEMINI
            // ------------------------------

            if (provider.type === "gemini") {

                reply =
                    await askGemini(
                        apiKey,
                        userPrompt
                    );

            }


            // ------------------------------
            // GROQ / MISTRAL
            // ------------------------------

            else {

                reply =
                    await askOpenAICompatible(
                        apiKey,
                        provider.url,
                        provider.model,
                        userPrompt
                    );

            }


            // ------------------------------
            // SUCCESS
            // ------------------------------

            return jsonResponse({

                success: true,

                reply,

                provider: provider.name

            });

        } catch (error) {

            lastError = error;

            // Continue immediately to next
            // provider instead of stopping.

            continue;
        }
    }


    // ======================================
    // ALL PROVIDERS FAILED
    // ======================================

    return jsonResponse(
        {
            success: false,

            error:
                "KAIRO could not connect to an AI provider.",

            detail:
                lastError?.message || "Unknown provider error"
        },

        503
    );
        }
