// StoryQuest/app/Components/useTextToSpeech.ts

import { useState, useEffect, useRef } from "react";

const useTextToSpeech = () => {
  const [isReady, setIsReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices and mark ready
  useEffect(() => {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      return;
    }

    const handleVoicesChanged = () => setIsReady(true);

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) setIsReady(true);
    else window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    // Safari fallback
    const safariTimer = setTimeout(() => setIsReady(true), 1000);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      clearTimeout(safariTimer);
      if (utteranceRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  // Return the same voice
  const selectVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = ["Google US English", "Samantha", "Microsoft Zira Desktop", "Microsoft Aria Online (Natural)","Google US Female",];
    const voice = voices.find(v => preferredVoices.includes(v.name) && v.lang === "en-US");
    return voice || voices.find(v => v.lang === "en-US") || voices[0];
  };

  // Speak text
  const speak = (text: string) => {
    if (!text || !isReady) return;

    const utterance = new SpeechSynthesisUtterance(text.replace(/_/g, " "));
    utteranceRef.current = utterance;

    utterance.voice = selectVoice() || undefined;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      console.warn("Speech error:", text);
      utteranceRef.current = null;
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };

  return { speak, stop, isReady };
};

export default useTextToSpeech;