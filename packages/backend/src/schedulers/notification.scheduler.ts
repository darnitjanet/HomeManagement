import cron from 'node-cron';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';

// Store active cron tasks
let notificationCheckTask: cron.ScheduledTask | null = null;
let digestTask: cron.ScheduledTask | null = null;
let cleanupTask: cron.ScheduledTask | null = null;

const notificationService = new NotificationService();
const emailService = new EmailService();

/**
 * Initialize notification schedulers
 */
export function initializeNotificationScheduler() {
  console.log('🔔 Initializing notification scheduler...');

  // Check for due notifications every 15 minutes
  notificationCheckTask = cron.schedule('*/15 * * * *', async () => {
    console.log('🔔 Running notification check...');
    await runNotificationCheck();
  });

  // Send daily digest at 7:00 AM (will check user preferences for actual time)
  digestTask = cron.schedule('0 7 * * *', async () => {
    console.log('📧 Running daily digest check...');
    await sendDailyDigest();
  });

  // Clean up expired notifications daily at 3:00 AM
  cleanupTask = cron.schedule('0 3 * * *', async () => {
    console.log('🧹 Running notification cleanup...');
    await runCleanup();
  });

  console.log('✅ Notification scheduler initialized');
  console.log('   - Notification check: Every 15 minutes (*/15 * * * *)');
  console.log('   - Daily digest: 7:00 AM (0 7 * * *)');
  console.log('   - Cleanup: 3:00 AM daily (0 3 * * *)');
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopNotificationScheduler() {
  if (notificationCheckTask) {
    notificationCheckTask.stop();
  }
  if (digestTask) {
    digestTask.stop();
  }
  if (cleanupTask) {
    cleanupTask.stop();
  }
  console.log('🛑 Stopped notification scheduler');
}

/**
 * Run the notification check
 * Generates notifications for due tasks, chores, calendar events, etc.
 */
async function runNotificationCheck() {
  try {
    const taskCount = await notificationService.generateTaskDueNotifications();
    const choreCount = await notificationService.generateChoreDueNotifications();
    const calendarCount = await notificationService.generateCalendarReminders();
    const warrantyCount = await notificationService.generateWarrantyExpiringNotifications();
    // Game overdue check runs less frequently (handled separately)

    const total = taskCount + choreCount + calendarCount + warrantyCount;
    if (total > 0) {
      console.log(`✅ Created ${total} notifications (tasks: ${taskCount}, chores: ${choreCount}, calendar: ${calendarCount}, warranties: ${warrantyCount})`);
    }
  } catch (error: any) {
    console.error('❌ Notification check error:', error.message);
  }
}

/**
 * Send daily digest email
 */
async function sendDailyDigest() {
  try {
    const prefs = await notificationService.getPreferences();

    if (!prefs || !prefs.digestEnabled || !prefs.digestEmail) {
      console.log('📧 Daily digest not enabled or no email configured');
      return;
    }

    // Check if digest was already sent today
    const alreadySent = await notificationService.hasDigestBeenSent(prefs.digestEmail);
    if (alreadySent) {
      console.log('📧 Daily digest already sent today');
      return;
    }

    if (!emailService.isConfigured()) {
      console.warn('📧 Cannot send digest: Email service not configured');
      return;
    }

    // Get digest data
    const digestData = await notificationService.getDigestData();

    // Check if there's anything to send
    const hasContent =
      digestData.calendarEvents.length > 0 ||
      digestData.tasksDueToday.length > 0 ||
      digestData.choresDueToday.length > 0 ||
      digestData.overdueGameLoans.length > 0;

    if (!hasContent) {
      console.log('📧 No content for daily digest, skipping');
      // Still log that we checked
      await notificationService.logDigestSent(prefs.digestEmail, digestData, true);
      return;
    }

    // Send the digest
    try {
      await emailService.sendDailyDigest(prefs.digestEmail, digestData);
      await notificationService.logDigestSent(prefs.digestEmail, digestData, true);
      console.log(`📧 Daily digest sent to ${prefs.digestEmail}`);
    } catch (emailError: any) {
      await notificationService.logDigestSent(
        prefs.digestEmail,
        digestData,
        false,
        emailError.message
      );
      throw emailError;
    }
  } catch (error: any) {
    console.error('❌ Daily digest error:', error.message);
  }
}

/**
 * Clean up expired notifications
 */
async function runCleanup() {
  try {
    const deletedCount = await notificationService.cleanupExpired();
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired notifications`);
    }
  } catch (error: any) {
    console.error('❌ Notification cleanup error:', error.message);
  }
}

/**
 * Run game overdue notification check (called weekly)
 */
export async function runGameOverdueCheck() {
  try {
    const count = await notificationService.generateGameOverdueNotifications();
    if (count > 0) {
      console.log(`🎮 Created ${count} game overdue notifications`);
    }
  } catch (error: any) {
    console.error('❌ Game overdue check error:', error.message);
  }
}

/**
 * Manually trigger notification check (for testing)
 */
export async function triggerNotificationCheck() {
  await runNotificationCheck();
}

/**
 * Manually trigger digest (for testing)
 */
export async function triggerDailyDigest() {
  await sendDailyDigest();
}
