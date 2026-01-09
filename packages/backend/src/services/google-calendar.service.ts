import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(private auth: OAuth2Client) {
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  /**
   * List all calendars for the authenticated user
   */
  async listCalendars() {
    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }

  /**
   * Get a specific calendar by ID
   */
  async getCalendar(calendarId: string) {
    try {
      const response = await this.calendar.calendars.get({ calendarId });
      return response.data;
    } catch (error) {
      console.error('Error getting calendar:', error);
      throw error;
    }
  }

  /**
   * List events from a calendar within a date range
   */
  async listEvents(
    calendarId: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      orderBy?: 'startTime' | 'updated';
      singleEvents?: boolean;
    }
  ) {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: options?.timeMin || new Date().toISOString(),
        timeMax: options?.timeMax,
        maxResults: options?.maxResults || 250,
        singleEvents: options?.singleEvents !== false, // Default to true
        orderBy: options?.orderBy || 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(calendarId: string, eventId: string) {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    calendarId: string,
    event: {
      summary: string;
      description?: string;
      location?: string;
      start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
      };
      end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
      };
      attendees?: Array<{ email: string }>;
      reminders?: {
        useDefault: boolean;
        overrides?: Array<{ method: string; minutes: number }>;
      };
      recurrence?: string[];
    }
  ) {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: {
      summary?: string;
      description?: string;
      location?: string;
      start?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
      };
      end?: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
      };
      attendees?: Array<{ email: string }>;
      reminders?: {
        useDefault: boolean;
        overrides?: Array<{ method: string; minutes: number }>;
      };
      recurrence?: string[];
    }
  ) {
    try {
      const response = await this.calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(calendarId: string, eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Get events using sync token for incremental sync
   */
  async syncEvents(
    calendarId: string,
    syncToken?: string,
    pageToken?: string
  ) {
    try {
      const params: any = {
        calendarId,
      };

      if (syncToken) {
        params.syncToken = syncToken;
      } else {
        // Initial sync - start from 1 month ago
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        params.timeMin = timeMin.toISOString();
      }

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await this.calendar.events.list(params);

      return {
        events: response.data.items || [],
        nextPageToken: response.data.nextPageToken,
        nextSyncToken: response.data.nextSyncToken,
      };
    } catch (error) {
      console.error('Error syncing events:', error);
      throw error;
    }
  }

  /**
   * Quick add event using natural language
   */
  async quickAddEvent(calendarId: string, text: string) {
    try {
      const response = await this.calendar.events.quickAdd({
        calendarId,
        text,
      });
      return response.data;
    } catch (error) {
      console.error('Error quick adding event:', error);
      throw error;
    }
  }
}
