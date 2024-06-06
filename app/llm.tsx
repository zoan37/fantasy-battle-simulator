"use server"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = ""; // TODO: fill in site url
const YOUR_SITE_NAME = "Fantasy Battle Simulator";

const parseRandomEnemyResponseContent = (messageContent: string) => {
    const nameMatch = messageContent.match(/^\s*Name:\s*(.+)$/m);
    if (!nameMatch) {
        throw new Error("Name not found in the message content.");
    }
    const name = nameMatch[1].trim();

    const descriptionMatch = messageContent.match(/^\s*Description:\s*(.+)$/m);
    if (!descriptionMatch) {
        throw new Error("Description not found in the message content.");
    }
    const description = descriptionMatch[1].trim();

    return { name, description };
};

/**
 * Generate a random enemy using OpenRouter.
 * @returns {Promise<{name: string, description: string}>} The name and description of the generated enemy.
 */
export async function generateRandomEnemy() {
    const prompt = "Generate a random enemy in a fantasy world. No spiders as they are too scary. Provide 'Name:' and 'Description:' on separate lines.";

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": YOUR_SITE_URL,
                "X-Title": YOUR_SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "openai/gpt-3.5-turbo",
                "messages": [{ "role": "user", "content": prompt }],
                "temperature": 1.0
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const messageContent = data.choices[0].message.content;

        return parseRandomEnemyResponseContent(messageContent);
    } catch (error) {
        console.error("Error fetching from OpenRouter:", error);
        throw error;
    }
}
