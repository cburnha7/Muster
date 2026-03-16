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
  Bookings: NavigatorScreenParams<BookingsStackParamList>;
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
};

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetails: { eventId: string };
  CreateEvent: { rentalId?: string };
  EditEvent: { eventId: string };
};

export type FacilitiesStackParamList = {
  FacilitiesList: undefined;
  FacilityDetails: { facilityId: string };
  CreateFacility: undefined;
  EditFacility: { facilityId: string };
  ManageGround: { facilityId: string; facilityName: string };
  AddCourt: { facilityId: string };
  FacilityMapEditor: { facilityId: string; facilityName: string; currentMapUrl?: string };
  GroundAvailability: { facilityId: string; facilityName: string };
  CourtAvailability: { facilityId: string; facilityName: string; courtId?: string };
  MyRentals: undefined;
};

export type TeamsStackParamList = {
  TeamsList: undefined;
  TeamDetails: { teamId: string; readOnly?: boolean };
  CreateTeam: undefined;
  JoinTeam: { inviteCode?: string };
};

export type LeaguesStackParamList = {
  LeaguesBrowser: undefined;
  LeagueDetails: { leagueId: string; readOnly?: boolean };
  CreateLeague: undefined;
  ManageLeague: { leagueId: string };
  CreateMatch: { leagueId: string; seasonId?: string };
  RecordMatchResult: { matchId: string };
  DocumentViewer: { leagueId: string; documentId: string; documentName?: string };
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