//StoryQuest/app/Components/CompletedStory.tsx
import React, { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/../firebaseControls/firebaseConfig";

interface TextToSpeechCompletedStoryProps {
  completedPhrases: string[];
  onComplete: () => void;
  roomId: string;
}

const CompletedStory: React.FC<TextToSpeechCompletedStoryProps> = ({
  completedPhrases,
  onComplete,
  roomId,
}) => {
  useEffect(() => {
    const narrationDelay = 1500; // 1.5 second delay before starting
    const postNarrationDelay = 500; // 0.5 second delay after finishing

    const fullStory = [...completedPhrases, "The End!"].join(". "); // Proper punctuation
        
    const waitForVoices = (): Promise<SpeechSynthesisVoice[]> =>
      new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length) {
          resolve(voices);
        } else {
          window.speechSynthesis.onvoiceschanged = () => {
            resolve(window.speechSynthesis.getVoices());
          };
        }
      });

    const getPreferredVoice = (voices: SpeechSynthesisVoice[]) => {
      const preferredVoices = [
        "Google US English",
        "Samantha",
        "Microsoft Zira Desktop",
        "Microsoft Aria Online (Natural)",
        "Google US Female",
      ];
      for (const name of preferredVoices) {
        const match = voices.find((v) => v.name === name && v.lang === "en-US");
        if (match) return match;
      }
      return (
        voices.find((v) => v.lang === "en-US") ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0] ||
        null
      );
    };

    const timer = setTimeout(async () => {
      const voices = await waitForVoices();

      const utterance = new SpeechSynthesisUtterance(fullStory);
      const voice = getPreferredVoice(voices);
      if (voice) utterance.voice = voice;

      utterance.onend = async () => {
        await updateDoc(doc(db, "games", roomId), { ttsDone: true });
        setTimeout(onComplete, postNarrationDelay);
      };

      window.speechSynthesis.cancel(); 
      window.speechSynthesis.speak(utterance);
    }, narrationDelay);

    return () => clearTimeout(timer);
  }, [completedPhrases, roomId, onComplete]);

  return null;
};

export default CompletedStory;