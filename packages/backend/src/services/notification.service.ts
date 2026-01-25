import { NotificationRepository } from '../repositories/notification.repository';
import { ChoreRepository } from '../repositories/chore.repository';
import { GameRepository } from '../repositories/game.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { AssetRepository } from '../repositories/asset.repository';
import * as plantRepo from '../repositories/plant.repository';
import * as todoRepo from '../repositories/todo.repository';
import * as packageRepo from '../repositories/package.repository';
import { ContactRepository } from '../repositories/contact.repository';
import { seasonalTaskRepository } from '../repositories/seasonal-task.repository';
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
  private contactRepo: ContactRepository;

  constructor() {
    this.notificationRepo = new NotificationRepository();
    this.choreRepo = new ChoreRepository();
    this.gameRepo = new GameRepository();
    this.calendarRepo = new CalendarRepository();
    this.assetRepo = new AssetRepository();
    this.contactRepo = new ContactRepository();
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

  /**
   * Create a plant watering notification
   */
  async createPlantWateringNotification(plant: {
    id: number;
    name: string;
    location: string | null;
    daysOverdue: number;
  }): Promise<Notification> {
    const locationStr = plant.location ? ` in ${plant.location}` : '';
    const urgency = plant.daysOverdue > 0 ? 'overdue' : 'due today';
    const message = plant.daysOverdue > 0
      ? `"${plant.name}"${locationStr} is ${plant.daysOverdue} day${plant.daysOverdue > 1 ? 's' : ''} overdue for watering!`
      : `"${plant.name}"${locationStr} needs watering today`;

    return this.create({
      type: 'plant_watering',
      title: plant.daysOverdue > 0 ? 'Plant Needs Water!' : 'Water Your Plant',
      message,
      icon: 'droplets',
      priority: plant.daysOverdue > 2 ? 'high' : 'normal',
      entityType: 'plant',
      entityId: plant.id,
    });
  }

  /**
   * Create a package delivery notification
   */
  async createPackageDeliveryNotification(pkg: {
    id: number;
    name: string;
    vendor: string | null;
    expectedDelivery: string | null;
    isToday: boolean;
    isOverdue: boolean;
  }): Promise<Notification> {
    const vendorStr = pkg.vendor ? ` from ${pkg.vendor}` : '';
    let message: string;
    let title: string;
    let priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal';

    if (pkg.isOverdue) {
      title = 'Package May Be Delayed';
      const dateStr = pkg.expectedDelivery
        ? new Date(pkg.expectedDelivery).toLocaleDateString()
        : '';
      message = `"${pkg.name}"${vendorStr} was expected ${dateStr} but hasn't arrived`;
      priority = 'high';
    } else if (pkg.isToday) {
      title = 'Package Arriving Today!';
      message = `"${pkg.name}"${vendorStr} is expected to arrive today`;
      priority = 'high';
    } else {
      title = 'Package Arriving Soon';
      const dateStr = pkg.expectedDelivery
        ? new Date(pkg.expectedDelivery).toLocaleDateString()
        : 'soon';
      message = `"${pkg.name}"${vendorStr} is expected ${dateStr}`;
    }

    return this.create({
      type: 'package_delivery',
      title,
      message,
      icon: 'package',
      priority,
      entityType: 'package',
      entityId: pkg.id,
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
      // Skip subtasks - only notify for parent tasks
      if (task.parent_id) {
        continue;
      }

      // Check if we already have a notification for this task today
      const existing = await this.notificationRepo.findByEntity('todo', task.id);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.substring(0, 10) === today
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
        (n) => n.createdAt.substring(0, 10) === today
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
        (n) => n.createdAt.substring(0, 10) === today && n.type === 'warranty_expiring'
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
   * Generate notifications for plants needing water
   * Called by the scheduler
   */
  async generatePlantWateringNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !(prefs as any).plantWateringAlerts) {
      return 0;
    }

    // Get plants that need water (due today or overdue)
    const plantsNeedingWater = await plantRepo.getPlantsNeedingWater();
    let count = 0;

    for (const plant of plantsNeedingWater) {
      // Check if we already have an active (undismissed) notification for this plant
      const existing = await this.notificationRepo.findByEntity('plant', plant.id);
      const hasActiveNotification = existing.some(
        (n) => n.type === 'plant_watering' && !n.isDismissed
      );

      if (!hasActiveNotification) {
        // Calculate days overdue
        const nextWaterDate = plant.next_water_date ? new Date(plant.next_water_date) : new Date();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        nextWaterDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((now.getTime() - nextWaterDate.getTime()) / (1000 * 60 * 60 * 24));

        await this.createPlantWateringNotification({
          id: plant.id,
          name: plant.name,
          location: plant.location,
          daysOverdue: Math.max(0, daysOverdue),
        });
        count++;
      }
    }

    return count;
  }

  /**
   * Generate notifications for packages arriving soon
   * Called by the scheduler
   */
  async generatePackageDeliveryNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    // Only skip if explicitly set to false
    if (prefs && prefs.packageDeliveryAlerts === false) {
      return 0;
    }

    // Get packages arriving today or tomorrow
    const packagesForNotification = await packageRepo.getPackagesForNotification();
    let count = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const pkg of packagesForNotification) {
      // Check if we already have a notification for this package today
      const existing = await this.notificationRepo.findByEntity('package', pkg.id);
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.substring(0, 10) === today && n.type === 'package_delivery'
      );

      if (!hasRecentNotification) {
        const isToday = pkg.expected_delivery === today;
        const isOverdue = pkg.expected_delivery ? pkg.expected_delivery < today : false;

        await this.createPackageDeliveryNotification({
          id: pkg.id,
          name: pkg.name,
          vendor: pkg.vendor,
          expectedDelivery: pkg.expected_delivery,
          isToday,
          isOverdue,
        });

        // Mark as notified
        await packageRepo.markNotified(pkg.id);
        count++;
      }
    }

    return count;
  }

  /**
   * Generate notifications for upcoming birthdays
   * Called by the scheduler
   */
  async generateBirthdayNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !(prefs as any).birthdayReminders) {
      return 0;
    }

    // Get contacts with birthdays in the next 7 days
    const upcomingBirthdays = await this.contactRepo.getContactsWithUpcomingBirthdays(7);
    let count = 0;

    for (const contact of upcomingBirthdays) {
      // Check if we already have a notification for this contact today
      const existing = await this.notificationRepo.findByEntity('contact', contact.id);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.substring(0, 10) === today && n.type === 'birthday_reminder'
      );

      if (!hasRecentNotification) {
        await this.createBirthdayNotification({
          id: contact.id,
          name: contact.displayName,
          birthday: contact.birthday || '',
          daysUntil: contact.daysUntil,
        });
        count++;
      }
    }

    return count;
  }

  private async createBirthdayNotification(contact: {
    id: number;
    name: string;
    birthday: string;
    daysUntil: number;
  }): Promise<void> {
    let message: string;
    if (contact.daysUntil === 0) {
      message = `Today is ${contact.name}'s birthday!`;
    } else if (contact.daysUntil === 1) {
      message = `Tomorrow is ${contact.name}'s birthday!`;
    } else {
      message = `${contact.name}'s birthday is in ${contact.daysUntil} days (${contact.birthday})`;
    }

    await this.create({
      type: 'birthday_reminder',
      title: contact.daysUntil === 0 ? 'Birthday Today!' : 'Upcoming Birthday',
      message,
      icon: 'Cake',
      priority: contact.daysUntil <= 1 ? 'high' : 'normal',
      entityType: 'contact',
      entityId: contact.id,
    });
  }

  /**
   * Generate notifications for seasonal tasks due
   * Called by the scheduler
   */
  async generateSeasonalTaskNotifications(): Promise<number> {
    const prefs = await this.notificationRepo.getPreferences();
    if (prefs && !(prefs as any).seasonalTaskAlerts === false) {
      // Default to enabled if not set
    }

    const upcomingTasks = await seasonalTaskRepository.getTasksNeedingReminders();
    let count = 0;

    for (const task of upcomingTasks) {
      // Check if we already have a notification for this task today
      const existing = await this.notificationRepo.findByEntity('seasonal_task', task.id);
      const today = new Date().toISOString().split('T')[0];
      const hasRecentNotification = existing.some(
        (n) => n.createdAt.substring(0, 10) === today && n.type === 'seasonal_task'
      );

      if (!hasRecentNotification) {
        await this.createSeasonalTaskNotification({
          id: task.id,
          title: task.title,
          category: task.category,
          dueIn: task.dueIn,
          estimatedMinutes: task.estimated_minutes,
        });
        count++;
      }
    }

    return count;
  }

  private async createSeasonalTaskNotification(task: {
    id: number;
    title: string;
    category: string;
    dueIn: number;
    estimatedMinutes: number | null;
  }): Promise<void> {
    let message: string;
    const timeEstimate = task.estimatedMinutes ? ` (~${task.estimatedMinutes} min)` : '';

    if (task.dueIn === 0) {
      message = `${task.title} is due today!${timeEstimate}`;
    } else if (task.dueIn === 1) {
      message = `${task.title} is due tomorrow${timeEstimate}`;
    } else {
      message = `${task.title} is due in ${task.dueIn} days${timeEstimate}`;
    }

    await this.create({
      type: 'seasonal_task',
      title: `Seasonal Task: ${task.category}`,
      message,
      icon: 'Leaf',
      priority: task.dueIn <= 1 ? 'high' : 'normal',
      entityType: 'seasonal_task',
      entityId: task.id,
    });
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

    // Get tasks due today (excluding subtasks)
    const tasks = await todoRepo.getTodaysTodos();
    const tasksDueToday = tasks
      .filter((t) => !t.parent_id && t.due_date === today.toISOString().split('T')[0])
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
