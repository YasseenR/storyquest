//StoryQuest/app/Components/TextToSpeechTextOnly.tsx

import React, { useEffect, useRef, useState } from "react";

interface TextToSpeechCompletedStoryProps {
  text: string;
  playOverlay: boolean;
  onComplete?: () => void;
}

const TextToSpeechTextOnly: React.FC<TextToSpeechCompletedStoryProps> = ({
  text,
  playOverlay,
  onComplete,
}) => {
  const [isReady, setIsReady] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const attemptCountRef = useRef(0);
  const maxAttempts = 5;

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      return;
    }

    const preferredVoiceNames = ["Google US English", "Samantha"];

    const loadPreferredVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return false;

      for (const name of preferredVoiceNames) {
        const voice = voices.find((v) => v.name.includes(name));
        if (voice) {
          voiceRef.current = voice;
          setIsReady(true);
          return true;
        }
      }
      return false;
    };

    if (!loadPreferredVoice()) {
      const handleVoicesChanged = () => {
        if (voiceRef.current) return;
        loadPreferredVoice();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

      const timer = setTimeout(() => {
        if (!voiceRef.current) setIsReady(false);
      }, 1000);

      return () => {
        clearTimeout(timer);
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
        if (utteranceRef.current) window.speechSynthesis.cancel();
      };
    }
  }, []);

  useEffect(() => {
    if (!text || !isReady || !voiceRef.current || playOverlay) return;

    const speakText = () => {
      try {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text.replace(/_/g, " "));
        utteranceRef.current = utterance;
        utterance.voice = voiceRef.current;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          utteranceRef.current = null;
          onComplete?.();
        };

        utterance.onerror = (e) => {
          console.warn("Speech synthesis error:", e);
          utteranceRef.current = null;
          if (attemptCountRef.current < maxAttempts) {
            attemptCountRef.current++;
            setTimeout(speakText, 250);
          } else {
            onComplete?.();
          }
        };

        setTimeout(() => window.speechSynthesis.speak(utterance), 100);
      } catch (err) {
        console.error("Speech synthesis exception:", err);
        onComplete?.();
      }
    };

    const timer = setTimeout(speakText, 200);
    return () => {
      clearTimeout(timer);
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
    };
  }, [text, isReady, onComplete]);

  return null;
};

export default TextToSpeechTextOnly;