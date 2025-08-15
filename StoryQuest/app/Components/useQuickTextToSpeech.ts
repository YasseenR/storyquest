// StoryQuest/app/Components/useQuickTextToSpeech.ts

import React, { useState, useEffect, useRef } from "react";

// Text to speech phrases hook, used for button or quick sounds
const useQuickTextToSpeech = () => {
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  const selectVoice = (voices: SpeechSynthesisVoice[]) => {
    if (!voices || voices.length === 0) return null;

    // Preferred voices 
    const preferredNames = [
      "Google US English",         // Chrome/Edge desktop
      "Samantha",                  // Safari macOS/iOS
      "Microsoft Zira Desktop"     // Windows female voice
    ];

    // Try preferred names first
    for (const name of preferredNames) {
      const match = voices.find(v => v.name === name && v.lang === "en-US");
      if (match) return match;
    }

    const usEnglishVoice = voices.find(v => v.lang === "en-US");
    if (usEnglishVoice) return usEnglishVoice;

    const englishVoice = voices.find(v => v.lang.startsWith("en"));
    if (englishVoice) return englishVoice;

    return voices[0]; 
  };

  // Initialize speech synthesis
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

        // iOS warm-up (silent utterance)
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
          const warmUp = new SpeechSynthesisUtterance("");
          warmUp.volume = 0;
          synth.speak(warmUp);
          setTimeout(() => synth.cancel(), 100);
        }
      }
    };

    // First try (voices might already be loaded)
    initializeSynth();

    // Fallback for browsers that load voices async
    synth.addEventListener("voiceschanged", initializeSynth);

    return () => {
      synth.removeEventListener("voiceschanged", initializeSynth);
      synth.cancel();
    };
  }, []);

  // Text to speech
  const speak = (text: string) => {
    if (!text || typeof window === "undefined" || !window.speechSynthesis || !selectedVoice) {
      return;
    }
    stop();

    const utterance = new SpeechSynthesisUtterance(text.replace(/_/g, " "));
    utterance.voice = selectedVoice;
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.pitch = 1;

    currentUtterance.current = utterance;

    utterance.onstart = () => {
      console.log("TTS started:", text);
    };

    utterance.onend = () => {
      console.log("TTS completed:", text);
      currentUtterance.current = null;
    };

    utterance.onerror = () => {
      console.log("TTS error:", text);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      currentUtterance.current = null;
    }
  };

  return { speak, stop, isReady };
};

export default useQuickTextToSpeech;