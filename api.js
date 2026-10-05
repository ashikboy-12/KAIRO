// ==========================================
// KAIRO - AI BACKEND
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

        // AI connection will be added here next.
        // For now, test that the backend receives the message.

        return res.status(200).json({
            success: true,
            reply: "KAIRO backend received your message successfully.",
            received: message,
            context: context || ""
        });

    } catch (error) {
        console.error("KAIRO API error:", error);

        return res.status(500).json({
            error: "KAIRO backend error"
        });
    }
}