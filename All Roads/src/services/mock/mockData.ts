/**
 * Mock data for development and testing
 */

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
  defaultTeamStats,
} from '../../types';

/**
 * Mock user profile
 */
export const mockUser: User = {
  id: '1',
  email: 'edwin@muster.app',
  firstName: 'Edwin',
  lastName: 'Smith',
  profileImage: 'https://ui-avatars.com/api/?name=Edwin+Smith&background=3B82F6&color=fff&size=200',
  phoneNumber: '+1 (555) 123-4567',
  dateOfBirth: new Date('1990-01-15'),
  preferredSports: [SportType.BASKETBALL, SportType.SOCCER],
  notificationPreferences: {
    eventReminders: true,
    eventUpdates: true,
    newEventAlerts: true,
    marketingEmails: false,
    pushNotifications: true,
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
};

/**
 * Mock facilities
 */
export const mockFacilities: Facility[] = [
  {
    id: '1',
    name: 'Downtown Sports Complex',
    description: 'Premier sports facility in the heart of downtown with state-of-the-art equipment and amenities.',
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'USA',
    latitude: 37.7749,
    longitude: -122.4194,
    amenities: ['Parking', 'Locker Rooms', 'Showers', 'WiFi', 'Cafe'],
    sportTypes: [SportType.BASKETBALL, SportType.VOLLEYBALL, SportType.BADMINTON],
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    contactPhone: '+1 (415) 555-0100',
    contactEmail: 'info@downtownsports.com',
    contactWebsite: 'https://downtownsports.com',
    pricePerHour: 50,
    ownerId: '1',
    rating: 4.5,
    reviewCount: 128,
    isActive: true,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Bayview Recreation Center',
    description: 'Community recreation center with outdoor fields and indoor courts. Perfect for roster sports and leagues.',
    street: '456 Bay St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94124',
    country: 'USA',
    latitude: 37.7299,
    longitude: -122.3922,
    amenities: ['Parking', 'Locker Rooms', 'Equipment Rental', 'Outdoor Fields'],
    sportTypes: [SportType.SOCCER, SportType.TENNIS, SportType.BASKETBALL],
    imageUrl: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=800',
    contactPhone: '+1 (415) 555-0200',
    contactEmail: 'contact@bayviewrec.com',
    contactWebsite: 'https://bayviewrec.com',
    pricePerHour: 40,
    ownerId: '2',
    rating: 4.2,
    reviewCount: 89,
    isActive: true,
    createdAt: new Date('2023-08-15'),
    updatedAt: new Date(),
  },
];

/**
 * Mock events
 */
export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Friday Night Basketball',
    description: 'Weekly pickup basketball game. All skill levels welcome! Bring your A-game and good vibes.',
    sportType: SportType.BASKETBALL,
    startTime: new Date('2026-03-13T19:00:00'),
    endTime: new Date('2026-03-13T21:00:00'),
    facilityId: '1',
    organizerId: '1',
    organizer: mockUser,
    maxParticipants: 10,
    currentParticipants: 7,
    participants: [],
    status: EventStatus.ACTIVE,
    eventType: EventType.PICKUP,
    skillLevel: SkillLevel.INTERMEDIATE,
    price: 15,
    currency: 'USD',
    equipment: ['Basketball'],
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Weekend Soccer Match',
    description: '5v5 soccer match at Bayview. Looking for skilled players for a competitive game.',
    sportType: SportType.SOCCER,
    startTime: new Date('2026-03-15T10:00:00'),
    endTime: new Date('2026-03-15T12:00:00'),
    facilityId: '2',
    organizerId: '2',
    organizer: {
      id: '2',
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      profileImage: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=10B981&color=fff&size=200',
      preferredSports: [SportType.SOCCER],
      notificationPreferences: {
        eventReminders: true,
        eventUpdates: true,
        newEventAlerts: true,
        marketingEmails: false,
        pushNotifications: true,
      },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date(),
    },
    maxParticipants: 10,
    currentParticipants: 8,
    participants: [],
    status: EventStatus.ACTIVE,
    eventType: EventType.GAME,
    skillLevel: SkillLevel.ADVANCED,
    price: 20,
    currency: 'USD',
    equipment: ['Soccer Ball', 'Cleats'],
    createdAt: new Date('2026-03-05'),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Beginner Volleyball Clinic',
    description: 'Learn the basics of volleyball in a fun, supportive environment. Perfect for newcomers!',
    sportType: SportType.VOLLEYBALL,
    startTime: new Date('2026-03-16T14:00:00'),
    endTime: new Date('2026-03-16T16:00:00'),
    facilityId: '1',
    organizerId: '3',
    organizer: {
      id: '3',
      email: 'mike@example.com',
      firstName: 'Mike',
      lastName: 'Chen',
      profileImage: 'https://ui-avatars.com/api/?name=Mike+Chen&background=F59E0B&color=fff&size=200',
      preferredSports: [SportType.VOLLEYBALL],
      notificationPreferences: {
        eventReminders: true,
        eventUpdates: true,
        newEventAlerts: true,
        marketingEmails: false,
        pushNotifications: true,
      },
      createdAt: new Date('2023-11-10'),
      updatedAt: new Date(),
    },
    maxParticipants: 12,
    currentParticipants: 5,
    participants: [],
    status: EventStatus.ACTIVE,
    eventType: EventType.INDIVIDUAL,
    skillLevel: SkillLevel.BEGINNER,
    price: 10,
    currency: 'USD',
    equipment: ['Volleyball'],
    createdAt: new Date('2026-03-08'),
    updatedAt: new Date(),
  },
  {
    id: '4',
    title: 'Tennis Doubles Tournament',
    description: 'Competitive doubles tournament. Register with your partner or find one at the event!',
    sportType: SportType.TENNIS,
    startTime: new Date('2026-03-20T09:00:00'),
    endTime: new Date('2026-03-20T17:00:00'),
    facilityId: '2',
    organizerId: '4',
    organizer: {
      id: '4',
      email: 'lisa@example.com',
      firstName: 'Lisa',
      lastName: 'Martinez',
      profileImage: 'https://ui-avatars.com/api/?name=Lisa+Martinez&background=EF4444&color=fff&size=200',
      preferredSports: [SportType.TENNIS],
      notificationPreferences: {
        eventReminders: true,
        eventUpdates: true,
        newEventAlerts: true,
        marketingEmails: false,
        pushNotifications: true,
      },
      createdAt: new Date('2023-09-20'),
      updatedAt: new Date(),
    },
    maxParticipants: 16,
    currentParticipants: 12,
    participants: [],
    status: EventStatus.ACTIVE,
    eventType: EventType.PRACTICE,
    skillLevel: SkillLevel.INTERMEDIATE,
    price: 35,
    currency: 'USD',
    equipment: ['Tennis Racket', 'Tennis Balls'],
    createdAt: new Date('2026-02-25'),
    updatedAt: new Date(),
  },
  {
    id: '5',
    title: 'Morning Basketball Shootaround',
    description: 'Casual morning basketball session. Work on your shot and meet other players.',
    sportType: SportType.BASKETBALL,
    startTime: new Date('2026-03-12T07:00:00'),
    endTime: new Date('2026-03-12T09:00:00'),
    facilityId: '1',
    organizerId: '1',
    organizer: mockUser,
    maxParticipants: 8,
    currentParticipants: 4,
    participants: [],
    status: EventStatus.ACTIVE,
    eventType: EventType.PICKUP,
    skillLevel: SkillLevel.ALL_LEVELS,
    price: 10,
    currency: 'USD',
    equipment: ['Basketball'],
    createdAt: new Date('2026-03-07'),
    updatedAt: new Date(),
  },
];

// Add facility references after events are created
mockEvents[0].facility = mockFacilities[0];
mockEvents[1].facility = mockFacilities[1];
mockEvents[2].facility = mockFacilities[0];
mockEvents[3].facility = mockFacilities[1];
mockEvents[4].facility = mockFacilities[0];

/**
 * Mock teams
 */
export const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Bay Area Ballers',
    description: 'Competitive basketball roster looking for skilled players. We play in local leagues.',
    captainId: '1',
    captain: mockUser,
    members: [
      {
        userId: '1',
        user: mockUser,
        role: TeamRole.CAPTAIN,
        joinedAt: new Date('2024-01-20'),
        status: MemberStatus.ACTIVE,
      },
    ],
    sportType: SportType.BASKETBALL,
    skillLevel: SkillLevel.INTERMEDIATE,
    maxMembers: 15,
    isPublic: true,
    logo: 'https://ui-avatars.com/api/?name=Bay+Area+Ballers&background=3B82F6&color=fff&size=200',
    stats: {
      ...defaultTeamStats,
      gamesPlayed: 24,
      gamesWon: 16,
      gamesLost: 8,
      winRate: 0.67,
      averageScore: 78,
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'SF Soccer Squad',
    description: 'Casual soccer roster for weekend games. All skill levels welcome!',
    captainId: '2',
    captain: {
      id: '2',
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      profileImage: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=10B981&color=fff&size=200',
      preferredSports: [SportType.SOCCER],
      notificationPreferences: {
        eventReminders: true,
        eventUpdates: true,
        newEventAlerts: true,
        marketingEmails: false,
        pushNotifications: true,
      },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date(),
    },
    members: [],
    sportType: SportType.SOCCER,
    skillLevel: SkillLevel.ALL_LEVELS,
    maxMembers: 22,
    isPublic: true,
    logo: 'https://ui-avatars.com/api/?name=SF+Soccer+Squad&background=10B981&color=fff&size=200',
    stats: {
      ...defaultTeamStats,
      gamesPlayed: 18,
      gamesWon: 10,
      gamesLost: 8,
      winRate: 0.56,
      averageScore: 3,
    },
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date(),
  },
];

/**
 * Mock bookings
 */
export const mockBookings: Booking[] = [
  {
    id: '1',
    userId: '1',
    user: mockUser,
    eventId: '1',
    status: BookingStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    bookedAt: new Date('2026-03-02'),
    createdAt: new Date('2026-03-02'),
    updatedAt: new Date(),
  },
  {
    id: '2',
    userId: '1',
    user: mockUser,
    eventId: '5',
    status: BookingStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAID,
    bookedAt: new Date('2026-03-08'),
    createdAt: new Date('2026-03-08'),
    updatedAt: new Date(),
  },
];

// Add event references after bookings are created
mockBookings[0].event = mockEvents[0];
mockBookings[1].event = mockEvents[4];

/**
 * Get all mock data
 */
export const MockData = {
  user: mockUser,
  events: mockEvents,
  facilities: mockFacilities,
  teams: mockTeams,
  bookings: mockBookings,
};

export default MockData;
