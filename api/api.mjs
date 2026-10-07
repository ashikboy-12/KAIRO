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
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}


/* ================================
   GEMINI
================================ */

async function callGemini(p, prompt, file) {

  const parts = [
    {
      text: prompt
    }
  ];


  if (
    file &&
    file.data &&
    file.mime &&
    file.mime.startsWith("image/")
  ) {

    parts.push({
      inline_data: {
        mime_type: file.mime,
        data: file.data
      }
    });
  }


  const r = await fetch(
    p.url + "?key=" + p.key(),
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],

        generationConfig: {
          maxOutputTokens: 500
        }
      })
    }
  );


  if (!r.ok) {

    const errorText =
      await r.text();

    console.error(
      "GEMINI IMAGE/TEXT ERROR:",
      errorText
    );

    throw new Error(
      "Gemini " + r.status
    );
  }


  const d =
    await r.json();


  return (
    d.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text ||
    ""
  );
}


/* ================================
   GROQ / MISTRAL
================================ */

async function callOpenAI(p, prompt) {

  const r = await fetch(
    p.url,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer " + p.key()
      },

      body: JSON.stringify({

        model: p.model,

        messages: [
          {
            role: "system",

            content:
              "You are KAIRO, a friendly AI companion. Understand Bangla, Banglish, English and Hindi. Answer naturally and concisely. Do not give unnecessary safety warnings. Never claim to see an image, video or file unless visual/file data was actually provided."
          },

          {
            role: "user",
            content: prompt
          }
        ],

        max_tokens: 500
      })
    }
  );


  if (!r.ok) {

    const errorText =
      await r.text();

    console.error(
      p.name + " ERROR:",
      errorText
    );

    throw new Error(
      p.name + " " + r.status
    );
  }


  const d =
    await r.json();


  return (
    d.choices?.[0]
      ?.message?.content ||
    ""
  );
}


/* ================================
   RUN AI
================================ */

async function runAI(body) {

  const message =
    String(
      body.message || ""
    ).trim();


  const file =
    body.file || null;


  if (
    !message &&
    !file
  ) {
    return "কিছু বলো, আমি শুনছি।";
  }


  const memory =
    JSON.stringify(
      body.memory || []
    );


  const history =
    JSON.stringify(
      body.relevantHistory ||
      body.history ||
      []
    );


  const hasImage =
    !!(
      file &&
      file.data &&
      file.mime &&
      file.mime.startsWith("image/")
    );


  const fileInfo =
    hasImage
      ? "\n\nIMPORTANT: An image is attached to this message. You MUST analyze the actual image and answer based on what is visible in it. Do not say that you cannot see the image."
      : "";


  const prompt =
    "Previous relevant memory:\n" +
    memory +

    "\n\nRelevant conversation history:\n" +
    history +

    "\n\nUser:\n" +
    message +

    fileInfo;


  /* --------------------------------
     IMAGE → GEMINI ONLY
  -------------------------------- */

  if (hasImage) {

    const gemini =
      providers.find(
        p => p.name === "Gemini"
      );


    if (
      gemini &&
      gemini.key()
    ) {

      try {

        const reply =
          await callGemini(
            gemini,
            prompt,
            file
          );


        if (reply) {

          return reply;
        }

      } catch (e) {

        console.error(
          "Gemini image analysis failed:",
          e.message
        );
      }
    }


    return "ছবিটা KAIRO server পর্যন্ত এসেছে, কিন্তু image-analysis AI এখন উত্তর দিতে পারেনি। আবার চেষ্টা করো।";
  }


  /* --------------------------------
     NORMAL TEXT
  -------------------------------- */

  for (
    const p of providers
  ) {

    if (!p.key()) {
      continue;
    }


    try {

      const reply =
        p.name === "Gemini"

          ? await callGemini(
              p,
              prompt,
              null
            )

          : await callOpenAI(
              p,
              prompt
            );


      if (reply) {
        return reply;
      }

    } catch (e) {

      console.log(
        p.name +
        " failed:",
        e.message
      );
    }
  }


  throw new Error(
    "All AI providers failed"
  );
}


/* ================================
   POST
================================ */

export async function POST(
  request
) {

  try {

    const body =
      await request.json();


    const reply =
      await runAI(body);


    return json({
      success: true,
      reply
    });

  } catch (e) {

    console.error(
      "KAIRO API ERROR:",
      e
    );


    return json(
      {
        success: false,

        reply:
          "KAIRO server এখন unavailable। একটু পরে আবার চেষ্টা করো।"
      },
      500
    );
  }
}


/* ================================
   GET
================================ */

export async function GET() {

  return json({
    success: true,
    message:
      "KAIRO API is online"
  });
}
