import { create } from 'zustand';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
  calendarId?: string;
}

interface CalendarStore {
  events: CalendarEvent[];
  calendars: any[];
  selectedCalendars: string[];
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  setEvents: (events: CalendarEvent[]) => void;
  setCalendars: (calendars: any[]) => void;
  toggleCalendar: (calendarId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventId: string, updatedEvent: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  events: [],
  calendars: [],
  selectedCalendars: ['primary'],
  isLoading: false,
  error: null,
  isAuthenticated: false,

  setEvents: (events) => set({ events }),

  setCalendars: (calendars) => set({ calendars }),

  toggleCalendar: (calendarId) => set((state) => {
    const isSelected = state.selectedCalendars.includes(calendarId);
    return {
      selectedCalendars: isSelected
        ? state.selectedCalendars.filter((id) => id !== calendarId)
        : [...state.selectedCalendars, calendarId],
    };
  }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

  addEvent: (event) => set((state) => ({
    events: [...state.events, event],
  })),

  updateEvent: (eventId, updatedEvent) => set((state) => ({
    events: state.events.map((e) => (e.id === eventId ? updatedEvent : e)),
  })),

  removeEvent: (eventId) => set((state) => ({
    events: state.events.filter((e) => e.id !== eventId),
  })),
}));
