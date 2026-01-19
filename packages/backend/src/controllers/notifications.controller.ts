import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { triggerPackageEmailSync, triggerAppointmentEmailSync } from '../schedulers/notification.scheduler';

const notificationService = new NotificationService();
const emailService = new EmailService();

// =====================
// NOTIFICATIONS
// =====================

export async function getNotifications(req: Request, res: Response) {
  try {
    const includeRead = req.query.includeRead === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const notifications = await notificationService.getAll(includeRead, limit);
    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notifications',
      message: error.message,
    });
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  try {
    const count = await notificationService.getUnreadCount();
    res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message,
    });
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(parseInt(id));
    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message,
    });
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    await notificationService.markAllAsRead();
    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message,
    });
  }
}

export async function dismissNotification(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await notificationService.dismiss(parseInt(id));
    res.json({
      success: true,
      message: 'Notification dismissed',
    });
  } catch (error: any) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss notification',
      message: error.message,
    });
  }
}

export async function dismissAllNotifications(req: Request, res: Response) {
  try {
    await notificationService.dismissAll();
    res.json({
      success: true,
      message: 'All notifications dismissed',
    });
  } catch (error: any) {
    console.error('Dismiss all notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss all notifications',
      message: error.message,
    });
  }
}

// =====================
// PREFERENCES
// =====================

export async function getPreferences(req: Request, res: Response) {
  try {
    const prefs = await notificationService.getPreferences();
    res.json({
      success: true,
      data: prefs,
    });
  } catch (error: any) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences',
      message: error.message,
    });
  }
}

export async function updatePreferences(req: Request, res: Response) {
  try {
    const prefs = await notificationService.updatePreferences(req.body);
    res.json({
      success: true,
      data: prefs,
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences',
      message: error.message,
    });
  }
}

// =====================
// EMAIL
// =====================

export async function testEmail(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
      });
    }

    if (!emailService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Email service is not configured. Check SMTP settings in .env',
      });
    }

    await emailService.sendTestEmail(email);
    res.json({
      success: true,
      message: 'Test email sent successfully',
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      message: error.message,
    });
  }
}

export async function sendDigestNow(req: Request, res: Response) {
  try {
    const prefs = await notificationService.getPreferences();

    if (!prefs?.digestEmail) {
      return res.status(400).json({
        success: false,
        error: 'No digest email configured in preferences',
      });
    }

    if (!emailService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Email service is not configured. Check SMTP settings in .env',
      });
    }

    const digestData = await notificationService.getDigestData();
    await emailService.sendDailyDigest(prefs.digestEmail, digestData);

    res.json({
      success: true,
      message: 'Digest email sent successfully',
      data: {
        sentTo: prefs.digestEmail,
        summary: {
          events: digestData.calendarEvents.length,
          tasks: digestData.tasksDueToday.length,
          chores: digestData.choresDueToday.length,
          overdueGames: digestData.overdueGameLoans.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Send digest error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send digest email',
      message: error.message,
    });
  }
}

// =====================
// MANUAL TRIGGER (for testing)
// =====================

export async function triggerNotificationCheck(req: Request, res: Response) {
  try {
    const tasksCreated = await notificationService.generateTaskDueNotifications();
    const choresCreated = await notificationService.generateChoreDueNotifications();
    const gamesCreated = await notificationService.generateGameOverdueNotifications();
    const calendarCreated = await notificationService.generateCalendarReminders();
    const warrantyCreated = await notificationService.generateWarrantyExpiringNotifications();
    const plantCreated = await notificationService.generatePlantWateringNotifications();
    const birthdayCreated = await notificationService.generateBirthdayNotifications();
    const seasonalCreated = await notificationService.generateSeasonalTaskNotifications();
    const packageCreated = await notificationService.generatePackageDeliveryNotifications();

    // Also trigger email sync for packages and appointments
    await triggerPackageEmailSync();
    await triggerAppointmentEmailSync();

    res.json({
      success: true,
      message: 'Notification check completed',
      data: {
        notificationsCreated: {
          tasks: tasksCreated,
          chores: choresCreated,
          games: gamesCreated,
          calendar: calendarCreated,
          warranties: warrantyCreated,
          plants: plantCreated,
          birthdays: birthdayCreated,
          seasonal: seasonalCreated,
          packages: packageCreated,
        },
      },
    });
  } catch (error: any) {
    console.error('Trigger notification check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run notification check',
      message: error.message,
    });
  }
}
