import cron from 'node-cron';
import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { getOAuth2Client } from '../config/google';
import { db } from '../config/database';

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

  // Sync appointment emails every hour
  cron.schedule('0 * * * *', async () => {
    console.log('📅 Running appointment email sync...');
    await runAppointmentEmailSync();
  });

  console.log('✅ Notification scheduler initialized');
  console.log('   - Notification check: Every 15 minutes (*/15 * * * *)');
  console.log('   - Daily digest: 7:00 AM (0 7 * * *)');
  console.log('   - Cleanup: 3:00 AM daily (0 3 * * *)');
  console.log('   - Appointment email sync: Every hour (0 * * * *)');
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
/**
 * Check if vacation mode is currently active
 */
async function isVacationModeActive(): Promise<boolean> {
  try {
    const prefs = await notificationService.getPreferences();
    if (!prefs || !prefs.vacationMode) {
      return false;
    }

    // If vacation mode is on, check date range if specified
    const today = new Date().toISOString().split('T')[0];
    const startDate = prefs.vacationStartDate;
    const endDate = prefs.vacationEndDate;

    // If no dates specified, vacation mode is always active when enabled
    if (!startDate && !endDate) {
      return true;
    }

    // Check if today is within the vacation period
    if (startDate && today < startDate) {
      return false; // Vacation hasn't started yet
    }
    if (endDate && today > endDate) {
      // Vacation has ended, auto-disable vacation mode
      await notificationService.updatePreferences({
        vacationMode: false,
        vacationStartDate: null,
        vacationEndDate: null,
      });
      console.log('🏖️ Vacation mode auto-disabled (end date passed)');
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function runNotificationCheck() {
  try {
    // Check if vacation mode is active
    if (await isVacationModeActive()) {
      console.log('🏖️ Vacation mode active - skipping notification check');
      return;
    }

    // Tasks are managed in their own UI, no notifications needed
    const choreCount = await notificationService.generateChoreDueNotifications();
    const calendarCount = await notificationService.generateCalendarReminders();
    const warrantyCount = await notificationService.generateWarrantyExpiringNotifications();
    const plantCount = await notificationService.generatePlantWateringNotifications();
    const birthdayCount = await notificationService.generateBirthdayNotifications();
    // Game overdue check runs less frequently (handled separately)

    const total = choreCount + calendarCount + warrantyCount + plantCount + birthdayCount;
    if (total > 0) {
      console.log(`✅ Created ${total} notifications (chores: ${choreCount}, calendar: ${calendarCount}, warranties: ${warrantyCount}, plants: ${plantCount}, birthdays: ${birthdayCount})`);
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
    // Check if vacation mode is active
    if (await isVacationModeActive()) {
      console.log('🏖️ Vacation mode active - skipping daily digest');
      return;
    }

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

    // Check if there's anything to send (tasks excluded - managed in their own UI)
    const hasContent =
      digestData.calendarEvents.length > 0 ||
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

/**
 * Helper to get active user session with Google tokens
 * Reads from the sessions.db file used by express-session
 */
async function getActiveUserSession(): Promise<any> {
  try {
    const path = require('path');
    const knex = require('knex');

    // Connect to the sessions database
    const sessionsDb = knex({
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, '../../database/sessions.db'),
      },
      useNullAsDefault: true,
    });

    try {
      const session = await sessionsDb('sessions')
        .where('expired', '>', Date.now())
        .orderBy('expired', 'desc')
        .first();

      if (!session) {
        await sessionsDb.destroy();
        return null;
      }

      // The session data is stored in the 'sess' column as JSON string
      const sessionData = typeof session.sess === 'string'
        ? JSON.parse(session.sess)
        : session.sess;

      await sessionsDb.destroy();

      if (!sessionData.googleTokens) {
        return null;
      }

      return {
        id: session.sid,
        googleTokens: sessionData.googleTokens,
      };
    } catch (err) {
      await sessionsDb.destroy();
      throw err;
    }
  } catch (error: any) {
    console.error('Error getting active session:', error.message);
    return null;
  }
}

/**
 * Run appointment email sync - fetch appointment emails and create notifications
 */
async function runAppointmentEmailSync() {
  try {
    // Get the active session with OAuth tokens
    const session = await getActiveUserSession();

    if (!session || !session.googleTokens) {
      // Silent skip - no session
      return;
    }

    // Set up OAuth client with stored tokens
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(session.googleTokens);

    // Fetch appointment emails from the last 14 days
    const daysBack = 14;
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - daysBack);

    const gmailService = new GoogleGmailService(oauth2Client);
    const emails = await gmailService.getAppointmentEmails(afterDate);
    const parsed = parseMultipleAppointmentEmails(emails);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    let created = 0;

    for (const appt of parsed) {
      // Only create notifications for appointments within next 2 days
      if (!appt.date || (appt.date !== today && appt.date !== tomorrowStr && appt.date !== dayAfterStr)) {
        continue;
      }

      try {
        const message = appt.description || appt.appointmentType || 'Appointment reminder';

        // Check if we already created a notification for this appointment today
        // Match on type, message content, and created today
        const existing = await db('notifications')
          .where('type', 'appointment_reminder')
          .where('message', message)
          .where('created_at', '>=', today)
          .first();

        if (existing) {
          continue;
        }

        const isToday = appt.date === today;
        const isTomorrow = appt.date === tomorrowStr;
        const timeStr = appt.time ? ` at ${formatTime(appt.time)}` : '';
        let title: string;
        if (isToday) {
          title = `Appointment Today${timeStr}`;
        } else if (isTomorrow) {
          title = `Appointment Tomorrow${timeStr}`;
        } else {
          title = `Appointment in 2 days${timeStr}`;
        }

        const notificationRepo = new NotificationRepository();
        await notificationRepo.create({
          type: 'appointment_reminder',
          title,
          message,
          priority: isToday ? 'high' : 'normal',
          entityType: 'appointment_email',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });

        created++;
      } catch (err: any) {
        console.error('Error creating appointment notification:', err.message);
      }
    }

    if (created > 0) {
      console.log(`📅 Appointment email sync: created ${created} notifications`);
    }
  } catch (error: any) {
    console.error('❌ Appointment email sync error:', error.message);
  }
}

/**
 * Format time for display (24h to 12h)
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Manually trigger appointment email sync (for testing)
 */
export async function triggerAppointmentEmailSync() {
  await runAppointmentEmailSync();
}
