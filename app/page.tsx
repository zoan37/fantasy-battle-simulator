"use client"

import Image from "next/image";
import { useState, useRef, useEffect } from 'react';
import * as fal from "@fal-ai/serverless-client";
import Markdown from 'react-markdown';
import { Analytics } from '@vercel/analytics/react';
import Cookies from 'js-cookie';
import { generateImage } from './image';
import { generateRandomEnemy, generateEnemyFromDescription, getBattleChatResponseStream } from "./llm";
import { readStreamableValue } from 'ai/rsc';
import { unstable_noStore as noStore } from 'next/cache';

fal.config({
  // Can also be auto-configured using environment variables:
  credentials: process.env.NEXT_PUBLIC_FAL_AI_KEY,
});

type Message = {
  role: "assistant" | "system" | "user";
  content: string;
};

export default function Home() {
  noStore();
  // TODO: break out streamed text area into its own component, and call noStore there

  // Replace the isVisible state with three separate states
  const [showPortal, setShowPortal] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showBattle, setShowBattle] = useState(false);

  // Add a new useState for isAudioMuted
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const EPIC_CONFRONTATION_BATTLE_THEME = 'https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Epic%20Confrontation-nTKBHqlteFFcFJ1j5U8Pw8k3cMcDmt.mp3';
  const INTO_THE_FLAMES_BATTLE_THEME = 'https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Into%20the%20Flames-VQJVdTSO9Pmb2t4nPsLdGgQPWgHReh.mp3';
  const TRIUMPH_OF_LEGENDS_BATTLE_THEME = 'https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Triumph%20of%20Legends-HrF2MfygLBNMWgvdTI5tW8EP48KkWK.mp3';
  const CLASH_OF_TITANS_BATTLE_THEME = 'https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Clash%20of%20Titans-gwhdW9DtathcRSPseOINlRULvLzCs1.mp3';

  const [defaultBattleTheme, setDefaultBattleTheme] = useState(() => Cookies.get('defaultBattleTheme') || EPIC_CONFRONTATION_BATTLE_THEME);

  useEffect(() => {
    Cookies.set('defaultBattleTheme', defaultBattleTheme, { expires: 360 }); // Expires in 360 days
  }, [defaultBattleTheme]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const fadeOutDuration = 3; // seconds
      const checkInterval = 250; // milliseconds

      const intervalId = setInterval(() => {
        if (audio.duration - audio.currentTime <= fadeOutDuration) {
          let newVolume = (audio.duration - audio.currentTime) / fadeOutDuration;

          // clamp volume between 0 and 1 just in case
          if (newVolume < 0) {
            newVolume = 0;
          }
          if (newVolume > 1) {
            newVolume = 1;
          }

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

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleStartClick = () => {
    setShowPortal(false);
    setShowSimulator(true);
    setShowBattle(false);

    /*
    if (audioRef.current) {
      audioRef.current.play(); // Play the audio when the start button is clicked
    }*/

    fadeOutAndChangeMusic(
      "https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Mystical%20Adventure-DnRAfQWnw0SB6GgS1rDW7VLRg59cA3.mp3",
      10);
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

  function fadeOutAndChangeMusic(newSrc: string, fadeOutDuration: number = 500) {
    // Use setTimeout so that click event is propagated so that mobile audio works
    if (audioRef.current) {
      let currentVolume = audioRef.current.volume;
      const fadeOut = () => {
        if (!audioRef.current) {
          return;
        }
        if (currentVolume > 0.1) {
          currentVolume -= 0.1;

          // if currentVolume is < 0, set to 0
          // do this in case, trying to debug IndexSizeError on mobile
          if (currentVolume < 0) {
            currentVolume = 0;
          }

          audioRef.current.volume = currentVolume;

          setTimeout(fadeOut, fadeOutDuration / 10);
        } else {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = newSrc;

          audioRef.current.volume = 1; // Reset volume to full for the new theme
          
          audioRef.current.loop = true;
          audioRef.current.play(); // Play the new theme
        }
      };
      setTimeout(fadeOut, fadeOutDuration / 10);
    }
  }

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

    fadeOutAndChangeMusic(
      defaultBattleTheme,
      500);

    handleStartBattleChatResponse(enemyName, enemyDescription);
  };

  const exitBattle = () => {
    setShowBattle(false);
    setShowSimulator(true);
    console.log("Exiting battle");

    // Reset image URL here as well, since can be delay to load new image and don't want old image to show
    setImageUrl('');

    fadeOutAndChangeMusic(
      "https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Mystical%20Adventure-DnRAfQWnw0SB6GgS1rDW7VLRg59cA3.mp3",
      500);
  };

  function handleBattleOver() {
    console.log("BattleOver");

    if (isBattleOver) {
      return;
    } else {
      setIsBattleOver(true);
    }

    fadeOutAndChangeMusic(
      "https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Victory%20Awaits%20(trimmed)-zW4Rkx5wPxoey7RDNZByqDXZWywCL7.mp3",
      1000);
  }

  // New function to process stream content
  const processStreamContent = async (reader: ReadableStreamDefaultReader, updateStateCallback: (content: string) => void) => {
    let content = '';
    let bufferValue = '';
    let done = false;
    while (!done) {
      const { done: readDone, value } = await reader.read();
      done = readDone;
      if (done) {
        console.log("Stream finished.");
        break;
      }

      bufferValue += value;

      let deltaValue = '';

      if (bufferValue.includes("<")) {
        if (bufferValue.includes("<<BattleInProgress>>")) {
          // remove <<BattleInProgress>> from bufferValue
          bufferValue = bufferValue.replace("<<BattleInProgress>>", "");
        }
        if (bufferValue.includes("<<BattleOver>>")) {
          // remove <<BattleOver>> from bufferValue
          bufferValue = bufferValue.replace("<<BattleOver>>", "");
        }
        // get length of bufferValue after first ocurrence of "<"
        const potentialTagLength = bufferValue.length - bufferValue.indexOf("<");
        if (potentialTagLength > 25) {
          // potential tag length is too long, so remove potential tag from bufferValue

          // get string between first character and inclusive of first occurrence of "<"
          deltaValue = bufferValue.substring(0, bufferValue.indexOf("<") + 1);

          // set buffer value to the rest of the string
          bufferValue = bufferValue.substring(bufferValue.indexOf("<") + 1);
        }
      } else {
        deltaValue = bufferValue;
        bufferValue = '';
      }

      content += value; // add true value to content

      if (deltaValue.length > 0) {
        updateStateCallback(deltaValue);
      }
    }

    if (bufferValue.length > 0) {
      updateStateCallback(bufferValue);
    }

    return content;
  };

  // function that calls getChatResponseStream with current message history, gets the response, and adds it to the message history
  const handleStartBattleChatResponse = async (enemyName: string, enemyDescription: string) => {
    const battlePrompt = `
I'm the Hero in a fantasy world. I have an overpowered magic system called Echo that assists me; it has a vast knowledge of spells, and can analyze and counter any enemy.

Simulate a battle between me and and the following opponent: ${enemyName}. ${enemyDescription}

Don't show the HP of me/opponent. Echo should recommend three actions to take: 1, 2, and 3. Give name and brief description of each action. The format should be like: **1. "Action 1":** Description of Action 1.

Keep descriptions of the battle and descriptions of the actions brief. Wait for me too choose an action before continuing. Please always provide actions, unless the battle is over, in which case don't provide actions. I'm allowed to choose a custom action as well, in addition to actions 1, 2, and 3. When the battle ends, don't ask for any follow up actions. As this is just a simulation, violence is allowed; but don't say it's a simulation, consider it as a real battle.

Additionally, at the end of your response, include a new line with the tag "<<BattleInProgress>>" or "<<BattleOver>>" to indicate if the battle is in progress (enemy not defeated, still actions for user to take) or if the battle is over (enemy defeated, no actions for user to take).

A battle may be over, but never end the simulation; the user is allowed to continue after the battle. Don't tell the user that it is a simulation. On the turn that the battle is over, don't provide actions though.
    `.trim();

    // example messages with Message
    const messages: Message[] = [
      { role: "user", content: battlePrompt },
    ];
    const responseStream = await getChatResponseStream(messages);
    const reader = responseStream.getReader();

    const bufferContent = await processStreamContent(reader, (newContent) => {
      setStreamContent(prevContent => prevContent + newContent);
    });

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

    const bufferContent = await processStreamContent(reader, (newContent) => {
      setStreamContent(prevContent => prevContent + newContent);
    });

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

  const fetchOpenRouterResponseWithInput = async (input: string) => {
    try {
      const userDescription = input.trim();

      const { name, description } = await generateEnemyFromDescription(userDescription);
      // log the name and description
      console.log("Name:", name);
      console.log("Description:", description);
      setEnemyName(name);
      setEnemyDescription(description);

      await fetchImage(name + ': ' + description);

      startBattle(name, description);

      setIsLoading(false); // Hide spinner

      return;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);

      setIsLoading(false); // Hide spinner
    }
  };

  const fetchOpenRouterResponse = async () => {
    setIsLoading(true); // Show spinner
    try {
      const { name, description } = await generateRandomEnemy();
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

      return;
    } catch (error) {
      console.error("Failed to fetch from OpenRouter:", error);

      setIsLoading(false); // Hide spinner
    }
  };

  const fetchImage = async (descriptionPrompt: string) => {
    const result = await generateImage(descriptionPrompt);

    console.log('Setting image');
    console.log(result.imageUrl);

    setImageUrl(result.imageUrl);
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

          const { output } = await getBattleChatResponseStream(messages);

          if (output) {
            try {
              for await (const chunk of readStreamableValue(output)) {
                if (chunk) {
                  // console.log('value');
                  // console.log(value);

                  // Assuming the stream is text, convert the Uint8Array to a string
                  // let chunk = new TextDecoder().decode(value);
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
              }
            } catch (error) {
              console.error('Error reading the stream', error);
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

  // Function to change the battle theme
  const changeBattleTheme = (newTheme: string) => {
    setDefaultBattleTheme(newTheme);
    if (showBattle) {
      fadeOutAndChangeMusic(newTheme, 500);
    }
  };

  return (
    <>
      <main className="flex flex-col items-center p-5">
        <h1 className="text-3xl font-bold text-center mt-4 mb-4">Fantasy Battle Simulator</h1>
        <div className="flex justify-center space-x-2 mb-4">
          <button className="p-1" onClick={toggleModal}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button className="p-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </button>
          <button className="p-1" onClick={() => setIsAudioMuted(!isAudioMuted)}>
            {!isAudioMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
              </svg>
            )}
          </button>
        </div>

        {isModalOpen && (
          <div
            className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center p-5"
            onClick={toggleModal} // This handles clicks on the backdrop
          >
            <div
              className="bg-white p-5 rounded-lg max-w-screen-md"
              onClick={(e) => e.stopPropagation()} // This prevents clicks inside the modal from closing it
            >
              <h2 className="text-lg font-bold mb-4">Settings</h2>
              <div className="mb-4">
                <label htmlFor="battleTheme" className="block mb-2 text-sm font-medium text-gray-900">Default Battle Theme:</label>
                <select
                  id="battleTheme"
                  value={defaultBattleTheme}
                  onChange={(e) => changeBattleTheme(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value={EPIC_CONFRONTATION_BATTLE_THEME}>Epic Confrontation</option>
                  <option value={INTO_THE_FLAMES_BATTLE_THEME}>Into the Flames</option>
                  <option value={TRIUMPH_OF_LEGENDS_BATTLE_THEME}>Triumph of Legends</option>
                  <option value={CLASH_OF_TITANS_BATTLE_THEME}>Clash of Titans</option>
                </select>
              </div>
              <hr className="mb-4" />
              <div className="mb-4">
                Fantasy Battle Simulator lets you battle an enemy of your imagination or a random one. You are the Hero in a fantasy world, where you are blessed with an overpowered magic system named Echo.
                Echo has a vast knowledge of spells, and can help analyze the battle situation and provide actions.
              </div>
              <div className="mb-4">
                The battle log records the enemies you've encountered. Share an enemy with a link.
              </div>
              <div className="mb-4">
                Made by <a href="https://x.com/zoan37" target="_blank" className="text-blue-500 hover:text-blue-700">@zoan37</a>.
              </div>
              <div className="text-right">
                <button onClick={toggleModal} className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          src="https://os2iyupv2jtrdzz9.public.blob.vercel-storage.com/Mystical%20Adventure-DnRAfQWnw0SB6GgS1rDW7VLRg59cA3.mp3"
          muted={isAudioMuted}
          loop>
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

            <button onClick={handleStartClick} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-1 mb-4">
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
            <form onSubmit={handleFormSubmit} className="mb-4 flex items-center" style={{ maxWidth: '25rem', width: '100%' }}>
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                placeholder="Describe an enemy..."
                className="text-black p-2 rounded border border-gray-300 mr-1 flex-grow disabled:opacity-50 w-full"
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

            <div className="mb-4">
            </div>
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

            <form onSubmit={handleActionSubmit} className="mb-4 flex items-center" style={{ maxWidth: '25rem', width: '100%' }}>
              <input
                type="text"
                value={userAction}
                onChange={handleActionInputChange}
                placeholder="Custom action..."
                className="text-black p-2 rounded border border-gray-300 mr-1 flex-grow disabled:opacity-50 w-full"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 hover:disabled:bg-blue-500"
                disabled={isLoading}
              >
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

            <div className="mb-4">
            </div>
          </>
        )}
      </main>
      <Analytics />
    </>
  );
}

