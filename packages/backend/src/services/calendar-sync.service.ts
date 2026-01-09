import { OAuth2Client } from 'google-auth-library';
import { GoogleCalendarService } from './google-calendar.service';
import { ExternalCalendarService } from './external-calendar.service';
import { CalendarRepository } from '../repositories/calendar.repository';
import { ExternalCalendarRepository } from '../repositories/external-calendar.repository';
import { SyncLogRepository } from '../repositories/sync-log.repository';
import { CalendarEvent } from '../types';

export interface SyncResult {
  success: boolean;
  calendarId: string;
  syncType: 'full' | 'incremental' | 'external';
  eventsAdded: number;
  eventsUpdated: number;
  eventsDeleted: number;
  error?: string;
  nextSyncToken?: string;
}

export class CalendarSyncService {
  private calendarRepo: CalendarRepository;
  private externalCalendarRepo: ExternalCalendarRepository;
  private syncLogRepo: SyncLogRepository;
  private googleCalendarService?: GoogleCalendarService;
  private externalCalendarService: ExternalCalendarService;

  constructor(auth?: OAuth2Client) {
    this.calendarRepo = new CalendarRepository();
    this.externalCalendarRepo = new ExternalCalendarRepository();
    this.syncLogRepo = new SyncLogRepository();
    this.externalCalendarService = new ExternalCalendarService();

    if (auth) {
      this.googleCalendarService = new GoogleCalendarService(auth);
    }
  }

  /**
   * Sync a single Google calendar incrementally
   */
  async syncGoogleCalendar(calendarId: string): Promise<SyncResult> {
    if (!this.googleCalendarService) {
      throw new Error('Google Calendar service not initialized. Authentication required.');
    }

    const result: SyncResult = {
      success: false,
      calendarId,
      syncType: 'incremental',
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    };

    // Create sync log
    const logId = await this.syncLogRepo.createLog({
      calendarId,
      syncType: 'incremental',
      status: 'success',
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    });

    try {
      // Get calendar config to retrieve sync token
      const config = await this.calendarRepo.getCalendarConfig(calendarId);
      const syncToken = config?.syncToken;

      if (!syncToken) {
        result.syncType = 'full';
      }

      // Fetch all events with pagination
      const { events, nextSyncToken } = await this.handlePagination(
        calendarId,
        syncToken
      );

      console.log(`Fetched ${events.length} events for calendar ${calendarId}`);

      // Process events
      const stats = await this.processEvents(calendarId, events, result.syncType);

      result.eventsAdded = stats.added;
      result.eventsUpdated = stats.updated;
      result.eventsDeleted = stats.deleted;
      result.nextSyncToken = nextSyncToken;
      result.success = true;

      // Update sync token in config
      if (nextSyncToken) {
        await this.calendarRepo.updateSyncToken(calendarId, nextSyncToken);
      }

      // Update sync log
      await this.syncLogRepo.completeLog(logId, {
        status: 'success',
        eventsAdded: stats.added,
        eventsUpdated: stats.updated,
        eventsDeleted: stats.deleted,
      });

      console.log(`✅ Synced ${calendarId}: +${stats.added} ~${stats.updated} -${stats.deleted}`);

      return result;
    } catch (error: any) {
      result.error = error.message;

      // Check if sync token is invalid
      if (error.message && error.message.toLowerCase().includes('sync token')) {
        console.log(`⚠️ Invalid sync token for ${calendarId}, clearing and retrying...`);
        await this.calendarRepo.updateSyncToken(calendarId, '');

        // Retry with full sync
        try {
          return await this.syncGoogleCalendar(calendarId);
        } catch (retryError: any) {
          result.error = retryError.message;
        }
      }

      // Update sync log with error
      await this.syncLogRepo.completeLog(logId, {
        status: 'failed',
        eventsAdded: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        errorMessage: error.message,
      });

      console.error(`❌ Failed to sync ${calendarId}:`, error.message);

      throw error;
    }
  }

  /**
   * Sync all enabled Google calendars
   */
  async syncAllGoogleCalendars(): Promise<SyncResult[]> {
    if (!this.googleCalendarService) {
      throw new Error('Google Calendar service not initialized. Authentication required.');
    }

    const calendars = await this.calendarRepo.getEnabledGoogleCalendars();

    console.log(`🔄 Syncing ${calendars.length} Google calendars...`);

    const results: SyncResult[] = [];

    for (const calendar of calendars) {
      try {
        const result = await this.syncGoogleCalendar(calendar.calendarId);
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          calendarId: calendar.calendarId,
          syncType: 'incremental',
          eventsAdded: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Sync a single external iCal calendar
   */
  async syncExternalCalendar(externalCalendarId: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      calendarId: `external_${externalCalendarId}`,
      syncType: 'external',
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    };

    // Create sync log
    const logId = await this.syncLogRepo.createLog({
      calendarId: `external_${externalCalendarId}`,
      syncType: 'external',
      status: 'success',
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    });

    try {
      // Get external calendar config
      const externalCalendar = await this.externalCalendarRepo.getExternalCalendar(
        externalCalendarId
      );

      if (!externalCalendar) {
        throw new Error(`External calendar ${externalCalendarId} not found`);
      }

      if (!externalCalendar.isEnabled) {
        throw new Error(`External calendar ${externalCalendarId} is disabled`);
      }

      // Fetch iCal feed
      console.log(`📥 Fetching iCal feed from ${externalCalendar.icalUrl}...`);
      const events = await this.externalCalendarService.fetchICalFeed(
        externalCalendar.icalUrl,
        externalCalendarId
      );

      console.log(`Fetched ${events.length} events from external calendar`);

      // For external calendars, use full replacement strategy
      const stats = await this.processEvents(
        `external_${externalCalendarId}`,
        events,
        'external'
      );

      result.eventsAdded = stats.added;
      result.eventsUpdated = stats.updated;
      result.eventsDeleted = stats.deleted;
      result.success = true;

      // Update last sync timestamp
      await this.externalCalendarRepo.updateLastSync(externalCalendarId);

      // Update sync log
      await this.syncLogRepo.completeLog(logId, {
        status: 'success',
        eventsAdded: stats.added,
        eventsUpdated: stats.updated,
        eventsDeleted: stats.deleted,
      });

      console.log(
        `✅ Synced external calendar ${externalCalendarId}: +${stats.added} ~${stats.updated}`
      );

      return result;
    } catch (error: any) {
      result.error = error.message;

      // Update external calendar with error
      await this.externalCalendarRepo.updateLastSync(externalCalendarId, error.message);

      // Update sync log
      await this.syncLogRepo.completeLog(logId, {
        status: 'failed',
        eventsAdded: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
        errorMessage: error.message,
      });

      console.error(`❌ Failed to sync external calendar ${externalCalendarId}:`, error.message);

      throw error;
    }
  }

  /**
   * Sync all enabled external calendars
   */
  async syncAllExternalCalendars(): Promise<SyncResult[]> {
    const calendars = await this.externalCalendarRepo.getEnabledExternalCalendars();

    console.log(`🔄 Syncing ${calendars.length} external calendars...`);

    const results: SyncResult[] = [];

    for (const calendar of calendars) {
      try {
        const result = await this.syncExternalCalendar(calendar.id);
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          calendarId: `external_${calendar.id}`,
          syncType: 'external',
          eventsAdded: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Discover and register Google calendars
   */
  async discoverGoogleCalendars(): Promise<void> {
    if (!this.googleCalendarService) {
      throw new Error('Google Calendar service not initialized');
    }

    const calendars = await this.googleCalendarService.listCalendars();

    for (const calendar of calendars) {
      await this.calendarRepo.upsertCalendar({
        calendarId: calendar.id!,
        calendarName: calendar.summary || 'Unnamed Calendar',
        calendarType: calendar.primary ? 'primary' : 'subscribed',
        isEnabled: true,
        color: calendar.backgroundColor,
        syncEnabled: true,
      });
    }

    console.log(`✅ Discovered and registered ${calendars.length} Google calendars`);
  }

  /**
   * Handle pagination for large calendar syncs
   */
  private async handlePagination(
    calendarId: string,
    syncToken?: string,
    pageToken?: string,
    accumulated: any[] = []
  ): Promise<{ events: any[]; nextSyncToken?: string }> {
    if (!this.googleCalendarService) {
      throw new Error('Google Calendar service not initialized');
    }

    const response = await this.googleCalendarService.syncEvents(
      calendarId,
      syncToken,
      pageToken
    );

    accumulated.push(...response.events);

    // If there's a next page, fetch it
    if (response.nextPageToken) {
      return this.handlePagination(
        calendarId,
        undefined, // Don't pass syncToken for pagination
        response.nextPageToken,
        accumulated
      );
    }

    // Return all events and the sync token
    return {
      events: accumulated,
      nextSyncToken: response.nextSyncToken,
    };
  }

  /**
   * Process and cache events
   */
  private async processEvents(
    calendarId: string,
    events: any[],
    syncType: 'full' | 'incremental' | 'external'
  ): Promise<{ added: number; updated: number; deleted: number }> {
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const event of events) {
      try {
        // Check if event is deleted
        if (event.status === 'cancelled') {
          await this.calendarRepo.deleteEvent(event.id);
          deleted++;
          continue;
        }

        // Convert Google event to our format
        const calendarEvent = this.convertToCalendarEvent(event, calendarId);

        // Check if event exists
        const existing = await this.calendarRepo.getCachedEvents(
          calendarId,
          new Date(calendarEvent.startDateTime),
          new Date(calendarEvent.endDateTime)
        );

        const existingEvent = existing.find((e) => e.id === calendarEvent.id);

        if (existingEvent) {
          updated++;
        } else {
          added++;
        }

        // Upsert event
        await this.calendarRepo.upsertEvent(calendarEvent);
      } catch (error: any) {
        console.warn(`Failed to process event ${event.id}:`, error.message);
        // Continue with other events
      }
    }

    return { added, updated, deleted };
  }

  /**
   * Convert Google Calendar event to CalendarEvent
   */
  private convertToCalendarEvent(googleEvent: any, calendarId: string): CalendarEvent {
    const start = googleEvent.start?.dateTime || googleEvent.start?.date;
    const end = googleEvent.end?.dateTime || googleEvent.end?.date;
    const allDay = !googleEvent.start?.dateTime;

    return {
      id: googleEvent.id,
      calendarId,
      summary: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      location: googleEvent.location,
      startDateTime: start ? new Date(start).toISOString() : new Date().toISOString(),
      endDateTime: end ? new Date(end).toISOString() : new Date().toISOString(),
      allDay,
      recurrence: googleEvent.recurrence ? JSON.stringify(googleEvent.recurrence) : undefined,
      attendees: googleEvent.attendees ? JSON.stringify(googleEvent.attendees) : undefined,
      status: googleEvent.status || 'confirmed',
      rawData: JSON.stringify(googleEvent),
    };
  }
}
