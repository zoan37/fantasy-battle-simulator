"use server"

import * as fal from "@fal-ai/serverless-client";

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

    // use fast-sdxl as it's higher quality
    // also, fast-lightning-sdxl doesn't appear to handle negatives
    // source: https://www.reddit.com/r/StableDiffusion/comments/1ax4col/i_compared_the_generation_results_of/
    const imageModel = "fal-ai/fast-sdxl";

    // const imageModel = "fal-ai/fast-lightning-sdxl";

    // disable safety checker because sometimes there are false positives where has_nsfw_concepts == true, and get black image.
    // log in this case: "Potential NSFW content was detected in one or more images. A black image will be returned instead. Try again with a different prompt and/or seed."
    // the prompt will be safe because it comes from gpt-3.5-turbo output.

    const result: ResultType = await fal.subscribe(imageModel, {
        input: {
            prompt: prompt,
            negative_prompt: "blood, gore, nsfw, scary, ugly, deformed, morbid, mutilated, extra limbs, duplicates. signature, watermark. cartoon, illustration, animation.",
            enable_safety_checker: false
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
