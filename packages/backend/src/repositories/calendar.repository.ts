import { db } from '../config/database';
import { CalendarConfig, CalendarEvent } from '../types';

export class CalendarRepository {
  /**
   * Get calendar configuration by calendar ID
   */
  async getCalendarConfig(calendarId: string): Promise<CalendarConfig | null> {
    const row = await db('calendar_configs')
      .where({ calendar_id: calendarId })
      .first();

    if (!row) return null;
    return this.mapCalendarConfigFromDb(row);
  }

  /**
   * Get all enabled Google calendars
   */
  async getEnabledGoogleCalendars(): Promise<CalendarConfig[]> {
    const rows = await db('calendar_configs')
      .where({ is_enabled: true, sync_enabled: true })
      .whereIn('calendar_type', ['primary', 'subscribed']);

    return rows.map(this.mapCalendarConfigFromDb);
  }

  /**
   * Update calendar sync token and last sync time
   */
  async updateSyncToken(calendarId: string, syncToken: string): Promise<void> {
    await db('calendar_configs')
      .where({ calendar_id: calendarId })
      .update({
        sync_token: syncToken,
        last_sync_at: db.fn.now(),
      });
  }

  /**
   * Upsert calendar configuration
   */
  async upsertCalendar(calendar: Partial<CalendarConfig>): Promise<void> {
    const existing = await this.getCalendarConfig(calendar.calendarId!);

    const dbData = this.mapCalendarConfigToDb(calendar);

    if (existing) {
      await db('calendar_configs')
        .where({ calendar_id: calendar.calendarId })
        .update(dbData);
    } else {
      await db('calendar_configs').insert(dbData);
    }
  }

  /**
   * Get cached events for a calendar within date range
   */
  async getCachedEvents(
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const rows = await db('calendar_events_cache')
      .where({ calendar_id: calendarId })
      .whereBetween('start_datetime', [startDate.toISOString(), endDate.toISOString()])
      .orderBy('start_datetime', 'asc');

    return rows.map(this.mapCalendarEventFromDb);
  }

  /**
   * Upsert event in cache
   */
  async upsertEvent(event: Partial<CalendarEvent>): Promise<void> {
    const existing = await db('calendar_events_cache')
      .where({ id: event.id })
      .first();

    const dbData = this.mapCalendarEventToDb(event);

    if (existing) {
      await db('calendar_events_cache')
        .where({ id: event.id })
        .update({
          ...dbData,
          last_synced_at: db.fn.now(),
        });
    } else {
      await db('calendar_events_cache').insert({
        ...dbData,
        last_synced_at: db.fn.now(),
      });
    }
  }

  /**
   * Delete event from cache
   */
  async deleteEvent(eventId: string): Promise<void> {
    await db('calendar_events_cache')
      .where({ id: eventId })
      .delete();
  }

  /**
   * Bulk upsert events (more efficient for large syncs)
   */
  async bulkUpsertEvents(events: Partial<CalendarEvent>[]): Promise<void> {
    if (events.length === 0) return;

    await db.transaction(async (trx) => {
      for (const event of events) {
        const existing = await trx('calendar_events_cache')
          .where({ id: event.id })
          .first();

        const dbData = this.mapCalendarEventToDb(event);

        if (existing) {
          await trx('calendar_events_cache')
            .where({ id: event.id })
            .update({ ...dbData, last_synced_at: trx.fn.now() });
        } else {
          await trx('calendar_events_cache').insert({
            ...dbData,
            last_synced_at: trx.fn.now(),
          });
        }
      }
    });
  }

  /**
   * Map database row to CalendarConfig
   */
  private mapCalendarConfigFromDb(row: any): CalendarConfig {
    return {
      id: row.id,
      calendarId: row.calendar_id,
      calendarName: row.calendar_name,
      calendarType: row.calendar_type,
      isEnabled: Boolean(row.is_enabled),
      color: row.color,
      syncEnabled: Boolean(row.sync_enabled),
      lastSyncAt: row.last_sync_at,
      syncToken: row.sync_token,
      createdAt: row.created_at,
    };
  }

  /**
   * Map CalendarConfig to database row
   */
  private mapCalendarConfigToDb(config: Partial<CalendarConfig>): any {
    const dbData: any = {};

    if (config.calendarId !== undefined) dbData.calendar_id = config.calendarId;
    if (config.calendarName !== undefined) dbData.calendar_name = config.calendarName;
    if (config.calendarType !== undefined) dbData.calendar_type = config.calendarType;
    if (config.isEnabled !== undefined) dbData.is_enabled = config.isEnabled;
    if (config.color !== undefined) dbData.color = config.color;
    if (config.syncEnabled !== undefined) dbData.sync_enabled = config.syncEnabled;
    if (config.lastSyncAt !== undefined) dbData.last_sync_at = config.lastSyncAt;
    if (config.syncToken !== undefined) dbData.sync_token = config.syncToken;

    return dbData;
  }

  /**
   * Map database row to CalendarEvent
   */
  private mapCalendarEventFromDb(row: any): CalendarEvent {
    return {
      id: row.id,
      calendarId: row.calendar_id,
      summary: row.summary,
      description: row.description,
      location: row.location,
      startDateTime: row.start_datetime,
      endDateTime: row.end_datetime,
      allDay: Boolean(row.all_day),
      recurrence: row.recurrence,
      attendees: row.attendees,
      status: row.status,
      rawData: row.raw_data,
    };
  }

  /**
   * Map CalendarEvent to database row
   */
  private mapCalendarEventToDb(event: Partial<CalendarEvent>): any {
    const dbData: any = {};

    if (event.id !== undefined) dbData.id = event.id;
    if (event.calendarId !== undefined) dbData.calendar_id = event.calendarId;
    if (event.summary !== undefined) dbData.summary = event.summary;
    if (event.description !== undefined) dbData.description = event.description;
    if (event.location !== undefined) dbData.location = event.location;
    if (event.startDateTime !== undefined) dbData.start_datetime = event.startDateTime;
    if (event.endDateTime !== undefined) dbData.end_datetime = event.endDateTime;
    if (event.allDay !== undefined) dbData.all_day = event.allDay;
    if (event.recurrence !== undefined) dbData.recurrence = event.recurrence;
    if (event.attendees !== undefined) dbData.attendees = event.attendees;
    if (event.status !== undefined) dbData.status = event.status;
    if (event.rawData !== undefined) dbData.raw_data = event.rawData;

    return dbData;
  }
}
