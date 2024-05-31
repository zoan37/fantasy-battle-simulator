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
          "messages": [
            { "role": "user", "content": prompt }
          ],
          "temperature": 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data);

      // Accessing the message content from the response data
      const messageContent = data.choices[0].message.content;
      console.log("Received message:", messageContent);

      // Parsing the name from the message content
      const nameMatch = messageContent.match(/^\s*Name:\s*(.+)$/m);
      if (!nameMatch) {
        throw new Error("Name not found in the message content.");
      }
      const name = nameMatch[1].trim();
      console.log("Parsed Name:", name);
      setEnemyName(name);

      // Parsing the description from the message content
      const descriptionMatch = messageContent.match(/Description:\s*(.+)/s);
      if (!descriptionMatch) {
        throw new Error("Description not found in the message content.");
      }
      const description = descriptionMatch[1].trim();
      console.log("Parsed Description:", description);
      setEnemyDescription(description);

      // Call fetchImage with the parsed description
      fetchImage(name + '. ' + description);

      return data;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);
    }
  };

  const fetchImage = async (descriptionPrompt: string) => {
    const result: ResultType = await fal.subscribe("fal-ai/fast-sdxl", {
      input: {
        prompt: descriptionPrompt
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
      <button onClick={fetchOpenRouterResponse} className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Ask OpenRouter
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
          Enemy Name: {enemyName}
        </div>
      )}

      {enemyDescription && (
        <div className="text-md mt-2">
          Description: {enemyDescription}
        </div>
      )}

      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Get started by editing&nbsp;
          <code className="font-mono font-bold">app/page.tsx</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            By{" "}
            <Image
              src="/vercel.svg"
              alt="Vercel Logo"
              className="dark:invert"
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className="relative z-[-1] flex place-items-center before:absolute before:h-[300px] before:w-full before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-full after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 sm:before:w-[480px] sm:after:w-[240px] before:lg:h-[360px]">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <a
          href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Docs{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Find in-depth information about Next.js features and API.
          </p>
        </a>

        <a
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Learn{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Learn about Next.js in an interactive course with&nbsp;quizzes!
          </p>
        </a>

        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Templates{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Explore starter templates for Next.js.
          </p>
        </a>

        <a
          href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          target="_blank"
          rel="noopener noreferrer"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Deploy{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-balance text-sm opacity-50">
            Instantly deploy your Next.js site to a shareable URL with Vercel.
          </p>
        </a>
      </div>
    </main>
  );
}
