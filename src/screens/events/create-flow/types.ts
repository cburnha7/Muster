import { SportType, EventType } from '../../../types';

// ── Slot & invite shapes (match existing CreateEventScreen.tsx) ──

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
  date: string; // YYYY-MM-DD
  slotCount: number;
}

export interface SlotForDate {
  id: string;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  price: number;
  isFromRental: boolean;
  rentalId: string | null;
}

// ── Wizard state ──

export interface WizardState {
  currentStep: number; // 0–4
  sport: SportType | null;
  eventType: EventType | null;
  minAge: string;
  maxAge: string;
  genderRestriction: string;
  skillLevel: string;
  maxParticipants: string;
  price: string;
  facilityId: string;
  facilityName: string;
  isOwner: boolean;
  courtId: string;
  courtName: string;
  selectedDate: string;
  selectedSlots: SlotData[];
  recurring: boolean;
  recurringFrequency: 'weekly' | 'biweekly' | 'monthly' | null;
  recurringEndDate: string;
  visibility: 'private' | 'public' | null;
  invitedItems: InviteItem[];
  minPlayerRating: string;
  isSubmitting: boolean;
  showSuccess: boolean;
  createdEventId: string | null;
}

// ── Wizard actions ──

export type WizardAction =
  | { type: 'SET_SPORT'; sport: SportType }
  | { type: 'SET_EVENT_TYPE'; eventType: EventType }
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_FACILITY'; facilityId: string; facilityName: string; isOwner: boolean }
  | { type: 'SET_COURT'; courtId: string; courtName: string }
  | { type: 'RESET_COURT' }
  | { type: 'SET_DATE'; date: string }
  | { type: 'TOGGLE_SLOT'; slot: SlotData; slotsForDate: SlotData[] }
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
    facilityId: '',
    facilityName: '',
    isOwner: false,
    courtId: '',
    courtName: '',
    selectedDate: '',
    selectedSlots: [],
    recurring: false,
    recurringFrequency: null,
    recurringEndDate: '',
    visibility: null,
    invitedItems: [],
    minPlayerRating: '',
    isSubmitting: false,
    showSuccess: false,
    createdEventId: null,
  };
}
