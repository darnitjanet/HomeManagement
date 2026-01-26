import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Sun,
  CloudRain,
  Cloud,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  Zap,
  Battery,
  BatteryMedium,
  BatteryFull,
  BellRing,
  Bell,
  ListTodo,
  CalendarDays,
  Mic,
  MicOff,
  Check,
  AlertCircle,
  AlertTriangle,
  Cake,
  Package,
  Volume2,
  VolumeX,
  Camera,
  MessageCircle,
  Timer,
  ScanBarcode,
  ShoppingCart,
  Wifi,
  UtensilsCrossed,
  Star,
  Gift,
  RotateCcw,
} from 'lucide-react';
import { weatherApi, todosApi, calendarApi, syncApi, smartInputApi, contactsApi, notificationsApi, shoppingApi, pantryApi, smartHomeApi, settingsApi, mealPlanApi, kidsApi } from '../../services/api';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useMotionDetection } from '../../hooks/useMotionDetection';
import { useVoiceAssistant, type VoiceCommand } from '../../hooks/useVoiceAssistant';
import { useBarcodeDetector } from '../../hooks/useBarcodeDetector';
import { generateWakeAnnouncement } from '../../utils/announcementGenerator';
import { EmergencyInfo } from '../Emergency/EmergencyInfo';
import './KioskDashboard.css';

interface KioskDashboardProps {
  onExit: () => void;
}

interface Todo {
  id: number;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  energy_level: 'low' | 'medium' | 'high';
  estimated_minutes: number | null;
  due_date: string | null;
  completed_at: string | null;
  context: string;
  parent_id: number | null;
  subtask_count?: number;
  completed_subtask_count?: number;
}

interface Nudge {
  todoId: number;
  todoTitle: string;
  message: string;
  reason: string;
}

interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  icon: string;
  high: number;
  low: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  calendarName?: string;
  colorId?: string;
}

interface BirthdayContact {
  id: number;
  name: string;
  birthday: string;
  daysUntil: number;
}

interface MealPlanEntry {
  id: number;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id?: number;
  recipe_name?: string;
  custom_meal?: string;
  notes?: string;
}

interface KidReward {
  id: number;
  kidId: number;
  name: string;
  stickersRequired: number;
  isClaimed: boolean;
  claimedAt?: string;
}

interface Kid {
  id: number;
  name: string;
  avatarColor: string;
  stickerCount: number;
  rewards: KidReward[];
}

interface KioskNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  icon: string;
  priority: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

const ENERGY_ICONS = {
  low: Battery,
  medium: BatteryMedium,
  high: BatteryFull,
};

export function KioskDashboard({ onExit }: KioskDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [completingTodo, setCompletingTodo] = useState<number | null>(null);
  const [breakingDown, setBreakingDown] = useState<number | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayContact[]>([]);
  const [notifications, setNotifications] = useState<KioskNotification[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);

  // Voice input state
  const [voiceResult, setVoiceResult] = useState<{ success: boolean; message: string } | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);

  // Emergency info modal
  const [showEmergency, setShowEmergency] = useState(false);


  // Timer state
  interface Timer {
    id: number;
    label: string;
    remainingSeconds: number;
    totalSeconds: number;
  }
  const [timers, setTimers] = useState<Timer[]>([]);
  const timerIdRef = useRef(0);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);

  // Barcode scanner state
  const [barcodeResult, setBarcodeResult] = useState<{ success: boolean; message: string } | null>(null);
  const barcodeResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  // WiFi QR modal state
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiCredentials, setWifiCredentials] = useState<{ ssid: string; password: string } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Barcode destination prompt state
  const [barcodeDestinationPrompt, setBarcodeDestinationPrompt] = useState<{
    product: { name: string; category?: string };
    barcode: string;
  } | null>(null);

  // Sleep mode state
  const [isSleeping, setIsSleeping] = useState(false);
  const [clockPosition, setClockPosition] = useState({ x: 50, y: 50 });
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSleepingRef = useRef(false); // Ref to avoid callback recreation
  const wasSleepingRef = useRef(false);
  const sleepStartTimeRef = useRef<number | null>(null);
  const SLEEP_DELAY = 2 * 60 * 1000; // 2 minutes of inactivity

  // Keep ref in sync with state
  useEffect(() => {
    isSleepingRef.current = isSleeping;
  }, [isSleeping]);

  // Text-to-speech state
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(0.8); // 0 to 1
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const {
    isSpeaking,
    isSupported: ttsSupported,
    speak: speakRaw,
    stop: _stopSpeaking,
  } = useSpeechSynthesis();

  // Wrapper to include volume in speak calls
  const speak = useCallback((text: string) => {
    speakRaw(text, { volume: ttsVolume });
  }, [speakRaw, ttsVolume]);

  // Motion detection state
  const [motionDetectionEnabled, setMotionDetectionEnabled] = useState(false);
  const resetSleepTimerRef = useRef<(() => void) | null>(null);

  // Keyboard input state for kiosk
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const keyboardInputRef = useRef<HTMLInputElement | null>(null);

  // Hey Cosmo voice assistant state - starts disabled, user must click to enable (provides user gesture for mic)
  const [heyCosmoEnabled, setHeyCosmoEnabled] = useState(false);
  const [cosmoResponse, setCosmoResponse] = useState<string | null>(null);
  const cosmoResponseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: voiceSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Timer functions
  const startTimer = useCallback((seconds: number, label: string) => {
    const id = ++timerIdRef.current;
    setTimers(prev => [...prev, {
      id,
      label,
      remainingSeconds: seconds,
      totalSeconds: seconds,
    }]);
  }, []);

  const cancelTimer = useCallback((id: number) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (timers.length === 0) return;

    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = prev.map(timer => ({
          ...timer,
          remainingSeconds: timer.remainingSeconds - 1,
        }));

        // Check for finished timers
        const finished = updated.filter(t => t.remainingSeconds <= 0);
        const remaining = updated.filter(t => t.remainingSeconds > 0);

        // Announce finished timers
        finished.forEach(timer => {
          if (ttsEnabled && ttsSupported) {
            speak(`Your ${timer.label} timer is done!`);
          }
        });

        return remaining;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers.length, ttsEnabled, ttsSupported, speak]);

  // Handle voice assistant commands
  const handleVoiceCommand = useCallback(async (command: VoiceCommand) => {
    try {
      switch (command.action) {
        case 'add_shopping_item':
          await shoppingApi.addItem('grocery', {
            name: command.data.item,
            quantity: 1,
          });
          break;
        case 'add_task':
          await todosApi.createTodo({
            title: command.data.title,
            priority: 'medium',
          });
          loadTodos();
          break;
        case 'add_chore':
          // Chores require more setup, so use smart input
          await smartInputApi.process(`add chore ${command.data.name}`);
          break;
        case 'set_timer':
          const seconds = parseInt(command.data.seconds);
          const label = command.data.display || `${seconds} second`;
          startTimer(seconds, label);
          break;
        case 'cancel_timer':
          setTimers([]);
          break;
        case 'lights_on':
        case 'lights_off':
          // Control Govee lights
          try {
            const devices = await smartHomeApi.getGoveeDevices();
            if (devices.data.success && devices.data.data.length > 0) {
              const room = command.data.room?.toLowerCase();
              // Find matching devices by name (or control all if room is 'all')
              const targetDevices = room === 'all'
                ? devices.data.data
                : devices.data.data.filter((d: any) =>
                    d.deviceName.toLowerCase().includes(room)
                  );

              for (const device of targetDevices) {
                await smartHomeApi.controlGovee(device.device, {
                  model: device.model,
                  action: command.action === 'lights_on' ? 'turn_on' : 'turn_off',
                });
              }
            }
          } catch (error) {
            console.error('Failed to control lights:', error);
          }
          break;
        case 'set_temperature':
          // Control Ecobee thermostat
          try {
            const thermostats = await smartHomeApi.getEcobeeThermostats();
            if (thermostats.data.success && thermostats.data.data.length > 0) {
              const temp = parseInt(command.data.temperature);
              // Set temperature on first thermostat
              await smartHomeApi.controlEcobee(thermostats.data.data[0].id, {
                action: 'set_temperature',
                value: temp,
                holdType: 'nextTransition',
              });
            }
          } catch (error) {
            console.error('Failed to set temperature:', error);
          }
          break;
        case 'unknown':
          // Try smart input as fallback, but skip timer-related commands
          // (prevents creating tasks when timer parsing fails)
          if (!command.rawText.toLowerCase().includes('timer')) {
            await smartInputApi.process(command.rawText);
          }
          break;
      }
    } catch (error) {
      console.error('Voice command failed:', error);
    }
  }, [startTimer]);

  // Handle voice assistant response (TTS feedback)
  const handleCosmoResponse = useCallback((text: string) => {
    setCosmoResponse(text);
    // Clear any existing timeout
    if (cosmoResponseTimeoutRef.current) {
      clearTimeout(cosmoResponseTimeoutRef.current);
    }
    // Clear response after 4 seconds
    cosmoResponseTimeoutRef.current = setTimeout(() => {
      setCosmoResponse(null);
    }, 4000);
    // Speak the response
    if (ttsEnabled && ttsSupported) {
      speak(text);
    }
  }, [ttsEnabled, ttsSupported, speak]);

  // Hey Cosmo voice assistant
  const {
    isSupported: cosmoSupported,
    isListening: cosmoListening,
    isAwake: cosmoAwake,
    transcript: cosmoTranscript,
    requestMicPermission,
    restart: restartCosmo,
  } = useVoiceAssistant({
    enabled: heyCosmoEnabled,
    wakeWord: 'hey cosmo',
    onWakeWordDetected: () => {
      // Reset sleep timer when user says hey cosmo
      if (resetSleepTimerRef.current) {
        resetSleepTimerRef.current();
      }
    },
    onCommand: handleVoiceCommand,
    onResponse: handleCosmoResponse,
  });

  // Motion detection hook - uses ref to access resetSleepTimer
  const {
    isActive: motionDetectionActive,
    videoRef: motionVideoRef,
  } = useMotionDetection({
    enabled: motionDetectionEnabled,
    sensitivity: 30,
    debounceMs: 3000,
    onMotionDetected: () => {
      if (resetSleepTimerRef.current) {
        resetSleepTimerRef.current();
      }
    },
  });

  // Global barcode scanner handler
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    console.log('[Kiosk] Barcode detected:', barcode);

    // Clear any existing timeout
    if (barcodeResultTimeoutRef.current) {
      clearTimeout(barcodeResultTimeoutRef.current);
    }

    // Wake from sleep if sleeping
    if (isSleeping) {
      setIsSleeping(false);
    }

    try {
      // Look up the product
      const response = await shoppingApi.lookupBarcode(barcode);
      const product = response.data?.data;

      if (product && product.found && product.name) {
        // Show destination prompt
        setBarcodeDestinationPrompt({
          product: { name: product.name, category: product.category },
          barcode,
        });

        // Announce product found
        if (ttsEnabled && ttsSupported) {
          speak(`Found ${product.name}. Where would you like to add it?`);
        }
      } else {
        setBarcodeResult({
          success: false,
          message: `Product not found for barcode ${barcode}`,
        });
        // Clear result after 4 seconds
        barcodeResultTimeoutRef.current = setTimeout(() => {
          setBarcodeResult(null);
        }, 4000);
      }
    } catch (error) {
      console.error('[Kiosk] Barcode lookup error:', error);
      setBarcodeResult({
        success: false,
        message: `Error looking up barcode`,
      });
      // Clear result after 4 seconds
      barcodeResultTimeoutRef.current = setTimeout(() => {
        setBarcodeResult(null);
      }, 4000);
    }
  }, [isSleeping, ttsEnabled, ttsSupported, speak]);

  // Handle barcode destination selection
  const handleBarcodeDestination = useCallback(async (destination: 'shopping' | 'pantry') => {
    if (!barcodeDestinationPrompt) return;

    const { product } = barcodeDestinationPrompt;

    try {
      if (destination === 'shopping') {
        await shoppingApi.addItem('grocery', {
          name: product.name,
          quantity: 1,
          category: product.category,
        });
        setBarcodeResult({
          success: true,
          message: `Added "${product.name}" to shopping list`,
        });
        if (ttsEnabled && ttsSupported) {
          speak(`Added ${product.name} to shopping list`);
        }
      } else {
        await pantryApi.createItem({
          name: product.name,
          quantity: 1,
          category: product.category,
        });
        setBarcodeResult({
          success: true,
          message: `Added "${product.name}" to pantry`,
        });
        if (ttsEnabled && ttsSupported) {
          speak(`Added ${product.name} to pantry`);
        }
      }
    } catch (error) {
      console.error('[Kiosk] Failed to add item:', error);
      setBarcodeResult({
        success: false,
        message: `Failed to add item`,
      });
    }

    setBarcodeDestinationPrompt(null);

    // Clear result after 4 seconds
    barcodeResultTimeoutRef.current = setTimeout(() => {
      setBarcodeResult(null);
    }, 4000);
  }, [barcodeDestinationPrompt, ttsEnabled, ttsSupported, speak]);

  // Global barcode detector - always active on kiosk (but not when modal is open)
  const { isDetecting: barcodeDetecting } = useBarcodeDetector({
    enabled: !isSleeping && !showBarcodeModal,
    onBarcodeDetected: handleBarcodeDetected,
  });

  // Handle barcode modal submit
  const handleBarcodeSubmit = useCallback(async () => {
    if (!barcodeInput.trim() || barcodeLoading) return;

    setBarcodeLoading(true);
    await handleBarcodeDetected(barcodeInput.trim());
    setBarcodeLoading(false);
    setBarcodeInput('');
    // Don't close the modal - the destination prompt will appear
    // Modal will be closed when destination is selected
    setShowBarcodeModal(false);
  }, [barcodeInput, barcodeLoading, handleBarcodeDetected]);

  // Focus barcode input when modal opens
  useEffect(() => {
    if (showBarcodeModal && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showBarcodeModal]);

  // Debug Cosmo state
  useEffect(() => {
    console.log('[Kiosk] Cosmo state - supported:', cosmoSupported, 'enabled:', heyCosmoEnabled, 'listening:', cosmoListening, 'awake:', cosmoAwake);
  }, [cosmoSupported, heyCosmoEnabled, cosmoListening, cosmoAwake]);

  // Restart Cosmo after TTS finishes speaking (TTS can interfere with mic)
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    if (wasSpeakingRef.current && !isSpeaking && heyCosmoEnabled) {
      // TTS just finished, restart Cosmo recognition after a brief delay
      setTimeout(() => {
        restartCosmo();
      }, 500);
    }
    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking, heyCosmoEnabled, restartCosmo]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sleep mode - reset timer on activity
  // Use ref for isSleeping to avoid recreating callback and causing effect loops
  const resetSleepTimer = useCallback(() => {
    if (isSleepingRef.current) {
      setIsSleeping(false);
    }
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
    }
    sleepTimeoutRef.current = setTimeout(() => {
      setIsSleeping(true);
    }, SLEEP_DELAY);
  }, [SLEEP_DELAY]);

  // Keep ref updated for motion detection callback
  useEffect(() => {
    resetSleepTimerRef.current = resetSleepTimer;
  }, [resetSleepTimer]);

  // Set up activity listeners for sleep mode
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown'];

    events.forEach((event) => {
      window.addEventListener(event, resetSleepTimer);
    });

    // Start initial sleep timer
    resetSleepTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetSleepTimer);
      });
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
      }
    };
  }, [resetSleepTimer]);

  // Move clock position when sleeping
  useEffect(() => {
    if (!isSleeping) return;

    const moveInterval = setInterval(() => {
      setClockPosition({
        x: 10 + Math.random() * 80, // 10-90% of screen width
        y: 10 + Math.random() * 80, // 10-90% of screen height
      });
    }, 10000); // Move every 10 seconds

    return () => clearInterval(moveInterval);
  }, [isSleeping]);

  // Text-to-speech wake-up announcement - only triggers on sleep state change
  // Use refs to avoid unnecessary effect re-runs
  const weatherRef = useRef(weather);
  const eventsRef = useRef(events);
  const todosRef = useRef(todos);
  const birthdaysRef = useRef(upcomingBirthdays);
  const notificationsRef = useRef(notifications);
  const speakRef = useRef(speak);
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsSupportedRef = useRef(ttsSupported);
  const initialLoadCompleteRef = useRef(false); // Track if initial load is done
  const hasAnnouncedThisSessionRef = useRef(false); // Prevent HMR duplicates

  // Keep refs updated (no effect triggers, just updates refs)
  useEffect(() => {
    weatherRef.current = weather;
    eventsRef.current = events;
    todosRef.current = todos;
    birthdaysRef.current = upcomingBirthdays;
    notificationsRef.current = notifications;
    speakRef.current = speak;
    ttsEnabledRef.current = ttsEnabled;
    ttsSupportedRef.current = ttsSupported;
  }, [weather, events, todos, upcomingBirthdays, notifications, speak, ttsEnabled, ttsSupported]);

  // Helper function to make announcement
  const makeWakeAnnouncement = useCallback(() => {
    if (!ttsEnabledRef.current || !ttsSupportedRef.current) return;

    // Prevent duplicate announcements (from HMR or double-renders)
    if (hasAnnouncedThisSessionRef.current) {
      console.log('[TTS] Skipping announcement (already announced this session)');
      return;
    }
    hasAnnouncedThisSessionRef.current = true;

    const currentWeather = weatherRef.current;
    const alerts: { message: string; icon: string; type: 'info' | 'warning' | 'danger' }[] = [];
    if (currentWeather) {
      const desc = currentWeather.description.toLowerCase();
      const low = currentWeather.low;
      const high = currentWeather.high;

      if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) {
        alerts.push({ message: 'Bring an umbrella today', icon: '☔', type: 'info' });
      }
      if (desc.includes('snow')) {
        alerts.push({ message: 'Snow expected - drive safe', icon: '❄️', type: 'warning' });
      }
      if (desc.includes('thunder') || desc.includes('storm')) {
        alerts.push({ message: 'Thunderstorms expected', icon: '⛈️', type: 'warning' });
      }
      if (low <= 32) {
        alerts.push({ message: 'Freeze warning tonight', icon: '🥶', type: 'danger' });
      }
      if (high >= 95) {
        alerts.push({ message: 'Heat advisory - stay hydrated', icon: '🥵', type: 'danger' });
      }
    }

    const announcement = generateWakeAnnouncement({
      currentTime: new Date(),
      weather: currentWeather,
      weatherAlerts: alerts,
      events: eventsRef.current,
      todos: todosRef.current,
      upcomingBirthdays: birthdaysRef.current,
      notifications: notificationsRef.current,
    });

    console.log('[TTS] Announcement triggered');
    setTimeout(() => speakRef.current(announcement), 500);
  }, []);

  // Initial load announcement - runs ONCE when loading completes
  useEffect(() => {
    if (!loading && !initialLoadCompleteRef.current) {
      initialLoadCompleteRef.current = true;
      console.log('[TTS] Initial load complete, announcing...');
      makeWakeAnnouncement();
    }
  }, [loading, makeWakeAnnouncement]);

  // Track sleep start time
  useEffect(() => {
    if (isSleeping) {
      sleepStartTimeRef.current = Date.now();
      console.log('[TTS] Kiosk entering sleep mode');
    }
  }, [isSleeping]);

  // Wake from sleep announcement
  useEffect(() => {
    // Reset announcement flag when waking from sleep (allows new announcement)
    if (wasSleepingRef.current && !isSleeping && initialLoadCompleteRef.current) {
      // Only announce if kiosk was sleeping for at least 30 seconds
      // This prevents announcements from brief sleep/wake cycles
      const sleepDuration = sleepStartTimeRef.current
        ? Date.now() - sleepStartTimeRef.current
        : 0;

      const MIN_SLEEP_FOR_ANNOUNCEMENT = 30 * 1000; // 30 seconds

      if (sleepDuration >= MIN_SLEEP_FOR_ANNOUNCEMENT) {
        console.log(`[TTS] Wake from sleep (slept ${Math.round(sleepDuration/1000)}s), announcing...`);
        hasAnnouncedThisSessionRef.current = false; // Reset to allow announcement
        makeWakeAnnouncement();
      } else {
        console.log(`[TTS] Wake from sleep (only slept ${Math.round(sleepDuration/1000)}s), skipping announcement`);
      }

      sleepStartTimeRef.current = null;
    }

    wasSleepingRef.current = isSleeping;
  }, [isSleeping, makeWakeAnnouncement]);

  // Load data on mount and refresh periodically
  useEffect(() => {
    loadData();
    checkAIStatus();
    // Refresh data every 5 minutes
    const refreshInterval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Rotate nudges periodically (every 2 minutes)
  useEffect(() => {
    if (aiEnabled && todos.length > 0) {
      fetchNudge();
      const nudgeInterval = setInterval(() => {
        fetchNudge();
      }, 2 * 60 * 1000);
      return () => clearInterval(nudgeInterval);
    }
  }, [aiEnabled, todos.length]);

  // Handle voice transcript completion
  useEffect(() => {
    if (transcript && !isListening) {
      handleVoiceSubmit(transcript);
    }
  }, [transcript, isListening]);

  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      setVoiceResult({ success: false, message: voiceError });
      setTimeout(() => setVoiceResult(null), 5000);
    }
  }, [voiceError]);

  // Auto-hide voice result
  useEffect(() => {
    if (voiceResult) {
      const timer = setTimeout(() => setVoiceResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [voiceResult]);

  const handleVoiceSubmit = async (text: string) => {
    if (!text.trim() || voiceProcessing) return;

    setVoiceProcessing(true);
    setVoiceResult(null);

    try {
      const response = await smartInputApi.process(text.trim());
      const data = response.data.data;

      if (data.results && data.results.length > 0) {
        const successCount = data.results.filter((r: any) => r.success).length;
        const messages = data.results.map((r: any) => r.message).join('; ');
        setVoiceResult({
          success: successCount > 0,
          message: messages || 'Processed successfully',
        });
        // Reload todos if any were added
        if (data.results.some((r: any) => r.action?.type === 'todo' && r.success)) {
          loadTodos();
        }
        // Reload events if calendar items were added
        if (data.results.some((r: any) => r.action?.type === 'calendar' && r.success)) {
          loadEvents();
        }
      } else if (data.message) {
        setVoiceResult({ success: false, message: data.message });
      }
    } catch (error: any) {
      console.error('Voice input error:', error);
      setVoiceResult({
        success: false,
        message: error.response?.data?.message || 'Failed to process voice input',
      });
    } finally {
      setVoiceProcessing(false);
      resetTranscript();
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setVoiceResult(null);
      startListening();
    }
  };

  const checkAIStatus = async () => {
    try {
      const response = await todosApi.getAIStatus();
      if (response.data.success) {
        setAiEnabled(response.data.data.aiEnabled);
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const loadData = async () => {
    await Promise.all([loadTodos(), loadWeather(), loadEvents(), loadBirthdays(), loadNotifications(), loadKioskPreferences(), loadMealPlan(), loadKids()]);
    setLoading(false);
  };

  const loadKioskPreferences = async () => {
    try {
      const response = await notificationsApi.getPreferences();
      if (response.data.success && response.data.data) {
        setTtsEnabled(response.data.data.ttsEnabled !== false);
        setTtsVolume(response.data.data.ttsVolume ?? 0.8);
        setMotionDetectionEnabled(response.data.data.motionDetectionEnabled === true);
      }
    } catch (error) {
      console.error('Failed to load kiosk preferences:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await notificationsApi.getAll(false, 5);
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleDismissNotification = async (id: number) => {
    try {
      await notificationsApi.dismiss(id);
      // Remove from local state immediately for snappy UI
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const loadMealPlan = async () => {
    try {
      const response = await mealPlanApi.getCurrentMealPlan();
      if (response.data.success && response.data.data) {
        setMealPlan(response.data.data.entries || []);
      }
    } catch (error) {
      console.error('Failed to load meal plan:', error);
    }
  };

  const loadKids = async () => {
    try {
      const response = await kidsApi.getAllKids();
      if (response.data.success) {
        setKids(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load kids:', error);
    }
  };

  const loadBirthdays = async () => {
    try {
      const response = await contactsApi.getUpcomingBirthdays(7);
      if (response.data.success) {
        setUpcomingBirthdays(response.data.data.map((c: any) => ({
          id: c.id,
          name: c.displayName,
          birthday: c.birthday,
          daysUntil: c.daysUntil,
        })));
      }
    } catch (error) {
      console.error('Failed to load upcoming birthdays:', error);
    }
  };

  const handleShowWifi = async () => {
    try {
      const response = await settingsApi.getWifiCredentials();
      if (response.data.success && response.data.data) {
        setWifiCredentials(response.data.data);
        setShowWifiModal(true);
      } else {
        // WiFi not configured - show placeholder modal
        setWifiCredentials({ ssid: 'Not Configured', password: '' });
        setShowWifiModal(true);
      }
    } catch (error) {
      console.error('Failed to load WiFi credentials:', error);
      // Show error state
      setWifiCredentials({ ssid: 'Error loading WiFi', password: '' });
      setShowWifiModal(true);
    }
  };

  const loadTodos = async () => {
    try {
      const response = await todosApi.getKioskTodos(8);
      if (response.data.success) {
        setTodos(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  };

  const loadWeather = async () => {
    try {
      const response = await weatherApi.getCurrent();
      if (response.data.success) {
        setWeather(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load weather:', error);
    }
  };

  const loadEvents = async () => {
    try {
      // Get today's date range in local timezone
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const date = today.getDate();

      // Create start/end times explicitly in local timezone
      const startOfDay = new Date(year, month, date, 0, 0, 0);
      const endOfDay = new Date(year, month, date, 23, 59, 59);

      // Format as YYYY-MM-DD for external calendars (use local date, not UTC)
      const pad = (n: number) => n.toString().padStart(2, '0');
      const startStr = `${year}-${pad(month + 1)}-${pad(date)}`;
      const endStr = startStr; // Same day

      console.log('[Kiosk Calendar] Fetching events for:', startStr, 'Local time:', today.toString());

      const allEvents: CalendarEvent[] = [];

      // 1. Fetch Google Calendar events (all calendars)
      try {
        // First get list of all Google calendars
        const calendarsResponse = await calendarApi.listCalendars();
        if (calendarsResponse.data.success && calendarsResponse.data.data) {
          const googleCalendars = calendarsResponse.data.data;

          // Fetch events from each Google calendar
          for (const cal of googleCalendars) {
            try {
              const response = await calendarApi.listEvents({
                calendarId: cal.id,
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                maxResults: 20,
              });

              if (response.data.success && response.data.data) {
                // Add calendar name to events
                const calEvents = response.data.data.map((event: any) => ({
                  ...event,
                  calendarName: cal.summary,
                }));
                allEvents.push(...calEvents);
              }
            } catch (error) {
              console.error(`Failed to load events from ${cal.summary}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load Google calendar events:', error);
      }

      // 2. Fetch external calendar events
      try {
        const extCalResponse = await syncApi.listExternalCalendars();
        if (extCalResponse.data.success && extCalResponse.data.data) {
          const externalCalendars = extCalResponse.data.data;

          // Fetch events from each external calendar
          for (const extCal of externalCalendars) {
            try {
              const cachedResponse = await syncApi.getCachedEvents(
                `external_${extCal.id}`,
                startStr,
                endStr
              );

              if (cachedResponse.data.success && cachedResponse.data.data) {
                // Convert cached events to CalendarEvent format
                const extEvents = cachedResponse.data.data.map((event: any) => ({
                  id: event.id || event.uid,
                  summary: event.summary || event.title,
                  start: {
                    dateTime: event.start_time,
                    date: event.all_day ? event.start_time?.split('T')[0] : undefined,
                  },
                  end: {
                    dateTime: event.end_time,
                    date: event.all_day ? event.end_time?.split('T')[0] : undefined,
                  },
                  calendarName: extCal.name,
                }));
                allEvents.push(...extEvents);
              }
            } catch (error) {
              console.error(`Failed to load events from ${extCal.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load external calendars:', error);
      }

      // Sort all events by start time
      const sortedEvents = allEvents.sort((a: CalendarEvent, b: CalendarEvent) => {
        const aTime = a.start.dateTime ? new Date(a.start.dateTime).getTime() : new Date(a.start.date || '').getTime();
        const bTime = b.start.dateTime ? new Date(b.start.dateTime).getTime() : new Date(b.start.date || '').getTime();
        return aTime - bTime;
      });

      setEvents(sortedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const fetchNudge = useCallback(async () => {
    if (!aiEnabled) return;

    try {
      const response = await todosApi.getNudge();
      if (response.data.success && response.data.data) {
        setNudge(response.data.data);
        setShowNudge(true);
        // Hide nudge after 30 seconds
        setTimeout(() => setShowNudge(false), 30000);
      }
    } catch (error) {
      console.error('Failed to fetch nudge:', error);
    }
  }, [aiEnabled]);

  const handleCompleteTodo = async (todo: Todo) => {
    setCompletingTodo(todo.id);
    try {
      await todosApi.completeTodo(todo.id);
      // Animate out, then reload
      setTimeout(() => {
        loadTodos();
        setCompletingTodo(null);
      }, 500);
    } catch (error) {
      console.error('Failed to complete todo:', error);
      setCompletingTodo(null);
    }
  };

  const handleBreakdown = async (todo: Todo) => {
    if (!aiEnabled || breakingDown) return;
    setBreakingDown(todo.id);

    try {
      const response = await todosApi.breakdownTask(todo.id);
      if (response.data.success) {
        // Reload todos to get updated subtask counts
        loadTodos();
        if (ttsEnabled && ttsSupported) {
          speak(`Task broken down into ${response.data.data.length} steps`);
        }
      }
    } catch (error) {
      console.error('Failed to breakdown task:', error);
    } finally {
      setBreakingDown(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getEventStartTime = (event: CalendarEvent) => {
    return event.start.dateTime ? new Date(event.start.dateTime) : null;
  };

  const getEventEndTime = (event: CalendarEvent) => {
    return event.end.dateTime ? new Date(event.end.dateTime) : null;
  };

  const isAllDayEvent = (event: CalendarEvent) => {
    return !event.start.dateTime && !!event.start.date;
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (isAllDayEvent(event)) return 'All Day';
    const start = getEventStartTime(event);
    const end = getEventEndTime(event);
    if (!start || !end) return 'All Day';
    const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${startTime} - ${endTime}`;
  };

  const isEventNow = (event: CalendarEvent) => {
    if (isAllDayEvent(event)) return false;
    const now = new Date();
    const start = getEventStartTime(event);
    const end = getEventEndTime(event);
    if (!start || !end) return false;
    return now >= start && now <= end;
  };

  const isEventPast = (event: CalendarEvent) => {
    if (isAllDayEvent(event)) return false;
    const now = new Date();
    const end = getEventEndTime(event);
    if (!end) return false;
    return now > end;
  };

  const getWeatherIcon = (iconCode: string) => {
    if (!iconCode) return <Cloud size={48} />;
    const code = iconCode.slice(0, 2);
    switch (code) {
      case '01':
        return <Sun size={48} className="weather-icon sun" />;
      case '09':
      case '10':
        return <CloudRain size={48} className="weather-icon rain" />;
      default:
        return <Cloud size={48} className="weather-icon cloud" />;
    }
  };

  const getWeatherAlerts = (): { message: string; icon: string; type: 'info' | 'warning' | 'danger' }[] => {
    if (!weather) return [];
    const alerts: { message: string; icon: string; type: 'info' | 'warning' | 'danger' }[] = [];
    const desc = weather.description.toLowerCase();
    const temp = weather.temperature;
    const high = weather.high;
    const low = weather.low;

    // Rain alerts
    if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) {
      alerts.push({ message: 'Bring an umbrella today', icon: '☔', type: 'info' });
    }

    // Snow alerts
    if (desc.includes('snow')) {
      alerts.push({ message: 'Snow expected - drive safe', icon: '❄️', type: 'warning' });
    }

    // Storm alerts
    if (desc.includes('thunder') || desc.includes('storm')) {
      alerts.push({ message: 'Thunderstorms expected', icon: '⛈️', type: 'warning' });
    }

    // Temperature alerts
    if (low <= 32) {
      alerts.push({ message: 'Freeze warning tonight', icon: '🥶', type: 'danger' });
    } else if (temp <= 40) {
      alerts.push({ message: 'Bundle up - it\'s cold', icon: '🧥', type: 'info' });
    }

    if (high >= 95) {
      alerts.push({ message: 'Heat advisory - stay hydrated', icon: '🥵', type: 'danger' });
    } else if (high >= 85) {
      alerts.push({ message: 'Hot day - drink water', icon: '💧', type: 'info' });
    }

    // Nice weather
    if (alerts.length === 0 && desc.includes('clear') && temp >= 65 && temp <= 80) {
      alerts.push({ message: 'Beautiful day to be outside!', icon: '🌞', type: 'info' });
    }

    return alerts;
  };

  const weatherAlerts = getWeatherAlerts();

  const getTimeOfDayEnergy = (): 'low' | 'medium' | 'high' => {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 12) return 'high';
    if (hour >= 14 && hour < 16) return 'medium';
    return 'low';
  };

  const currentEnergy = getTimeOfDayEnergy();

  if (loading) {
    return (
      <div className="kiosk-dashboard">
        {/* Hidden video element for motion detection - must always be rendered */}
        <video
          ref={motionVideoRef}
          style={{ display: 'none' }}
          playsInline
          muted
        />
        <div className="kiosk-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kiosk-dashboard">
      {/* Hidden video element for motion detection */}
      <video
        ref={motionVideoRef}
        style={{ display: 'none' }}
        playsInline
        muted
      />

      {/* Sleep Mode Overlay */}
      {isSleeping && (
        <div className="kiosk-sleep-overlay" onClick={resetSleepTimer}>
          <div
            className="sleep-clock"
            style={{
              left: `${clockPosition.x}%`,
              top: `${clockPosition.y}%`,
            }}
          >
            <div className="sleep-time">{formatTime(currentTime)}</div>
            <div className="sleep-date">{formatDate(currentTime)}</div>
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="kiosk-controls">
        <button className="kiosk-exit-btn" onClick={onExit}>
          <X size={20} />
          <span>Exit</span>
        </button>

        <div className="volume-control-wrapper">
          <button
            className={`kiosk-control-btn ${ttsEnabled ? '' : 'muted'}`}
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            onDoubleClick={() => setTtsEnabled(!ttsEnabled)}
            title="Click for volume, double-click to mute"
          >
            {ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          {showVolumeSlider && (
            <div className="volume-slider-popup">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ttsVolume}
                onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
              <span className="volume-value">{Math.round(ttsVolume * 100)}%</span>
              <button
                className="volume-mute-btn"
                onClick={() => {
                  setTtsEnabled(!ttsEnabled);
                  setShowVolumeSlider(false);
                }}
              >
                {ttsEnabled ? 'Mute' : 'Unmute'}
              </button>
            </div>
          )}
        </div>

        {motionDetectionActive && (
          <div className="kiosk-camera-indicator" title="Motion detection active">
            <Camera size={16} />
          </div>
        )}

        {/* Hey Cosmo disabled - speech recognition not working on Pi/Chromium
        <button
          className={`kiosk-control-btn cosmo-toggle ${heyCosmoEnabled ? 'active' : ''} ${!cosmoSupported ? 'unsupported' : ''}`}
          onClick={async () => {
            if (!cosmoSupported) {
              setCosmoResponse('Speech recognition not supported in this browser');
              setTimeout(() => setCosmoResponse(null), 3000);
              return;
            }
            if (!heyCosmoEnabled) {
              const granted = await requestMicPermission();
              if (granted) {
                setHeyCosmoEnabled(true);
              } else {
                setCosmoResponse('Microphone permission denied');
                setTimeout(() => setCosmoResponse(null), 3000);
              }
            } else {
              setHeyCosmoEnabled(false);
            }
          }}
          title={!cosmoSupported ? 'Speech not supported' : heyCosmoEnabled ? 'Disable Hey Cosmo' : 'Enable Hey Cosmo'}
        >
          <MessageCircle size={20} />
          <span className="cosmo-label">Cosmo</span>
        </button>
        */}

        <button
          className={`kiosk-control-btn keyboard-btn ${showKeyboardInput ? 'active' : ''}`}
          onClick={() => {
            if (showKeyboardInput) {
              // Hide the keyboard input
              if (keyboardInputRef.current) {
                keyboardInputRef.current.blur();
                keyboardInputRef.current.remove();
                keyboardInputRef.current = null;
              }
              setShowKeyboardInput(false);
            } else {
              // Create and focus a temporary input to trigger the virtual keyboard
              const tempInput = document.createElement('input');
              tempInput.type = 'text';
              tempInput.style.position = 'fixed';
              tempInput.style.bottom = '100px';
              tempInput.style.left = '50%';
              tempInput.style.transform = 'translateX(-50%)';
              tempInput.style.fontSize = '18px';
              tempInput.style.padding = '12px';
              tempInput.style.width = '80%';
              tempInput.style.maxWidth = '400px';
              tempInput.style.zIndex = '9998';
              tempInput.style.border = '2px solid #5b768a';
              tempInput.style.borderRadius = '8px';
              tempInput.style.backgroundColor = '#eed6aa';
              tempInput.placeholder = 'Type here... (tap keyboard button to close)';
              document.body.appendChild(tempInput);
              tempInput.focus();
              keyboardInputRef.current = tempInput;
              setShowKeyboardInput(true);
            }
          }}
          title={showKeyboardInput ? 'Hide Keyboard' : 'Show Keyboard'}
        >
          ⌨
        </button>

        <button
          className="kiosk-control-btn timer-btn"
          onClick={() => setShowTimerModal(true)}
          title="Set Timer"
        >
          <Timer size={20} />
        </button>

        <button
          className={`kiosk-control-btn barcode-btn ${barcodeDetecting ? 'detecting' : ''}`}
          onClick={() => setShowBarcodeModal(true)}
          title="Scan Barcode"
        >
          <ScanBarcode size={20} />
        </button>

        <button
          className="kiosk-control-btn wifi-btn"
          onClick={handleShowWifi}
          title="Guest WiFi"
        >
          <Wifi size={20} />
        </button>
      </div>

      {/* Barcode Scan Result */}
      {barcodeResult && (
        <div className={`barcode-result ${barcodeResult.success ? 'success' : 'error'}`}>
          <ScanBarcode size={24} />
          <span>{barcodeResult.message}</span>
        </div>
      )}

      {/* Barcode Destination Prompt */}
      {barcodeDestinationPrompt && (
        <div className="barcode-destination-overlay" onClick={() => setBarcodeDestinationPrompt(null)}>
          <div className="barcode-destination-modal" onClick={(e) => e.stopPropagation()}>
            <div className="barcode-destination-header">
              <ScanBarcode size={24} />
              <h3>Add to...</h3>
            </div>
            <div className="barcode-destination-product">
              <strong>{barcodeDestinationPrompt.product.name}</strong>
              {barcodeDestinationPrompt.product.category && (
                <span className="product-category">{barcodeDestinationPrompt.product.category}</span>
              )}
            </div>
            <div className="barcode-destination-actions">
              <button
                className="barcode-dest-btn shopping"
                onClick={() => handleBarcodeDestination('shopping')}
              >
                <ShoppingCart size={24} />
                <span>Shopping List</span>
              </button>
              <button
                className="barcode-dest-btn pantry"
                onClick={() => handleBarcodeDestination('pantry')}
              >
                <Package size={24} />
                <span>Pantry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeModal && (
        <div className="timer-modal-overlay" onClick={() => setShowBarcodeModal(false)}>
          <div className="timer-modal barcode-modal" onClick={e => e.stopPropagation()}>
            <div className="timer-modal-header">
              <ScanBarcode size={24} />
              <h3>Scan Barcode</h3>
              <button className="timer-modal-close" onClick={() => setShowBarcodeModal(false)}>
                ✕
              </button>
            </div>
            <div className="timer-modal-content">
              <p className="barcode-instructions">
                Scan a barcode or type it manually
              </p>
              <input
                ref={barcodeInputRef}
                type="text"
                className="barcode-input"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeSubmit();
                  }
                }}
                placeholder="Barcode will appear here..."
                data-barcode-input="true"
                disabled={barcodeLoading}
              />
              <button
                className="timer-start-btn"
                onClick={handleBarcodeSubmit}
                disabled={!barcodeInput.trim() || barcodeLoading}
              >
                {barcodeLoading ? 'Looking up...' : 'Look Up Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hey Cosmo Assistant Indicator */}
      {(heyCosmoEnabled && cosmoSupported) && (
        <div className={`cosmo-assistant ${cosmoAwake ? 'awake' : ''} ${cosmoListening ? 'listening' : ''}`}>
          <div className="cosmo-indicator">
            <MessageCircle size={24} />
            <span className="cosmo-status">
              {cosmoAwake ? 'Listening...' : cosmoListening ? 'Say "Hey Cosmo"' : 'Voice Assistant'}
            </span>
          </div>
          {cosmoTranscript && (
            <div className="cosmo-transcript">{cosmoTranscript}</div>
          )}
          {cosmoResponse && (
            <div className="cosmo-response">{cosmoResponse}</div>
          )}
        </div>
      )}
      {/* Cosmo error/response messages when not enabled */}
      {cosmoResponse && !heyCosmoEnabled && (
        <div className="cosmo-assistant error">
          <div className="cosmo-response">{cosmoResponse}</div>
        </div>
      )}

      {/* Active Timers */}
      {timers.length > 0 && (
        <div className="kiosk-timers">
          {timers.map(timer => {
            const minutes = Math.floor(timer.remainingSeconds / 60);
            const secs = timer.remainingSeconds % 60;
            const progress = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;
            return (
              <div key={timer.id} className="timer-card">
                <div className="timer-label">{timer.label}</div>
                <div className="timer-display">
                  {minutes}:{secs.toString().padStart(2, '0')}
                </div>
                <div className="timer-progress">
                  <div className="timer-progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <button className="timer-cancel" onClick={() => cancelTimer(timer.id)}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="kiosk-header">
        <div className="kiosk-time-section">
          <div className="kiosk-time">{formatTime(currentTime)}</div>
          <div className="kiosk-date">{formatDate(currentTime)}</div>
        </div>

        {weather && (
          <div className="kiosk-weather">
            {getWeatherIcon(weather.icon)}
            <div className="weather-info">
              <div className="weather-temp">{weather.temperature}°F</div>
              <div className="weather-desc">{weather.description}</div>
              <div className="weather-range">
                H: {weather.high}° L: {weather.low}°
              </div>
              {weatherAlerts.length > 0 && (
                <div className="weather-alerts-inline">
                  {weatherAlerts.slice(0, 2).map((alert, index) => (
                    <div key={index} className={`weather-alert-inline ${alert.type}`}>
                      <span>{alert.icon}</span>
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {upcomingBirthdays.length > 0 && (
          <div className="kiosk-birthdays">
            <Cake size={24} />
            <div className="birthdays-list">
              {upcomingBirthdays.slice(0, 2).map((contact) => (
                <div key={contact.id} className="birthday-item">
                  {contact.daysUntil === 0 ? (
                    <span className="birthday-today">{contact.name}'s birthday today!</span>
                  ) : contact.daysUntil === 1 ? (
                    <span>{contact.name}'s birthday tomorrow</span>
                  ) : (
                    <span>{contact.name}'s birthday in {contact.daysUntil} days</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal Plan Widget */}
        {(() => {
          const today = new Date().getDay(); // 0 = Sunday
          const todayMeals = mealPlan.filter(m => m.day_of_week === today);
          if (todayMeals.length === 0) return null;

          return (
            <div className="kiosk-meal-plan">
              <UtensilsCrossed size={24} />
              <div className="meal-plan-content">
                <span className="meal-plan-label">Today's Menu</span>
                <div className="meal-plan-items">
                  {todayMeals
                    .filter(m => m.meal_type === 'dinner' || m.meal_type === 'lunch')
                    .slice(0, 2)
                    .map(meal => (
                      <span key={meal.id} className="meal-item">
                        {meal.recipe_name || meal.custom_meal}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* AI Nudge Banner */}
      {showNudge && nudge && (
        <div className="kiosk-nudge">
          <div className="nudge-icon">
            <Sparkles size={24} />
          </div>
          <div className="nudge-content">
            <div className="nudge-message">{nudge.message}</div>
            <div className="nudge-reason">{nudge.reason}</div>
          </div>
          <button className="nudge-dismiss" onClick={() => setShowNudge(false)}>
            <X size={18} />
          </button>
        </div>
      )}

      <div className="kiosk-content">
        <div className="kiosk-column-left">
        <div className="kiosk-section todos-section">
          <div className="section-header">
            <ListTodo size={28} />
            <h2>Today's Tasks</h2>
            <div className="energy-indicator-kiosk">
              <Zap size={16} />
              <span className={`energy-${currentEnergy}`}>{currentEnergy} energy time</span>
            </div>
          </div>

          {todos.length === 0 ? (
            <div className="no-todos-kiosk">
              <CheckCircle2 size={48} />
              <p>All done! Take a break.</p>
            </div>
          ) : (
            <div className="todos-list-kiosk">
              {todos.map((todo) => {
                const EnergyIcon = ENERGY_ICONS[todo.energy_level];
                const isEnergyMatch = todo.energy_level === currentEnergy;
                const isCompleting = completingTodo === todo.id;
                const isBreaking = breakingDown === todo.id;
                const hasSubtasks = (todo.subtask_count ?? 0) > 0;
                const canBreakdown = aiEnabled && !todo.parent_id && !hasSubtasks;

                return (
                  <div
                    key={todo.id}
                    className={`todo-item-kiosk ${isEnergyMatch ? 'energy-match' : ''} ${
                      isCompleting ? 'completing' : ''
                    }`}
                    style={{ borderLeftColor: PRIORITY_COLORS[todo.priority] }}
                  >
                    <button
                      className="todo-check-kiosk"
                      onClick={() => handleCompleteTodo(todo)}
                      disabled={isCompleting}
                    >
                      {isCompleting ? (
                        <CheckCircle2 size={28} className="check-complete" />
                      ) : (
                        <Circle size={28} />
                      )}
                    </button>

                    <div className="todo-content-kiosk">
                      <div className="todo-title-kiosk">{todo.title}</div>
                      <div className="todo-meta-kiosk">
                        <span
                          className={`priority-tag priority-${todo.priority}`}
                          style={{ color: PRIORITY_COLORS[todo.priority] }}
                        >
                          {todo.priority}
                        </span>
                        <span className={`energy-tag energy-${todo.energy_level}`}>
                          <EnergyIcon size={14} />
                          {todo.energy_level}
                        </span>
                        {todo.estimated_minutes && (
                          <span className="time-tag">
                            <Clock size={14} />
                            {formatMinutes(todo.estimated_minutes)}
                          </span>
                        )}
                        {hasSubtasks && (
                          <span className="subtask-progress-tag">
                            {todo.completed_subtask_count ?? 0}/{todo.subtask_count} steps
                          </span>
                        )}
                      </div>
                    </div>

                    {canBreakdown && (
                      <button
                        className={`kiosk-breakdown-btn ${isBreaking ? 'breaking' : ''}`}
                        onClick={() => handleBreakdown(todo)}
                        disabled={isBreaking}
                        title="Break into smaller steps"
                      >
                        {isBreaking ? (
                          <RotateCcw size={20} className="spinning" />
                        ) : (
                          <Sparkles size={20} />
                        )}
                      </button>
                    )}

                    {isEnergyMatch && (
                      <div className="energy-match-indicator" title="Good energy match!">
                        <Zap size={20} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kids Rewards Display */}
        {kids.length > 0 && (
          <div className="kiosk-section kids-section">
            <div className="section-header">
              <Star size={28} />
              <h2>Kids Rewards</h2>
            </div>
            <div className="kids-rewards-display">
              {kids.map((kid) => {
                // Find the next unclaimed reward
                const nextReward = kid.rewards
                  .filter(r => !r.isClaimed)
                  .sort((a, b) => a.stickersRequired - b.stickersRequired)[0];
                const progress = nextReward
                  ? Math.min(100, (kid.stickerCount / nextReward.stickersRequired) * 100)
                  : 100;

                return (
                  <div key={kid.id} className="kid-reward-card">
                    <div
                      className="kid-avatar"
                      style={{ backgroundColor: kid.avatarColor }}
                    >
                      {kid.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="kid-info">
                      <div className="kid-name">{kid.name}</div>
                      <div className="kid-stickers">
                        <Star size={16} className="sticker-icon" />
                        <span>{kid.stickerCount} stickers</span>
                      </div>
                      {nextReward ? (
                        <div className="kid-next-reward">
                          <div className="reward-progress-bar">
                            <div
                              className="reward-progress-fill"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="reward-goal">
                            <Gift size={14} />
                            <span>{nextReward.name} ({kid.stickerCount}/{nextReward.stickersRequired})</span>
                          </div>
                        </div>
                      ) : (
                        <div className="no-active-reward">No active reward goal</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>

        <div className="kiosk-section events-section">
          <div className="section-header">
            <CalendarDays size={28} />
            <h2>Today's Schedule</h2>
          </div>

          {events.length === 0 ? (
            <div className="no-events">
              <p>No events today</p>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`event-item ${isEventNow(event) ? 'now' : ''} ${isEventPast(event) ? 'past' : ''}`}
                  style={{ borderLeftColor: '#5b768a' }}
                >
                  <div className="event-time">{formatEventTime(event)}</div>
                  <div className="event-title">{event.summary}</div>
                  {event.calendarName && (
                    <div className="event-calendar">{event.calendarName}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="kiosk-section quick-info">
          <div className="quick-stats">
            <div className="info-card">
              <ListTodo size={24} />
              <div className="info-content">
                <div className="info-label">Tasks Left</div>
                <div className="info-value">{todos.length}</div>
              </div>
            </div>

            <div className="info-card">
              <CalendarDays size={24} />
              <div className="info-content">
                <div className="info-label">Events Today</div>
                <div className="info-value">{events.length}</div>
              </div>
            </div>

            {aiEnabled && (
              <div className="info-card ai-card">
                <BellRing size={24} />
                <div className="info-content">
                  <div className="info-label">AI Nudges</div>
                  <div className="info-value">Active</div>
                </div>
              </div>
            )}
          </div>

          <div className="kiosk-notifications">
            <div className="section-header">
              <Bell size={24} />
              <h3>Notifications</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="no-notifications">No new notifications</div>
            ) : (
              <div className="notifications-list-kiosk">
                {notifications.slice(0, 4).map((notification) => (
                  <div key={notification.id} className={`notification-item-kiosk priority-${notification.priority}`}>
                    <div className="notification-icon-kiosk">
                      {notification.type === 'package_delivery' && <Package size={18} />}
                      {notification.type === 'task_due' && <ListTodo size={18} />}
                      {notification.type === 'calendar_reminder' && <CalendarDays size={18} />}
                      {notification.type === 'birthday_reminder' && <Cake size={18} />}
                      {!['package_delivery', 'task_due', 'calendar_reminder', 'birthday_reminder'].includes(notification.type) && <Bell size={18} />}
                    </div>
                    <div className="notification-content-kiosk">
                      <div className="notification-title-kiosk">{notification.title}</div>
                      <div className="notification-message-kiosk">{notification.message}</div>
                    </div>
                    <button
                      className="notification-dismiss-kiosk"
                      onClick={() => handleDismissNotification(notification.id)}
                      title="Dismiss notification"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="kiosk-footer">
        <button className="kiosk-emergency-btn" onClick={() => setShowEmergency(true)}>
          <AlertTriangle size={20} />
          Emergency Info
        </button>
        <span>Last updated: {formatTime(new Date())}</span>
        {aiEnabled && <span className="ai-badge">AI Assisted</span>}
      </div>

      {showEmergency && <EmergencyInfo onClose={() => setShowEmergency(false)} />}

      {/* Voice Input Button */}
      {/* Voice input disabled - speech recognition not working on Pi/Chromium */}
      {false && voiceSupported && (
        <div className="kiosk-voice-container">
          {/* Voice Result Feedback */}
          {voiceResult && (
            <div className={`kiosk-voice-result ${voiceResult.success ? 'success' : 'error'}`}>
              {voiceResult.success ? <Check size={20} /> : <AlertCircle size={20} />}
              <span>{voiceResult.message}</span>
            </div>
          )}

          {/* Interim Transcript Display */}
          {isListening && interimTranscript && (
            <div className="kiosk-voice-transcript">
              <span>{interimTranscript}</span>
            </div>
          )}

          {/* Voice Button */}
          <button
            className={`kiosk-voice-btn ${isListening ? 'listening' : ''} ${voiceProcessing ? 'processing' : ''}`}
            onClick={handleMicClick}
            disabled={voiceProcessing}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {voiceProcessing ? (
              <div className="kiosk-voice-spinner" />
            ) : isListening ? (
              <MicOff size={32} />
            ) : (
              <Mic size={32} />
            )}
          </button>

          {isListening && (
            <div className="kiosk-voice-label">Listening...</div>
          )}
        </div>
      )}

      {/* Timer Modal */}
      {showTimerModal && (
        <div className="timer-modal-overlay" onClick={() => setShowTimerModal(false)}>
          <div className="timer-modal" onClick={e => e.stopPropagation()}>
            <div className="timer-modal-header">
              <Timer size={24} />
              <h3>Set Timer</h3>
              <button className="timer-modal-close" onClick={() => setShowTimerModal(false)}>
                ✕
              </button>
            </div>
            <div className="timer-modal-content">
              <div className="timer-preset-buttons">
                {[1, 3, 5, 10, 15, 30].map(mins => (
                  <button
                    key={mins}
                    className={`timer-preset ${timerMinutes === mins ? 'active' : ''}`}
                    onClick={() => setTimerMinutes(mins)}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <div className="timer-custom">
                <button
                  className="timer-adjust"
                  onClick={() => setTimerMinutes(Math.max(1, timerMinutes - 1))}
                >
                  −
                </button>
                <span className="timer-custom-display">{timerMinutes} min</span>
                <button
                  className="timer-adjust"
                  onClick={() => setTimerMinutes(timerMinutes + 1)}
                >
                  +
                </button>
              </div>
              <button
                className="timer-start-btn"
                onClick={() => {
                  startTimer(timerMinutes * 60, `${timerMinutes} minute`);
                  setShowTimerModal(false);
                }}
              >
                <Timer size={20} />
                Start Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WiFi QR Code Modal */}
      {showWifiModal && wifiCredentials && (
        <div className="timer-modal-overlay" onClick={() => setShowWifiModal(false)}>
          <div className="timer-modal wifi-modal" onClick={e => e.stopPropagation()}>
            <div className="timer-modal-header">
              <Wifi size={24} />
              <h3>Guest WiFi</h3>
              <button className="timer-modal-close" onClick={() => setShowWifiModal(false)}>
                ✕
              </button>
            </div>
            <div className="wifi-modal-content">
              {wifiCredentials.ssid === 'Not Configured' ? (
                <div className="wifi-not-configured">
                  <p>WiFi credentials not configured.</p>
                  <p className="wifi-hint">Add WIFI_SSID and WIFI_PASSWORD to your .env file.</p>
                </div>
              ) : wifiCredentials.ssid === 'Error loading WiFi' ? (
                <div className="wifi-not-configured">
                  <p>Failed to load WiFi credentials.</p>
                </div>
              ) : (
                <>
                  <div className="wifi-qr-container">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`WIFI:T:WPA;S:${wifiCredentials.ssid};P:${wifiCredentials.password};;`)}`}
                      alt="WiFi QR Code"
                      className="wifi-qr-code"
                    />
                  </div>
                  <p className="wifi-hint">Scan with your phone's camera to connect</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
