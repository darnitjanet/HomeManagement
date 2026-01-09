import { NotificationRepository } from '../repositories/notification.repository';
import { ChoreRepository } from '../repositories/chore.repository';
import { GameRepository } from '../repositories/game.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { AssetRepository } from '../repositories/asset.repository';
import * as todoRepo from '../repositories/todo.repository';
import {
  Notification,
  CreateNotificationInput,
  NotificationPreferences,
  NotificationType,
  NotificationPriority,
} from '../types';

export interface DigestData {
  calendarEvents: Array<{
    id: string;
    summary: string;
    startDateTime: string;
    endDateTime: string;
    allDay: boolean;
    location?: string;
  }>;
  tasksDueToday: Array<{
    id: number;
    title: string;
    priority: string;
    dueTime?: string;
  }>;
  choresDueToday: Array<{
    id: number;
    name: string;
    assignedKidName?: string;
    dueTime?: string;
  }>;
  overdueGameLoans: Array<{
    id: number;
    gameName: string;
    borrowerName: string;
    loanedDate: string;
    daysOverdue: number;
  }>;
}

export class NotificationService {
  private notificationRepo: NotificationRepository;
  private choreRepo: ChoreRepository;
  private gameRepo: GameRepository;
  private calendarRepo: CalendarRepository;
  private assetRepo: AssetRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.choreRepo = new ChoreRepository();
    this.gameRepo = new GameRepository();
    this.calendarRepo = new CalendarRepository();
    this.assetRepo = new AssetRepository();
  }

  // =====================
  // CORE NOTIFICATION METHODS
  // =====================

  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.notificationRepo.create(input);
  }

  async getUnread(limit?: number): Promise<Notification[]> {
    return this.notificationRepo.getUnread(limit);
  }

  async getAll(includeRead?: boolean, limit?: number): Promise<Notification[]> {
    return this.notificationRepo.getAll(includeRead, limit);
  }

  async getUnreadCount(): Promise<number> {
    return this.notificationRepo.getUnreadCount();
  }

  async markAsRead(id: number): Promise<void> {
    return this.notificationRepo.markAsRead(id);
  }

  async markAllAsRead(): Promise<void> {
    return this.notificationRepo.markAllAsRead();
  }

  async dismiss(id: number): Promise<void> {
    return this.notificationRepo.dismiss(id);
  }

  async dismissAll(): Promise<void> {
    return this.notificationRepo.dismissAll();
  }

  // =====================
  // PREFERENCE METHODS
  // =====================

  async getPreferences(): Promise<NotificationPreferences | null> {
    return this.notificationRepo.getPreferences();
  }

  async updatePreferences(input: any): Promise<NotificationPreferences> {
    return this.notificationRepo.updatePreferences(input);
  }

  // =====================
  // NOTIFICATION GENERATORS
  // =====================

  /**
   * Create a calendar reminder notification
   */
  async createCalendarReminder(event: {
    id: string;
    summary: string;
    startDateTime: string;
    location?: string;
  }): Promise<Notification> {
    const startTime = new Date(event.startDateTime);
    const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return this.create({
      type: 'calendar_reminder',
      title: 'Upcoming Event',
      message: `${event.summary} at ${timeStr}${event.location ? ` - ${event.location}` : ''}`,
      icon: 'calendar',
      priority: 'normal',
      entityType: 'calendar_event',
      entityId: undefined, // Calendar events use string IDs
    });
  }

  /**
   * Create a task due notification
   */
  async createTaskDueNotification(task: {
    id: number;
    title: string;
    priority: string;
    dueTime?: string | null;
  }): Promise<Notification> {
    const priority = this.mapTaskPriority(task.priority);
    const timeInfo = task.dueTime ? ` (due at ${task.dueTime})` : '';

    return this.create({
      type: 'task_due',
      title: 'Task Due Today',
      message: `${task.title}${timeInfo}`,
      icon: 'check-square',
      priority,
      entityType: 'todo',
      entityId: task.id,
    });
  }

  /**
   * Create a chore due notification
   */
  async createChoreDueNotification(chore: {
    id: number;
    name: string;
    assignedKidName?: string;
    dueTime?: string | null;
  }): Promise<Notification> {
    const assignee = chore.assignedKidName ? ` (${chore.assignedKidName}'s turn)` : '';
    const timeInfo = chore.dueTime ? ` due at ${chore.dueTime}` : '';

    return this.create({
      type: 'chore_due',
      title: 'Chore Due Today',
      message: `${chore.name}${assignee}${timeInfo}`,
      icon: 'sparkles',
      priority: 'normal',
      entityType: 'chore',
      entityId: chore.id,
    });
  }

  /**
   * Create a game loan overdue notification
   */
  async createGameOverdueNotification(loan: {
    id: number;
    gameName: string;
    borrowerName: string;
    daysOverdue: number;
  }): Promise<Notification> {
    return this.create({
      type: 'game_overdue',
      title: 'Game Loan Overdue',
      message: `"${loan.gameName}" has been with ${loan.borrowerName} for ${loan.daysOverdue}+ days`,
      icon: 'gamepad-2',
      priority: 'high',
      entityType: 'game_loan',
      entityId: loan.id,
    });
  }

  /**
   * Create a warranty expiring notification
   */
  async createWarrantyExpiringNotification(asset: {
    id: number;
    name: string;
    warrantyExpirationDate: string;
    daysUntilExpiration: number;
  }): Promise<Notification> {
    const expirationDate = new Date(asset.warrantyExpirationDate);
    const dateStr = expirationDate.toLocaleDateString();

    return this.create({
      type: 'warranty_expiring',
      title: 'Warranty Expiring Soon',
      message: `"${asset.name}" warranty expires in ${asset.daysUntilExpiration} days (${dateStr})`,
      icon: 'shield-alert',
      priority: asset.daysUntilExpiration <= 7 ? 'high' : 'normal',
      entityType: 'asset',
      entityId: asset.id,
    });
  }

  // =====================
  // BATCH NOTIFICATION GENERATION
  // =====================

  /**
   * Generate notifications for all due tasks today
   * Called by the scheduler
   */
  async generateTaskDueNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !prefs.taskDueAlerts) {
      return 0;
    }

    const tasks = await todoRepo.getTodaysTodos();
    let count = 0;

    for (const task of tasks) {
      // Check if we already have a notification for this task today
      const existing = await this.notificationRepo.findByEntity('todo', task.id);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.split('T')[0] === today
      );

      if (!hasRecentNotification) {
        await this.createTaskDueNotification({
          id: task.id,
          title: task.title,
          priority: task.priority,
          dueTime: task.due_time,
        });
        count++;
      }
    }

    return count;
  }

  /**
   * Generate notifications for all due chores today
   * Called by the scheduler
   */
  async generateChoreDueNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !prefs.choreDueAlerts) {
      return 0;
    }

    const chores = await this.choreRepo.getTodaysChores();
    let count = 0;

    for (const chore of chores) {
      // Check if we already have a notification for this chore instance today
      const existing = await this.notificationRepo.findByEntity('chore', chore.id);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.split('T')[0] === today
      );

      if (!hasRecentNotification) {
        await this.createChoreDueNotification({
          id: chore.id,
          name: chore.choreDefinition?.name || 'Chore',
          assignedKidName: chore.assignedKid?.name,
          dueTime: chore.dueTime,
        });
        count++;
      }
    }

    return count;
  }

  /**
   * Generate notifications for overdue game loans
   * Called by the scheduler (less frequently, e.g., weekly)
   */
  async generateGameOverdueNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !prefs.gameOverdueAlerts) {
      return 0;
    }

    const overdueLoans = await this.gameRepo.getOverdueLoans();
    let count = 0;

    for (const loan of overdueLoans) {
      const loanDate = new Date(loan.loanedDate);
      const now = new Date();
      const daysOverdue = Math.floor(
        (now.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      await this.createGameOverdueNotification({
        id: loan.id,
        gameName: loan.gameName,
        borrowerName: loan.borrowerName,
        daysOverdue,
      });

      // Mark reminder as sent so we don't notify again
      await this.gameRepo.markReminderSent(loan.id);
      count++;
    }

    return count;
  }

  /**
   * Generate notifications for warranties expiring within 30 days
   * Called by the scheduler
   */
  async generateWarrantyExpiringNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !prefs.warrantyExpiringAlerts) {
      return 0;
    }

    // Get assets with warranties expiring in the next 30 days
    const expiringAssets = await this.assetRepo.getAssetsWithExpiringWarranties(30);
    let count = 0;

    for (const asset of expiringAssets) {
      if (!asset.warrantyExpirationDate) continue;

      // Check if we already have a notification for this asset today
      const existing = await this.notificationRepo.findByEntity('asset', asset.id);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.split('T')[0] === today && n.type === 'warranty_expiring'
      );

      if (!hasRecentNotification) {
        // Calculate days until expiration
        const expirationDate = new Date(asset.warrantyExpirationDate);
        const now = new Date();
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        await this.createWarrantyExpiringNotification({
          id: asset.id,
          name: asset.name,
          warrantyExpirationDate: asset.warrantyExpirationDate,
          daysUntilExpiration,
        });
        count++;
      }
    }

    return count;
  }

  /**
   * Generate calendar reminder notifications
   * Called by the scheduler
   */
  async generateCalendarReminders(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !prefs.calendarReminders) {
      return 0;
    }

    const reminderMinutes = prefs?.calendarReminderMinutes || 30;
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + reminderMinutes * 60 * 1000);

    // Get events in the reminder window
    const events = await this.calendarRepo.getCachedEvents(
      '*', // All calendars
      now,
      reminderWindow
    );

    let count = 0;

    for (const event of events) {
      // Skip all-day events for reminders
      if (event.allDay) continue;

      // Check if we already sent a reminder for this event
      const existing = await this.notificationRepo.findByEntity('calendar_event', 0);
      // Since calendar events use string IDs, we check by message content
      const hasReminder = existing.some((n) => n.message.includes(event.summary));

      if (!hasReminder) {
        await this.createCalendarReminder({
          id: event.id,
          summary: event.summary,
          startDateTime: event.startDateTime,
          location: event.location,
        });
        count++;
      }
    }

    return count;
  }

  // =====================
  // DIGEST DATA
  // =====================

  /**
   * Get data for the daily digest email
   */
  async getDigestData(): Promise<DigestData> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's calendar events
    const calendarEvents = await this.calendarRepo.getCachedEvents(
      '*',
      today,
      tomorrow
    );

    // Get tasks due today
    const tasks = await todoRepo.getTodaysTodos();
    const tasksDueToday = tasks
      .filter((t) => t.due_date === today.toISOString().split('T')[0])
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueTime: t.due_time || undefined,
      }));

    // Get chores due today
    const chores = await this.choreRepo.getTodaysChores();
    const choresDueToday = chores.map((c) => ({
      id: c.id,
      name: c.choreDefinition?.name || 'Chore',
      assignedKidName: c.assignedKid?.name,
      dueTime: c.dueTime || undefined,
    }));

    // Get overdue game loans
    const overdueLoans = await this.gameRepo.getOverdueLoans();
    const overdueGameLoans = overdueLoans.map((loan) => {
      const loanDate = new Date(loan.loanedDate);
      const daysOverdue = Math.floor(
        (today.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: loan.id,
        gameName: loan.gameName,
        borrowerName: loan.borrowerName,
        loanedDate: loan.loanedDate,
        daysOverdue,
      };
    });

    return {
      calendarEvents: calendarEvents.map((e) => ({
        id: e.id,
        summary: e.summary,
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        allDay: e.allDay,
        location: e.location,
      })),
      tasksDueToday,
      choresDueToday,
      overdueGameLoans,
    };
  }

  /**
   * Check if today's digest has already been sent
   */
  async hasDigestBeenSent(email: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    return this.notificationRepo.hasDigestBeenSent(today, email);
  }

  /**
   * Log that digest was sent
   */
  async logDigestSent(
    email: string,
    data: DigestData,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.notificationRepo.createDigestLog({
      digestDate: today,
      emailTo: email,
      eventsCount: data.calendarEvents.length,
      tasksCount: data.tasksDueToday.length,
      choresCount: data.choresDueToday.length,
      contentSummary: JSON.stringify({
        events: data.calendarEvents.length,
        tasks: data.tasksDueToday.length,
        chores: data.choresDueToday.length,
        overdueGames: data.overdueGameLoans.length,
      }),
      success,
      errorMessage,
    });
  }

  // =====================
  // CLEANUP
  // =====================

  /**
   * Delete expired notifications
   */
  async cleanupExpired(): Promise<number> {
    return this.notificationRepo.deleteExpired();
  }

  // =====================
  // HELPERS
  // =====================

  private mapTaskPriority(taskPriority: string): NotificationPriority {
    switch (taskPriority) {
      case 'urgent':
        return 'urgent';
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      default:
        return 'normal';
    }
  }
}
