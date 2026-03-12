/**
 * Cron Job Scheduler
 * 
 * This file sets up scheduled background jobs for the application.
 * 
 * IMPORTANT: Before running, install node-cron:
 *   npm install node-cron @types/node-cron
 */

import cron from 'node-cron';
import { TimeSlotMaintenanceJob } from './TimeSlotMaintenanceJob';

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs...');

  // Time Slot Maintenance Job - Daily at 00:00 UTC
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Starting time slot maintenance job');

    try {
      const job = new TimeSlotMaintenanceJob();
      const metrics = await job.execute();

      console.log('✅ Time slot maintenance completed', {
        courtsProcessed: metrics.courtsProcessed,
        slotsGenerated: metrics.slotsGenerated,
        courtsWithErrors: metrics.courtsWithErrors,
        duration: `${metrics.duration}ms`,
      });

      // Send alert if there were errors
      if (metrics.courtsWithErrors > 0) {
        console.warn('⚠️  Some courts had errors during maintenance', {
          errorCount: metrics.courtsWithErrors,
          errors: metrics.errors,
        });
        // TODO: Send alert to monitoring system
      }
    } catch (error: any) {
      console.error('❌ Time slot maintenance failed', { error: error.message });
      // TODO: Send alert to on-call engineer
    }
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Cron jobs initialized');
}
