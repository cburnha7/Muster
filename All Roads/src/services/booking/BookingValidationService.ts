import { Event, User, Team, BookingStatus, EventStatus } from '../../types';

export interface BookingValidationResult {
  canBook: boolean;
  reason?: string;
  warnings?: string[];
}

export class BookingValidationService {
  /**
   * Validate if a user can book an event
   */
  static validateBooking(
    event: Event,
    user: User,
    team?: Team
  ): BookingValidationResult {
    const warnings: string[] = [];

    // Check if event is active
    if (event.status !== EventStatus.ACTIVE) {
      return {
        canBook: false,
        reason: `Event is ${event.status.toLowerCase()}`,
      };
    }

    // Check if event is in the past
    const currentTime = Date.now();
    const eventStartTime = typeof event.startTime === 'string' 
      ? new Date(event.startTime).getTime() 
      : event.startTime.getTime();
    if (eventStartTime <= currentTime) {
      return {
        canBook: false,
        reason: 'Event has already started or passed',
      };
    }

    // Check if user is already booked
    const isAlreadyBooked = event.participants?.some(
      participant => participant.userId === user.id
    );
    if (isAlreadyBooked) {
      return {
        canBook: false,
        reason: 'You are already booked for this event',
      };
    }

    // Check capacity
    if (event.currentParticipants >= event.maxParticipants) {
      return {
        canBook: false,
        reason: 'Event is full',
      };
    }

    // Check if team booking is required but no team provided
    if (event.eventType === 'team_based' && !team) {
      return {
        canBook: false,
        reason: 'This event requires team registration',
      };
    }

    // Check if team booking is provided but event is individual
    if (event.eventType === 'individual' && team) {
      return {
        canBook: false,
        reason: 'This event is for individual participants only',
      };
    }

    // Team-specific validations
    if (team) {
      // Check if user is a member of the team
      const isMember = team.members.some(
        member => member.userId === user.id && member.status === 'active'
      );
      if (!isMember) {
        return {
          canBook: false,
          reason: 'You are not an active member of this team',
        };
      }

      // Check if team sport matches event sport
      if (team.sportType !== event.sportType) {
        return {
          canBook: false,
          reason: 'Team sport type does not match event sport type',
        };
      }

      // Check if team is already registered
      const isTeamRegistered = event.teamIds && event.teamIds.indexOf(team.id) !== -1;
      if (isTeamRegistered) {
        return {
          canBook: false,
          reason: 'Your team is already registered for this event',
        };
      }
    }

    // Add warnings for potential issues
    const spotsLeft = event.maxParticipants - event.currentParticipants;
    if (spotsLeft <= 3) {
      warnings.push(`Only ${spotsLeft} spots remaining`);
    }

    const timeUntilEvent = eventStartTime - currentTime;
    const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);
    if (hoursUntilEvent < 2) {
      warnings.push('Event starts in less than 2 hours');
    }

    const result: BookingValidationResult = {
      canBook: true,
    };

    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  }

  /**
   * Validate if a booking can be cancelled
   */
  static validateCancellation(
    event: Event,
    _user: User,
    bookingStatus: BookingStatus
  ): BookingValidationResult {
    // Check if booking is confirmed
    if (bookingStatus !== BookingStatus.CONFIRMED) {
      return {
        canBook: false,
        reason: 'Only confirmed bookings can be cancelled',
      };
    }

    // Check if event has already started
    const currentTime = Date.now();
    const eventStartTime = typeof event.startTime === 'string' 
      ? new Date(event.startTime).getTime() 
      : event.startTime.getTime();
    if (eventStartTime <= currentTime) {
      return {
        canBook: false,
        reason: 'Cannot cancel booking for events that have already started',
      };
    }

    // Check if event is cancelled
    if (event.status === EventStatus.CANCELLED) {
      return {
        canBook: false,
        reason: 'Event has been cancelled',
      };
    }

    const warnings: string[] = [];

    // Add warning for late cancellation
    const timeUntilEvent = eventStartTime - currentTime;
    const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);
    if (hoursUntilEvent < 24) {
      warnings.push('Cancelling less than 24 hours before the event may affect refund eligibility');
    }

    const result: BookingValidationResult = {
      canBook: true,
    };

    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  }

  /**
   * Calculate refund amount based on cancellation timing
   */
  static calculateRefundAmount(
    originalAmount: number,
    eventStartTime: Date,
    cancellationTime: Date = new Date()
  ): number {
    if (originalAmount <= 0) return 0;

    const eventTime = typeof eventStartTime === 'string' 
      ? new Date(eventStartTime).getTime() 
      : eventStartTime.getTime();
    const cancelTime = typeof cancellationTime === 'string' 
      ? new Date(cancellationTime).getTime() 
      : cancellationTime.getTime();
    const timeUntilEvent = eventTime - cancelTime;
    const hoursUntilEvent = timeUntilEvent / (1000 * 60 * 60);

    // Refund policy based on timing
    if (hoursUntilEvent >= 48) {
      return originalAmount; // Full refund
    } else if (hoursUntilEvent >= 24) {
      return originalAmount * 0.75; // 75% refund
    } else if (hoursUntilEvent >= 2) {
      return originalAmount * 0.5; // 50% refund
    } else {
      return 0; // No refund
    }
  }

  /**
   * Get booking confirmation message
   */
  static getBookingConfirmationMessage(
    event: Event,
    _user: User,
    team?: Team
  ): string {
    const eventStartTime = typeof event.startTime === 'string' 
      ? new Date(event.startTime) 
      : event.startTime;
    const eventDate = eventStartTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = eventStartTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let message = `You have successfully booked "${event.title}" on ${eventDate} at ${eventTime}`;
    
    if (team) {
      message += ` for team "${team.name}"`;
    }

    if (event.facility?.name) {
      message += ` at ${event.facility.name}`;
    }

    if (event.price > 0) {
      message += `. Total cost: $${event.price}`;
    }

    return message;
  }

  /**
   * Get cancellation confirmation message
   */
  static getCancellationConfirmationMessage(
    event: Event,
    refundAmount: number
  ): string {
    let message = `Your booking for "${event.title}" has been cancelled`;
    
    if (refundAmount > 0) {
      message += `. A refund of $${refundAmount.toFixed(2)} will be processed within 3-5 business days`;
    } else if (event.price > 0) {
      message += `. No refund is available due to the cancellation timing`;
    }

    return message;
  }
}