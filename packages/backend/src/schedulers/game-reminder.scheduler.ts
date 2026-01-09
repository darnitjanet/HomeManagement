import cron from 'node-cron';
import { GameRepository } from '../repositories/game.repository';

// Store active cron task
let reminderTask: cron.ScheduledTask | null = null;

/**
 * Initialize the game reminder scheduler
 * Runs daily at 9 AM to check for overdue loans
 */
export function initializeGameReminderScheduler() {
  console.log('🎮 Initializing game reminder scheduler...');

  // Run daily at 9 AM
  reminderTask = cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running game loan reminder check...');
    await checkOverdueLoans();
  });

  console.log('✅ Game reminder scheduler initialized');
  console.log('   - Overdue loan check: Daily at 9:00 AM (0 9 * * *)');
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopGameReminderScheduler() {
  if (reminderTask) {
    reminderTask.stop();
    console.log('🛑 Stopped game reminder scheduler');
  }
}

/**
 * Check for overdue loans (30+ days) and log reminders
 * This creates an in-app reminder by marking the loan as needing attention
 */
async function checkOverdueLoans() {
  try {
    const gameRepo = new GameRepository();
    const overdueLoans = await gameRepo.getOverdueLoans();

    if (overdueLoans.length === 0) {
      console.log('✅ No overdue game loans found');
      return;
    }

    console.log(`⚠️  Found ${overdueLoans.length} overdue game loan(s):`);

    for (const loan of overdueLoans) {
      const daysSinceLoaned = Math.floor(
        (Date.now() - new Date(loan.loanedDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(`   - "${loan.gameName}" borrowed by ${loan.borrowerName} (${daysSinceLoaned} days ago)`);

      // Mark reminder as sent so we don't keep reminding
      await gameRepo.markReminderSent(loan.id);
    }

    console.log(`📧 Marked ${overdueLoans.length} loan(s) as reminder sent`);

    // Note: Calendar event creation could be added here using the existing
    // Google Calendar service if calendar integration is enabled

  } catch (error: any) {
    console.error('❌ Game reminder check error:', error.message);
  }
}

/**
 * Manually trigger the overdue loan check
 */
export async function triggerReminderCheck(): Promise<void> {
  await checkOverdueLoans();
}

/**
 * Get current overdue loan count (for in-app notifications)
 */
export async function getOverdueLoanCount(): Promise<number> {
  try {
    const gameRepo = new GameRepository();
    const overdueLoans = await gameRepo.getOverdueLoans();
    return overdueLoans.length;
  } catch (error) {
    console.error('Error getting overdue loan count:', error);
    return 0;
  }
}
