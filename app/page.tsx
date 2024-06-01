"use client"

import Image from "next/image";
import { useState } from 'react';
import * as fal from "@fal-ai/serverless-client";

fal.config({
  // Can also be auto-configured using environment variables:
  credentials: process.env.NEXT_PUBLIC_FAL_AI_KEY,
});

export default function Home() {
  const [imageUrl, setImageUrl] = useState('');
  const [enemyName, setEnemyName] = useState('');
  const [enemyDescription, setEnemyDescription] = useState('');
  const [userInput, setUserInput] = useState(''); // State to hold user input

  // Function to handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(event.target.value);
  };

  // Function to handle form submission
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    generateCustomEnemy(userInput); // Call the asdf function with user input
  };

  // Example asdf function
  const generateCustomEnemy = (input: string) => {
    console.log("Function generateCustomEnemy called with input:", input);
    // You can add more logic here to process the input
    fetchOpenRouterResponseWithInput(input);
  };

  type ResultType = {
    images: [
      {
        url: string;
        content_type: string;
      }
    ];
    prompt: string;
  };

  console.log(process.env.NEXT_PUBLIC_FAL_AI_KEY);

  const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  const YOUR_SITE_URL = "";
  const YOUR_SITE_NAME = "Fantasy Battle Simulator";

  const parseResponseContent = (messageContent: string) => {
    const nameMatch = messageContent.match(/^\s*Name:\s*(.+)$/m);
    if (!nameMatch) {
      throw new Error("Name not found in the message content.");
    }
    const name = nameMatch[1].trim();

    const descriptionMatch = messageContent.match(/Description:\s*(.+)/s);
    if (!descriptionMatch) {
      throw new Error("Description not found in the message content.");
    }
    const description = descriptionMatch[1].trim();

    return { name, description };
  };

  const fetchOpenRouterResponseWithInput = async (input: string) => {
    try {
      const userDescription = input.trim();
      const prompt = "Given the user description for an enemy in a fantasy world, generate a name and description for the enemy. Provide 'Name:' and 'Description:' on separate lines. Here is the user description:\n" + userDescription;
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

      const { name, description } = parseResponseContent(messageContent);
      // log the name and description
      console.log("Name:", name);
      console.log("Description:", description);
      setEnemyName(name);
      setEnemyDescription(description);
      fetchImage(name + ': ' + description);

      return data;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);
    }
  };

  const fetchOpenRouterResponse = async () => {
    try {
      const prompt = "Generate a random enemy in a fantasy world. No spiders as they are too scary. Provide 'Name:' and 'Description:' on separate lines.";
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

      const { name, description } = parseResponseContent(messageContent);
      // log the name and description
      console.log("Name:", name);
      console.log("Description:", description);
      setEnemyName(name);
      setEnemyDescription(description);
      fetchImage(name + ': ' + description);

      return data;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);
    }
  };

  const fetchImage = async (descriptionPrompt: string) => {
    const result: ResultType = await fal.subscribe("fal-ai/fast-sdxl", {
      input: {
        prompt: descriptionPrompt,
        negative_prompt: "blood, gore, nsfw, scary, ugly, deformed, morbid, mutilated, extra limbs, malformed limbs. duplicates. signature, watermark. cartoon, illustration, animation."
      },
      logs: true,
      onQueueUpdate: (status: fal.QueueStatus) => {
        if (status.status === "IN_PROGRESS" && status.logs) {
          status.logs.map((log: { message: any; }) => log.message).forEach(console.log);
        }
      },
    });

    if (result.images.length > 0) {
      setImageUrl(result.images[0].url);
    } else {
      console.error("No images found in result");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-3xl font-bold text-center mb-8">Fantasy Battle Simulator</h1>
      <p className="text-center text-lg mb-4">You are a hero blessed with an overpowered magic system in a fantasy world. Battle enemies to your heart's content!</p>
      <form onSubmit={handleFormSubmit} className="mb-4">
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="Describe an enemy..."
          className="text-black p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Battle!
        </button>
      </form>

      <button onClick={fetchOpenRouterResponse} className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Battle Random Enemy
      </button>

      {imageUrl && (
        <Image
          src={imageUrl}
          alt="Dynamic Image"
          width={500}
          height={300}
          priority
        />
      )}

      {enemyName && (
        <div className="text-lg font-bold mt-4">
          {enemyName}
        </div>
      )}

      {enemyDescription && (
        <div className="text-md mt-2">
          {enemyDescription}
        </div>
      )}
    </main>
  );
}
