import { db } from '../config/database';
import {
  Notification,
  CreateNotificationInput,
  NotificationPreferences,
  UpdatePreferencesInput,
  DigestLog,
} from '../types';

export class NotificationRepository {
  // =====================
  // NOTIFICATIONS CRUD
  // =====================

  async create(input: CreateNotificationInput): Promise<Notification> {
    const [id] = await db('notifications').insert({
      type: input.type,
      title: input.title,
      message: input.message,
      icon: input.icon || null,
      priority: input.priority || 'normal',
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      scheduled_for: input.scheduledFor || null,
      expires_at: input.expiresAt || null,
    });
    return this.getById(id) as Promise<Notification>;
  }

  async getById(id: number): Promise<Notification | null> {
    const row = await db('notifications').where({ id }).first();
    if (!row) return null;
    return this.mapFromDb(row);
  }

  async getUnread(limit = 50): Promise<Notification[]> {
    const now = new Date().toISOString();
    const rows = await db('notifications')
      .where({ is_read: false, is_dismissed: false })
      .where(function () {
        this.whereNull('scheduled_for').orWhere('scheduled_for', '<=', now);
      })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', now);
      })
      .orderBy('created_at', 'desc')
      .limit(limit);
    return rows.map((row: any) => this.mapFromDb(row));
  }

  async getAll(includeRead = false, limit = 100): Promise<Notification[]> {
    const now = new Date().toISOString();
    let query = db('notifications')
      .where({ is_dismissed: false })
      .where(function () {
        this.whereNull('scheduled_for').orWhere('scheduled_for', '<=', now);
      });

    if (!includeRead) {
      query = query.where({ is_read: false });
    }

    const rows = await query.orderBy('created_at', 'desc').limit(limit);
    return rows.map((row: any) => this.mapFromDb(row));
  }

  async getUnreadCount(): Promise<number> {
    const now = new Date().toISOString();
    const result = await db('notifications')
      .where({ is_read: false, is_dismissed: false })
      .where(function () {
        this.whereNull('scheduled_for').orWhere('scheduled_for', '<=', now);
      })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', now);
      })
      .count('id as count')
      .first();
    return (result as any)?.count || 0;
  }

  async markAsRead(id: number): Promise<void> {
    await db('notifications').where({ id }).update({
      is_read: true,
      read_at: db.fn.now(),
    });
  }

  async markAllAsRead(): Promise<void> {
    await db('notifications').where({ is_read: false }).update({
      is_read: true,
      read_at: db.fn.now(),
    });
  }

  async dismiss(id: number): Promise<void> {
    await db('notifications').where({ id }).update({ is_dismissed: true });
  }

  async dismissAll(): Promise<void> {
    await db('notifications')
      .where({ is_dismissed: false })
      .update({ is_dismissed: true });
  }

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    return db('notifications').where('expires_at', '<', now).delete();
  }

  async findByEntity(
    entityType: string,
    entityId: number
  ): Promise<Notification[]> {
    const rows = await db('notifications')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc');
    return rows.map((row: any) => this.mapFromDb(row));
  }

  // =====================
  // PREFERENCES
  // =====================

  async getPreferences(): Promise<NotificationPreferences | null> {
    const row = await db('notification_preferences').first();
    if (!row) return null;
    return this.mapPreferencesFromDb(row);
  }

  async getOrCreatePreferences(): Promise<NotificationPreferences> {
    let prefs = await this.getPreferences();
    if (!prefs) {
      await db('notification_preferences').insert({});
      prefs = await this.getPreferences();
    }
    return prefs!;
  }

  async updatePreferences(
    input: UpdatePreferencesInput
  ): Promise<NotificationPreferences> {
    await this.getOrCreatePreferences();

    const updates: any = { updated_at: db.fn.now() };
    if (input.digestEmail !== undefined) updates.digest_email = input.digestEmail;
    if (input.digestEnabled !== undefined)
      updates.digest_enabled = input.digestEnabled;
    if (input.digestTime !== undefined) updates.digest_time = input.digestTime;
    if (input.calendarReminders !== undefined)
      updates.calendar_reminders = input.calendarReminders;
    if (input.taskDueAlerts !== undefined)
      updates.task_due_alerts = input.taskDueAlerts;
    if (input.choreDueAlerts !== undefined)
      updates.chore_due_alerts = input.choreDueAlerts;
    if (input.gameOverdueAlerts !== undefined)
      updates.game_overdue_alerts = input.gameOverdueAlerts;
    if (input.billReminders !== undefined)
      updates.bill_reminders = input.billReminders;
    if (input.warrantyExpiringAlerts !== undefined)
      updates.warranty_expiring_alerts = input.warrantyExpiringAlerts;
    if (input.calendarReminderMinutes !== undefined)
      updates.calendar_reminder_minutes = input.calendarReminderMinutes;
    if (input.taskReminderMinutes !== undefined)
      updates.task_reminder_minutes = input.taskReminderMinutes;

    await db('notification_preferences').update(updates);
    return this.getPreferences() as Promise<NotificationPreferences>;
  }

  // =====================
  // DIGEST LOGS
  // =====================

  async createDigestLog(
    log: Omit<DigestLog, 'id' | 'sentAt'>
  ): Promise<number> {
    const [id] = await db('digest_logs').insert({
      digest_date: log.digestDate,
      email_to: log.emailTo,
      events_count: log.eventsCount,
      tasks_count: log.tasksCount,
      chores_count: log.choresCount,
      content_summary: log.contentSummary || null,
      success: log.success,
      error_message: log.errorMessage || null,
    });
    return id;
  }

  async hasDigestBeenSent(date: string, email: string): Promise<boolean> {
    const existing = await db('digest_logs')
      .where({ digest_date: date, email_to: email, success: true })
      .first();
    return !!existing;
  }

  // =====================
  // MAPPING
  // =====================

  private mapFromDb(row: any): Notification {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      icon: row.icon,
      priority: row.priority,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: !!row.is_read,
      isDismissed: !!row.is_dismissed,
      scheduledFor: row.scheduled_for,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      readAt: row.read_at,
    };
  }

  private mapPreferencesFromDb(row: any): NotificationPreferences {
    return {
      id: row.id,
      digestEmail: row.digest_email,
      digestEnabled: !!row.digest_enabled,
      digestTime: row.digest_time,
      calendarReminders: !!row.calendar_reminders,
      taskDueAlerts: !!row.task_due_alerts,
      choreDueAlerts: !!row.chore_due_alerts,
      gameOverdueAlerts: !!row.game_overdue_alerts,
      billReminders: !!row.bill_reminders,
      warrantyExpiringAlerts: row.warranty_expiring_alerts !== false, // Default true
      calendarReminderMinutes: row.calendar_reminder_minutes,
      taskReminderMinutes: row.task_reminder_minutes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
