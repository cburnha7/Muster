// Type guards and utility functions for type validation
import {
  User,
  Event,
  Facility,
  Team,
  Booking,
  SportType,
  SkillLevel,
  EventStatus,
  EventType,
  BookingStatus,
  PaymentStatus,
  TeamRole,
  MemberStatus,
} from './index';

// Type guards for runtime type checking
export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.firstName === 'string' &&
    typeof obj.lastName === 'string' &&
    Array.isArray(obj.preferredSports) &&
    obj.notificationPreferences &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
}

export function isEvent(obj: any): obj is Event {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    Object.values(SportType).includes(obj.sportType) &&
    typeof obj.facilityId === 'string' &&
    typeof obj.organizerId === 'string' &&
    obj.startTime instanceof Date &&
    obj.endTime instanceof Date &&
    typeof obj.maxParticipants === 'number' &&
    typeof obj.currentParticipants === 'number' &&
    typeof obj.price === 'number' &&
    Object.values(SkillLevel).includes(obj.skillLevel) &&
    Object.values(EventStatus).includes(obj.status) &&
    Object.values(EventType).includes(obj.eventType) &&
    Array.isArray(obj.participants)
  );
}

export function isFacility(obj: any): obj is Facility {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    obj.address &&
    obj.coordinates &&
    Array.isArray(obj.amenities) &&
    Array.isArray(obj.sportTypes) &&
    Array.isArray(obj.images) &&
    obj.contactInfo &&
    obj.operatingHours &&
    obj.pricing &&
    typeof obj.ownerId === 'string' &&
    typeof obj.rating === 'number' &&
    typeof obj.reviewCount === 'number'
  );
}

export function isTeam(obj: any): obj is Team {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.captainId === 'string' &&
    Array.isArray(obj.members) &&
    Object.values(SportType).includes(obj.sportType) &&
    Object.values(SkillLevel).includes(obj.skillLevel) &&
    typeof obj.maxMembers === 'number' &&
    typeof obj.isPublic === 'boolean' &&
    obj.stats &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
}

export function isBooking(obj: any): obj is Booking {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.eventId === 'string' &&
    Object.values(BookingStatus).includes(obj.status) &&
    Object.values(PaymentStatus).includes(obj.paymentStatus) &&
    obj.bookedAt instanceof Date &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
}

// Utility functions for enum validation
export function isValidSportType(value: string): value is SportType {
  return Object.values(SportType).includes(value as SportType);
}

export function isValidSkillLevel(value: string): value is SkillLevel {
  return Object.values(SkillLevel).includes(value as SkillLevel);
}

export function isValidEventStatus(value: string): value is EventStatus {
  return Object.values(EventStatus).includes(value as EventStatus);
}

export function isValidEventType(value: string): value is EventType {
  return Object.values(EventType).includes(value as EventType);
}

export function isValidBookingStatus(value: string): value is BookingStatus {
  return Object.values(BookingStatus).includes(value as BookingStatus);
}

export function isValidPaymentStatus(value: string): value is PaymentStatus {
  return Object.values(PaymentStatus).includes(value as PaymentStatus);
}

export function isValidTeamRole(value: string): value is TeamRole {
  return Object.values(TeamRole).includes(value as TeamRole);
}

export function isValidMemberStatus(value: string): value is MemberStatus {
  return Object.values(MemberStatus).includes(value as MemberStatus);
}

// Factory functions for creating default objects
export function createDefaultNotificationPreferences() {
  return {
    eventReminders: true,
    eventUpdates: true,
    newEventAlerts: false,
    marketingEmails: false,
    pushNotifications: true,
  };
}

export function createDefaultTeamStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    winRate: 0,
  };
}

export function createDefaultPaginationParams() {
  return {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  };
}