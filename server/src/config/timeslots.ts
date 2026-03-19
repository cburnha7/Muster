/**
 * Time Slot Configuration
 * 
 * Centralized configuration for the auto-generate time slots feature.
 */

export const timeSlotConfig = {
  // Rolling window duration in days
  rollingWindowDays: 365,

  // Default operating hours (when not specified)
  defaultStartTime: '06:00',
  defaultEndTime: '22:00',

  // Slot duration in minutes
  slotDurationMinutes: 60,

  // Batch insert size
  batchSize: 1000,

  // Cron schedule (daily at midnight UTC)
  cronSchedule: '0 0 * * *',

  // Retry configuration
  maxRetries: 3,
  retryDelayMs: 1000,

  // Performance thresholds
  maxGenerationTimeMs: 5000, // 5 seconds
  maxCronDurationMs: 120000, // 2 minutes

  // Alert thresholds
  alertIfNoSlotsAfterHours: 24,
  alertIfSuccessRateBelow: 0.95,
};
