//project-aac-game-team-b/StoryQuest/app/CreateRoom/page.tsx

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ExitButton } from "../HomePage/HomePageButtons";
import { db } from "../../firebaseControls/firebaseConfig";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";
import "./CreateRoomButtonStyles.css";
import useButtonFeedback from "@/Components/useButtonClickSounds";
import useQuickTextToSpeech from "@/Components/useQuickTextToSpeech";
import Link from "next/link";

export default function CreateRoomPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const { speak } = useQuickTextToSpeech();
  const { buttonHandler, isSpeaking } = useButtonFeedback();

  const router = useRouter();

  const handleStoryClick = (story: string) => {
    setSelectedStory(story);
    setCurrentStep(2);
    buttonHandler("select", story, speak);
  };

  const handlePlayerClick = (num: number) => {
    setNumPlayers(num);
    setCurrentStep(3);
    buttonHandler("select", num + " players", speak);
  };

  const handleDifficultyClick = (level: string) => {
    setDifficultyLevel(level);
    setCurrentStep(4);
    buttonHandler("select", level + " mode", speak);
  };

  const handleCreateRoom = async () => {
    if (!selectedStory) {
      alert("Please select a story.");
      return;
    }

    setLoading(true);
    buttonHandler("select", "Start Adventure!", speak);

    try {
      // Create room in 'rooms' collection
      const roomRef = await addDoc(collection(db, "rooms"), {
        story: selectedStory,
        numPlayers: numPlayers,
        difficulty: difficultyLevel,
        createdAt: new Date(),
      });

      const roomId = roomRef.id;
      const numberOfPhrasesForGame =
        difficultyLevel === "easy"
          ? 4
          : difficultyLevel === "medium"
          ? 8
          : difficultyLevel === "hard"
          ? 12
          : 4;

      // Create game state in 'games' collection
      await setDoc(doc(db, "games", roomId), {
        storyTitle: selectedStory,
        difficulty: difficultyLevel,
        numberOfPhrases: numberOfPhrasesForGame,
        maxPlayers: numPlayers,
        players: [],
        currentTurn: 1,
        gameStatus: "waiting_for_players",
        createdAt: new Date(),
        currentSectionIndexInGame: 0,
        completedPhrases: [],
        completedImages: [],
        currentSectionIndex: 0,
        currentPhrase: "",
        useOrderedSections: true,
        lastUpdated: new Date(),
      });

      router.push(
        `/CreateRoom/qrcode?roomId=${roomId}&storyTitle=${encodeURIComponent(
          selectedStory ?? ""
        )}`
      );
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = (text: string) => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
    buttonHandler("back", text, speak);
  };

  const handleOnMouseEnter = (text: string) => {
    if (!isSpeaking) speak(text);
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/images/home-background.jpg')" }}
    >
      {/* Main content container */}
      <div className="relative h-[90vh] w-[90vw] bg-white/80 backdrop-blur-sm flex flex-col items-center p-6 overflow-hidden shadow-xl rounded-2xl">
        {/* Home Button (conditionally shown) */}
        {(currentStep === 1 || currentStep === 4) && (
          <div className="absolute top-4 left-1">
            <Link href="/" className="absolute top-4 left-4 z-10 scale-50">
              <ExitButton />
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="w-full max-w-4xl text-center mt-4 mb-2">
          <h1
            className="text-3xl font-bold text-gray-800"
            onClick={() => handleOnMouseEnter("Let's Create a Game!")}
          >
            Let's Create a Game!
          </h1>
        </div>

        {/* Progress bubbles */}
        <div className="flex justify-center gap-3 mb-4 w-full max-w-4xl">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                            ${
                              currentStep >= step
                                ? "bg-teal-500 text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
            >
              {step}
            </div>
          ))}
        </div>

        {/* Step 1: Story Selection */}
        {currentStep === 1 && (
          <div className="w-full max-w-4xl flex-grow flex flex-col overflow-hidden">
            <h2
              className="text-2xl font-semibold text-gray-700 text-center mb-4"
              onClick={() => handleOnMouseEnter("Choose Your Story")}
            >
              Choose Your Story
            </h2>

            <div className="grid grid-cols-2 gap-4 px-2 mb-2 overflow-y-auto">
              {[
                {
                  title: "The Garden Adventure",
                  img: "/images/garden-background.webp",
                },
                {
                  title: "Walk in the Forest",
                  img: "/images/forest-background.jpg",
                },
                { title: "Under the Sea", img: "/images/ocean-background.png" },
                {
                  title: "Space Adventure",
                  img: "/images/space-background.svg",
                },
              ].map((story) => (
                <button
                  key={story.title}
                  className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden
                                                hover:border-teal-300 active:scale-95 transition-all flex flex-col h-full"
                  onClick={() => handleStoryClick(story.title)}
                >
                  <img
                    src={story.img}
                    alt={story.title}
                    className="w-full h-32 object-cover"
                  />
                  <span className="text-lg font-medium text-gray-800 p-3">
                    {story.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Player Count */}
        {currentStep === 2 && (
          <div className="w-full flex-grow flex flex-col items-center">
            <h2
              className="text-2xl font-semibold text-gray-700 text-center mb-3"
              onClick={() =>
                handleOnMouseEnter("How Many Friends Are Playing?")
              }
            >
              How Many Friends Are Playing?
            </h2>

            <div className="flex flex-col gap-1 w-[300px] mb-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4
                                                hover:border-teal-300 active:scale-95 transition-all
                                                h-[110px] w-full"
                  onClick={() => handlePlayerClick(num)}
                >
                  <div className="flex justify-center gap-2 mb-2">
                    {[...Array(num)].map((_, index) => (
                      <span key={index} className="text-2xl">
                        😊
                      </span>
                    ))}
                  </div>
                  <span className="text-xl font-medium text-gray-800">
                    {num} Players
                  </span>
                </button>
              ))}
            </div>

            <button
              className="back-step-button"
              onClick={() => goBack("Go Back")}
            >
              ← Go Back
            </button>
          </div>
        )}

        {/* Step 3: Difficulty */}
        {currentStep === 3 && (
          <div className="w-full flex-grow flex flex-col items-center">
            <h2
              className="text-2xl font-semibold text-gray-700 text-center mb-3"
              onClick={() => handleOnMouseEnter("Pick Game Difficulty")}
            >
              Pick Game Difficulty
            </h2>

            <div className="flex flex-col gap-1 w-[300px] mb-1">
              <button
                className={`bg-white rounded-xl shadow-md border-2 p-4 h-[110px] w-full
                                            transition-all flex flex-col justify-center items-center 
                                            ${
                                              difficultyLevel === "easy"
                                                ? "bg-green-100 border-green-400"
                                                : "border-gray-200 hover:border-green-400"
                                            }`}
                onClick={() => handleDifficultyClick("easy")}
                onMouseEnter={() => {
                  setTooltip("Easy mode: 4 sentences");
                  handleOnMouseEnter("Easy mode: 4 sentences");
                }}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => setTooltip("Easy mode: 4 sentences")}
              >
                <span className="text-xl font-medium text-gray-700">Easy</span>
                {tooltip === "Easy mode: 4 sentences" && (
                  <span className="text-sm font-normal text-gray-600 mt-1 bg-green-400 rounded-lg px-2 py-1">
                    4 sentences
                  </span>
                )}
              </button>

              <button
                className={`bg-white rounded-xl shadow-md border-2 p-4 h-[110px] w-full
                                            transition-all flex flex-col justify-center items-center
                                            ${
                                              difficultyLevel === "medium"
                                                ? "bg-orange-100 border-orange-400"
                                                : "border-gray-200 hover:border-orange-400"
                                            }`}
                onClick={() => handleDifficultyClick("medium")}
                onMouseEnter={() => {
                  setTooltip("Medium mode: 8 sentences");
                  handleOnMouseEnter("Medium mode: 8 sentences");
                }}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => setTooltip("Medium mode: 8 sentences")}
              >
                <span className="text-xl font-medium text-gray-700">
                  Medium
                </span>
                {tooltip === "Medium mode: 8 sentences" && (
                  <span className="text-sm font-normal text-gray-600 mt-1 bg-orange-400 rounded-lg px-2 py-1">
                    8 sentences
                  </span>
                )}
              </button>

              <button
                className={`bg-white rounded-xl shadow-md border-2 p-4 h-[110px] w-full
                                            transition-all flex flex-col justify-center items-center
                                            ${
                                              difficultyLevel === "hard"
                                                ? "bg-red-100 border-red-400"
                                                : "border-gray-200 hover:border-red-400"
                                            }`}
                onClick={() => handleDifficultyClick("hard")}
                onMouseEnter={() => {
                  setTooltip("Hard mode: 12 sentences");
                  handleOnMouseEnter("Hard mode: 12 sentences");
                }}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => setTooltip("Hard mode: 12 sentences")}
              >
                <span className="text-xl font-medium text-gray-700">Hard</span>
                {tooltip === "Hard mode: 12 sentences" && (
                  <span className="text-sm font-normal text-gray-600 mt-1 bg-red-400 rounded-lg px-2 py-1">
                    12 sentences
                  </span>
                )}
              </button>
            </div>

            <button
              className="back-step-button"
              onClick={() => goBack("Go Back")}
            >
              ← Go Back
            </button>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="w-full flex-grow flex flex-col items-center">
            <h2
              className="text-2xl font-semibold text-gray-700 text-center mb-3"
              onClick={() => handleOnMouseEnter("Ready to Play!")}
            >
              Ready to Play!
            </h2>

            <div className="flex flex-col items-center w-[300px] mb-4 max-h-[300px] overflow-hidden">
              {/* Story Preview */}
              <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 w-full mb-3 overflow-hidden">
                <img
                  src={
                    selectedStory === "The Garden Adventure"
                      ? "/images/garden-background.webp"
                      : selectedStory === "Walk in the Forest"
                      ? "/images/forest-background.jpg"
                      : selectedStory === "Under the sea"
                      ? "/images/ocean-background.png"
                      : "/images/space-background.svg"
                  }
                  alt={selectedStory || "Story"}
                  className="w-full h-24 object-cover"
                />
                <div className="p-3">
                  <p className="font-medium text-gray-800">{selectedStory}</p>
                </div>
              </div>

              {/* Players & Difficulty */}
              <div className="flex gap-3 w-full">
                {/* Players */}
                <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-3 flex-1 text-center">
                  <div className="flex justify-center gap-1 mb-1">
                    {numPlayers &&
                      [...Array(numPlayers)].map((_, i) => (
                        <span key={i} className="text-xl">
                          😊
                        </span>
                      ))}
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {numPlayers} Players
                  </p>
                </div>

                {/* Difficulty Box */}
                <div
                  className={`rounded-xl shadow-md border-2 p-3 flex-1 text-center
                                    ${
                                      difficultyLevel === "easy"
                                        ? "bg-green-100 border-green-400"
                                        : difficultyLevel === "medium"
                                        ? "bg-orange-100 border-orange-400"
                                        : "bg-red-100 border-red-400"
                                    }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                      {difficultyLevel}:
                    </span>
                    <span className="text-sm font-normal text-gray-600">
                      {difficultyLevel === "easy"
                        ? "4 sentences"
                        : difficultyLevel === "medium"
                        ? "8 sentences"
                        : "12 sentences"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1 w-[300px]">
              <button
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl
                                            flex items-center justify-center gap-2 transition-colors
                                            active:scale-95 disabled:opacity-50"
                onClick={handleCreateRoom}
                disabled={loading}
              >
                {loading ? "Creating..." : "🎮 Start Adventure!"}
              </button>
              <button
                className="back-step-button"
                onClick={() => goBack("Change Something")}
              >
                ← Change Something
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
