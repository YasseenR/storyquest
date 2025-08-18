//project-aac-game-team-b/StoryQuest/app/Gameplay/[roomId]/[storyTitle]/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import stories, { Story, StorySection } from "../../stories"; //import the stories interface
import { useParams } from "next/navigation"; //To retrieve story based on room settings
import AACKeyboard from "../../../Components/AACKeyboard";
import useSound from "use-sound";
import TextToSpeechAACButtons from "../../../Components/TextToSpeechAACButtons";
import CompletedStory from "@/Components/CompletedStory";
import { motion, AnimatePresence } from "framer-motion";
import {
  SpinEffect,
  PulseEffect,
  FadeEffect,
  SideToSideEffect,
  UpAndDownEffect,
  ScaleUpEffect,
  BounceEffect,
  FlipEffect,
  SlideAcrossEffect,
} from "../../../Components/AnimationUtils";
import CompletionPage from "../../../CompletionPage/page";
import TextToSpeechTextOnly from "@/Components/TextToSpeechTextOnly";
import useAACSounds from "@/Components/useAACSounds";
import { db } from "../../../../firebaseControls/firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
  collection,
  runTransaction,
} from "firebase/firestore"; // to update the firestore database with game data

const availableAvatars = ["🐯", "🐻", "🦄", "🐰", "🐬", "🦋"];

const loadPreferredVoices = (): SpeechSynthesisVoice[] => {
  const voices = window.speechSynthesis.getVoices();
  return voices.filter((v) => v.lang.includes("en-US"));
};

const preferredVoices = ["Google US English", "Samantha", "Microsoft Zira Desktop", "Microsoft Aria Online (Natural)","Google US Female",];

const getPreferredVoice = (): SpeechSynthesisVoice | null => {
  const voices = loadPreferredVoices();
  for (const name of preferredVoices) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  //fallback to first us eng voice if none match
  return voices[0] || null;
};

// getImageAnimation: Returns a reusable animation configuration for images.
const getImageAnimation = () => ({
  initial: { opacity: 0, scale: 0.5 }, // Start with a small, transparent image.
  animate: { opacity: 1, scale: 1 }, // Animate to full size and opacity.
  exit: { opacity: 0, scale: 0.5 }, // Animate out by shrinking and fading.
  transition: { duration: 0.8, ease: "easeOut" }, // Smooth animation with a standard easing.
});

const getNumPhrases = (difficulty: "easy" | "medium" | "hard") => {
  if (difficulty === "easy") return 4;
  if (difficulty === "medium") return 8;
  if (difficulty === "hard") return 12;
  return 8; // default
};

//This saves the player info such as their avatar, number, and playerId
async function savePlayerProfile(
  roomId: string,
  playerId: string,
  avatar: string,
  playerNumber: number
) {
  console.log("savePlayerProfile:", { roomId, playerId, avatar, playerNumber });
  const playerRef = doc(db, "games", roomId, "players", playerId);
  try {
    await setDoc(playerRef, {
      avatar,
      playerNumber,
      joinedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to write player doc:", e);
    throw e;
  }
}

export default function Home() {
  const skipSetup = process.env.NODE_ENV === "test";
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const { playSound } = useAACSounds(); // aac mp3 sound hook
  const [phrase, setPhrase] = useState("");
  const [userInput, setUserInput] = useState("");
  const [addedImage, setAddedImage] = useState<string | null>(null);
  const [images, setImages] = useState<
    { src: string; alt: string; x: number; y: number }[]
  >([]);
  const [isMounted, setIsMounted] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedPhrases, setCompletedPhrases] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<object[]>([]);
  const [turnReminders, setTurnReminders] = useState<object[]>([]);
  const [completedImages, setCompletedImages] = useState<
    { src: string; alt: string; x: number; y: number }[]
  >([]);
  const [currentImage, setCurrentImage] = useState<{
    src: string;
    alt: string;
    x: number;
    y: number;
  } | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [lastPlayedWord, setLastPlayedWord] = useState<string | null>(null);
  const [ttsReady, setTtsReady] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState<boolean>(false); //Opens window for player to choose avatar
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [playerAvatars, setPlayerAvatars] = useState<{
    [key: number]: string | undefined;
  }>({});
  const [storyCompleted, setStoryCompleted] = useState(false); // Used as a check for the story completion overlay
  const [showOverlay, setShowOverlay] = useState(false); // Is shown after storycompleted = true, with a delay
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "easy"
  ); // State for difficulty
  const numberOfPhrasesForGame = getNumPhrases(difficulty); // Derive from difficulty
  const trimmedSections =
    currentStory?.sections.slice(0, numberOfPhrasesForGame) || [];
  const [blockOverlay, setBlockOverlay] = useState<boolean>(false);
  const [showInitialPlayOverlay, setShowInitialPlayOverlay] = useState(true);
  const [isAutoReading, setIsAutoReading] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [announcedPlayer, setAnnouncedPlayer] = useState<number | null>(null);
  const [highlightedPlayer, setHighlightedPlayer] = useState<number | null>(
    null
  );
  const [speechQueue, setSpeechQueue] = useState<SpeechSynthesisUtterance[]>(
    []
  );
  const [isSpeaking, setIsSpeaking] = useState(false);

  //Grabbing roomID and story title from URL
  //roomID stores in firestore
  //story chosen from create room becomes default story
  const params = useParams();
  console.log("Params:", params); // Debugging

  const getNextPlayerNum = (): number => {
    if (currentTurn === maxPlayers) return 1;
    return currentTurn + 1;
  };

  const roomId = params.roomId as string;
  const storyTitleURL = params.storyTitle as string | undefined;
  const storyTitle = storyTitleURL ? decodeURIComponent(storyTitleURL) : null;
  const completedLength = completedPhrases.length;
  const lastCompleted = completedPhrases[completedLength - 1];
  const secondToLastCompleted = completedPhrases[completedLength - 2];
  const gameFinished = lastCompleted === "The End!";

  const announcePlayer = useCallback(
    async (playerNum: number) => {
      const avatar = playerAvatars[playerNum];
      if (avatar) {
        // Audio announcement
        const utterance = new SpeechSynthesisUtterance(
          `Player ${playerNum}, ${avatar}, it's your turn!`
        );
        window.speechSynthesis.speak(utterance);

        // Visual highlight
        setHighlightedPlayer(playerNum);

        // TODO: LOG TURN REMINDER HERE
        const newReminder = {
          playerAvatar: avatar,
          reminderTime: new Date(),
        };

        setTurnReminders([...turnReminders, newReminder]);

        // Auto-remove highlight after 5 seconds
        setTimeout(() => setHighlightedPlayer(null), 5000); //clears after 5 seconds
      }
    },
    [playerAvatars]
  );

  useEffect(() => {
    if (skipSetup) {
      // instantly allow the main UI to render
      setTtsReady(true);
      setAvatarModalOpen(false);
      setShowInitialPlayOverlay(false);
    }
  }, [skipSetup]);

  // NEW: Dedicated effect for turn timeout announcements
  useEffect(() => {
    if (!currentTurn || !playerAvatars[currentTurn]) return;

    // Clear previous timer
    if (inactivityTimer) clearTimeout(inactivityTimer);

    // Only set timer if this is the current player's device
    if (playerNumber === currentTurn) {
      const timer = setTimeout(() => {
        announcePlayer(currentTurn);
      }, 30000); // 30 second delay

      setInactivityTimer(timer);
    }

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [currentTurn, playerAvatars, playerNumber, announcePlayer]);

  //This is the snapshot used to retrieve game state in firestore
  useEffect(() => {
    if (!roomId) return;

    //Creates a new sub-collection "players" in game collection and stores player info
    const playersCol = collection(db, "games", roomId, "players");
    const unsubscribePlayers = onSnapshot(playersCol, (snap) => {
      const avatars: Record<number, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as { avatar: string; playerNumber: number };
        avatars[data.playerNumber] = data.avatar;
      });
      setPlayerAvatars(avatars);
    });

    const gameRef = doc(db, "games", roomId);

    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const gameData = snapshot.data();
        console.log("Firestore data received:", gameData);

        const dbPhrase = gameData.currentPhrase ?? "";
        if (dbPhrase.trim() !== "") {
          setPhrase(dbPhrase);
        }

        setMaxPlayers(gameData.maxPlayers || 4);
        setCurrentSectionIndex(gameData.currentSectionIndex || 0);
        //setPhrase(gameData.currentPhrase || "");
        setCompletedPhrases(gameData.completedPhrases || []);
        setCompletedImages(gameData.completedImages || []);
        setCurrentTurn(gameData.currentTurn || 1);
        setStoryCompleted(gameData.gameStatus === "completed");
        setDifficulty(gameData.difficulty || "easy"); // Load difficulty from DB

        if (gameData.gameStatus === "completed" && gameData.ttsDone) {
          setTimeout(() => {
            setShowOverlay(true);
          }, 3000);
        }

        const lastWord = gameData.lastWordSelected?.word;
        if (lastWord && lastWord !== lastPlayedWord) {
          setLastPlayedWord(lastWord);
        }

        if (gameData.storyTitle && !currentStory) {
          const selectedStory = stories.find(
            (s) => s.title === gameData.storyTitle
          );
          setCurrentStory(selectedStory || stories[0]);
          setPhrase(
            selectedStory?.sections[gameData.currentSectionIndex || 0]
              ?.phrase || ""
          );
          setCurrentSectionIndex(gameData.currentSectionIndex || 0);
        } else if (
          currentStory &&
          gameData.currentSectionIndex !== currentSectionIndex
        ) {
          setCurrentSectionIndex(gameData.currentSectionIndex || 0);
          setPhrase(
            currentStory.sections[gameData.currentSectionIndex || 0]?.phrase ||
            ""
          );
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, lastPlayedWord, currentStory]); // Added currentStory to dependency array

  useEffect(() => {
    if (!storyTitle || stories.length === 0) return;

    const selectedStory = stories.find((s) => s.title === storyTitle);
    const storyToUse = selectedStory || stories[0];

    setCurrentStory(storyToUse);
    setPhrase(storyToUse.sections[0].phrase);
    setIsMounted(true);
  }, [storyTitle, stories]);

  //Assigning player #'s
  const handleConfirmAvatar = async () => {
    if (!selectedAvatar) return alert("Pick one!");
    // With this polyfill:
    const myId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2);
    sessionStorage.setItem("player-uid", myId);

    await runTransaction(db, async (tx) => {
      const gameRef = doc(db, "games", roomId);
      const roomRef = doc(db, "rooms", roomId);
      const [gameSnap, roomSnap] = await Promise.all([
        tx.get(gameRef),
        tx.get(roomRef),
      ]);
      const roomData = roomSnap.exists() ? roomSnap.data() : {};
      const roomNumPlayers = roomData.numPlayers || 4;

      if (!gameSnap.exists()) {
        // first join: create game doc
        tx.set(gameRef, {
          player1Id: myId,
          currentTurn: 1,
          maxPlayers: roomNumPlayers,
          currentSectionIndex: 0,
          currentPhrase: currentStory!.sections[0].phrase,
          completedPhrases: [],
          completedImages: [],
          gameStatus: "in_progress",
          difficulty: difficulty, // Initialize difficulty in DB
          numberOfPhrases: numberOfPhrasesForGame, // Initialize number of phrases
          lastUpdated: serverTimestamp(),
        });
        setPlayerNumber(1);
        return;
      }

      const data = gameSnap.data();

      // assign next free slot
      if (!data.player1Id) {
        tx.update(gameRef, { player1Id: myId });
        setPlayerNumber(1);
        return;
      }
      // ——— then slot 2 ———
      if (!data.player2Id && roomNumPlayers > 1) {
        tx.update(gameRef, { player2Id: myId });
        setPlayerNumber(2);
        return;
      }
      // ——— then slot 3 ———
      if (!data.player3Id && roomNumPlayers > 2) {
        tx.update(gameRef, { player3Id: myId });
        setPlayerNumber(3);
        return;
      }
      // ——— then slot 4 ———
      if (!data.player4Id && roomNumPlayers > 3) {
        tx.update(gameRef, { player4Id: myId });
        setPlayerNumber(4);
        return;
      }

      throw new Error("Room is full");
    });

    // save avatar to sub-collection
    const playersCol = collection(db, "games", roomId, "players");
    const snapshot = await getDocs(playersCol);
    const myNum = snapshot.size + 1;
    await savePlayerProfile(roomId, myId, selectedAvatar, myNum);

    setAvatarModalOpen(false);
    speechSynthesis.getVoices();
    setTtsReady(true);
  };

  useEffect(() => {
    const isEnd = phrase === "The End!";
    const notYourTurn =
      playerNumber !== null &&
      currentTurn !== null &&
      playerNumber !== currentTurn;
    setBlockOverlay(isEnd || notYourTurn);
  }, [phrase, playerNumber, currentTurn]);

  const speakCurrentPhrase = useCallback(() => {
    setShowInitialPlayOverlay(false);
    //setIsAutoReading(false);
    setIsAutoReading(true); // Set to true when auto-read starts
    const u = new SpeechSynthesisUtterance(phrase);
    const prefVoice = getPreferredVoice();
    if (prefVoice) {
      u.voice = prefVoice;
    }
    //u.addEventListener("end", () => {
    //  setIsAutoReading(false); // Set to false when done  
    //});
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setIsAutoReading(false);
  }, [phrase]);

  // Not used
  const handleStoryChange = async (story: Story, phraseLimit: number) => {
    setCurrentStory(story);
    setPhrase(story.sections[0].phrase);
    setCurrentSectionIndex(0);
    setImages([]);
    setCompletedPhrases([]);
    setSelectedWords([]);
    setTurnReminders([]);
    setCompletedImages([]);
    setCurrentImage(null);
    if (roomId) {
      const gameRef = doc(db, "games", roomId);
      await updateDoc(gameRef, {
        currentSectionIndex: 0,
        currentPhrase: story.sections[0].phrase,
        completedPhrases: [],
        completedImages: [],
        selectedWords: [],
        turnReminders: [],
        gameStatus: "in_progress",
      });
    }
  };

  // Word has been selected from "AAC board", replace blank, add in visual element, update the firestore
  const handleWordSelect = async (word: string) => {
    if (!currentStory) return;
    setAnnouncedPlayer(null);
    // Clear existing timer
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    // Access words from the trimmed sections
    const currentSections = trimmedSections;
    if (!currentSections || currentSectionIndex >= trimmedSections.length) {
      return;
    }

    const currentWords = currentSections[currentSectionIndex].words;

    if (!currentWords[word]) {
      alert(`Word "${word}" not found in current section!`);
      return;
    }
    const selectedWordData = currentSections[currentSectionIndex]?.words[word];

    if (!selectedWordData) return;

    const lastWordSelected = {
      word,
      timestamp: new Date(),
      player: playerAvatars[currentTurn],
    };

    const newImage = {
      src: `/images/${selectedWordData?.image || null}`,
      alt: word,
      x: selectedWordData.x || 0,
      y: selectedWordData.y || 0,
    };

    const newPhrase = phrase.replace("___", word);

    const gameRef = doc(db, "games", roomId);
    const docSnap = await getDoc(gameRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const maxPlayers = data.maxPlayers || 4;
      const nextTurn = currentTurn === maxPlayers ? 1 : currentTurn + 1;
      const nextSectionIndex = currentSectionIndex + 1;
      const isLastSection = nextSectionIndex >= numberOfPhrasesForGame; // Still use numberOfPhrasesForGame for the final check
      const nextPhrase = isLastSection
        ? "The End!"
        : trimmedSections[nextSectionIndex]?.phrase || "The End!"; // Access phrase from trimmedSections

      //if game already exists just update game document, else create new game document
      const gameDataToSave = {
        completedPhrases: [...completedPhrases, newPhrase],
        completedImages: [...completedImages, newImage],
        selectedWords: [...selectedWords, lastWordSelected],
        turnReminders: turnReminders,
        currentSectionIndex: isLastSection
          ? currentSectionIndex
          : nextSectionIndex,
        currentPhrase: nextPhrase,
        lastWordSelected: lastWordSelected,
        currentTurn: nextTurn,
        lastUpdated: new Date(),
        gameStatus: isLastSection ? "completed" : "in_progress",
        numberOfPhrases: numberOfPhrasesForGame, // Ensure this is saved
      };
      await setDoc(gameRef, gameDataToSave, { merge: true });
      // await updateDoc(gameRef, gameDataToSave);
      if (!isLastSection) {
        setCurrentSectionIndex(nextSectionIndex);
        // Set the next phrase from the trimmed sections
        setPhrase(trimmedSections[nextSectionIndex]?.phrase || "");
      } else {
        setPhrase("The End!");
        setStoryCompleted(true);
      }
    }

    setCompletedPhrases([...completedPhrases, newPhrase]);
    setCompletedImages([...completedImages, newImage]);
    setSelectedWords([...selectedWords, lastWordSelected]);
  };

  const handleAACSelect = (word: string) => {
    if (playerNumber !== currentTurn) {
      return;
    }
    console.log("AAC Button Clicked:", word);
    playSound(word);
    handleWordSelect(word);
    // Reset announcement state
    setAnnouncedPlayer(null);
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
  };

  useEffect(() => {
    if (phrase === "The End!") {
      setBlockOverlay(true);
      console.log("AAC Tablet Blocked");
    }
  }, [phrase]);

  const usedAvatars = new Set(Object.values(playerAvatars));

  if (!ttsReady) {
    return (
      <>
        <div
          className="flex items-center justify-center w-full h-full overflow-hidden bg-yellow-100"
          style={{ width: "100vw", height: "100vh" }}
        >
          {/* Avatar modal - now centered in iPad viewport */}
          {avatarModalOpen ? (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white p-6 rounded-lg w-[90vw] max-w-md mx-auto">
                <h2 className="text-xl font-bold mb-3 text-center text-black">
                  Choose Your Avatar
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {availableAvatars.map((a) => {
                    const taken = usedAvatars.has(a);
                    return (
                      <button
                        key={a}
                        onClick={() => !taken && setSelectedAvatar(a)}
                        disabled={taken}
                        className={`
                        text-4xl p-2 rounded-full border-4
                        ${selectedAvatar === a
                            ? "border-green-500"
                            : "border-transparent"
                          }
                        ${taken
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:scale-110 transition-transform"
                          }
                      `}
                      >
                        {a}
                        {taken && <span className="sr-only">(taken)</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleConfirmAvatar}
                  className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded"
                >
                  ✅
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-screen bg-yellow-100">
              <button
                onClick={() => setAvatarModalOpen(true)}
                className="w-[80%] h-[30vh] text-5xl bg-orange-500 text-white font-extrabold rounded-2xl shadow-2xl hover:bg-orange-600 transition animate-pulse"
              >
                🎮 START GAME
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  const numJoined = Object.keys(playerAvatars).length;

  return (
    <>
      {showInitialPlayOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-75">
          {numJoined < maxPlayers ? (
            <p className="mb-4 w-2/3 text-4xl font-bold text-yellow-200 bg-blue-300 bg-opacity-60 p-8 rounded-3xl shadow-2xl flex items-center justify-center space-x-4">
              <span>
                Waiting for players… ({numJoined}/{maxPlayers})
              </span>
              <span className="text-5xl">🕒</span>
            </p>
          ) : (
            <button
              onClick={speakCurrentPhrase}
              className="relative text-9xl p-10 bg-gradient-to-tr from-purple-400 via-pink-500 to-red-500 text-white rounded-full shadow-2xl ring-4 ring-offset-4 ring-purple-300 
            transform transition duration-300 ease-in-out hover:scale-110 active:scale-95 animate-pulse"
              aria-label="Press to start reading"
            >
              ▶️
              <span
                className="
              absolute inset-0 rounded-full
              bg-white bg-opacity-10
              animate-ping
              pointer-events-none
            "
              />
            </button>
          )}
        </div>
      )}

      <div className="fixed inset-0 flex bg-gray-900 overflow-hidden">
        {/* Left Panel: */}
        <div className="w-[40%] h-full bg-[hsl(45,93%,83%)] p-3 flex flex-col justify-between items-center rounded-lg shadow-lg border-[8px] border-[#e09f3e] overflow-hidden">
          {/* Player turns display */}
          {playerNumber && (
            <div className="flex flex-col items-center justify-center mb-2 w-full">
              <div className="w-full bg-yellow-100 rounded-lg p-2 shadow-inner">
                <div className="grid grid-cols-4 gap-2 w-full">
                  {Object.entries(playerAvatars)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([num, avatar]) => {
                      const slot = Number(num);
                      const highlight =
                        slot === currentTurn && slot === playerNumber;
                      return (
                        <div key={num} className="flex flex-col items-center">
                          <span
                            className={`
                              ${highlight
                                ? "text-7xl p-4 border-4 ring-4 ring-yellow-300 bg-green-500 rounded-full scale-150 animate-pulse glow"
                                : "text-5xl p-2 border-2 border-gray-400"
                              }
                              rounded-full
                              transition-transform duration-300 ease-in-out
                            `}
                            style={{
                              transform: highlight ? "scale(1.5)" : "scale(1)",
                              zIndex: highlight ? 10 : 1,
                            }}
                          >
                            {avatar}
                          </span>
                          {highlight && (
                            <span className="text-xs mt-1 font-bold text-green-600">
                              YOU!
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="mt-2 text-center w-full">
                {playerNumber === currentTurn ? (
                  <p
                    className={`text-2xl font-extrabold ${highlightedPlayer === currentTurn
                      ? "text-red-600 animate-pulse"
                      : "text-green-600"
                      }`}
                  >
                    {highlightedPlayer === currentTurn
                      ? "⚠️ YOUR TURN! (PLAY NOW!)"
                      : "YOUR TURN!"}
                  </p>
                ) : (
                  <p className="text-2xl text-gray-600">
                    ⏳ Waiting for {playerAvatars[currentTurn]}...
                  </p>
                )}
              </div>
            </div>
          )}
          <div
            className={`aac-blocking-container ${blockOverlay ? "blocked" : ""
              }`}
            style={{ height: "60%" }}
          >
            <AACKeyboard
              onSelect={handleAACSelect}
              symbols={
                trimmedSections[currentSectionIndex] // Use trimmedSections here
                  ? Object.entries(
                    trimmedSections[currentSectionIndex].words
                  ).map(([word, data]) => ({
                    word: word,
                    image: `/images/${data.image}`,
                    displayText: word,
                  }))
                  : []
              }
              backgroundColor={currentStory?.colorTheme.backgroundColor}
              buttonColor={currentStory?.colorTheme.buttonColor}
              blockButtons={blockOverlay} // Last phrase "The End!"
            />
          </div>

          <TextToSpeechAACButtons
            text={phrase}
            disabled={isAutoReading} // Pass the auto-read state
          />
        </div>

        {/* Right Panel: Game Scene */}
        <div
          className="w-[60%] h-full relative bg-cover bg-center flex justify-center items-center overflow-hidden"
          style={{
            backgroundImage: `url('/images/${currentStory?.backgroundImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Completed Phrases (positioned with the text) */}
          {/* Storybook Text Display */}
          <div className="absolute bottom-0 left-0 right-0 min-h-[120px] bg-[url('/images/parchment-texture.png')] bg-cover p-4 border-t-8 border-amber-800 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]"
            style={{
              zIndex: 10
            }}
          >
            {/* Decorative scroll ends */}
            <div className="absolute -top-6 left-4 right-4 flex justify-between pointer-events-none">
              <span className="text-5xl text-amber-800">✧</span>
              <span className="text-5xl text-amber-800">✧</span>
            </div>

            <div className="max-w-full mx-auto">
              {/* Completed story phrases */}
              <div className="flex flex-col gap-1">
                {phrase !== "The End!" ? (
                  <>
                    {completedPhrases.length > 0 && (
                      <span className="text-3xl font-short-stack text-amber-700 italic bg-white/50 px-3 py-1 rounded-lg whitespace-nowrap">
                        {completedPhrases[completedPhrases.length - 1]}
                      </span>
                    )}
                  </>
                ) : (
                  completedPhrases.map((completedPhrase, index) => (
                    <span
                      key={index}
                      className="text-2xl font-short-stack text-amber-900 bg-white/80 px-3 py-1 rounded-lg whitespace-nowrap"
                    >
                      {completedPhrase}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Current phrase with magical effects */}
            <div className="relative">
              <span className="text-4xl font-bold font-patrick-hand text-amber-900 animate-pulse">
                {phrase}
                <span className="ml-1 inline-block w-2 h- bg-amber-600 animate-blink"></span>
              </span>
            </div>
          </div>

          {/* Animated Images (sparkles removed) */}
          <AnimatePresence>
            {completedImages.map((image, index) => {
              const imageData = trimmedSections
                .flatMap((section) => Object.values(section.words))
                .find((data) => `/images/${data.image}` === image.src); // Use trimmedSections
              const effect = imageData?.effect || "none"; // Get the effect, default to 'none'
              let effectComponent = null;
              {/*if (effect === "spin") {
                effectComponent = (
                  <SpinEffect key={`spin-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </SpinEffect>
                );
              } else if (effect === "pulse") {
                effectComponent = (
                  <PulseEffect key={`pulse-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </PulseEffect>
                );
              } else if (effect === "fade") {
                effectComponent = (
                  <FadeEffect key={`fade-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </FadeEffect>
                );
              } else if (effect === "sideToSide") {
                effectComponent = (
                  <SideToSideEffect key={`sidetoside-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </SideToSideEffect>
                );
              } else if (effect === "upAndDown") {
                effectComponent = (
                  <UpAndDownEffect key={`updown-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </UpAndDownEffect>
                );
              } else if (effect === "scaleUp") {
                effectComponent = (
                  <ScaleUpEffect key={`scaleup-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </ScaleUpEffect>
                );
              } else if (effect === "bounce") {
                effectComponent = (
                  <BounceEffect key={`bounce-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </BounceEffect>
                );
              } else if (effect === "SlideAcrossEffect") {
                effectComponent = (
                  <SlideAcrossEffect key={`slideacross-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </SlideAcrossEffect>
                );
              } else if (effect === "flip") {
                effectComponent = (
                  <FlipEffect key={`flip-${index}`}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-48 h-48"
                      {...getImageAnimation()}
                    />
                  </FlipEffect>
                );
              } else {*/}
              effectComponent = (
                <motion.img
                  key={`normal-${index}`}
                  src={image.src}
                  alt={image.alt}
                  className="w-48 h-48"
                  {...getImageAnimation()}
                />
              );
              {/*}*/ }

              return (
                <div
                  key={`image-container-${index}`}
                  className="absolute"
                  style={{
                    left: `${image.x}%`,
                    top: `${Math.min(image.y, 60)}%`,
                  }}
                >
                  {effectComponent}
                </div>
              );
            })}
          </AnimatePresence>

          {/* Calls AutomaticTextToSpeech, which speech texts the current fill in the blank phrase*/}
          {phrase && <TextToSpeechTextOnly key={phrase} text={phrase} playOverlay={showInitialPlayOverlay} />}

          {/* Text to speech completed story*/}
          {phrase === "The End!" && (
            <div>
              {/*Call completedstory button and pass completedphrase map*/}
              <CompletedStory
                completedPhrases={completedPhrases}
                roomId={roomId}
                onComplete={() => {
                  setShowOverlay(true);
                }}
              />
            </div>
          )}

          {showOverlay && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center">
              <CompletionPage />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
