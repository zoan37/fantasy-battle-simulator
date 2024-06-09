"use server"

import { createStreamableValue } from 'ai/rsc';
import { generateImage } from './image';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from '../drizzle/schema';
import Sqids from "sqids";

const db = drizzle(sql, { schema })
import { EnemiesTable } from '../drizzle/schema';

const sqids = new Sqids({
    minLength: 8
});

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
    const prompt = "Generate a random enemy in a fantasy world. No spiders or arachnids as they are too scary. Provide 'Name:' and 'Description:' on separate lines.";

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
                    //"model": "openai/gpt-3.5-turbo",
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

                    // NOTE: This code assumes that the value is a valid UTF-8 encoded string.
                    // It won't handle the case where the last byte of value was meant to be paired up with 
                    // the first byte of the next incoming value.
                    let chunk = new TextDecoder().decode(value);

                    // console.log('chunk:');
                    // console.log(chunk);

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

function getImagePrompt(enemy: { name: string; description: string }) {
    return enemy.name + ': ' + enemy.description;
}

// function to create an enemy, with parameters random boolean or user description
interface CreateEnemyParams {
    random: boolean;
    description: string;
}

// function to parse image name from url
// e.g. https://fal.media/files/rabbit/7_iD9sPgq1EweJfxerKB5.jpeg&w=1080&q=75 -> 7_iD9sPgq1EweJfxerKB5.jpeg
function parseImageNameFromUrl(url: string) {
    const imageName = url.split('/').pop()?.split('&')[0];
    if (!imageName) {
        throw new Error("Image name could not be parsed from URL.");
    }
    return imageName;
}

// async function to upload image
async function uploadImage(image: { imageUrl: string }) {
    const imageName = parseImageNameFromUrl(image.imageUrl);
    const imageData = await fetch(image.imageUrl).then(r => r.blob());
    const blob = await put(imageName, imageData, {
        access: 'public',
    });
    return blob;
}

interface WriteEnemyResult {
    id: number;
    // include other properties if there are more
}

// async function to write enemy to Enemies table
async function writeEnemyToDb(enemy: { type: string, name: string; description: string; imageUrl: string }): Promise<WriteEnemyResult> {
    // insert enemy into Enemies table, with db
    const result = await db.insert(EnemiesTable).values({
        type: enemy.type,
        name: enemy.name,
        description: enemy.description,
        imageUrl: enemy.imageUrl
    }).returning({
        id: EnemiesTable.id
    });

    return result[0];
}

export async function createEnemy(params: CreateEnemyParams) {
    if (params.random) {
        console.log("Generating random enemy");

        let enemy = await generateRandomEnemy();

        console.log("Generating image");

        let imagePrompt = getImagePrompt(enemy);
        let image = await generateImage(imagePrompt);

        console.log("Uploading image")

        let imageBlob = await uploadImage(image);

        let enemyInfo = {
            type: "random",
            name: enemy.name,
            description: enemy.description,
            imageUrl: imageBlob.url,
            hash: ""
        };

        console.log("Writing to database");

        const writeResult = await writeEnemyToDb(enemyInfo);
        const enemyId = writeResult.id;
        const enemyHash = sqids.encode([enemyId]);

        enemyInfo.hash = enemyHash;

        console.log('Enemy hash:', enemyHash);

        return enemyInfo;

    } else {
        console.log("Generating enemy from description");

        let enemy = await generateEnemyFromDescription(params.description);

        console.log("Generating image");

        let imagePrompt = getImagePrompt(enemy);
        let image = await generateImage(imagePrompt);

        console.log("Uploading image")

        let imageBlob = await uploadImage(image);

        let enemyInfo = {
            type: "custom",
            name: enemy.name,
            description: enemy.description,
            imageUrl: imageBlob.url,
            hash: ""
        };

        console.log("Writing to database");

        const writeResult = await writeEnemyToDb(enemyInfo);
        const enemyId = writeResult.id;
        const enemyHash = sqids.encode([enemyId]);

        enemyInfo.hash = enemyHash;

        console.log('Enemy hash:', enemyHash);

        return enemyInfo;
    }
}

// TODO: use sqid for enemy id hash

// Function to retrieve an enemy from the database by its name
export async function getEnemy(enemyHash: string) {
    const numbers = sqids.decode(enemyHash);
    const enemyId = numbers[0];

    try {
        // don't expose id
        const result = await db.select({
            name: EnemiesTable.name,
            description: EnemiesTable.description,
            imageUrl: EnemiesTable.imageUrl
        })
            .from(EnemiesTable)
            .where(eq(EnemiesTable.id, enemyId));

        if (result.length === 0) {
            return {
                enemy: null
            }
        }

        return {
            enemy: result[0]
        }
    } catch (error) {
        console.error("Error retrieving enemy from database:", error);
        throw error;
    }
}

