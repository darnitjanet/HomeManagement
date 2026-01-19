import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

// Global Window interface is extended in useSpeechRecognition.ts

export type VoiceCommand = {
  action: 'add_shopping_item' | 'add_task' | 'add_chore' | 'set_timer' | 'cancel_timer' | 'lights_on' | 'lights_off' | 'set_temperature' | 'unknown';
  data: Record<string, string>;
  rawText: string;
};

interface UseVoiceAssistantOptions {
  enabled: boolean;
  wakeWord?: string;
  onWakeWordDetected?: () => void;
  onCommand?: (command: VoiceCommand) => void;
  onResponse?: (text: string) => void;
  commandTimeoutMs?: number;
}

interface UseVoiceAssistantReturn {
  isSupported: boolean;
  isListening: boolean;
  isAwake: boolean;
  transcript: string;
  error: string | null;
  requestMicPermission: () => Promise<boolean>;
  restart: () => void;
}

// Parse voice commands
function parseCommand(text: string): VoiceCommand {
  const lower = text.toLowerCase().trim();

  // Shopping list commands
  // "add milk to the shopping list"
  // "add eggs to shopping"
  // "put bread on the shopping list"
  const shoppingPatterns = [
    /(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:the\s+)?shopping(?:\s+list)?/i,
    /(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:the\s+)?(?:grocery|groceries)(?:\s+list)?/i,
    /shopping\s+list\s+add\s+(.+)/i,
  ];

  for (const pattern of shoppingPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        action: 'add_shopping_item',
        data: { item: match[1].trim() },
        rawText: text,
      };
    }
  }

  // Task commands
  // "add task to call mom"
  // "remind me to take out the trash"
  // "create task buy birthday gift"
  const taskPatterns = [
    /(?:add\s+)?task\s+(?:to\s+)?(.+)/i,
    /remind\s+(?:me\s+)?to\s+(.+)/i,
    /create\s+(?:a\s+)?task\s+(?:to\s+)?(.+)/i,
  ];

  for (const pattern of taskPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        action: 'add_task',
        data: { title: match[1].trim() },
        rawText: text,
      };
    }
  }

  // Chore commands
  // "add chore vacuum the living room"
  // "create chore clean bathroom"
  const chorePatterns = [
    /(?:add|create)\s+(?:a\s+)?chore\s+(?:to\s+)?(.+)/i,
  ];

  for (const pattern of chorePatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        action: 'add_chore',
        data: { name: match[1].trim() },
        rawText: text,
      };
    }
  }

  // Timer commands
  // "set timer for 5 minutes"
  // "set a 10 minute timer"
  const timerPatterns = [
    /set\s+(?:a\s+)?timer\s+(?:for\s+)?(\d+)\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)/i,
    /set\s+(?:a\s+)?(\d+)\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)\s+timer/i,
  ];

  for (const pattern of timerPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let seconds = amount;

      if (unit.startsWith('min')) {
        seconds = amount * 60;
      } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
        seconds = amount * 3600;
      }

      return {
        action: 'set_timer',
        data: { seconds: String(seconds), display: `${amount} ${unit}` },
        rawText: text,
      };
    }
  }

  // Cancel timer commands
  // "cancel timer"
  // "stop timer"
  // "cancel the timer"
  const cancelTimerPatterns = [
    /cancel\s+(?:the\s+)?timer/i,
    /stop\s+(?:the\s+)?timer/i,
    /clear\s+(?:the\s+)?timer/i,
  ];

  for (const pattern of cancelTimerPatterns) {
    if (lower.match(pattern)) {
      return {
        action: 'cancel_timer',
        data: {},
        rawText: text,
      };
    }
  }

  // Smart home: Lights on
  // "turn on the lights"
  // "turn on the living room lights"
  // "lights on"
  const lightsOnPatterns = [
    /turn\s+on\s+(?:the\s+)?(?:(.+?)\s+)?lights?/i,
    /lights?\s+on(?:\s+in\s+(?:the\s+)?(.+))?/i,
  ];

  for (const pattern of lightsOnPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        action: 'lights_on',
        data: { room: (match[1] || 'all').trim() },
        rawText: text,
      };
    }
  }

  // Smart home: Lights off
  // "turn off the lights"
  // "turn off the bedroom lights"
  // "lights off"
  const lightsOffPatterns = [
    /turn\s+off\s+(?:the\s+)?(?:(.+?)\s+)?lights?/i,
    /lights?\s+off(?:\s+in\s+(?:the\s+)?(.+))?/i,
  ];

  for (const pattern of lightsOffPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        action: 'lights_off',
        data: { room: (match[1] || 'all').trim() },
        rawText: text,
      };
    }
  }

  // Smart home: Set temperature
  // "set temperature to 72"
  // "set thermostat to 68 degrees"
  // "make it 70 degrees"
  const tempPatterns = [
    /set\s+(?:the\s+)?(?:temperature|thermostat)\s+to\s+(\d+)(?:\s*degrees?)?/i,
    /make\s+it\s+(\d+)\s*degrees?/i,
    /set\s+(?:the\s+)?heat\s+to\s+(\d+)/i,
    /set\s+(?:the\s+)?(?:ac|air\s*conditioning?|cooling?)\s+to\s+(\d+)/i,
  ];

  for (const pattern of tempPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        action: 'set_temperature',
        data: { temperature: match[1] },
        rawText: text,
      };
    }
  }

  return {
    action: 'unknown',
    data: {},
    rawText: text,
  };
}

export function useVoiceAssistant({
  enabled,
  wakeWord = 'hey cosmo',
  onWakeWordDetected,
  onCommand,
  onResponse,
  commandTimeoutMs = 6000,
}: UseVoiceAssistantOptions): UseVoiceAssistantReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const awakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldRestartRef = useRef(false);
  const lastProcessedRef = useRef('');
  const processTranscriptRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognitionAPI;
    console.log('[Cosmo] Browser speech recognition supported:', supported);
    setIsSupported(supported);
  }, []);

  // Clear awake timeout
  const clearAwakeTimeout = useCallback(() => {
    if (awakeTimeoutRef.current) {
      clearTimeout(awakeTimeoutRef.current);
      awakeTimeoutRef.current = null;
    }
  }, []);

  // Handle command execution
  const executeCommand = useCallback((text: string) => {
    const command = parseCommand(text);
    onCommand?.(command);

    // Generate response
    let response = '';
    switch (command.action) {
      case 'add_shopping_item':
        response = `Adding ${command.data.item} to shopping list`;
        break;
      case 'add_task':
        response = `Creating task: ${command.data.title}`;
        break;
      case 'add_chore':
        response = `Adding chore: ${command.data.name}`;
        break;
      case 'set_timer':
        response = `Setting timer for ${command.data.display}`;
        break;
      case 'cancel_timer':
        response = `Timer cancelled`;
        break;
      case 'lights_on':
        response = command.data.room === 'all'
          ? `Turning on the lights`
          : `Turning on ${command.data.room} lights`;
        break;
      case 'lights_off':
        response = command.data.room === 'all'
          ? `Turning off the lights`
          : `Turning off ${command.data.room} lights`;
        break;
      case 'set_temperature':
        response = `Setting temperature to ${command.data.temperature} degrees`;
        break;
      case 'unknown':
        response = `Sorry, I didn't understand that command`;
        break;
    }
    onResponse?.(response);
  }, [onCommand, onResponse]);

  // Set awake state with timeout
  const setAwakeWithTimeout = useCallback(() => {
    clearAwakeTimeout();
    setIsAwake(true);
    onWakeWordDetected?.();
    onResponse?.("How can I help?");

    awakeTimeoutRef.current = setTimeout(() => {
      setIsAwake(false);
      setTranscript('');
      onResponse?.("I didn't catch that. Say hey cosmo to try again.");
    }, commandTimeoutMs);
  }, [clearAwakeTimeout, commandTimeoutMs, onWakeWordDetected, onResponse]);

  // Process speech results
  const processTranscript = useCallback((text: string, isFinal: boolean) => {
    const lowerText = text.toLowerCase().trim();
    console.log('[Cosmo] Processing transcript:', lowerText, 'isFinal:', isFinal, 'isAwake:', isAwake);

    // Avoid processing the same text multiple times
    if (isFinal && text === lastProcessedRef.current) {
      console.log('[Cosmo] Skipping duplicate');
      return;
    }
    if (isFinal) {
      lastProcessedRef.current = text;
    }

    // Check for wake word - look for "cosmo" or common misheard variations
    const wakeVariations = ['cosmo', 'cosmos', 'costume', 'cosmic', 'cause mo', 'cost mo', 'kozmo', 'causmo'];
    let cosmoIndex = -1;
    let matchedWord = '';
    for (const variation of wakeVariations) {
      const idx = lowerText.indexOf(variation);
      if (idx !== -1) {
        cosmoIndex = idx;
        matchedWord = variation;
        break;
      }
    }
    console.log('[Cosmo] Processing:', lowerText, '| matched:', matchedWord, 'at:', cosmoIndex, '| isAwake:', isAwake, '| isFinal:', isFinal);

    if (!isAwake) {
      if (cosmoIndex !== -1) {
        // Extract command after the matched wake word
        const afterCosmo = lowerText.substring(cosmoIndex + matchedWord.length).trim();

        if (afterCosmo && isFinal) {
          // Command was included with wake word (e.g., "Hey Cosmo add milk to shopping list")
          setAwakeWithTimeout();
          setTranscript(afterCosmo);
          executeCommand(afterCosmo);
          setIsAwake(false);
          clearAwakeTimeout();
          setTimeout(() => setTranscript(''), 2000);
        } else if (isFinal) {
          // Just wake word, wait for command
          setAwakeWithTimeout();
          setTranscript('');
        }
      }
    } else {
      // Already awake, collect command
      setTranscript(text);

      if (isFinal && text.trim()) {
        executeCommand(text.trim());
        setIsAwake(false);
        clearAwakeTimeout();
        setTimeout(() => setTranscript(''), 2000);
      }
    }
  }, [isAwake, wakeWord, executeCommand, setAwakeWithTimeout, clearAwakeTimeout]);

  // Keep processTranscript ref updated
  useEffect(() => {
    processTranscriptRef.current = processTranscript;
  }, [processTranscript]);

  // Initialize recognition
  useEffect(() => {
    console.log('[Cosmo] Init effect - isSupported:', isSupported, 'enabled:', enabled);
    if (!isSupported || !enabled) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('[Cosmo] Recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      console.log('[Cosmo] Speech result - final:', finalTranscript, 'interim:', interimTranscript);

      if (finalTranscript) {
        processTranscriptRef.current?.(finalTranscript, true);
      } else if (interimTranscript) {
        processTranscriptRef.current?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event) => {
      console.log('[Cosmo] Recognition error:', event.error);
      // Don't treat 'no-speech' as an error - it's normal
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('[Cosmo] Recognition ended, shouldRestart:', shouldRestartRef.current);
      setIsListening(false);
      // Auto-restart if we should be listening
      if (shouldRestartRef.current && enabled) {
        setTimeout(() => {
          try {
            console.log('[Cosmo] Restarting recognition...');
            recognition.start();
          } catch (e) {
            console.log('[Cosmo] Restart error:', e);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    // Start listening
    shouldRestartRef.current = true;
    try {
      console.log('[Cosmo] Starting recognition...');
      recognition.start();
      console.log('[Cosmo] Recognition.start() called successfully');
    } catch (e) {
      console.log('[Cosmo] Start error:', e);
    }

    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
      clearAwakeTimeout();
    };
  }, [isSupported, enabled, clearAwakeTimeout]);

  // Handle enabled changes
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (enabled) {
      shouldRestartRef.current = true;
      try {
        console.log('[Cosmo] Enabled changed, starting recognition...');
        recognitionRef.current.start();
      } catch (e) {
        console.log('[Cosmo] Start on enable error:', e);
      }
    } else {
      shouldRestartRef.current = false;
      recognitionRef.current.stop();
      setIsAwake(false);
      setTranscript('');
      clearAwakeTimeout();
    }
  }, [enabled, clearAwakeTimeout]);

  // Request mic permission explicitly (for user gesture)
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Cosmo] Requesting mic permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('[Cosmo] Mic permission granted');
      return true;
    } catch (e) {
      console.error('[Cosmo] Mic permission denied:', e);
      setError('Microphone access denied');
      return false;
    }
  }, []);

  // Manual restart function
  const restart = useCallback(() => {
    if (!recognitionRef.current || !enabled) return;
    console.log('[Cosmo] Manual restart requested');
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Ignore
    }
    setTimeout(() => {
      if (recognitionRef.current && shouldRestartRef.current) {
        try {
          recognitionRef.current.start();
          console.log('[Cosmo] Manual restart completed');
        } catch (e) {
          console.log('[Cosmo] Manual restart error:', e);
        }
      }
    }, 200);
  }, [enabled]);

  // Watchdog: periodically check if recognition should be running but isn't
  useEffect(() => {
    if (!enabled || !isSupported) return;

    const watchdog = setInterval(() => {
      if (shouldRestartRef.current && !isListening && recognitionRef.current) {
        console.log('[Cosmo] Watchdog: recognition stopped unexpectedly, restarting...');
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('[Cosmo] Watchdog restart error:', e);
        }
      }
    }, 3000);

    return () => clearInterval(watchdog);
  }, [enabled, isSupported, isListening]);

  return {
    isSupported,
    isListening,
    isAwake,
    transcript,
    error,
    requestMicPermission,
    restart,
  };
}
