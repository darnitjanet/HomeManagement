import cron from 'node-cron';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { getOAuth2Client } from '../config/google';
import { db } from '../config/database';

// Store active cron tasks
let googleSyncTask: cron.ScheduledTask | null = null;
let externalSyncTask: cron.ScheduledTask | null = null;

/**
 * Initialize all sync schedulers
 */
export function initializeSyncSchedulers() {
  console.log('📅 Initializing calendar sync schedulers...');

  // Google Calendar sync - every hour
  googleSyncTask = cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running scheduled Google calendar sync...');
    await runGoogleCalendarSync();
  });

  // External calendar sync - every 30 minutes
  externalSyncTask = cron.schedule('*/30 * * * *', async () => {
    console.log('🔄 Running scheduled external calendar sync...');
    await runExternalCalendarSync();
  });

  console.log('✅ Sync schedulers initialized');
  console.log('   - Google calendars: Every hour (0 * * * *)');
  console.log('   - External calendars: Every 30 minutes (*/30 * * * *)');
}

/**
 * Stop all schedulers (for graceful shutdown)
 */
export function stopSyncSchedulers() {
  if (googleSyncTask) {
    googleSyncTask.stop();
    console.log('🛑 Stopped Google calendar sync scheduler');
  }

  if (externalSyncTask) {
    externalSyncTask.stop();
    console.log('🛑 Stopped external calendar sync scheduler');
  }
}

/**
 * Run Google calendar sync for all users
 * For now, assumes single-user Raspberry Pi setup
 */
async function runGoogleCalendarSync() {
  try {
    // Get the active session with OAuth tokens
    const session = await getActiveUserSession();

    if (!session || !session.googleTokens) {
      console.log('⏭️  No active user session, skipping Google sync');
      return;
    }

    // Set up OAuth client with stored tokens
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(session.googleTokens);

    const syncService = new CalendarSyncService(oauth2Client);
    const results = await syncService.syncAllGoogleCalendars();

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalAdded = results.reduce((sum, r) => sum + r.eventsAdded, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.eventsUpdated, 0);

    console.log(
      `✅ Google sync complete: ${successful}/${results.length} calendars synced (+${totalAdded} ~${totalUpdated})`
    );

    if (failed > 0) {
      console.warn(`⚠️  ${failed} calendar(s) failed to sync`);
    }
  } catch (error: any) {
    console.error('❌ Google calendar sync error:', error.message);
  }
}

/**
 * Run external calendar sync
 */
async function runExternalCalendarSync() {
  try {
    const syncService = new CalendarSyncService();
    const results = await syncService.syncAllExternalCalendars();

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalAdded = results.reduce((sum, r) => sum + r.eventsAdded, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.eventsUpdated, 0);

    console.log(
      `✅ External sync complete: ${successful}/${results.length} calendars synced (+${totalAdded} ~${totalUpdated})`
    );

    if (failed > 0) {
      console.warn(`⚠️  ${failed} external calendar(s) failed to sync`);
    }
  } catch (error: any) {
    console.error('❌ External calendar sync error:', error.message);
  }
}

/**
 * Helper to get active user session
 * For single-user Raspberry Pi setup
 */
async function getActiveUserSession(): Promise<any> {
  try {
    const session = await db('user_sessions')
      .where('expires_at', '>', Date.now())
      .orderBy('expires_at', 'desc')
      .first();

    if (!session) return null;

    const sessionData = JSON.parse(session.session_data);

    return {
      id: session.id,
      googleTokens: sessionData.googleTokens,
    };
  } catch (error: any) {
    console.error('Error getting active session:', error.message);
    return null;
  }
}

/**
 * Manually trigger sync for all Google calendars
 */
export async function triggerGoogleSync(): Promise<void> {
  await runGoogleCalendarSync();
}

/**
 * Manually trigger sync for all external calendars
 */
export async function triggerExternalSync(): Promise<void> {
  await runExternalCalendarSync();
}
