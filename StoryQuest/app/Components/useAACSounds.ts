//StoryQuest/app/Components/useAACSounds.ts

import { useEffect, useRef, useState } from "react";

const useAACSounds = () => {
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  const selectVoice = (voices: SpeechSynthesisVoice[]) => {
    if (!voices || voices.length === 0) return null;

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

    const usEnglishVoice = voices.find((v) => v.lang === "en-US");
    if (usEnglishVoice) return usEnglishVoice;

    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) return englishVoice;

    return voices[0];
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      return;
    }

    const synth = window.speechSynthesis;
    let initialized = false;

    const initializeSynth = () => {
      if (initialized) return;

      const voices = synth.getVoices();
      if (voices.length > 0) {
        const voice = selectVoice(voices);
        setSelectedVoice(voice);
        setIsReady(true);
        initialized = true;

        console.log("Selected voice:", voice?.name, voice?.lang);

        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          const warmUp = new SpeechSynthesisUtterance("");
          warmUp.volume = 0;
          synth.speak(warmUp);
          setTimeout(() => synth.cancel(), 100);
        }
      }
    };

    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = initializeSynth;
    }

    initializeSynth();
  }, []);

  const playSound = (word: string) => {
    if (!isReady || !word) return;

    try {
      window.speechSynthesis.cancel(); 

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 1;  
      utterance.pitch = 1; 
      if (selectedVoice) utterance.voice = selectedVoice;

      currentUtterance.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  return { playSound };
};

export default useAACSounds;