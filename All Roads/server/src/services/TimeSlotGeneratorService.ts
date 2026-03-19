import { PrismaClient } from '@prisma/client';
import { OperatingHoursService, DailyOperatingHours } from './OperatingHoursService';
import { timeSlotConfig } from '../config/timeslots';

const prisma = new PrismaClient();

export interface TimeSlotGenerationOptions {
  courtId: string;
  startDate: Date;
  endDate: Date;
  skipExisting?: boolean; // Default: true
}

export interface TimeSlotGenerationResult {
  courtId: string;
  slotsGenerated: number;
  slotsSkipped: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  duration: number; // milliseconds
  errors: string[];
}

interface OperatingHours {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isBlocked: boolean;
}

interface TimeSlotData {
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
  price: number;
  status: string;
}

export class TimeSlotGeneratorService {
  private operatingHoursService: OperatingHoursService;
  private logger: Console;

  constructor() {
    this.operatingHoursService = new OperatingHoursService();
    this.logger = console;
  }

  /**
   * Generate time slots for a court within a date range
   */
  async generateSlotsForCourt(
    options: TimeSlotGenerationOptions
  ): Promise<TimeSlotGenerationResult> {
    const startTime = Date.now();
    const { courtId, startDate, endDate, skipExisting = true } = options;
    const errors: string[] = [];

    try {
      // Query court data including facility reference
      const court = await prisma.facilityCourt.findUnique({
        where: { id: courtId },
        include: { facility: true },
      });

      // Return early with warning if court not found
      if (!court) {
        this.logger.warn('Court not found, skipping slot generation', { courtId });
        return {
          courtId,
          slotsGenerated: 0,
          slotsSkipped: 0,
          dateRange: { start: startDate, end: endDate },
          duration: Date.now() - startTime,
          errors: ['Court not found'],
        };
      }

      // Get operating hours via OperatingHoursService
      const dailyHours = await this.operatingHoursService.getOperatingHours(court.facilityId);
      
      // Convert to OperatingHours format
      const operatingHours: OperatingHours[] = dailyHours.map(h => ({
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
        isBlocked: !h.isOpen,
      }));

      // Use facility default price if court pricePerHour is null
      const price = court.pricePerHour ?? court.facility.pricePerHour ?? 50;
      
      // Get slot increment from facility (default to 60 minutes if not set)
      const slotIncrementMinutes = court.facility.slotIncrementMinutes ?? 60;

      // Loop through each date in range, generate slots for each date
      const allSlots: TimeSlotData[] = [];
      const currentDate = this.normalizeToUTCMidnight(new Date(startDate));
      const normalizedEndDate = this.normalizeToUTCMidnight(new Date(endDate));

      while (currentDate < normalizedEndDate) {
        const slotsForDate = this.generateSlotsForDate(
          courtId,
          currentDate,
          operatingHours,
          price,
          slotIncrementMinutes
        );
        allSlots.push(...slotsForDate);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      // Call batchInsertSlots to insert with duplicate handling
      const { inserted, skipped } = await this.batchInsertSlots(allSlots);

      const duration = Date.now() - startTime;

      // Log warning if generation exceeds maxGenerationTimeMs
      if (duration > timeSlotConfig.maxGenerationTimeMs) {
        this.logger.warn('Slot generation exceeded performance threshold', {
          courtId,
          duration,
          threshold: timeSlotConfig.maxGenerationTimeMs,
        });
      }

      this.logger.info('Slot generation completed', {
        courtId,
        slotsGenerated: inserted,
        slotsSkipped: skipped,
        duration,
        dateRange: { start: startDate, end: endDate },
      });

      return {
        courtId,
        slotsGenerated: inserted,
        slotsSkipped: skipped,
        dateRange: { start: startDate, end: endDate },
        duration,
        errors,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Slot generation failed', {
        courtId,
        error: error.message,
        duration,
      });

      return {
        courtId,
        slotsGenerated: 0,
        slotsSkipped: 0,
        dateRange: { start: startDate, end: endDate },
        duration,
        errors: [error.message],
      };
    }
  }

  /**
   * Generate slots for a court with 365-day rolling window
   */
  async generateRollingWindow(courtId: string): Promise<TimeSlotGenerationResult> {
    // Calculate 365-day range from current date
    const { start, end } = this.calculate365DayRange(new Date());

    // Call generateSlotsForCourt with calculated range
    return await this.generateSlotsForCourt({
      courtId,
      startDate: start,
      endDate: end,
      skipExisting: true,
    });
  }

  /**
   * Regenerate future unbooked slots for a facility when slot increment changes
   * This preserves already booked/rented slots and only regenerates available slots
   */
  async regenerateSlotsAfterIncrementChange(
    facilityId: string,
    newIncrementMinutes: number
  ): Promise<{
    courtsProcessed: number;
    slotsDeleted: number;
    slotsGenerated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let courtsProcessed = 0;
    let totalDeleted = 0;
    let totalGenerated = 0;

    try {
      // Get all courts for this facility
      const courts = await prisma.facilityCourt.findMany({
        where: { facilityId, isActive: true },
      });

      const today = this.normalizeToUTCMidnight(new Date());

      for (const court of courts) {
        try {
          // Delete only future available slots (not booked or rented)
          const deleteResult = await prisma.facilityTimeSlot.deleteMany({
            where: {
              courtId: court.id,
              date: { gte: today },
              status: 'available',
            },
          });

          totalDeleted += deleteResult.count;

          // Regenerate slots with new increment
          const { start, end } = this.calculate365DayRange(today);
          const result = await this.generateSlotsForCourt({
            courtId: court.id,
            startDate: start,
            endDate: end,
            skipExisting: true, // Skip any remaining booked/rented slots
          });

          totalGenerated += result.slotsGenerated;
          courtsProcessed++;

          this.logger.info('Regenerated slots for court after increment change', {
            courtId: court.id,
            deleted: deleteResult.count,
            generated: result.slotsGenerated,
          });
        } catch (error: any) {
          errors.push(`Court ${court.id}: ${error.message}`);
          this.logger.error('Failed to regenerate slots for court', {
            courtId: court.id,
            error: error.message,
          });
        }
      }

      return {
        courtsProcessed,
        slotsDeleted: totalDeleted,
        slotsGenerated: totalGenerated,
        errors,
      };
    } catch (error: any) {
      this.logger.error('Failed to regenerate slots after increment change', {
        facilityId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if a court has complete slot coverage for the next N days
   */
  async checkSlotCoverage(courtId: string, days: number = 365): Promise<{
    hasCompleteCoverage: boolean;
    latestSlotDate: Date | null;
    missingDays: number;
  }> {
    // Use Prisma aggregate to get MAX(date) for the court
    const result = await prisma.facilityTimeSlot.aggregate({
      where: { courtId },
      _max: { date: true },
    });

    const latestSlotDate = result._max.date;

    // Return null if no slots exist
    if (!latestSlotDate) {
      return {
        hasCompleteCoverage: false,
        latestSlotDate: null,
        missingDays: days,
      };
    }

    // Calculate days between latest slot date and target date (today + days)
    const today = this.normalizeToUTCMidnight(new Date());
    const targetDate = new Date(today);
    targetDate.setUTCDate(targetDate.getUTCDate() + days);

    const missingDays = Math.max(
      0,
      Math.floor((targetDate.getTime() - latestSlotDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      hasCompleteCoverage: missingDays === 0,
      latestSlotDate,
      missingDays,
    };
  }

  /**
   * Generate slot data for a specific date based on operating hours
   */
  private generateSlotsForDate(
    courtId: string,
    date: Date,
    operatingHours: OperatingHours[],
    pricePerHour: number,
    slotIncrementMinutes: number = 60
  ): TimeSlotData[] {
    const normalizedDate = this.normalizeToUTCMidnight(date);
    const dayOfWeek = normalizedDate.getUTCDay();
    
    // Filter operating hours for this day of week
    const hoursForDay = operatingHours.filter(h => h.dayOfWeek === dayOfWeek);
    
    // Return empty array if day is blocked
    if (hoursForDay.length === 0 || hoursForDay.some(h => h.isBlocked)) {
      return [];
    }
    
    const slots: TimeSlotData[] = [];
    
    for (const hours of hoursForDay) {
      const startHour = this.parseTime(hours.startTime);
      const endHour = this.parseTime(hours.endTime);
      
      // Calculate price per slot based on increment
      const pricePerSlot = (pricePerHour * slotIncrementMinutes) / 60;
      
      // Generate slots based on increment (30 or 60 minutes)
      if (slotIncrementMinutes === 30) {
        // Generate 30-minute slots
        for (let hour = startHour; hour < endHour; hour++) {
          // First half-hour slot
          slots.push({
            courtId,
            date: normalizedDate,
            startTime: this.formatTime(hour, 0),
            endTime: this.formatTime(hour, 30),
            price: pricePerSlot,
            status: 'available',
          });
          
          // Second half-hour slot (only if not at the end hour)
          if (hour < endHour - 1 || (hour === endHour - 1 && endHour * 60 > hour * 60 + 30)) {
            slots.push({
              courtId,
              date: normalizedDate,
              startTime: this.formatTime(hour, 30),
              endTime: this.formatTime(hour + 1, 0),
              price: pricePerSlot,
              status: 'available',
            });
          }
        }
      } else {
        // Generate hourly slots (default behavior)
        for (let hour = startHour; hour < endHour; hour++) {
          slots.push({
            courtId,
            date: normalizedDate,
            startTime: this.formatTime(hour, 0),
            endTime: this.formatTime(hour + 1, 0),
            price: pricePerSlot,
            status: 'available',
          });
        }
      }
    }
    
    return slots;
  }

  /**
   * Batch insert slots with duplicate handling
   */
  private async batchInsertSlots(
    slots: TimeSlotData[],
    batchSize: number = 1000
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < slots.length; i += batchSize) {
      const batch = slots.slice(i, i + batchSize);

      try {
        const result = await prisma.facilityTimeSlot.createMany({
          data: batch,
          skipDuplicates: true, // Skip duplicates instead of throwing error
        });

        inserted += result.count;
        skipped += batch.length - result.count;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint violation - expected for duplicates
          this.logger.info('Duplicate slots detected, skipping', { 
            batchIndex: i,
            batchSize: batch.length 
          });
          skipped += batch.length;
        } else if (error.code === 'P2003') {
          // Foreign key constraint - court doesn't exist
          this.logger.error('Court not found during slot insertion', { 
            courtId: batch[0]?.courtId,
            error: error.message 
          });
          throw new Error(`Court not found: ${batch[0]?.courtId}`);
        } else {
          // Unexpected database error
          this.logger.error('Database error during slot generation', { 
            batchIndex: i,
            error: error.message 
          });
          throw error;
        }
      }
    }

    return { inserted, skipped };
  }

  /**
   * Normalize date to UTC midnight (00:00:00.000)
   */
  private normalizeToUTCMidnight(date: Date): Date {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Calculate 365-day range from start date
   */
  private calculate365DayRange(startDate: Date): { start: Date; end: Date } {
    const start = this.normalizeToUTCMidnight(startDate);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 365);
    return { start, end };
  }

  /**
   * Format hour and minutes to HH:MM
   */
  private formatTime(hour: number, minutes: number = 0): string {
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Parse HH:MM time string to hour number
   */
  private parseTime(timeStr: string): number {
    const [hours] = timeStr.split(':').map(Number);
    return hours;
  }
}
