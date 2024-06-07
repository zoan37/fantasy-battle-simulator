"use server"

import * as fal from "@fal-ai/serverless-client";

export const maxDuration = 15; // more leeway for image generation to finish

// Configure FAL with your API key
fal.config({
    credentials: process.env.FAL_AI_KEY,
});

type ResultType = {
    images: [
        {
            url: string;
            content_type: string;
        }
    ];
    prompt: string;
};

/**
 * Generate an image using FAL based on a given prompt.
 * @param {string} prompt The prompt to use for image generation.
 * @returns {Promise<{ imageUrl: string, contentType: string }>} The image URL and content type.
 */
export async function generateImage(prompt: string) {
    if (!prompt) {
        throw new Error('No prompt provided');
    }

    // Call FAL to generate the image
    const result: ResultType = await fal.subscribe("fal-ai/fast-sdxl", {
        input: {
            prompt: prompt,
            negative_prompt: "blood, gore, nsfw, scary, ugly, deformed, morbid, mutilated, extra limbs, duplicates. signature, watermark. cartoon, illustration, animation."
        },
        logs: true,
        onQueueUpdate: (status: fal.QueueStatus) => {
            if (status.status === "IN_PROGRESS" && status.logs) {
                // status.logs.map((log: { message: any; }) => log.message).forEach(console.log);
            }
            if (status.status === "COMPLETED") {
                console.log("Image generation complete");
            }
        },
    });

    // Check if the image was generated successfully
    if (result.images.length > 0) {
        return {
            imageUrl: result.images[0].url,
            contentType: result.images[0].content_type
        };
    } else {
        throw new Error('No images generated');
    }
}
