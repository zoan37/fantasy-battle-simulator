"use client"

import Image from "next/image";
import { useState } from 'react';
import * as fal from "@fal-ai/serverless-client";
import Markdown from 'react-markdown';

fal.config({
  // Can also be auto-configured using environment variables:
  credentials: process.env.NEXT_PUBLIC_FAL_AI_KEY,
});

type Message = {
  role: "assistant" | "system" | "user";
  content: string;
};

export default function Home() {
  const [imageUrl, setImageUrl] = useState('');
  const [enemyName, setEnemyName] = useState('');
  const [enemyDescription, setEnemyDescription] = useState('');
  const [userInput, setUserInput] = useState(''); // State to hold user input
  const [userAction, setUserAction] = useState(''); // State to hold user's action input
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [streamContent, setStreamContent] = useState(''); // State to hold stream content

  // Function to handle user action input changes
  const handleActionInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserAction(event.target.value);
  };

  // Function to handle action submission and execute new battle turn
  const handleActionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("User action submitted:", userAction);
    // Call handleBattleTurnChatResponse with the user's action
    handleBattleTurnChatResponse(userAction);
  };

  // start battle function
  const startBattle = async (enemyName: string, enemyDescription: string) => {
    // trim the enemyName and enemyDescription
    enemyName = enemyName.trim();
    enemyDescription = enemyDescription.trim();

    // log battle
    console.log('startBattle');
    console.log(enemyName);
    console.log(enemyDescription);

    handleStartBattleChatResponse(enemyName, enemyDescription);
  };

  // function that calls getChatResponseStream with current message history, gets the response, and adds it to the message history
  const handleStartBattleChatResponse = async (enemyName: string, enemyDescription: string) => {
    const battlePrompt = `
I'm the Hero in a fantasy world. I have an overpowered magic system called Echo that assists me; it has a vast knowledge of spells, and can analyze and counter any enemy.

Simulate a battle between me and and the following opponent: ${enemyName}. ${enemyDescription}

Don't show the HP of me/opponent. Echo should recommend three actions to take: 1, 2, and 3. Give name and brief description of each action. The format should be like: **1. "Action 1":** Description of Action 1.

Keep descriptions of the battle and descriptions of the actions brief. Wait for me too choose an action before continuing. When the battle ends, don't ask for any follow up actions. As this is just a simulation, violence is allowed; but don't say it's a simulation, consider it as a real battle.
    `.trim();

    // example messages with Message
    const messages: Message[] = [
      { role: "user", content: battlePrompt },
    ];
    const responseStream = await getChatResponseStream(messages);
    const reader = responseStream.getReader();

    let bufferContent = '';
    // Function to read the stream using a while loop
    const readStream = async () => {
      let done = false;
      while (!done) {
        const { done: readDone, value } = await reader.read();
        done = readDone;
        if (done) {
          console.log("Stream finished.");
          break;
        }
        bufferContent += value;
        // console.log(bufferContent);
        // Update the state with new content, appending it to existing content
        setStreamContent(prevContent => prevContent + value);
      }
    };

    await readStream(); // Start reading the stream

    // add bufferContent to messages
    messages.push({ role: "assistant", content: bufferContent });

    // set messageHistory to messages
    setMessageHistory(messages);
  };

  // function that calls getChatResponseStream with current message history, gets the response, and adds it to the message history
  const handleBattleTurnChatResponse = async (action: string) => {

    // clone message history
    const messages = [...messageHistory];

    // add action to the end of the messages
    messages.push({ role: "user", content: action });

    // log messages
    console.log('messages');
    console.log(messages);

    const responseStream = await getChatResponseStream(messages);
    const reader = responseStream.getReader();

    let bufferContent = '';
    // Function to read the stream using a while loop
    const readStream = async () => {
      let done = false;
      while (!done) {
        const { done: readDone, value } = await reader.read();
        done = readDone;
        if (done) {
          console.log("Stream finished.");
          break;
        }
        bufferContent += value;
        // console.log(bufferContent);
        // Update the state with new content, appending it to existing content
        setStreamContent(prevContent => prevContent + value);
      }
    };

    await readStream(); // Start reading the stream

    console.log('bufferContent');
    console.log(bufferContent);

    // add bufferContent to messages
    messages.push({ role: "assistant", content: bufferContent });

    // set messageHistory to messages
    setMessageHistory(messages);
  };

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

      startBattle(name, description);

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

      startBattle(name, description);

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

  async function getChatResponseStream(
    messages: Message[]
  ) {

    console.log('getChatResponseStream');

    console.log('messages');
    console.log(messages);

    const stream = new ReadableStream({
      async start(controller: ReadableStreamDefaultController) {
        try {
          let isStreamed = false;
          const generation = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": `${YOUR_SITE_URL}`, // Optional, for including your app on openrouter.ai rankings.
              "X-Title": `${YOUR_SITE_NAME}`, // Optional. Shows in rankings on openrouter.ai.
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              // "model": "openai/gpt-3.5-turbo",
              "model": "meta-llama/llama-3-70b-instruct:nitro",
              "messages": messages,
              "temperature": 1.0,
              "stream": true,
            })
          });

          if (generation.body) {
            const reader = generation.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // console.log('value');
                // console.log(value);

                // Assuming the stream is text, convert the Uint8Array to a string
                let chunk = new TextDecoder().decode(value);
                // Process the chunk here (e.g., append it to the controller for streaming to the client)
                // console.log(chunk); // Or handle the chunk as needed

                // split the chunk into lines
                let lines = chunk.split('\n');
                // console.log('lines');
                // console.log(lines);

                const SSE_COMMENT = ": OPENROUTER PROCESSING";


                // filter out lines that start with SSE_COMMENT
                lines = lines.filter((line) => !line.trim().startsWith(SSE_COMMENT));

                // filter out lines that end with "data: [DONE]"
                lines = lines.filter((line) => !line.trim().endsWith("data: [DONE]"));

                // Filter out empty lines and lines that do not start with "data:"
                const dataLines = lines.filter(line => line.startsWith("data:"));

                // Extract and parse the JSON from each data line
                const messages = dataLines.map(line => {
                  // Remove the "data: " prefix and parse the JSON
                  const jsonStr = line.substring(5); // "data: ".length == 5
                  return JSON.parse(jsonStr);
                });

                // loop through messages and enqueue them to the controller
                messages.forEach((message) => {
                  const content = message.choices[0].delta.content;
                  // console.log(content);
                  controller.enqueue(content);
                });

                isStreamed = true;
              }
            } catch (error) {
              console.error('Error reading the stream', error);
            } finally {
              reader.releaseLock();
            }
          }

          // handle case where streaming is not supported
          if (!isStreamed) {
            console.error('Streaming not supported! Need to handle this case.');
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return stream;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-3xl font-bold text-center mb-8">Fantasy Battle Simulator</h1>
      <p className="text-center text-lg mb-4">You are the Hero, blessed with an overpowered magic system called Echo, in a fantasy world. Battle enemies to your heart's content!</p>
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

      <button onClick={handleStartBattleChatResponse} className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Test
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

      <div className="text-md mt-4 whitespace-pre-wrap">
        <Markdown>{streamContent}</Markdown>
      </div>

      <form onSubmit={handleActionSubmit} className="mb-4">
        <input
          type="text"
          value={userAction}
          onChange={handleActionInputChange}
          placeholder="Custom action..."
          className="text-black p-2 rounded"
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Execute Action
        </button>
      </form>
    </main>
  );
}
