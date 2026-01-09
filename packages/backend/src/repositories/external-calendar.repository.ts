import { db } from '../config/database';
import { ExternalCalendar } from '../types';

export class ExternalCalendarRepository {
  /**
   * Get external calendar by ID
   */
  async getExternalCalendar(id: number): Promise<ExternalCalendar | null> {
    const row = await db('external_calendars').where({ id }).first();

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /**
   * Get all enabled external calendars
   */
  async getEnabledExternalCalendars(): Promise<ExternalCalendar[]> {
    const rows = await db('external_calendars').where({ is_enabled: true });

    return rows.map(this.mapFromDb);
  }

  /**
   * Get calendars that are due for sync
   */
  async getCalendarsDueForSync(): Promise<ExternalCalendar[]> {
    // Get calendars where last_sync_at + sync_interval < now
    // Or where last_sync_at is null
    const rows = await db('external_calendars')
      .where({ is_enabled: true })
      .where(function() {
        this.whereRaw(
          'datetime(last_sync_at, "+" || sync_interval || " seconds") <= datetime("now")'
        ).orWhereNull('last_sync_at');
      });

    return rows.map(this.mapFromDb);
  }

  /**
   * Update last sync timestamp and error
   */
  async updateLastSync(id: number, error?: string): Promise<void> {
    await db('external_calendars')
      .where({ id })
      .update({
        last_sync_at: db.fn.now(),
        sync_error: error || null,
      });
  }

  /**
   * Create a new external calendar
   */
  async create(calendar: Omit<ExternalCalendar, 'id' | 'createdAt'>): Promise<number> {
    const dbData = this.mapToDb(calendar);
    const [id] = await db('external_calendars').insert(dbData);
    return id;
  }

  /**
   * Update external calendar
   */
  async update(id: number, calendar: Partial<ExternalCalendar>): Promise<void> {
    const dbData = this.mapToDb(calendar);
    await db('external_calendars').where({ id }).update(dbData);
  }

  /**
   * Delete external calendar
   */
  async delete(id: number): Promise<void> {
    await db('external_calendars').where({ id }).delete();
  }

  /**
   * Get all external calendars
   */
  async getAll(): Promise<ExternalCalendar[]> {
    const rows = await db('external_calendars').orderBy('created_at', 'desc');
    return rows.map(this.mapFromDb);
  }

  /**
   * Map database row to ExternalCalendar
   */
  private mapFromDb(row: any): ExternalCalendar {
    return {
      id: row.id,
      name: row.name,
      icalUrl: row.ical_url,
      color: row.color,
      isEnabled: Boolean(row.is_enabled),
      syncInterval: row.sync_interval,
      lastSyncAt: row.last_sync_at,
      syncError: row.sync_error,
      createdAt: row.created_at,
    };
  }

  /**
   * Map ExternalCalendar to database row
   */
  private mapToDb(calendar: Partial<ExternalCalendar>): any {
    const dbData: any = {};

    if (calendar.name !== undefined) dbData.name = calendar.name;
    if (calendar.icalUrl !== undefined) dbData.ical_url = calendar.icalUrl;
    if (calendar.color !== undefined) dbData.color = calendar.color;
    if (calendar.isEnabled !== undefined) dbData.is_enabled = calendar.isEnabled;
    if (calendar.syncInterval !== undefined) dbData.sync_interval = calendar.syncInterval;
    if (calendar.lastSyncAt !== undefined) dbData.last_sync_at = calendar.lastSyncAt;
    if (calendar.syncError !== undefined) dbData.sync_error = calendar.syncError;

    return dbData;
  }
}
