const providers = [
  {
    name: "Gemini",
    key: () => process.env.GEMINI_API_KEY,
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
  },
  {
    name: "Groq",
    key: () => process.env.GROQ_API_KEY,
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-120b"
  },
  {
    name: "Mistral",
    key: () => process.env.MISTRAL_API_KEY,
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small-latest"
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function callGemini(p, prompt) {
  const r = await fetch(p.url + "?key=" + p.key(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 500
      }
    })
  });

  if (!r.ok) throw new Error("Gemini " + r.status);

  const d = await r.json();

  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(p, prompt) {
  const r = await fetch(p.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + p.key()
    },
    body: JSON.stringify({
      model: p.model,
      messages: [
        {
          role: "system",
          content:
            "You are KAIRO, a friendly AI companion. Understand Bangla, Banglish, English and Hindi. Answer naturally and concisely. Do not give unnecessary safety warnings. Never claim to see a screen unless visual data was actually provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500
    })
  });

  if (!r.ok) throw new Error(p.name + " " + r.status);

  const d = await r.json();

  return d.choices?.[0]?.message?.content || "";
}

async function runAI(body) {
  const message = String(body.message || "").trim();

  if (!message) return "কিছু বলো, আমি শুনছি।";

  const memory = JSON.stringify(body.memory || []);
  const history = JSON.stringify(
    body.relevantHistory || body.history || []
  );

  const prompt =
    "Previous relevant memory:\n" +
    memory +
    "\n\nRelevant conversation history:\n" +
    history +
    "\n\nUser:\n" +
    message;

  for (const p of providers) {
    if (!p.key()) continue;

    try {
      const reply =
        p.name === "Gemini"
          ? await callGemini(p, prompt)
          : await callOpenAI(p, prompt);

      if (reply) return reply;
    } catch (e) {
      console.log(p.name + " failed:", e.message);
    }
  }

  throw new Error("All AI providers failed");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const reply = await runAI(body);

    return json({
      success: true,
      reply
    });
  } catch (e) {
    console.error("KAIRO API ERROR:", e);

    return json(
      {
        success: false,
        reply: "KAIRO server এখন unavailable। একটু পরে আবার চেষ্টা করো।"
      },
      500
    );
  }
}

export async function GET() {
  return json({
    success: true,
    message: "KAIRO API is online"
  });
}
