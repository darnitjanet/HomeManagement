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

        // Combine audio chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Convert to WAV format for Vosk
        try {
          const wavBlob = await convertToWav(audioBlob);

          // Send to backend for transcription
          const response = await sttApi.transcribe(wavBlob);

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

/**
 * Convert audio blob to WAV format using AudioContext
 */
async function convertToWav(audioBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();

  // Decode the audio
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Convert to mono 16kHz WAV
  const targetSampleRate = 16000;
  const numChannels = 1;

  // Resample to target sample rate
  const offlineContext = new OfflineAudioContext(
    numChannels,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();

  const resampledBuffer = await offlineContext.startRendering();

  // Convert to WAV
  const wavData = encodeWav(resampledBuffer);
  return new Blob([wavData], { type: 'audio/wav' });
}

/**
 * Encode AudioBuffer to WAV format
 */
function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;

  // Get audio data
  const channelData = audioBuffer.getChannelData(0);
  const numSamples = channelData.length;

  // Calculate sizes
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV header
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true);

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write audio data
  const offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset + i * bytesPerSample, intSample, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
