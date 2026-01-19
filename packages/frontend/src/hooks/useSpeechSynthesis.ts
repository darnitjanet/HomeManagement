import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions for Web Speech Synthesis API
interface SpeechSynthesisOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null;
}

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error: string | null;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, options?: SpeechSynthesisOptions) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && !!window.speechSynthesis;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    // Load voices immediately if available
    loadVoices();

    // Chrome loads voices asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const speak = useCallback((text: string, options: SpeechSynthesisOptions = {}) => {
    if (!isSupported) {
      setError('Speech synthesis is not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Apply options
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.volume = options.volume ?? 1;

    // Select voice - prefer a natural English voice
    if (options.voice) {
      utterance.voice = options.voice;
    } else {
      // Try to find a good default English voice
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      const preferredVoice = englishVoices.find(v =>
        v.name.includes('Natural') ||
        v.name.includes('Samantha') ||
        v.name.includes('Google US')
      ) || englishVoices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setError(null);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      setIsPaused(false);

      if (event.error === 'canceled') {
        // User or code cancelled - not an error
        return;
      } else if (event.error === 'interrupted') {
        // Interrupted by new speech - not an error
        return;
      } else if (event.error === 'audio-busy') {
        setError('Audio device is busy. Please try again.');
      } else if (event.error === 'network') {
        setError('Network error occurred during speech synthesis.');
      } else if (event.error === 'not-allowed') {
        setError('Speech synthesis not allowed. Please check browser settings.');
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utteranceRef.current = utterance;

    // Chrome has a bug where long texts get cut off - workaround with chunking
    // For now, speak directly. If issues arise, implement chunking.
    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;
    window.speechSynthesis.pause();
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
  }, [isSupported, isPaused]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    error,
    voices,
    speak,
    stop,
    pause,
    resume,
  };
}
