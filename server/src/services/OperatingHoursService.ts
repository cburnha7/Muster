import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DailyOperatingHours {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isOpen: boolean;
}

export class OperatingHoursService {
  /**
   * Get operating hours for a facility
   * Returns default hours (06:00-22:00) if none defined
   */
  async getOperatingHours(facilityId: string): Promise<DailyOperatingHours[]> {
    try {
      const availability = await prisma.facilityAvailability.findMany({
        where: {
          facilityId,
          isRecurring: true,
          specificDate: null,
        },
      });

      if (!availability || availability.length === 0) {
        return this.getDefaultHours();
      }

      // Validate operating hours format
      const validHours = availability.filter(hours => 
        this.isValidTimeFormat(hours.startTime) && 
        this.isValidTimeFormat(hours.endTime) &&
        hours.startTime < hours.endTime
      );

      if (validHours.length === 0) {
        return this.getDefaultHours();
      }

      return validHours.map(hours => ({
        dayOfWeek: hours.dayOfWeek,
        startTime: hours.startTime,
        endTime: hours.endTime,
        isOpen: !hours.isBlocked,
      }));
    } catch (error) {
      console.error('Error fetching operating hours:', error);
      return this.getDefaultHours();
    }
  }

  /**
   * Check if a facility is open on a specific date
   */
  async isOpenOnDate(facilityId: string, date: Date): Promise<boolean> {
    const dayOfWeek = date.getUTCDay();
    const hours = await this.getOperatingHours(facilityId);
    
    const hoursForDay = hours.find(h => h.dayOfWeek === dayOfWeek);
    return hoursForDay ? hoursForDay.isOpen : true;
  }

  /**
   * Get time slots for a specific day of week
   * Returns array of HH:MM time strings for each hour
   */
  getTimeSlotsForDay(dayOfWeek: number, hours: DailyOperatingHours[]): string[] {
    const hoursForDay = hours.filter(h => h.dayOfWeek === dayOfWeek && h.isOpen);
    
    if (hoursForDay.length === 0) {
      return [];
    }

    const slots: string[] = [];
    
    for (const operatingHours of hoursForDay) {
      const startHour = parseInt(operatingHours.startTime.split(':')[0]);
      const endHour = parseInt(operatingHours.endTime.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = this.formatTime(hour);
        if (!slots.includes(timeSlot)) {
          slots.push(timeSlot);
        }
      }
    }
    
    return slots.sort();
  }

  /**
   * Default operating hours (06:00-22:00, all days)
   */
  private getDefaultHours(): DailyOperatingHours[] {
    return [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => ({
      dayOfWeek,
      startTime: '06:00',
      endTime: '22:00',
      isOpen: true,
    }));
  }

  /**
   * Validate time format (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Format hour to HH:MM
   */
  private formatTime(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }
}
