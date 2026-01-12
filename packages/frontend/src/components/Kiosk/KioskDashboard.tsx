import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Sun,
  CloudRain,
  Cloud,
  Thermometer,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  Zap,
  Battery,
  BatteryMedium,
  BatteryFull,
  BellRing,
  ListTodo,
  CalendarDays,
  Mic,
  MicOff,
  Check,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { weatherApi, todosApi, calendarApi, syncApi, smartInputApi } from '../../services/api';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
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
  const [aiEnabled, setAiEnabled] = useState(false);

  // Voice input state
  const [voiceResult, setVoiceResult] = useState<{ success: boolean; message: string } | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);

  // Emergency info modal
  const [showEmergency, setShowEmergency] = useState(false);

  // Sleep mode state
  const [isSleeping, setIsSleeping] = useState(false);
  const [clockPosition, setClockPosition] = useState({ x: 50, y: 50 });
  const sleepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const SLEEP_DELAY = 2 * 60 * 1000; // 2 minutes of inactivity

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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sleep mode - reset timer on activity
  const resetSleepTimer = useCallback(() => {
    if (isSleeping) {
      setIsSleeping(false);
    }
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
    }
    sleepTimeoutRef.current = setTimeout(() => {
      setIsSleeping(true);
    }, SLEEP_DELAY);
  }, [isSleeping, SLEEP_DELAY]);

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
    await Promise.all([loadTodos(), loadWeather(), loadEvents()]);
    setLoading(false);
  };

  const loadTodos = async () => {
    try {
      const response = await todosApi.getKioskTodos(5);
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
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const startStr = startOfDay.toISOString().split('T')[0];
      const endStr = endOfDay.toISOString().split('T')[0];

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
        <div className="kiosk-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="kiosk-dashboard">
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

      <button className="kiosk-exit-btn" onClick={onExit}>
        <X size={20} />
        <span>Exit</span>
      </button>

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
                      </div>
                    </div>

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

          {weather && (
            <div className="info-card">
              <Thermometer size={24} />
              <div className="info-content">
                <div className="info-label">Feels Like</div>
                <div className="info-value">{weather.temperature}°F</div>
              </div>
            </div>
          )}

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
      {voiceSupported && (
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
    </div>
  );
}
