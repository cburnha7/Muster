// Core type definitions for the Sports Booking App

// ============================================================================
// ENUMS
// ============================================================================

export enum SportType {
  BASKETBALL = 'basketball',
  PICKLEBALL = 'pickleball',
  TENNIS = 'tennis',
  SOCCER = 'soccer',
  SOFTBALL = 'softball',
  BASEBALL = 'baseball',
  VOLLEYBALL = 'volleyball',
  FLAG_FOOTBALL = 'flag_football',
  KICKBALL = 'kickball',
  OTHER = 'other',
  // Legacy values — kept for backward compatibility with existing records
  BADMINTON = 'badminton',
  HOCKEY = 'hockey',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  ALL_LEVELS = 'all_levels',
}

export enum EventStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FULL = 'full',
}

export enum EventType {
  GAME = 'game',
  PRACTICE = 'practice',
  PICKUP = 'pickup',
  TOURNAMENT = 'tournament',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum TeamRole {
  CAPTAIN = 'captain',
  CO_CAPTAIN = 'co_captain',
  MEMBER = 'member',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  PENDING = 'pending',
  REMOVED = 'removed',
}

export enum TeamTransactionType {
  JOIN_FEE = 'join_fee',
  TOP_UP = 'top_up',
  BOOKING_DEBIT = 'booking_debit',
  REFUND = 'refund',
}

export enum JoinFeeType {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
}

export enum ParticipantStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

// ============================================================================
// USER MODELS
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  preferredSports: SportType[];
  notificationPreferences: NotificationPreferences;
  stripeAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  eventReminders: boolean;
  eventUpdates: boolean;
  newEventAlerts: boolean;
  marketingEmails: boolean;
  pushNotifications: boolean;
}

// ============================================================================
// FACILITY MODELS
// ============================================================================

export interface Facility {
  id: string;
  name: string;
  description: string;
  // Address fields (flattened from Address interface)
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  // Location coordinates (flattened from Coordinates interface)
  latitude: number;
  longitude: number;
  // Amenities as string array
  amenities: string[];
  sportTypes: SportType[];
  imageUrl?: string;
  facilityMapUrl?: string;
  // Contact information (flattened from ContactInfo interface)
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactWebsite?: string;
  // Pricing
  pricePerHour: number;
  // Slot increment
  slotIncrementMinutes: number; // 30 or 60 minutes
  // Owner
  ownerId: string;
  owner?: User;
  // Ratings
  rating: number;
  reviewCount: number;
  // Status
  isActive: boolean;
  // Cancellation Policy
  noticeWindowHours?: number | null;
  teamPenaltyPct?: number | null;
  penaltyDestination?: 'facility' | 'opposing_team' | 'split' | null;
  policyVersion?: string | null;
  // Reservation cancellation policy (hours before booking start requiring owner approval)
  cancellationPolicyHours?: number | null;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface OperatingHours {
  [key: string]: TimeSlot[]; // key is day of week (monday, tuesday, etc.)
}

export interface TimeSlot {
  open: string; // HH:mm format
  close: string; // HH:mm format
}

export type PenaltyDestination = 'facility' | 'opposing_team' | 'split';

export interface CancellationPolicy {
  noticeWindowHours: number;
  teamPenaltyPct: number;
  penaltyDestination: PenaltyDestination;
  policyVersion: string;
}

export interface CancellationPolicyResponse extends CancellationPolicy {
  hasPolicy: boolean;
}

export interface FacilityPricing {
  hourlyRate?: number;
  dailyRate?: number;
  wholeFacilityRate?: number;
  currency: string;
  deposit?: number;
}

// ============================================================================
// EVENT MODELS
// ============================================================================

export interface Event {
  id: string;
  title: string;
  description: string;
  sportType: SportType;
  facilityId: string;
  facility?: Facility;
  organizerId: string;
  organizer?: User;
  teamIds?: string[];
  teams?: Team[];
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  currentParticipants: number;
  price: number;
  currency: string;
  skillLevel: SkillLevel;
  minPlayerRating?: number; // 0-100 percentile; null = open to all
  equipment: string[];
  rules?: string;
  status: EventStatus;
  eventType: EventType;
  participants: Participant[];
  // Eligibility restrictions
  eligibility?: EventEligibility;
  // Privacy
  isPrivate?: boolean;
  invitedUserIds?: string[];
  // League match relation
  matches?: any[]; // Match[] from league types
  // Rental relation
  rentalId?: string;
  rental?: {
    id: string;
    timeSlot: {
      id: string;
      court: {
        id: string;
        name: string;
        sportType: string;
      };
    };
  };
  // Group fee coverage
  isGroupFeeCovered?: boolean; // Event cost covered by roster balance
  coveringTeamId?: string; // Which roster is covering the cost
  createdAt: Date;
  updatedAt: Date;
}

export interface EventEligibility {
  restrictedToTeams?: string[]; // Specific team IDs allowed
  restrictedToLeagues?: string[]; // Specific league IDs allowed
  minAge?: number; // Minimum age requirement
  maxAge?: number; // Maximum age requirement
  requiredSkillLevel?: SkillLevel; // @deprecated — use minPlayerRating on Event
  minSkillLevel?: SkillLevel; // @deprecated — use minPlayerRating on Event
  maxSkillLevel?: SkillLevel; // @deprecated — use minPlayerRating on Event
  minPlayerRating?: number; // 0-100 percentile; null = open to all
  isInviteOnly?: boolean; // Requires invitation to join
  minimumPlayerCount?: number; // Minimum players needed (required for invite-only)
  wasAutoOpenedToPublic?: boolean; // Track if event was auto-opened
  autoOpenedAt?: Date; // When the event was auto-opened
}

export interface Participant {
  userId: string;
  user?: User;
  bookingId: string;
  joinedAt: Date;
  status: ParticipantStatus;
}

// ============================================================================
// BOOKING MODELS
// ============================================================================

export interface Booking {
  id: string;
  userId: string;
  user?: User;
  eventId: string;
  event?: Event;
  teamId?: string;
  team?: Team;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  bookedAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  debriefSubmitted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// TEAM MODELS
// ============================================================================

export interface Team {
  id: string;
  name: string;
  description?: string;
  captainId: string;
  captain?: User;
  members: TeamMember[];
  sportType: SportType;
  skillLevel: SkillLevel;
  maxMembers: number;
  isPublic: boolean;
  inviteCode?: string;
  logo?: string;
  leagueId?: string; // Optional league association
  league?: League;
  stats: TeamStats;
  // Roster balance fields
  balance: number; // Current roster balance in USD
  joinFee?: number; // Optional join fee amount
  joinFeeType?: JoinFeeType; // 'one_time' or 'monthly'
  stripeAccountId?: string; // Stripe Connect account
  lastBalanceUpdate: Date;
  transactions?: TeamTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface League {
  id: string;
  name: string;
  description?: string;
  sportType: SportType;
  skillLevel: SkillLevel;
  organizerId: string;
  organizer?: User;
  teams: Team[];
  isActive: boolean;
  season?: string; // e.g., "Spring 2024", "Fall 2023"
  startDate?: Date;
  endDate?: Date;
  logo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  user?: User;
  role: TeamRole;
  joinedAt: Date;
  status: MemberStatus;
}

export interface TeamStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  averageScore?: number;
}

// Default team stats for new teams
export const defaultTeamStats: TeamStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  winRate: 0,
  averageScore: 0,
};

// ============================================================================
// API AND UTILITY TYPES
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface EventFilters {
  sportType?: SportType;
  skillLevel?: SkillLevel;
  minPlayerRating?: number; // Filter events by max rating requirement
  startDate?: Date;
  endDate?: Date;
  facilityId?: string;
  organizerId?: string;
  eventType?: EventType;
  status?: EventStatus;
  priceMin?: number;
  priceMax?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

export interface FacilityFilters {
  sportTypes?: SportType[];
  amenities?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  priceMin?: number;
  priceMax?: number;
  rating?: number;
}

export interface TeamFilters {
  sportType?: SportType;
  skillLevel?: SkillLevel;
  isPublic?: boolean;
  hasOpenSlots?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface CreateEventData {
  title: string;
  description: string;
  sportType: SportType;
  facilityId: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  price: number;
  skillLevel: SkillLevel;
  minPlayerRating?: number; // 0-100 percentile; null = open to all
  equipment: string[];
  rules?: string;
  eventType: EventType;
  teamIds?: string[];
  eligibility?: EventEligibility;
  isPrivate?: boolean;
  invitedUserIds?: string[];
  rentalId?: string; // Link to FacilityRental if event is created from a rental
  organizerId?: string;
  homeRosterId?: string; // Home roster for game events
  awayRosterId?: string; // Away roster for game events
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: EventStatus;
}

export interface CreateFacilityData {
  name: string;
  description: string;
  address: Address;
  coordinates: Coordinates;
  amenities: string[];
  sportTypes: SportType[];
  contactInfo: ContactInfo;
  operatingHours: OperatingHours;
  pricing: FacilityPricing;
  cancellationPolicyHours?: number | null;
}

export interface UpdateFacilityData extends Partial<CreateFacilityData> {
  facilityMapUrl?: string | null;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  sportType: SportType;
  skillLevel: SkillLevel;
  maxMembers: number;
  isPublic: boolean;
}

export interface UpdateTeamData extends Partial<CreateTeamData> {}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: string;
  preferredSports?: SportType[];
  notificationPreferences?: NotificationPreferences;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  preferredSports: SportType[];
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

// ============================================================================
// SEARCH AND DISCOVERY TYPES
// ============================================================================

export interface SearchQuery {
  query: string;
  filters?: EventFilters | FacilityFilters | TeamFilters;
  pagination?: PaginationParams;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  query: string;
  filters?: any;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export enum NotificationType {
  EVENT_REMINDER = 'event_reminder',
  EVENT_CANCELLED = 'event_cancelled',
  EVENT_UPDATED = 'event_updated',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  TEAM_INVITATION = 'team_invitation',
  NEW_EVENT_ALERT = 'new_event_alert',
}

// ============================================================================
// OFFLINE AND SYNC TYPES
// ============================================================================

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: OfflineAction[];
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  type: 'user_data' | 'shared_data';
  localData: any;
  serverData: any;
  resolution?: 'local' | 'server' | 'merge';
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

// Re-export type guards and utilities
export * from './type-guards';
export * from './rating';


// ============================================================================
// FACILITY VERIFICATION TYPES
// ============================================================================

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum RateType {
  BASE = 'base',
  PEAK = 'peak',
  SEASONAL = 'seasonal',
  DISCOUNT = 'discount',
}

export interface FacilityVerification {
  id: string;
  facilityId: string;
  status: VerificationStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  expiresAt?: Date;
  rejectionReason?: string;
  reviewerNotes?: string;
  documents: VerificationDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationDocument {
  id: string;
  verificationId: string;
  fileName: string;
  fileUrl: string;
  fileType: string; // deed, lease, license, etc.
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface FacilityRateSchedule {
  id: string;
  facilityId: string;
  name: string; // e.g., "Weekend Peak Hours"
  rateType: RateType;
  hourlyRate: number;
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  minHours?: number;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacilityAvailability {
  id: string;
  facilityId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isRecurring: boolean;
  specificDate?: Date;
  isBlocked: boolean;
  blockReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacilityAccessImage {
  id: string;
  facilityId: string;
  imageUrl: string;
  caption?: string;
  displayOrder: number;
  createdAt: Date;
}

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

export interface AvailabilityCheckResult {
  available: boolean;
  conflicts?: Booking[];
}

// Extended Facility interface with verification fields
export interface FacilityWithVerification extends Facility {
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  accessInstructions?: string;
  parkingInfo?: string;
  minimumBookingHours: number;
  bufferTimeMins: number;
  verification?: FacilityVerification;
  rateSchedules?: FacilityRateSchedule[];
  availabilitySlots?: FacilityAvailability[];
  accessImages?: FacilityAccessImage[];
}

// ============================================================================
// DEPENDENT ACCOUNT TYPES
// ============================================================================

export * from './dependent';

// ============================================================================
// LEAGUE MANAGEMENT TYPES
// ============================================================================

export * from './league';
export * from './scheduling';

export interface TeamTransaction {
  id: string;
  teamId: string;
  type: TeamTransactionType;
  amount: number; // Positive for credits, negative for debits
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  stripePaymentId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  userId?: string;
  user?: User;
  rentalId?: string;
  rental?: any; // FacilityRental type
  createdAt: Date;
}

// ============================================================================
// EVENTS CALENDAR TYPES
// ============================================================================

export * from './eventsCalendar';


// ============================================================================
// EVENTS CALENDAR TYPES
// ============================================================================

export * from './eventsCalendar';
