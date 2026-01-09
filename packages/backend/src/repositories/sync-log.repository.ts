import { db } from '../config/database';
import { SyncLog } from '../types';

export class SyncLogRepository {
  /**
   * Create a new sync log entry
   */
  async createLog(log: Omit<SyncLog, 'id' | 'startedAt' | 'completedAt'>): Promise<number> {
    const dbData = {
      calendar_id: log.calendarId,
      sync_type: log.syncType,
      status: log.status,
      events_added: log.eventsAdded || 0,
      events_updated: log.eventsUpdated || 0,
      events_deleted: log.eventsDeleted || 0,
      error_message: log.errorMessage,
      started_at: db.fn.now(),
    };

    const [id] = await db('sync_logs').insert(dbData);
    return id;
  }

  /**
   * Update sync log with completion data
   */
  async completeLog(
    id: number,
    data: {
      status: 'success' | 'failed' | 'partial';
      eventsAdded: number;
      eventsUpdated: number;
      eventsDeleted: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    await db('sync_logs')
      .where({ id })
      .update({
        status: data.status,
        events_added: data.eventsAdded,
        events_updated: data.eventsUpdated,
        events_deleted: data.eventsDeleted,
        error_message: data.errorMessage,
        completed_at: db.fn.now(),
      });
  }

  /**
   * Get recent sync logs for a calendar
   */
  async getRecentLogs(calendarId?: string, limit: number = 10): Promise<SyncLog[]> {
    let query = db('sync_logs');

    if (calendarId) {
      query = query.where({ calendar_id: calendarId });
    }

    const rows = await query
      .orderBy('started_at', 'desc')
      .limit(limit);

    return rows.map(this.mapFromDb);
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(calendarId?: string): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncAt?: string;
  }> {
    let query = db('sync_logs');

    if (calendarId) {
      query = query.where({ calendar_id: calendarId });
    }

    const stats = await query.select(
      db.raw('COUNT(*) as total_syncs'),
      db.raw('SUM(CASE WHEN status = "success" THEN 1 ELSE 0 END) as successful_syncs'),
      db.raw('SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed_syncs'),
      db.raw('MAX(started_at) as last_sync_at')
    ).first();

    return {
      totalSyncs: stats?.total_syncs || 0,
      successfulSyncs: stats?.successful_syncs || 0,
      failedSyncs: stats?.failed_syncs || 0,
      lastSyncAt: stats?.last_sync_at || undefined,
    };
  }

  /**
   * Get all logs
   */
  async getAllLogs(limit: number = 50): Promise<SyncLog[]> {
    const rows = await db('sync_logs')
      .orderBy('started_at', 'desc')
      .limit(limit);

    return rows.map(this.mapFromDb);
  }

  /**
   * Delete old sync logs (cleanup)
   */
  async deleteOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await db('sync_logs')
      .where('started_at', '<', cutoffDate.toISOString())
      .delete();

    return deleted;
  }

  /**
   * Map database row to SyncLog
   */
  private mapFromDb(row: any): SyncLog {
    return {
      id: row.id,
      calendarId: row.calendar_id,
      syncType: row.sync_type,
      status: row.status,
      eventsAdded: row.events_added,
      eventsUpdated: row.events_updated,
      eventsDeleted: row.events_deleted,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }
}
