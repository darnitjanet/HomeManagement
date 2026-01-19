// Types for announcement generation
interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  icon: string;
  high: number;
  low: number;
}

interface WeatherAlert {
  message: string;
  icon: string;
  type: 'info' | 'warning' | 'danger';
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
}

interface Todo {
  id: number;
  title: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

interface BirthdayContact {
  id: number;
  name: string;
  birthday: string;
  daysUntil: number;
}

interface KioskNotification {
  id: number;
  type: string;
  title: string;
  message: string;
}

interface AnnouncementData {
  currentTime: Date;
  weather: WeatherData | null;
  weatherAlerts: WeatherAlert[];
  events: CalendarEvent[];
  todos: Todo[];
  upcomingBirthdays: BirthdayContact[];
  notifications: KioskNotification[];
}

/**
 * Get greeting based on time of day
 */
function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format time for speech (e.g., "7:30 AM")
 */
function formatTimeForSpeech(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  if (minutes === 0) {
    return `${hour12} ${ampm}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format date for speech (e.g., "Thursday, January 9th")
 */
function formatDateForSpeech(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format event time for speech
 */
function formatEventTimeForSpeech(event: CalendarEvent): string {
  if (!event.start.dateTime) return 'all day';

  const eventTime = new Date(event.start.dateTime);
  return `at ${formatTimeForSpeech(eventTime)}`;
}

/**
 * Generate the wake-up announcement
 */
export function generateWakeAnnouncement(data: AnnouncementData): string {
  const parts: string[] = [];
  const hour = data.currentTime.getHours();

  // 1. Greeting and time
  const greeting = getGreeting(hour);
  const timeStr = formatTimeForSpeech(data.currentTime);
  const dateStr = formatDateForSpeech(data.currentTime);
  parts.push(`${greeting}! It's ${timeStr}, ${dateStr}.`);

  // 2. Weather
  if (data.weather) {
    const temp = Math.round(data.weather.temperature);
    const desc = data.weather.description;
    const high = Math.round(data.weather.high);
    const low = Math.round(data.weather.low);
    parts.push(`Currently ${temp} degrees and ${desc}. High of ${high}, low of ${low}.`);
  }

  // 3. Weather alerts (important ones)
  const importantAlerts = data.weatherAlerts.filter(a => a.type === 'warning' || a.type === 'danger');
  if (importantAlerts.length > 0) {
    const alertMessages = importantAlerts.map(a => a.message).join('. ');
    parts.push(alertMessages + '.');
  }

  // 4. Tasks and events summary
  const taskCount = data.todos.length;
  const eventCount = data.events.length;

  if (taskCount > 0 || eventCount > 0) {
    const summaryParts: string[] = [];

    if (taskCount > 0) {
      summaryParts.push(`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`);
    }
    if (eventCount > 0) {
      summaryParts.push(`${eventCount} ${eventCount === 1 ? 'event' : 'events'}`);
    }

    parts.push(`You have ${summaryParts.join(' and ')} today.`);
  }

  // 5. First event of the day
  if (data.events.length > 0) {
    const firstEvent = data.events[0];
    const eventTime = formatEventTimeForSpeech(firstEvent);
    // Clean up event summary for speech
    const summary = firstEvent.summary.replace(/[^\w\s]/g, ' ').trim();
    parts.push(`First up: ${summary} ${eventTime}.`);
  }

  // 6. Birthday reminders
  const todayBirthdays = data.upcomingBirthdays.filter(b => b.daysUntil === 0);
  const tomorrowBirthdays = data.upcomingBirthdays.filter(b => b.daysUntil === 1);

  if (todayBirthdays.length > 0) {
    const names = todayBirthdays.map(b => b.name.split(' ')[0]).join(' and ');
    parts.push(`${names}'s birthday is today!`);
  } else if (tomorrowBirthdays.length > 0) {
    const names = tomorrowBirthdays.map(b => b.name.split(' ')[0]).join(' and ');
    parts.push(`${names}'s birthday is tomorrow.`);
  }

  // 7. Unread notifications count (if any)
  if (data.notifications.length > 0) {
    const count = data.notifications.length;
    parts.push(`You have ${count} ${count === 1 ? 'notification' : 'notifications'}.`);
  }

  return parts.join(' ');
}

/**
 * Generate a brief weather alert announcement
 */
export function generateWeatherAlertAnnouncement(alerts: WeatherAlert[]): string {
  if (alerts.length === 0) return '';

  const importantAlerts = alerts.filter(a => a.type === 'warning' || a.type === 'danger');
  if (importantAlerts.length === 0) return '';

  return 'Weather alert: ' + importantAlerts.map(a => a.message).join('. ') + '.';
}

/**
 * Generate a birthday announcement
 */
export function generateBirthdayAnnouncement(birthdays: BirthdayContact[]): string {
  const todayBirthdays = birthdays.filter(b => b.daysUntil === 0);

  if (todayBirthdays.length === 0) return '';

  const names = todayBirthdays.map(b => b.name.split(' ')[0]).join(' and ');
  return `Today is ${names}'s birthday!`;
}

/**
 * Generate a notification announcement
 */
export function generateNotificationAnnouncement(notification: KioskNotification): string {
  // Handle different notification types
  switch (notification.type) {
    case 'package_delivery':
      return `Package alert: ${notification.message}`;
    case 'task_due':
      return `Task reminder: ${notification.title}`;
    case 'calendar_reminder':
      return `Calendar reminder: ${notification.message}`;
    case 'birthday_reminder':
      return notification.message;
    default:
      return notification.message;
  }
}
