import { prisma } from '../lib/prisma';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  price?: number;
}

export class AvailabilityService {
  /**
   * Check if a facility is available for the requested time
   */
  async isAvailable(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // 1. Check if time falls within availability slots
    const withinSlot = await this.isWithinAvailabilitySlot(facilityId, startTime, endTime);
    if (!withinSlot) return false;

    // 2. Check for blocked times
    const isBlocked = await this.isTimeBlocked(facilityId, startTime, endTime);
    if (isBlocked) return false;

    // 3. Check for existing bookings
    const hasConflict = await this.hasBookingConflict(facilityId, startTime, endTime);
    if (hasConflict) return false;

    // 4. Check buffer time
    const hasBuffer = await this.checkBufferTime(facilityId, startTime, endTime);
    if (!hasBuffer) return false;

    return true;
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(
    facilityId: string,
    date: Date
  ): Promise<TimeSlot[]> {
    const dayOfWeek = date.getDay();
    
    // Get availability slots for this day
    const slots = await prisma.facilityAvailability.findMany({
      where: {
        facilityId,
        OR: [
          { isRecurring: true, dayOfWeek },
          { isRecurring: false, specificDate: date },
        ],
        isBlocked: false,
      },
    });

    const timeSlots: TimeSlot[] = [];

    for (const slot of slots) {
      // Split slot into hourly segments
      const segments = this.generateHourlySegments(slot.startTime, slot.endTime);
      
      for (const segment of segments) {
        const segmentStart = this.combineDateAndTime(date, segment.start);
        const segmentEnd = this.combineDateAndTime(date, segment.end);

        const available = await this.isAvailable(facilityId, segmentStart, segmentEnd);

        timeSlots.push({
          startTime: segment.start,
          endTime: segment.end,
          available,
        });
      }
    }

    return timeSlots;
  }

  /**
   * Block time for maintenance or private events
   */
  async blockTime(
    facilityId: string,
    startTime: Date,
    endTime: Date,
    reason: string
  ): Promise<void> {
    await prisma.facilityAvailability.create({
      data: {
        facilityId,
        dayOfWeek: startTime.getDay(),
        startTime: this.formatTime(startTime),
        endTime: this.formatTime(endTime),
        isRecurring: false,
        specificDate: startTime,
        isBlocked: true,
        blockReason: reason,
      },
    });
  }

  /**
   * Get booking conflicts for a time period
   */
  async getConflicts(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ) {
    return await prisma.booking.findMany({
      where: {
        facilityId,
        status: { in: ['confirmed', 'pending'] },
        event: {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      },
      include: {
        event: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Check if time falls within availability slots
   */
  private async isWithinAvailabilitySlot(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const dayOfWeek = startTime.getDay();
    const startTimeStr = this.formatTime(startTime);
    const endTimeStr = this.formatTime(endTime);

    const slots = await prisma.facilityAvailability.findMany({
      where: {
        facilityId,
        OR: [
          { isRecurring: true, dayOfWeek },
          { isRecurring: false, specificDate: startTime },
        ],
        isBlocked: false,
      },
    });

    // Check if requested time falls within any slot
    return slots.some(slot => {
      return startTimeStr >= slot.startTime && endTimeStr <= slot.endTime;
    });
  }

  /**
   * Check if time is blocked
   */
  private async isTimeBlocked(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const dayOfWeek = startTime.getDay();
    const startTimeStr = this.formatTime(startTime);
    const endTimeStr = this.formatTime(endTime);

    const blockedSlots = await prisma.facilityAvailability.findMany({
      where: {
        facilityId,
        isBlocked: true,
        OR: [
          { isRecurring: true, dayOfWeek },
          { isRecurring: false, specificDate: startTime },
        ],
      },
    });

    // Check if requested time overlaps with any blocked slot
    return blockedSlots.some(slot => {
      return !(endTimeStr <= slot.startTime || startTimeStr >= slot.endTime);
    });
  }

  /**
   * Check for booking conflicts
   */
  private async hasBookingConflict(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const conflicts = await this.getConflicts(facilityId, startTime, endTime);
    return conflicts.length > 0;
  }

  /**
   * Check buffer time between bookings
   */
  private async checkBufferTime(
    facilityId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: { bufferTimeMins: true },
    });

    if (!facility || facility.bufferTimeMins === 0) {
      return true;
    }

    const bufferMs = facility.bufferTimeMins * 60 * 1000;
    const bufferStart = new Date(startTime.getTime() - bufferMs);
    const bufferEnd = new Date(endTime.getTime() + bufferMs);

    const conflicts = await this.getConflicts(facilityId, bufferStart, bufferEnd);
    return conflicts.length === 0;
  }

  /**
   * Generate hourly segments from time range
   */
  private generateHourlySegments(startTime: string, endTime: string) {
    const segments: { start: string; end: string }[] = [];
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);

    for (let hour = startHour; hour < endHour; hour++) {
      segments.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`,
      });
    }

    return segments;
  }

  /**
   * Combine date and time string
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
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

export const availabilityService = new AvailabilityService();
