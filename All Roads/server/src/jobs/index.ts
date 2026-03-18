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
import { InviteOnlyEventAutoOpenJob } from './InviteOnlyEventAutoOpenJob';
import { processExpiredConfirmations } from './away-confirmation';
import { processEventCutoffs } from './event-cutoff';
import { processCaptureWindowRenewals } from './capture-window';
import { processNightlyRatings } from './nightly-ratings';
import { processTrialExpiry } from './trial-expiry';
import { processLeagueReadyChecks } from './league-ready-check';

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

  // Invite-Only Event Auto-Open Job - Every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Starting invite-only event auto-open job');

    try {
      const job = new InviteOnlyEventAutoOpenJob();
      const metrics = await job.execute();

      console.log('✅ Invite-only auto-open completed', {
        eventsChecked: metrics.eventsChecked,
        eventsAutoOpened: metrics.eventsAutoOpened,
        notificationsSent: metrics.notificationsSent,
        duration: `${metrics.duration}ms`,
      });

      // Send alert if there were errors
      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some events had errors during auto-open', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
        // TODO: Send alert to monitoring system
      }
    } catch (error: any) {
      console.error('❌ Invite-only auto-open job failed', { error: error.message });
      // TODO: Send alert to on-call engineer
    }
  }, {
    timezone: 'UTC',
  });

  // Away Confirmation Expiry Job - Every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🔄 Starting away confirmation expiry job');

    try {
      const metrics = await processExpiredConfirmations();

      console.log('✅ Away confirmation expiry completed', {
        matchesChecked: metrics.matchesChecked,
        matchesLapsed: metrics.matchesLapsed,
        strikesRecorded: metrics.strikesRecorded,
        notificationsSent: metrics.notificationsSent,
        duration: `${metrics.duration}ms`,
      });

      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some matches had errors during away confirmation processing', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
      }
    } catch (error: any) {
      console.error('❌ Away confirmation expiry job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC',
  });

  // Public Event Cutoff Job - Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔄 Starting public event cutoff job');

    try {
      const metrics = await processEventCutoffs();

      console.log('✅ Public event cutoff completed', {
        bookingsChecked: metrics.bookingsChecked,
        bookingsCancelled: metrics.bookingsCancelled,
        refundsIssued: metrics.refundsIssued,
        intentsCancelled: metrics.intentsCancelled,
        notificationsSent: metrics.notificationsSent,
        duration: `${metrics.duration}ms`,
      });

      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some bookings had errors during event cutoff processing', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
      }
    } catch (error: any) {
      console.error('❌ Public event cutoff job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC',
  });

  // Capture Window Renewal Job - Daily at 02:00 UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Starting capture window renewal job');

    try {
      const metrics = await processCaptureWindowRenewals();

      console.log('✅ Capture window renewal completed', {
        bookingsChecked: metrics.bookingsChecked,
        intentsRenewed: metrics.intentsRenewed,
        renewalsFailed: metrics.renewalsFailed,
        duration: `${metrics.duration}ms`,
      });

      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some bookings had errors during capture window renewal', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
      }
    } catch (error: any) {
      console.error('❌ Capture window renewal job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC',
  });

  // Nightly Ratings Recalculation Job - Daily at 03:00 UTC (after debrief windows close)
  cron.schedule('0 3 * * *', async () => {
    console.log('🔄 Starting nightly ratings recalculation job');

    try {
      const metrics = await processNightlyRatings();

      console.log('✅ Nightly ratings recalculation completed', {
        usersProcessed: metrics.usersProcessed,
        ratingsUpdated: metrics.ratingsUpdated,
        percentilesUpdated: metrics.percentilesUpdated,
        duration: `${metrics.duration}ms`,
      });

      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some users had errors during rating recalculation', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
      }
    } catch (error: any) {
      console.error('❌ Nightly ratings recalculation job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC',
  });

  // Trial Expiry Job - Daily at 04:00 UTC
  cron.schedule('0 4 * * *', async () => {
    console.log('🔄 Starting trial expiry job');

    try {
      const metrics = await processTrialExpiry();

      console.log('✅ Trial expiry completed', {
        usersChecked: metrics.usersChecked,
        trialsExpired: metrics.trialsExpired,
        notificationsSent7d: metrics.notificationsSent7d,
        notificationsSent1d: metrics.notificationsSent1d,
        duration: `${metrics.duration}ms`,
      });

      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some users had errors during trial expiry processing', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
      }
    } catch (error: any) {
      console.error('❌ Trial expiry job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC',
  });

  // League Ready Check Job - Every hour
  // Checks if leagues are ready to schedule (registration closed or all rosters confirmed)
  // and sends a notification to the Commissioner (Requirements: 2.1, 2.2, 2.3, 2.7)
  cron.schedule('30 * * * *', async () => {
    console.log('🔄 Starting league ready check job');

    try {
      const metrics = await processLeagueReadyChecks();

      console.log('✅ League ready check completed', {
        leaguesChecked: metrics.leaguesChecked,
        notificationsSent: metrics.notificationsSent,
        duration: `${metrics.duration}ms`,
      });

      if (metrics.errors.length > 0) {
        console.warn('⚠️  Some leagues had errors during ready check', {
          errorCount: metrics.errors.length,
          errors: metrics.errors,
        });
      }
    } catch (error: any) {
      console.error('❌ League ready check job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Cron jobs initialized');
}
