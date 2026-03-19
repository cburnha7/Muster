import { PrismaClient } from '@prisma/client';
import { TimeSlotGeneratorService } from '../services/TimeSlotGeneratorService';
import { timeSlotConfig } from '../config/timeslots';

const prisma = new PrismaClient();

export interface CronJobMetrics {
  executionDate: Date;
  courtsProcessed: number;
  slotsGenerated: number;
  courtsWithErrors: number;
  duration: number;
  errors: Array<{
    courtId: string;
    error: string;
  }>;
}

interface FailedGeneration {
  courtId: string;
  failedAt: Date;
  error: string;
  retryCount: number;
}

// In-memory map to track failed generations
const failedGenerations = new Map<string, FailedGeneration>();

export class TimeSlotMaintenanceJob {
  private generator: TimeSlotGeneratorService;
  private logger: Console;

  constructor() {
    this.generator = new TimeSlotGeneratorService();
    this.logger = console;
  }

  /**
   * Execute daily maintenance
   */
  async execute(): Promise<CronJobMetrics> {
    const startTime = Date.now();
    const metrics: CronJobMetrics = {
      executionDate: new Date(),
      courtsProcessed: 0,
      slotsGenerated: 0,
      courtsWithErrors: 0,
      duration: 0,
      errors: [],
    };

    try {
      // Query all active courts
      const courts = await prisma.facilityCourt.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      this.logger.info(`Processing ${courts.length} courts`);

      // Loop through courts and call processCourt for each
      for (const court of courts) {
        const result = await this.processCourt(court.id);

        metrics.courtsProcessed++;
        metrics.slotsGenerated += result.slotsGenerated;

        if (result.error) {
          metrics.courtsWithErrors++;
          metrics.errors.push({
            courtId: court.id,
            error: result.error,
          });
        }
      }

      // Call retryFailedGenerations at end
      const retriedCount = await this.retryFailedGenerations();
      this.logger.info(`Retried ${retriedCount} failed generations`);

    } catch (error: any) {
      this.logger.error('Maintenance job execution failed', { error: error.message });
      throw error;
    } finally {
      // Calculate total duration
      metrics.duration = Date.now() - startTime;
      
      // Log warning if cron job exceeds maxCronDurationMs
      if (metrics.duration > timeSlotConfig.maxCronDurationMs) {
        this.logger.warn('Cron job exceeded performance threshold', {
          duration: metrics.duration,
          threshold: timeSlotConfig.maxCronDurationMs,
        });
      }
    }

    return metrics;
  }

  /**
   * Process a single court
   */
  private async processCourt(courtId: string): Promise<{
    slotsGenerated: number;
    error?: string;
  }> {
    try {
      // Call checkSlotCoverage(courtId, 365)
      const coverage = await this.generator.checkSlotCoverage(courtId, 365);

      // Return early if hasCompleteCoverage is true
      if (coverage.hasCompleteCoverage) {
        return { slotsGenerated: 0 };
      }

      // Call generateRollingWindow(courtId) if coverage incomplete
      const result = await this.generator.generateRollingWindow(courtId);

      return { slotsGenerated: result.slotsGenerated };
    } catch (error: any) {
      this.logger.error('Failed to process court', { courtId, error: error.message });
      
      // Track failure for retry
      this.trackFailedGeneration(courtId, error);
      
      return {
        slotsGenerated: 0,
        error: error.message,
      };
    }
  }

  /**
   * Track failed generation for retry
   */
  private trackFailedGeneration(courtId: string, error: Error): void {
    const existing = failedGenerations.get(courtId);
    failedGenerations.set(courtId, {
      courtId,
      failedAt: new Date(),
      error: error.message,
      retryCount: (existing?.retryCount ?? 0) + 1,
    });
  }

  /**
   * Retry previously failed generations
   */
  private async retryFailedGenerations(): Promise<number> {
    let successCount = 0;

    // Loop through failed courts
    for (const [courtId, failure] of failedGenerations.entries()) {
      try {
        // Attempt generateRollingWindow for each
        await this.generator.generateRollingWindow(courtId);
        
        // Remove from map on success
        failedGenerations.delete(courtId);
        successCount++;
        
        this.logger.info('Retry successful', { courtId });
      } catch (error: any) {
        // Increment retryCount on failure
        failure.retryCount++;
        failedGenerations.set(courtId, failure);
        
        this.logger.warn('Retry failed', { courtId, retryCount: failure.retryCount });
      }
    }

    return successCount;
  }
}
