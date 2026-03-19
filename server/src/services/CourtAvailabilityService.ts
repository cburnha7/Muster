import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AvailabilityCheck {
  courtId: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface AvailabilityResult {
  available: boolean;
  blocked: boolean;
  blockReason?: string;
  conflictingBooking?: any;
}

class CourtAvailabilityService {
  /**
   * Check if a court is available for booking at a specific date and time
   */
  async isCourtAvailable(check: AvailabilityCheck): Promise<AvailabilityResult> {
    const { courtId, date, startTime, endTime } = check;
    const dayOfWeek = date.getDay();

    // Get all availability rules for this court
    const availabilityRules = await prisma.facilityCourtAvailability.findMany({
      where: {
        courtId,
        OR: [
          { isRecurring: true, dayOfWeek },
          { 
            isRecurring: false, 
            specificDate: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        ],
      },
    });

    // Check if time slot matches any availability rule
    let hasMatchingRule = false;
    let isBlocked = false;
    let blockReason: string | undefined;

    for (const rule of availabilityRules) {
      // Check if requested time falls within this rule
      if (this.timeInRange(startTime, endTime, rule.startTime, rule.endTime)) {
        if (rule.isBlocked) {
          isBlocked = true;
          blockReason = rule.blockReason || undefined;
          break;
        }
        hasMatchingRule = true;
      }
    }

    // If no matching rule or blocked, return unavailable
    if (!hasMatchingRule || isBlocked) {
      return {
        available: false,
        blocked: isBlocked,
        blockReason,
      };
    }

    // Check for existing bookings
    const startDateTime = new Date(`${date.toISOString().split('T')[0]}T${startTime}`);
    const endDateTime = new Date(`${date.toISOString().split('T')[0]}T${endTime}`);

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId,
        status: 'confirmed',
        event: {
          startTime: { lt: endDateTime },
          endTime: { gt: startDateTime },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (conflictingBooking) {
      return {
        available: false,
        blocked: false,
        conflictingBooking,
      };
    }

    return {
      available: true,
      blocked: false,
    };
  }

  /**
   * Get available courts for a facility at a specific date and time
   */
  async getAvailableCourts(
    facilityId: string,
    date: Date,
    startTime: string,
    endTime: string,
    sportType?: string
  ) {
    // Get all active courts for the facility
    const where: any = { facilityId, isActive: true };
    if (sportType) {
      where.sportType = sportType;
    }

    const courts = await prisma.facilityCourt.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    // Check availability for each court
    const availabilityChecks = await Promise.all(
      courts.map(async (court) => {
        const result = await this.isCourtAvailable({
          courtId: court.id,
          date,
          startTime,
          endTime,
        });

        return {
          court,
          ...result,
        };
      })
    );

    return availabilityChecks.filter((check) => check.available);
  }

  /**
   * Get court schedule for a date range
   */
  async getCourtSchedule(courtId: string, startDate: Date, endDate: Date) {
    const schedule: any[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Get availability rules for this day
      const rules = await prisma.facilityCourtAvailability.findMany({
        where: {
          courtId,
          OR: [
            { isRecurring: true, dayOfWeek },
            {
              isRecurring: false,
              specificDate: {
                gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                lt: new Date(currentDate.setHours(23, 59, 59, 999)),
              },
            },
          ],
        },
        orderBy: { startTime: 'asc' },
      });

      // Get bookings for this day
      const bookings = await prisma.booking.findMany({
        where: {
          courtId,
          status: 'confirmed',
          event: {
            startTime: {
              gte: new Date(currentDate.setHours(0, 0, 0, 0)),
              lt: new Date(currentDate.setHours(23, 59, 59, 999)),
            },
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      schedule.push({
        date: new Date(currentDate),
        dayOfWeek,
        availabilityRules: rules,
        bookings,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedule;
  }

  /**
   * Create bulk availability rules (e.g., set weekday hours for all courts)
   */
  async createBulkAvailability(
    courtIds: string[],
    rules: {
      dayOfWeek?: number;
      startTime: string;
      endTime: string;
      isRecurring: boolean;
      specificDate?: Date;
    }[]
  ) {
    const createdRules = [];

    for (const courtId of courtIds) {
      for (const rule of rules) {
        const created = await prisma.facilityCourtAvailability.create({
          data: {
            courtId,
            ...rule,
          },
        });
        createdRules.push(created);
      }
    }

    return createdRules;
  }

  /**
   * Helper: Check if a time range falls within another time range
   */
  private timeInRange(
    checkStart: string,
    checkEnd: string,
    rangeStart: string,
    rangeEnd: string
  ): boolean {
    return checkStart >= rangeStart && checkEnd <= rangeEnd;
  }

  /**
   * Helper: Convert time string (HH:MM) to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validate availability rule
   */
  validateAvailabilityRule(rule: {
    startTime: string;
    endTime: string;
    dayOfWeek?: number;
    isRecurring: boolean;
    specificDate?: Date;
  }): { valid: boolean; error?: string } {
    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(rule.startTime) || !timeRegex.test(rule.endTime)) {
      return { valid: false, error: 'Invalid time format. Use HH:MM (24-hour)' };
    }

    // Validate end time is after start time
    if (this.timeToMinutes(rule.endTime) <= this.timeToMinutes(rule.startTime)) {
      return { valid: false, error: 'End time must be after start time' };
    }

    // Validate recurring rules have dayOfWeek
    if (rule.isRecurring && (rule.dayOfWeek === undefined || rule.dayOfWeek < 0 || rule.dayOfWeek > 6)) {
      return { valid: false, error: 'Recurring rules must have a valid dayOfWeek (0-6)' };
    }

    // Validate one-time rules have specificDate
    if (!rule.isRecurring && !rule.specificDate) {
      return { valid: false, error: 'One-time rules must have a specificDate' };
    }

    return { valid: true };
  }
}

export const courtAvailabilityService = new CourtAvailabilityService();
