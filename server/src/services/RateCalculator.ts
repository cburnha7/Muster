import { prisma } from '../index';

export interface PriceBreakdown {
  hours: number;
  baseRate: number;
  appliedRates: AppliedRate[];
  subtotal: number;
  fees: number;
  total: number;
}

export interface AppliedRate {
  name: string;
  rateType: string;
  hourlyRate: number;
  hoursApplied: number;
  amount: number;
}

export class RateCalculator {
  /**
   * Calculate the total price for a booking based on facility rate schedules
   */
  async calculatePrice(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<PriceBreakdown> {
    // Get all active rate schedules for the facility
    const rates = await this.getApplicableRates(facilityId, startTime, endTime);

    if (rates.length === 0) {
      throw new Error('No rate schedules found for this facility');
    }

    // Split booking into hourly segments
    const segments = this.splitIntoHourlySegments(startTime, endTime);
    const appliedRatesMap = new Map<string, AppliedRate>();

    // Calculate cost for each segment
    for (const segment of segments) {
      const applicableRate = this.findBestRate(rates, segment.start);
      
      const key = `${applicableRate.name}-${applicableRate.hourlyRate}`;
      if (appliedRatesMap.has(key)) {
        const existing = appliedRatesMap.get(key)!;
        existing.hoursApplied += 1;
        existing.amount += applicableRate.hourlyRate;
      } else {
        appliedRatesMap.set(key, {
          name: applicableRate.name,
          rateType: applicableRate.rateType,
          hourlyRate: applicableRate.hourlyRate,
          hoursApplied: 1,
          amount: applicableRate.hourlyRate,
        });
      }
    }

    const appliedRates = Array.from(appliedRatesMap.values());
    const subtotal = appliedRates.reduce((sum, rate) => sum + rate.amount, 0);
    const fees = subtotal * 0.05; // 5% platform fee
    const total = subtotal + fees;

    // Find base rate for reference
    const baseRate = rates.find(r => r.rateType === 'base')?.hourlyRate || 0;

    return {
      hours: segments.length,
      baseRate,
      appliedRates,
      subtotal,
      fees,
      total,
    };
  }

  /**
   * Get all rate schedules that could apply to the booking period
   */
  async getApplicableRates(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ) {
    const rates = await prisma.facilityRateSchedule.findMany({
      where: {
        facilityId,
        isActive: true,
      },
      orderBy: {
        priority: 'desc', // Higher priority first
      },
    });

    // Filter rates that apply to this time period
    return rates.filter(rate => {
      // Check date range for seasonal rates
      if (rate.startDate && rate.endDate) {
        if (startTime < rate.startDate || endTime > rate.endDate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Find the best (highest priority) rate for a specific time
   */
  private findBestRate(rates: any[], time: Date) {
    const dayOfWeek = time.getDay();
    const timeStr = this.formatTime(time);

    // Find all rates that match this specific time
    const matchingRates = rates.filter(rate => {
      // Check day of week
      if (rate.daysOfWeek && rate.daysOfWeek.length > 0) {
        if (!rate.daysOfWeek.includes(dayOfWeek)) {
          return false;
        }
      }

      // Check time range
      if (rate.startTime && rate.endTime) {
        if (timeStr < rate.startTime || timeStr >= rate.endTime) {
          return false;
        }
      }

      return true;
    });

    // Return highest priority matching rate, or base rate
    if (matchingRates.length > 0) {
      return matchingRates[0]; // Already sorted by priority desc
    }

    // Fallback to base rate
    return rates.find(r => r.rateType === 'base') || rates[0];
  }

  /**
   * Split booking time into hourly segments
   */
  private splitIntoHourlySegments(startTime: Date, endTime: Date) {
    const segments: { start: Date; end: Date }[] = [];
    let current = new Date(startTime);

    while (current < endTime) {
      const segmentEnd = new Date(current);
      segmentEnd.setHours(segmentEnd.getHours() + 1);

      segments.push({
        start: new Date(current),
        end: segmentEnd > endTime ? endTime : segmentEnd,
      });

      current = segmentEnd;
    }

    return segments;
  }

  /**
   * Format time as HH:MM
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export const rateCalculator = new RateCalculator();
