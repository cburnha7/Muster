import { SportType } from '../../../types';

// ── Court & Hours shapes ──

export interface CourtFormData {
  id: string;
  name: string;
  sportType: string;
  capacity: number;
  isIndoor: boolean;
  pricePerHour: number;
}

export interface DayHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

// ── Wizard state ──

export interface FacilityWizardState {
  currentStep: number; // 0-4
  // Step 0: Name & Sports
  name: string;
  sportTypes: SportType[];
  // Step 1: Location
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  // Step 2: Contact
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactWebsite: string;
  // Step 3: Courts & Settings
  courts: CourtFormData[];
  hoursOfOperation: DayHours[];
  // Step 4: Policies & Waivers
  cancellationPolicyHours: number | null;
  requiresBookingConfirmation: boolean;
  requiresInsurance: boolean;
  waiverRequired: boolean;
  waiverText: string;
  // Submission
  isSubmitting: boolean;
  showSuccess: boolean;
  createdFacilityId: string | null;
}

// ── Wizard actions ──

export type FacilityWizardAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'ADD_COURT'; court: CourtFormData }
  | { type: 'UPDATE_COURT'; court: CourtFormData }
  | { type: 'REMOVE_COURT'; courtId: string }
  | { type: 'SET_HOURS'; hours: DayHours[] }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; facilityId: string }
  | { type: 'SUBMIT_FAIL' };

// ── Initial state factory ──

export function createInitialFacilityState(): FacilityWizardState {
  return {
    currentStep: 0,
    name: '',
    sportTypes: [],
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactWebsite: '',
    courts: [],
    hoursOfOperation: [],
    cancellationPolicyHours: null,
    requiresBookingConfirmation: false,
    requiresInsurance: false,
    waiverRequired: false,
    waiverText: '',
    isSubmitting: false,
    showSuccess: false,
    createdFacilityId: null,
  };
}
