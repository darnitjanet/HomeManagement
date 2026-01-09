import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { calendarApi } from '../../services/api';
import { EventForm } from './EventForm';
import { SyncButton } from './SyncButton';
import './CalendarView.css';

export function CalendarView() {
  const {
    events,
    calendars,
    setEvents,
    setCalendars,
    setLoading,
    setError,
    isLoading,
    setAuthenticated,
  } = useCalendarStore();

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>();
  const [calendarColors, setCalendarColors] = useState<Record<string, string>>({});
  const calendarRef = useRef<any>(null);

  // Fetch calendars and events on mount
  useEffect(() => {
    fetchCalendarsAndEvents();
  }, []);

  const fetchCalendarsAndEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all calendars
      const calendarsResponse = await calendarApi.listCalendars();
      if (calendarsResponse.data.success) {
        const calendarList = calendarsResponse.data.data;
        setCalendars(calendarList);
        setAuthenticated(true); // Successfully fetched calendars, so we're authenticated

        // Build a map of calendar colors
        const colorMap: Record<string, string> = {};
        calendarList.forEach((cal: any) => {
          if (cal.backgroundColor) {
            colorMap[cal.id] = cal.backgroundColor;
          }
        });
        setCalendarColors(colorMap);

        // Get current month range
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);

        // Fetch events from ALL calendars
        const allEvents: any[] = [];
        for (const calendar of calendarList) {
          try {
            const eventsResponse = await calendarApi.listEvents({
              calendarId: calendar.id,
              timeMin: start.toISOString(),
              timeMax: end.toISOString(),
              maxResults: 250,
            });

            if (eventsResponse.data.success) {
              // Add calendar info to each event
              const calendarEvents = eventsResponse.data.data.map((event: any) => ({
                ...event,
                calendarId: calendar.id,
                calendarSummary: calendar.summary,
              }));
              allEvents.push(...calendarEvents);
            }
          } catch (error) {
            console.warn(`Failed to fetch events for calendar ${calendar.summary}:`, error);
          }
        }

        setEvents(allEvents);
      }
    } catch (error: any) {
      console.error('Error fetching calendars and events:', error);

      // Check if it's an authentication error
      if (error.response?.status === 401) {
        setAuthenticated(false);
        setError('Please log in with Google to view your calendar');
      } else {
        setError('Failed to load calendars');
      }
    } finally {
      setLoading(false);
    }
  };

  // Convert Google Calendar events to FullCalendar format
  const calendarEvents = events.map((event: any) => {
    const isAllDay = !!event.start?.date;
    const color = getColorForEvent(event);

    return {
      id: event.id,
      title: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: isAllDay,
      extendedProps: {
        description: event.description,
        location: event.location,
        originalEvent: event,
      },
      backgroundColor: color.background,
      borderColor: color.border,
      textColor: '#ffffff',
    };
  });

  // Get color from Google Calendar event - adapted to match retro color theme
  function getColorForEvent(event: any) {
    // Map Google Calendar colors to our 3-color retro palette
    const googleColorToRetro: Record<string, { background: string; border: string }> = {
      // Blues -> Slate
      '#a4bdfc': { background: '#5b768a', border: '#4a6070' },
      '#5484ed': { background: '#5b768a', border: '#4a6070' },
      '#4285f4': { background: '#5b768a', border: '#4a6070' },
      '#039be5': { background: '#5b768a', border: '#4a6070' },

      // Teals -> Slate
      '#46d6db': { background: '#5b768a', border: '#4a6070' },

      // Greens -> Gold
      '#7ae7bf': { background: '#dc9e33', border: '#bf8529' },
      '#51b749': { background: '#dc9e33', border: '#bf8529' },
      '#33b679': { background: '#dc9e33', border: '#bf8529' },

      // Purples -> Slate
      '#dbadff': { background: '#5b768a', border: '#4a6070' },
      '#8e24aa': { background: '#5b768a', border: '#4a6070' },

      // Pinks/Reds -> Orange
      '#ff887c': { background: '#da6b34', border: '#bc5829' },
      '#dc2127': { background: '#da6b34', border: '#bc5829' },
      '#e67c73': { background: '#da6b34', border: '#bc5829' },

      // Oranges -> Orange
      '#f5511d': { background: '#da6b34', border: '#bc5829' },
      '#ffb878': { background: '#da6b34', border: '#bc5829' },

      // Yellows -> Gold
      '#fbd75b': { background: '#dc9e33', border: '#bf8529' },
      '#f6c026': { background: '#dc9e33', border: '#bf8529' },

      // Grays -> Slate
      '#e1e1e1': { background: '#5b768a', border: '#4a6070' },
      '#616161': { background: '#5b768a', border: '#4a6070' },
    };

    // Event colorId mapping to 3-color palette (for individually colored events)
    const googleEventColors: Record<string, { background: string; border: string }> = {
      '1': { background: '#5b768a', border: '#4a6070' }, // Slate
      '2': { background: '#dc9e33', border: '#bf8529' }, // Gold
      '3': { background: '#da6b34', border: '#bc5829' }, // Orange
      '4': { background: '#da6b34', border: '#bc5829' }, // Orange
      '5': { background: '#dc9e33', border: '#bf8529' }, // Gold
      '6': { background: '#dc9e33', border: '#bf8529' }, // Gold
      '7': { background: '#5b768a', border: '#4a6070' }, // Slate
      '8': { background: '#dc9e33', border: '#bf8529' }, // Gold
      '9': { background: '#5b768a', border: '#4a6070' }, // Slate
      '10': { background: '#dc9e33', border: '#bf8529' }, // Gold
      '11': { background: '#da6b34', border: '#bc5829' }, // Orange
    };

    // Priority 1: Event has a colorId (user manually colored this event)
    if (event.colorId && googleEventColors[event.colorId]) {
      return googleEventColors[event.colorId];
    }

    // Priority 2: Map calendar's color to retro palette (maintains differentiation)
    if (event.calendarId && calendarColors[event.calendarId]) {
      const calColor = calendarColors[event.calendarId];

      // Direct mapping from Google color to retro palette
      if (googleColorToRetro[calColor]) {
        return googleColorToRetro[calColor];
      }

      // Fallback: Parse hex color and map by hue
      // This ensures external calendars with unknown colors get mapped
      const parseColor = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };

      const rgb = parseColor(calColor);
      if (rgb) {
        const max = Math.max(rgb.r, rgb.g, rgb.b);
        const min = Math.min(rgb.r, rgb.g, rgb.b);
        const diff = max - min;

        // Classify by dominant color
        if (diff < 30) {
          // Gray/neutral -> Slate
          return { background: '#5b768a', border: '#4a6070' };
        } else if (rgb.r > rgb.g && rgb.r > rgb.b) {
          // Red dominant -> Orange or Gold
          if (rgb.g > rgb.b + 30) {
            return { background: '#dc9e33', border: '#bf8529' }; // Gold
          } else {
            return { background: '#da6b34', border: '#bc5829' }; // Orange
          }
        } else if (rgb.g > rgb.r && rgb.g > rgb.b) {
          // Green dominant -> Gold
          return { background: '#dc9e33', border: '#bf8529' };
        } else if (rgb.b > rgb.r && rgb.b > rgb.g) {
          // Blue dominant -> Slate
          return { background: '#5b768a', border: '#4a6070' };
        }
      }

      // Final fallback
      return { background: '#5b768a', border: '#4a6070' };
    }

    // Priority 3: Map event backgroundColor to retro palette
    if (event.backgroundColor && googleColorToRetro[event.backgroundColor]) {
      return googleColorToRetro[event.backgroundColor];
    }

    // Default to slate
    return {
      background: '#5b768a',
      border: '#4a6070',
    };
  }

  // Handle event click
  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps.originalEvent);
    setShowEventModal(true);
  };

  // Handle date click (create new event)
  const handleDateClick = (info: any) => {
    setFormInitialDate(info.date);
    setShowEventForm(true);
  };

  // Handle edit button click from event modal
  const handleEditEvent = () => {
    setShowEventModal(false);
    setShowEventForm(true);
  };

  // Handle form save/close
  const handleFormSave = () => {
    fetchCalendarsAndEvents();
  };

  const handleFormClose = () => {
    setShowEventForm(false);
    setSelectedEvent(null);
    setFormInitialDate(undefined);
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="calendar-loading">
        <div className="loading-spinner"></div>
        <p>Loading your calendar...</p>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-banner">
        <img src="/Calendar.png" alt="Calendar" />
      </div>
      <div className="calendar-header">
        <div className="calendar-actions">
          {calendars.length > 0 && (
            <span className="calendars-count">
              {calendars.length} calendar{calendars.length !== 1 ? 's' : ''} connected
            </span>
          )}
          <SyncButton onSyncComplete={fetchCalendarsAndEvents} />
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={calendarEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        editable={false} // Will enable after implementing edit
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        height="auto"
        eventMinHeight={50} // Larger for touch
        weekends={true}
        nowIndicator={true}
      />

      {/* Event details modal */}
      {showEventModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEvent.summary || '(No title)'}</h2>
              <button className="close-button" onClick={() => setShowEventModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {selectedEvent.calendarSummary && (
                <p>
                  <strong>Calendar:</strong> {selectedEvent.calendarSummary}
                </p>
              )}
              {selectedEvent.start && (
                <p>
                  <strong>Start:</strong>{' '}
                  {new Date(selectedEvent.start.dateTime || selectedEvent.start.date).toLocaleString()}
                </p>
              )}
              {selectedEvent.end && (
                <p>
                  <strong>End:</strong>{' '}
                  {new Date(selectedEvent.end.dateTime || selectedEvent.end.date).toLocaleString()}
                </p>
              )}
              {selectedEvent.location && (
                <p>
                  <strong>Location:</strong> {selectedEvent.location}
                </p>
              )}
              {selectedEvent.description && (
                <div>
                  <strong>Description:</strong>
                  <p>{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="outline" onClick={() => setShowEventModal(false)}>
                Close
              </button>
              <button className="secondary" onClick={handleEditEvent}>
                Edit Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event create/edit form */}
      {showEventForm && (
        <EventForm
          event={selectedEvent}
          initialDate={formInitialDate}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}
