"use server"

import { createStreamableValue } from 'ai/rsc';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = "https://fantasy-battle-simulator.vercel.app/";
const YOUR_SITE_NAME = "Fantasy Battle Simulator";

const parseEnemyResponseContent = (messageContent: string) => {
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

// TODO: if too many messages in battle, do middle-out on client side, so server requests
// to openrouter don't get too big

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

        return parseEnemyResponseContent(messageContent);
    } catch (error) {
        console.error("Error fetching from OpenRouter:", error);
        throw error;
    }
}

/**
 * Generate an enemy based on user description.
 * @param userDescription {string} User provided description of an enemy.
 * @returns {Promise<{name: string, description: string}>} The name and description of the generated enemy.
 */
export async function generateEnemyFromDescription(userDescription: string): Promise<{ name: string, description: string }> {
    userDescription = userDescription.trim();

    const prompt = "Based on the user description for an enemy in a fantasy world, generate a name and description for the enemy. Provide 'Name:' and 'Description:' on separate lines. If the user provides a name for the enemy, try to respect the name provided it's not vulgar or bad language. Here is the user description:\n" + userDescription;

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

        return parseEnemyResponseContent(messageContent);
    } catch (error) {
        console.error("Error fetching from OpenRouter:", error);
        throw error;
    }
}

type Message = {
    role: "assistant" | "system" | "user";
    content: string;
};

export async function getBattleChatResponseStream(messages: Message[]) {
    try {
        const stream = createStreamableValue('');

        (async () => {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": YOUR_SITE_URL,
                    "X-Title": YOUR_SITE_NAME,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "meta-llama/llama-3-70b-instruct:nitro",
                    "messages": messages,
                    "temperature": 1.0,
                    "stream": true,
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error("No body found in the response");
            }

            const reader = response.body.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    let chunk = new TextDecoder().decode(value);

                    stream.update(chunk);
                }
            } catch (error) {
                console.error('Error reading the stream', error);
                throw error;
            } finally {
                reader.releaseLock();
            }

            stream.done();
        })();

        return { output: stream.value };
    } catch (error) {
        console.error("Failed to fetch from OpenRouter:", error);
        throw error;
    }
}