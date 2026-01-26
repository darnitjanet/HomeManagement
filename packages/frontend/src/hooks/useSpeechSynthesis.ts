import { useState, useCallback, useEffect, useRef } from 'react';
import { ttsApi } from '../services/api';

interface SpeechSynthesisOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
}

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error: string | null;
  voices: never[];  // Backend TTS doesn't have voice selection
  speak: (text: string, options?: SpeechSynthesisOptions) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if backend TTS is available
  useEffect(() => {
    const checkTTS = async () => {
      try {
        const response = await ttsApi.getStatus();
        setIsSupported(response.data?.data?.available ?? false);
      } catch {
        // If backend TTS not available, fall back to browser TTS
        setIsSupported(typeof window !== 'undefined' && !!window.speechSynthesis);
      }
    };
    checkTTS();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, []);

  const speak = useCallback(async (text: string, options: SpeechSynthesisOptions = {}) => {
    if (!text) return;

    setIsSpeaking(true);
    setError(null);

    try {
      // Convert browser TTS options to backend TTS options
      // Browser rate: 0.1-10 (1 = normal)
      // espeak-ng speed: words per minute (default 175)
      const speed = options.rate ? Math.round(175 * options.rate) : undefined;

      // Browser pitch: 0-2 (1 = normal)
      // espeak-ng pitch: 0-99 (50 = normal)
      const pitch = options.pitch ? Math.round(options.pitch * 50) : undefined;

      // Browser volume: 0-1
      // espeak-ng amplitude: 0-200 (100 = normal)
      const volume = options.volume !== undefined ? Math.round(options.volume * 100) : undefined;

      await ttsApi.speak(text, { speed, pitch, volume });

      // Estimate speaking duration (roughly 150 words per minute)
      const wordCount = text.split(/\s+/).length;
      const estimatedMs = Math.max(1000, (wordCount / 150) * 60 * 1000);

      // Set speaking to false after estimated duration
      speakingTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
      }, estimatedMs);

    } catch (err) {
      console.error('[TTS] Backend TTS error:', err);
      setError('Failed to speak text');
      setIsSpeaking(false);

      // Fall back to browser TTS if available
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = options.rate ?? 1;
          utterance.pitch = options.pitch ?? 1;
          utterance.volume = options.volume ?? 1;

          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          setIsSpeaking(true);
          window.speechSynthesis.speak(utterance);
        } catch {
          // Browser TTS also failed
        }
      }
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      await ttsApi.stop();
    } catch {
      // Ignore errors on stop
    }

    // Also stop browser TTS if it was used as fallback
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }

    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    // Backend TTS doesn't support pause - just stop
    stop();
  }, [stop]);

  const resume = useCallback(() => {
    // Backend TTS doesn't support resume
  }, []);

  return {
    isSpeaking,
    isPaused: false,  // Backend TTS doesn't support pause
    isSupported,
    error,
    voices: [],  // Backend TTS doesn't have voice selection
    speak,
    stop,
    pause,
    resume,
  };
}
