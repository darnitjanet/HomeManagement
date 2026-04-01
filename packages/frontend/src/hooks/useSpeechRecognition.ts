import { useState, useCallback, useRef, useEffect } from 'react';
import { sttApi } from '../services/api';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Speech recognition hook using backend Vosk STT
 * Records audio and sends to backend for transcription
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check if backend STT is available
  useEffect(() => {
    const checkSTT = async () => {
      try {
        const response = await sttApi.getStatus();
        setIsSupported(response.data?.data?.available ?? false);
      } catch {
        // Check if browser MediaRecorder is available as fallback check
        setIsSupported(typeof MediaRecorder !== 'undefined');
      }
    };
    checkSTT();
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;

    setError(null);
    setInterimTranscript('Recording...');
    audioChunksRef.current = [];

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setInterimTranscript('Processing...');

        // Combine audio chunks - send raw webm to backend (ffmpeg converts server-side)
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        try {
          // Send to backend for transcription (backend handles webm→wav conversion)
          const response = await sttApi.transcribe(audioBlob);

          if (response.data?.success && response.data?.data?.text) {
            setTranscript(response.data.data.text);
            setInterimTranscript('');
          } else {
            setError(response.data?.error || 'Failed to transcribe');
            setInterimTranscript('');
          }
        } catch (err: any) {
          console.error('[STT] Transcription error:', err);
          setError(err.message || 'Failed to transcribe audio');
          setInterimTranscript('');
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);

    } catch (err: any) {
      console.error('[STT] Failed to start recording:', err);
      setError(err.message || 'Failed to access microphone');
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!mediaRecorderRef.current || !isListening) return;

    mediaRecorderRef.current.stop();
    setIsListening(false);
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

