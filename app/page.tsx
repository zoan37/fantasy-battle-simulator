"use client"

import Image from "next/image";
import { useState, useRef, useEffect } from 'react';
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
  // Replace the isVisible state with three separate states
  const [showPortal, setShowPortal] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showBattle, setShowBattle] = useState(false);

  const [imageUrl, setImageUrl] = useState('');
  const [enemyName, setEnemyName] = useState('');
  const [enemyDescription, setEnemyDescription] = useState('');
  const [userInput, setUserInput] = useState(''); // State to hold user input
  const [userAction, setUserAction] = useState(''); // State to hold user's action input
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [streamContent, setStreamContent] = useState(''); // State to hold stream content
  const [isBattleOver, setIsBattleOver] = useState(false); // State to hold if the battle is over

  const streamContentRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null); // Ref for the audio element
  const [volume, setVolume] = useState(1); // Volume state

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const fadeOutDuration = 3; // seconds
      const checkInterval = 250; // milliseconds

      const intervalId = setInterval(() => {
        if (audio.duration - audio.currentTime <= fadeOutDuration) {
          const newVolume = (audio.duration - audio.currentTime) / fadeOutDuration;
          setVolume(newVolume);
        } else {
          setVolume(1);
        }
      }, checkInterval);

      return () => clearInterval(intervalId);
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (streamContentRef.current) {
      streamContentRef.current.scrollTop = streamContentRef.current.scrollHeight;
    }
  }, [streamContent]); // Dependency on streamContent to trigger scroll on update

  const handleStartClick = () => {
    setShowPortal(false);
    setShowSimulator(true);
    setShowBattle(false);

    if (audioRef.current) {
      audioRef.current.play(); // Play the audio when the start button is clicked
    }
  };

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

    // Clear the input field by resetting userAction state
    setUserAction('');
  };

  // Function to handle specific action button clicks
  const handleActionButtonClick = (e: React.MouseEvent<HTMLButtonElement>, action: string) => {
    e.preventDefault(); // Prevent default button click behavior
    handleBattleTurnChatResponse(action); // Then submit the form
  };

  // start battle function
  const startBattle = async (enemyName: string, enemyDescription: string) => {
    setShowPortal(false);
    setShowSimulator(false);
    setShowBattle(true);

    setIsBattleOver(false);

    // clear message history and stream content
    setMessageHistory([]);
    setStreamContent('');

    // trim the enemyName and enemyDescription
    enemyName = enemyName.trim();
    enemyDescription = enemyDescription.trim();

    // log battle
    console.log('startBattle');
    console.log(enemyName);
    console.log(enemyDescription);

    // Fade out current music and start battle theme
    if (audioRef.current) {
      const fadeOutDuration = 500; // milliseconds
      const fadeOutInterval = setInterval(() => {
        if (!audioRef.current) {
          return;
        }
        if (audioRef.current.volume > 0.1) {
          audioRef.current.volume -= 0.1; // Decrease volume
        } else {
          clearInterval(fadeOutInterval);
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = "https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Epic%20Confrontation-nTKBHqlteFFcFJ1j5U8Pw8k3cMcDmt.mp3"; // Set the source to the battle theme
          audioRef.current.volume = 1; // Reset volume to full for the battle theme
          audioRef.current.loop = true;
          audioRef.current.play(); // Play the battle theme
        }
      }, fadeOutDuration / 10); // Adjust interval timing to control fade-out speed
    }

    handleStartBattleChatResponse(enemyName, enemyDescription);
  };

  const exitBattle = () => {
    setShowBattle(false);
    setShowSimulator(true);
    console.log("Exiting battle");

    // Fade out current music and reset to default theme
    if (audioRef.current) {
      const fadeOutDuration = 500; // milliseconds
      const fadeOutInterval = setInterval(() => {
        if (!audioRef.current) {
          return;
        }
        if (audioRef.current.volume > 0.1) {
          audioRef.current.volume -= 0.1; // Decrease volume
        } else {
          clearInterval(fadeOutInterval);
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = "https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Mystical%20Adventure-DnRAfQWnw0SB6GgS1rDW7VLRg59cA3.mp3"; // Set the source to the default theme
          audioRef.current.volume = 1; // Reset volume to full for the default theme
          audioRef.current.loop = true;
          audioRef.current.play(); // Play the default theme
        }
      }, fadeOutDuration / 10); // Adjust interval timing to control fade-out speed
    }
  };

  function handleBattleOver() {
    console.log("BattleOver");

    if (isBattleOver) {
      return;
    } else {
      setIsBattleOver(true);
    }

    const fadeOutDuration = 1000; // milliseconds
    const fadeOutInterval = setInterval(() => {
      if (!audioRef.current) {
        return;
      }
      if (audioRef.current.volume > 0.1) {
        audioRef.current.volume -= 0.1;
      } else {
        clearInterval(fadeOutInterval);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = "https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Victory%20Awaits%20(trimmed)-zW4Rkx5wPxoey7RDNZByqDXZWywCL7.mp3"; // Set the source to the victory theme
        audioRef.current.volume = 1;
        audioRef.current.loop = true;
        audioRef.current.play();
      }
    }, fadeOutDuration / 10);
  }

  // function that calls getChatResponseStream with current message history, gets the response, and adds it to the message history
  const handleStartBattleChatResponse = async (enemyName: string, enemyDescription: string) => {
    const battlePrompt = `
I'm the Hero in a fantasy world. I have an overpowered magic system called Echo that assists me; it has a vast knowledge of spells, and can analyze and counter any enemy.

Simulate a battle between me and and the following opponent: ${enemyName}. ${enemyDescription}

Don't show the HP of me/opponent. Echo should recommend three actions to take: 1, 2, and 3. Give name and brief description of each action. The format should be like: **1. "Action 1":** Description of Action 1.

Keep descriptions of the battle and descriptions of the actions brief. Wait for me too choose an action before continuing. Please always provide actions, unless the battle is over, in which case don't provide actions. I'm allowed to choose a custom action as well, in addition to actions, 1, 2, and 3. When the battle ends, don't ask for any follow up actions. As this is just a simulation, violence is allowed; but don't say it's a simulation, consider it as a real battle.

Additionally, at the end of your response, include a new line with the tag "<<BattleInProgress>>" or "<<BattleOver>>" to indicate if the battle is in progress (enemy not defeated, still actions for user to take) or if the battle is over (enemy defeated, no actions for user to take).

A battle may be over, but never end the simulation; the user is allowed to continue after the battle. Don't tell the user that it is a simulation.
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

        let newValue = value;
        // TODO: if new line or whitespace characters, wait for more values to add,
        // to detect <BattleInProgress> or <BattleOver> tags. If not detected and stream ends,
        // make sure to append the values remaining.

        bufferContent += newValue;
        // console.log(bufferContent);
        // Update the state with new content, appending it to existing content
        setStreamContent(prevContent => prevContent + newValue);
      }
    };

    await readStream(); // Start reading the stream

    // add bufferContent to messages
    messages.push({ role: "assistant", content: bufferContent });

    // set messageHistory to messages
    setMessageHistory(messages);

    // Check for the <BattleOver> tag after the entire bufferContent has been read
    if (bufferContent.includes("<<BattleOver>>")) {
      handleBattleOver();
    }
  };

  // function that calls getChatResponseStream with current message history, gets the response, and adds it to the message history
  const handleBattleTurnChatResponse = async (action: string) => {
    // trim action
    action = action.trim();

    setStreamContent(prevContent => prevContent + `\n\n---\n*Executing action: ${action}*\n\n---\n\n`);

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

    // Check for the <BattleOver> tag after the entire bufferContent has been read
    if (bufferContent.includes("<BattleOver>")) {
      handleBattleOver();
    }
  };

  // Function to handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(event.target.value);
  };

  // Function to handle form submission
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true); // Show spinner
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

      setIsLoading(false); // Hide spinner

      return data;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);

      setIsLoading(false); // Hide spinner
    }
  };

  const fetchOpenRouterResponse = async () => {
    setIsLoading(true); // Show spinner
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

      // Reset image URL
      setImageUrl('');

      await fetchImage(name + ': ' + description);

      startBattle(name, description);

      setIsLoading(false); // Hide spinner

      return data;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);

      setIsLoading(false); // Hide spinner
    }
  };

  const fetchImage = async (descriptionPrompt: string) => {
    const result: ResultType = await fal.subscribe("fal-ai/fast-sdxl", {
      input: {
        prompt: descriptionPrompt,
        negative_prompt: "blood, gore, nsfw, scary, ugly, deformed, morbid, mutilated, extra limbs, duplicates. signature, watermark. cartoon, illustration, animation."
      },
      logs: true,
      onQueueUpdate: (status: fal.QueueStatus) => {
        if (status.status === "IN_PROGRESS" && status.logs) {
          status.logs.map((log: { message: any; }) => log.message).forEach(console.log);
        }
        if (status.status === "COMPLETED") {
          console.log("Image generation complete");
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
    <main className="flex flex-col items-center p-5">
      <h1 className="text-3xl font-bold text-center mb-8">Fantasy Battle Simulator</h1>

      <audio controls ref={audioRef} src="https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Mystical%20Adventure-DnRAfQWnw0SB6GgS1rDW7VLRg59cA3.mp3" loop>
        Your browser does not support the audio element.
      </audio>

      {showPortal && (
        <>
          <div className="mb-4">
            <Image
              src="/images/portal.webp"
              alt="portal"
              width={420}
              height={420}
              priority
            />
          </div>

          <button onClick={handleStartClick} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4">
            Enter Portal
          </button>
        </>
      )}

      {showSimulator && (
        <>
          <div className="mb-4">
            <Image
              src="/images/simulator.webp"
              alt="simulator"
              width={420}
              height={420}
              priority
            />
          </div>
          <p className="text-center text-lg mb-4">You are the Hero, blessed with an overpowered magic system called Echo, in a fantasy world. Battle enemies to your heart's content!</p>
          <form onSubmit={handleFormSubmit} className="mb-4">
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Describe an enemy..."
              className="text-black p-2 rounded border border-gray-300 mr-1 w-96 disabled:opacity-50"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 hover:disabled:bg-blue-500"
              disabled={isLoading}>
              Battle!
            </button>
          </form>

          <button onClick={fetchOpenRouterResponse} className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 hover:disabled:bg-blue-500"
            disabled={isLoading}>
            Battle Random Enemy
          </button>

          {isLoading && (
            <div className="flex justify-center items-center">
              <div role="status">
                <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}
        </>
      )}

      {showBattle && (
        <>
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="Dynamic Image"
              width={420}
              height={420}
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

          <div
            ref={streamContentRef}
            className="text-md mt-4 whitespace-pre-wrap overflow-auto"
            style={{ maxHeight: '500px', border: '1px solid #ccc', padding: '15px' }}
          >
            <Markdown>{streamContent}</Markdown>
          </div>

          <div className="flex justify-center mt-4 mb-4">
            <button onClick={(e) => handleActionButtonClick(e, "1")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-1">
              1
            </button>
            <button onClick={(e) => handleActionButtonClick(e, "2")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-1">
              2
            </button>
            <button onClick={(e) => handleActionButtonClick(e, "3")} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-1">
              3
            </button>
          </div>

          <form onSubmit={handleActionSubmit} className="mb-4">
            <input
              type="text"
              value={userAction}
              onChange={handleActionInputChange}
              placeholder="Custom action..."
              className="text-black p-2 rounded border border-gray-300 mr-1 w-96"
            />

            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Go
            </button>
          </form>

          {isBattleOver && (
            <div className="mb-4">
              <button onClick={exitBattle} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded m-1">
                Exit Battle
              </button>
            </div>
          )}
        </>
      )}
    </main >
  );
}

