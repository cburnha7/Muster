// Example usage of the defined types
// This file demonstrates how the types would be used throughout the application

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
  createDefaultNotificationPreferences,
  createDefaultTeamStats,
  createDefaultPaginationParams,
} from './index';

// Example User object
export const exampleUser: User = {
  id: 'user-123',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  profileImage: 'https://example.com/profile.jpg',
  phoneNumber: '+1-555-0123',
  dateOfBirth: new Date('1990-05-15'),
  preferredSports: [SportType.BASKETBALL, SportType.SOCCER],
  notificationPreferences: createDefaultNotificationPreferences(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

// Example Facility object
export const exampleFacility: Facility = {
  id: 'facility-456',
  name: 'Downtown Sports Complex',
  description: 'Modern sports facility with multiple courts and fields',
  address: {
    street: '123 Sports Ave',
    city: 'Sportstown',
    state: 'CA',
    zipCode: '90210',
    country: 'USA',
  },
  coordinates: {
    latitude: 34.0522,
    longitude: -118.2437,
  },
  amenities: [
    {
      id: 'amenity-1',
      name: 'Parking',
      icon: 'parking',
      description: 'Free parking available',
    },
    {
      id: 'amenity-2',
      name: 'Locker Rooms',
      icon: 'locker',
      description: 'Clean locker rooms with showers',
    },
  ],
  sportTypes: [SportType.BASKETBALL, SportType.VOLLEYBALL],
  images: [
    'https://example.com/facility1.jpg',
    'https://example.com/facility2.jpg',
  ],
  contactInfo: {
    phone: '+1-555-0456',
    email: 'info@sportscomplex.com',
    website: 'https://sportscomplex.com',
  },
  operatingHours: {
    monday: [{ open: '06:00', close: '22:00' }],
    tuesday: [{ open: '06:00', close: '22:00' }],
    wednesday: [{ open: '06:00', close: '22:00' }],
    thursday: [{ open: '06:00', close: '22:00' }],
    friday: [{ open: '06:00', close: '23:00' }],
    saturday: [{ open: '08:00', close: '23:00' }],
    sunday: [{ open: '08:00', close: '20:00' }],
  },
  pricing: {
    hourlyRate: 25,
    currency: 'USD',
    deposit: 50,
  },
  ownerId: 'owner-789',
  rating: 4.5,
  reviewCount: 127,
  createdAt: new Date('2023-06-01'),
  updatedAt: new Date('2024-01-10'),
};

// Example Event object
export const exampleEvent: Event = {
  id: 'event-789',
  title: 'Pickup Basketball Game',
  description: 'Casual basketball game for intermediate players',
  sportType: SportType.BASKETBALL,
  facilityId: 'facility-456',
  facility: exampleFacility,
  organizerId: 'user-123',
  organizer: exampleUser,
  startTime: new Date('2024-02-15T18:00:00Z'),
  endTime: new Date('2024-02-15T20:00:00Z'),
  maxParticipants: 10,
  currentParticipants: 6,
  price: 15.00,
  currency: 'USD',
  skillLevel: SkillLevel.INTERMEDIATE,
  equipment: ['Basketball'],
  rules: 'Standard pickup rules, first to 21 wins',
  status: EventStatus.ACTIVE,
  eventType: EventType.PICKUP,
  participants: [
    {
      userId: 'user-123',
      user: exampleUser,
      bookingId: 'booking-001',
      joinedAt: new Date('2024-02-01T10:00:00Z'),
      status: 'confirmed',
    },
  ],
  createdAt: new Date('2024-01-20'),
  updatedAt: new Date('2024-02-01'),
};

// Example Team object
export const exampleTeam: Team = {
  id: 'team-101',
  name: 'The Ballers',
  description: 'Competitive basketball team looking for skilled players',
  captainId: 'user-123',
  captain: exampleUser,
  members: [
    {
      userId: 'user-123',
      user: exampleUser,
      role: TeamRole.CAPTAIN,
      joinedAt: new Date('2024-01-01'),
      status: MemberStatus.ACTIVE,
    },
  ],
  sportType: SportType.BASKETBALL,
  skillLevel: SkillLevel.ADVANCED,
  maxMembers: 12,
  isPublic: true,
  inviteCode: 'BALLERS2024',
  stats: createDefaultTeamStats(),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

// Example Booking object
export const exampleBooking: Booking = {
  id: 'booking-001',
  userId: 'user-123',
  user: exampleUser,
  eventId: 'event-789',
  event: exampleEvent,
  status: BookingStatus.CONFIRMED,
  paymentStatus: PaymentStatus.PAID,
  paymentId: 'payment-xyz',
  bookedAt: new Date('2024-02-01T10:00:00Z'),
  createdAt: new Date('2024-02-01T10:00:00Z'),
  updatedAt: new Date('2024-02-01T10:00:00Z'),
};

// Example API usage patterns
export const exampleApiUsage = {
  // Pagination parameters for listing events
  eventListParams: createDefaultPaginationParams(),
  
  // Event filters for search
  eventFilters: {
    sportType: SportType.BASKETBALL,
    skillLevel: SkillLevel.INTERMEDIATE,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-02-28'),
    priceMin: 10,
    priceMax: 30,
  },
  
  // Facility filters for discovery
  facilityFilters: {
    sportTypes: [SportType.BASKETBALL, SportType.VOLLEYBALL],
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      radius: 10, // 10km radius
    },
    rating: 4,
  },
  
  // Team filters for finding teams
  teamFilters: {
    sportType: SportType.BASKETBALL,
    skillLevel: SkillLevel.INTERMEDIATE,
    isPublic: true,
    hasOpenSlots: true,
  },
};

// Example form data for creating new entities
export const exampleFormData = {
  createEvent: {
    title: 'New Basketball Game',
    description: 'Fun pickup game',
    sportType: SportType.BASKETBALL,
    facilityId: 'facility-456',
    startTime: new Date('2024-03-01T18:00:00Z'),
    endTime: new Date('2024-03-01T20:00:00Z'),
    maxParticipants: 10,
    price: 20,
    currency: 'USD',
    skillLevel: SkillLevel.ALL_LEVELS,
    equipment: ['Basketball'],
    eventType: EventType.PICKUP,
  },
  
  createTeam: {
    name: 'New Team',
    description: 'Looking for players',
    sportType: SportType.SOCCER,
    skillLevel: SkillLevel.BEGINNER,
    maxMembers: 15,
    isPublic: true,
  },
  
  registerUser: {
    email: 'newuser@example.com',
    password: 'securepassword123',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '+1-555-0789',
    preferredSports: [SportType.TENNIS, SportType.VOLLEYBALL],
  },
};