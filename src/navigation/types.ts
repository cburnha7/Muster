import { NavigatorScreenParams } from '@react-navigation/native';

// Root Stack Navigator Types
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Onboarding Stack Types
export type OnboardingStackParamList = {
  Welcome: undefined;
  FeatureOverview: undefined;
  GetStarted: undefined;
};

// Auth Stack Types
export type AuthStackParamList = {
  Login: undefined;
  Registration: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

// Main Tab Navigator Types
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Events: NavigatorScreenParams<EventsStackParamList>;
  Facilities: NavigatorScreenParams<FacilitiesStackParamList>;
  Teams: NavigatorScreenParams<TeamsStackParamList>;
  Leagues: NavigatorScreenParams<LeaguesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Individual Tab Stack Types
export type HomeStackParamList = {
  HomeScreen: undefined;
  EventDetails: { eventId: string };
  EditEvent: { eventId: string };
  FacilityDetails: { facilityId: string };
  SearchResults: { query: string; filters?: any };
  Debrief: { eventId: string; readonly?: boolean };
  PendingReservationDetails: { rentalId: string };
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetails: { eventId: string };
  CreateEvent: {
    rentalId?: string;
    fromReservation?: boolean;
    facilityId?: string;
    facilityName?: string;
    courtId?: string;
    courtName?: string;
    courtSportType?: string;
    timeSlotId?: string;
    reservedDate?: string;
    reservedStartTime?: string;
    reservedEndTime?: string;
  };
  EditEvent: {
    eventId: string;
    fromBooking?: boolean;
    facilityId?: string;
    facilityName?: string;
    courtId?: string;
    courtName?: string;
    courtSportType?: string;
    timeSlotId?: string;
    reservedDate?: string;
    reservedStartTime?: string;
    reservedEndTime?: string;
  };
};

export type FacilitiesStackParamList = {
  FacilitiesList: {
    eventDate?: string;
    eventStartTime?: string;
    returnTo?: 'CreateEvent' | 'EditEvent';
    returnParams?: Record<string, any>;
  } | undefined;
  FacilityDetails: {
    facilityId: string;
    eventDate?: string;
    eventStartTime?: string;
    returnTo?: 'CreateEvent' | 'EditEvent';
    returnParams?: Record<string, any>;
  };
  CreateFacility: undefined;
  EditFacility: { facilityId: string };
  ManageGround: { facilityId: string; facilityName: string };
  AddCourt: { facilityId: string };
  FacilityMapEditor: { facilityId: string; facilityName: string; currentMapUrl?: string };
  GroundAvailability: { facilityId: string; facilityName: string };
  CourtAvailability: {
    facilityId: string;
    facilityName: string;
    courtId?: string;
    /** When navigating from event create/edit, pass event context */
    eventDate?: string;
    eventStartTime?: string;
    returnTo?: 'CreateEvent' | 'EditEvent';
    returnParams?: Record<string, any>;
  };
  CancellationPolicy: { facilityId: string };
  MyRentals: undefined;
};

export type TeamsStackParamList = {
  TeamsList: undefined;
  TeamDetails: { teamId: string; readOnly?: boolean };
  CreateTeam: undefined;
  JoinTeam: { inviteCode?: string };
  CreateGameChallenge: { challengerRosterId: string };
  AcceptGameChallenge: { bookingId: string };
  CreatePublicEvent: { rosterId: string };
  PayPlayerDues: { rosterId: string; seasonId: string };
  EventDetails: { eventId: string };
};

export type LeaguesStackParamList = {
  LeaguesBrowser: undefined;
  LeagueDetails: { leagueId: string; readOnly?: boolean };
  CreateLeague: undefined;
  ManageLeague: { leagueId: string };
  CreateMatch: { leagueId: string; seasonId?: string };
  RecordMatchResult: { matchId: string };
  AssignFacility: { matchId: string };
  DocumentViewer: { leagueId: string; documentId: string; documentName?: string };
  PayLeagueDues: { rosterId: string; leagueId: string; seasonId: string };
  LeagueScheduling: { leagueId: string };
  LeagueDeletionConfirm: { leagueId: string };
};

export type BookingsStackParamList = {
  BookingsList: undefined;
  BookingDetails: { bookingId: string };
  BookingHistory: undefined;
  Debrief: { eventId: string; readonly?: boolean };
};

export type ProfileStackParamList = {
  ProfileScreen: undefined;
  EditProfile: undefined;
  Settings: undefined;
  NotificationPreferences: undefined;
  DependentForm: { dependentId?: string };
  DependentProfile: { dependentId: string };
  TransferAccount: { dependentId: string };
  RedeemCode: undefined;
};

// Navigation Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  navigation: any;
  route: { params: RootStackParamList[T] };
};

export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> = {
  navigation: any;
  route: { params: OnboardingStackParamList[T] };
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = {
  navigation: any;
  route: { params: AuthStackParamList[T] };
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = {
  navigation: any;
  route: { params: MainTabParamList[T] };
};