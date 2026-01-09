import * as ical from 'ical';
import axios from 'axios';
import { CalendarEvent } from '../types';

export class ExternalCalendarService {
  /**
   * Fetch and parse iCal feed from URL
   */
  async fetchICalFeed(url: string, externalCalendarId: number): Promise<CalendarEvent[]> {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'HomeManagement/1.0',
        },
      });

      const events = this.parseICalData(response.data, externalCalendarId);
      return events;
    } catch (error: any) {
      throw new Error(`Failed to fetch iCal feed from ${url}: ${error.message}`);
    }
  }

  /**
   * Parse iCal data into CalendarEvent format
   */
  private parseICalData(icalData: string, externalCalendarId: number): CalendarEvent[] {
    try {
      const parsed = ical.parseICS(icalData);
      const events: CalendarEvent[] = [];

      for (const key in parsed) {
        const event = parsed[key];

        if (event.type !== 'VEVENT') continue;

        try {
          // Generate unique ID for external event
          const eventId = `external_${externalCalendarId}_${event.uid}`;

          // Convert iCal event to our format
          const calendarEvent: CalendarEvent = {
            id: eventId,
            calendarId: `external_${externalCalendarId}`,
            summary: event.summary || 'Untitled Event',
            description: event.description || undefined,
            location: event.location || undefined,
            startDateTime: this.parseDate(event.start),
            endDateTime: this.parseDate(event.end || event.start),
            allDay: this.isAllDayEvent(event),
            recurrence: event.rrule ? JSON.stringify(event.rrule) : undefined,
            attendees: event.attendee ? JSON.stringify(event.attendee) : undefined,
            status: this.mapStatus(event.status),
            rawData: JSON.stringify(event),
          };

          events.push(calendarEvent);
        } catch (error: any) {
          console.warn(`Failed to parse event ${event.uid}:`, error.message);
          // Skip malformed events, continue with others
          continue;
        }
      }

      return events;
    } catch (error: any) {
      throw new Error(`Failed to parse iCal data: ${error.message}`);
    }
  }

  /**
   * Parse date to ISO string
   */
  private parseDate(date: any): string {
    if (!date) {
      return new Date().toISOString();
    }

    try {
      if (date instanceof Date) {
        return date.toISOString();
      }

      if (typeof date === 'string') {
        return new Date(date).toISOString();
      }

      // If it's a moment-like object or has toISOString
      if (date.toISOString) {
        return date.toISOString();
      }

      // Fallback
      return new Date(date).toISOString();
    } catch (error) {
      console.warn('Failed to parse date:', date);
      return new Date().toISOString();
    }
  }

  /**
   * Determine if event is all-day
   */
  private isAllDayEvent(event: any): boolean {
    try {
      // Check if datetype is 'date' (no time component)
      if (event.datetype === 'date') {
        return true;
      }

      // Check if start date has no time component (00:00:00)
      const start = event.start;
      if (!start) return false;

      const dateStr = this.parseDate(start);
      const date = new Date(dateStr);

      // If hours, minutes, and seconds are all 0, and duration is 24 hours or day boundary
      const isStartOfDay =
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0;

      if (!isStartOfDay) return false;

      // Check if end is also at day boundary
      if (event.end) {
        const endStr = this.parseDate(event.end);
        const endDate = new Date(endStr);
        const isEndOfDay =
          endDate.getUTCHours() === 0 &&
          endDate.getUTCMinutes() === 0 &&
          endDate.getUTCSeconds() === 0;

        return isEndOfDay;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map iCal status to our status
   */
  private mapStatus(status: any): string {
    if (!status) return 'confirmed';

    const statusStr = String(status).toLowerCase();

    switch (statusStr) {
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Test if URL is valid iCal feed
   */
  async validateICalUrl(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'HomeManagement/1.0',
        },
      });

      // Check if response contains VCALENDAR
      const data = response.data;
      return typeof data === 'string' && data.includes('BEGIN:VCALENDAR');
    } catch (error) {
      return false;
    }
  }
}
