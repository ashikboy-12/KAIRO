export default async function handler(req, res) {

    try {

        console.log("KAIRO DIAGNOSTIC START");

        if (req.method !== "POST") {

            console.log("METHOD:", req.method);

            return res.status(405).json({
                success: false,
                error: "Method not allowed",
                method: req.method
            });
        }

        var body = req.body || {};

        var message = body.message || "";

        console.log("MESSAGE RECEIVED:", message ? "YES" : "NO");

        if (!message) {

            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        var apiKey = process.env.GEMINI_API_KEY;

        console.log(
            "GEMINI KEY EXISTS:",
            apiKey ? "YES" : "NO"
        );

        if (!apiKey) {

            return res.status(500).json({
                success: false,
                error: "GEMINI_API_KEY is missing"
            });
        }

        console.log(
            "GEMINI KEY LENGTH:",
            apiKey.length
        );

        var cleanApiKey = apiKey.trim();

        console.log("KEY CLEANED: YES");

        var testUrl =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

        console.log("ABOUT TO CALL GEMINI");

        var response = await fetch(
            testUrl,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": cleanApiKey
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: message
                                }
                            ]
                        }
                    ]

                })
            }
        );

        console.log(
            "GEMINI STATUS:",
            response.status
        );

        var rawText = await response.text();

        console.log(
            "GEMINI RAW:",
            rawText
        );

        if (!response.ok) {

            return res.status(response.status).json({

                success: false,

                error:
                    "Gemini API error",

                status:
                    response.status,

                details:
                    rawText

            });
        }

        var data = JSON.parse(rawText);

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

                error:
                    "Gemini returned no reply",

                raw:
                    rawText

            });
        }

        console.log("GEMINI REPLY RECEIVED");

        return res.status(200).json({

            success: true,

            reply: reply

        });

    } catch (error) {

        console.log(
            "KAIRO DIAGNOSTIC ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error &&
                error.message
                    ? error.message
                    : "Unknown backend error"

        });

    }

}
