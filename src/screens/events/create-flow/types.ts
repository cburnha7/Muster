import { SportType, EventType } from '../../../types';

// ── Slot & invite shapes ──

export interface SlotData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  court: { id: string; name: string; sportType: string; capacity: number };
  isFromRental: boolean;
  rentalId: string | null;
}

export interface InviteItem {
  id: string;
  name: string;
  type: 'roster' | 'player';
  image?: string;
}

// ── API response shapes ──

export interface CourtForEvent {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  availableSlotCount: number;
}

export interface DateForCourt {
  date: string;
  slotCount: number;
}

export interface SlotForDate {
  id: string;
  startTime: string;
  endTime: string;
  price: number;
  isFromRental: boolean;
  rentalId: string | null;
}

// ── Per-occurrence location for recurring events ──

export interface OccurrenceLocation {
  date: string;           // YYYY-MM-DD
  facilityId?: string;
  facilityName?: string;
  courtId?: string;
  courtName?: string;
  booked: boolean;
}

// ── Day of week ──

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Map JS Date.getDay() (0=Sun) to our DayOfWeek
export const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
};

// ── Wizard state ──

export interface WizardState {
  currentStep: number; // 0–4
  // Step 1: Sport
  sport: SportType | null;
  // Step 2: Details
  eventType: EventType | null;
  minAge: string;
  maxAge: string;
  genderRestriction: string;
  skillLevel: string;
  maxParticipants: string;
  price: string;
  // Step 3: When
  startDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  recurring: boolean;
  recurringFrequency: 'weekly' | 'biweekly' | 'monthly' | null;
  recurringDays: DayOfWeek[];
  numberOfEvents: string;
  recurringEndDate: string; // auto-calculated, read-only display
  // Step 4: Where
  locationMode: 'muster' | 'open' | null;
  facilityId: string;
  facilityName: string;
  isOwner: boolean;
  courtId: string;
  courtName: string;
  selectedDate: string;
  selectedSlots: SlotData[];
  occurrenceLocations: OccurrenceLocation[];
  locationName: string;    // open ground free-text name
  locationAddress: string; // open ground address
  locationLat: number | null;
  locationLng: number | null;
  // Step 5: Invite
  visibility: 'private' | 'public' | null;
  invitedItems: InviteItem[];
  minPlayerRating: string;
  // Submission
  isSubmitting: boolean;
  showSuccess: boolean;
  createdEventId: string | null;
}

// ── Wizard actions ──

export type WizardAction =
  | { type: 'SET_SPORT'; sport: SportType }
  | { type: 'SET_EVENT_TYPE'; eventType: EventType }
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_LOCATION_MODE'; mode: 'muster' | 'open' }
  | { type: 'SET_FACILITY'; facilityId: string; facilityName: string; isOwner: boolean }
  | { type: 'SET_COURT'; courtId: string; courtName: string }
  | { type: 'RESET_COURT' }
  | { type: 'SET_DATE'; date: string }
  | { type: 'TOGGLE_SLOT'; slot: SlotData; slotsForDate: SlotData[] }
  | { type: 'TOGGLE_RECURRING_DAY'; day: DayOfWeek }
  | { type: 'SET_OCCURRENCE_LOCATIONS'; locations: OccurrenceLocation[] }
  | { type: 'UPDATE_OCCURRENCE'; index: number; location: Partial<OccurrenceLocation> }
  | { type: 'SET_VISIBILITY'; visibility: 'private' | 'public' }
  | { type: 'ADD_INVITE'; item: InviteItem }
  | { type: 'REMOVE_INVITE'; id: string }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; eventId: string }
  | { type: 'SUBMIT_FAIL' };

// ── Initial state factory ──

export function createInitialState(): WizardState {
  return {
    currentStep: 0,
    sport: null,
    eventType: null,
    minAge: '',
    maxAge: '',
    genderRestriction: '',
    skillLevel: '',
    maxParticipants: '',
    price: '',
    startDate: new Date(),
    startTime: (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; })(),
    endTime: (() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 2); return d; })(),
    recurring: false,
    recurringFrequency: null,
    recurringDays: [],
    numberOfEvents: '',
    recurringEndDate: '',
    locationMode: null,
    facilityId: '',
    facilityName: '',
    isOwner: false,
    courtId: '',
    courtName: '',
    selectedDate: '',
    selectedSlots: [],
    occurrenceLocations: [],
    locationName: '',
    locationAddress: '',
    locationLat: null,
    locationLng: null,
    visibility: null,
    invitedItems: [],
    minPlayerRating: '',
    isSubmitting: false,
    showSuccess: false,
    createdEventId: null,
  };
}
