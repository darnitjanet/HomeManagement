// Load environment variables BEFORE any other imports
// This ensures all modules have access to env vars when they're loaded
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

console.log('📁 Loading .env from:', envPath);
console.log('🔑 OAuth configured:', !!process.env.GOOGLE_CLIENT_ID);
console.log('🎬 TMDB API key configured:', !!process.env.TMDB_API_KEY);

// Now import the rest of the application
import { createApp } from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeSyncSchedulers, stopSyncSchedulers } from './schedulers/calendar-sync.scheduler';
import { initializeGameReminderScheduler, stopGameReminderScheduler } from './schedulers/game-reminder.scheduler';
import { initializeNotificationScheduler, stopNotificationScheduler } from './schedulers/notification.scheduler';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database
    console.log('🔄 Initializing database...');
    await initializeDatabase();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📅 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
    });

    // Initialize sync schedulers
    initializeSyncSchedulers();
    initializeGameReminderScheduler();
    initializeNotificationScheduler();

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🔄 Shutting down gracefully...');
      stopSyncSchedulers();
      stopGameReminderScheduler();
      stopNotificationScheduler();
      server.close(async () => {
        await closeDatabase();
        console.log('👋 Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
