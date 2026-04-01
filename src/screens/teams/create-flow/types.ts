import { SportType } from '../../../types';

export interface RosterInviteItem {
  id: string;
  name: string;
  type: 'roster' | 'player';
  image?: string;
  pending?: boolean;
  email?: string;
}

export interface RosterWizardState {
  currentStep: number; // 0–2
  sport: SportType | null;
  name: string;
  gender: string;
  minAge: string;
  maxAge: string;
  maxPlayers: string;
  price: string;
  visibility: 'private' | 'public' | null;
  invitedItems: RosterInviteItem[];
  minPlayerRating: string;
  isSubmitting: boolean;
  showSuccess: boolean;
  createdRosterId: string | null;
}

export type RosterWizardAction =
  | { type: 'SET_SPORT'; sport: SportType }
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_VISIBILITY'; visibility: 'private' | 'public' }
  | { type: 'ADD_INVITE'; item: RosterInviteItem }
  | { type: 'REMOVE_INVITE'; id: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; rosterId: string }
  | { type: 'SUBMIT_FAIL' };

const DEFAULT_MAX: Record<string, number> = {
  basketball: 10, soccer: 22, tennis: 4, pickleball: 4,
  volleyball: 12, softball: 18, baseball: 18, flag_football: 14, kickball: 16,
};

export function getDefaultMaxPlayers(sport: string): number {
  return DEFAULT_MAX[sport] || 10;
}

export function createInitialRosterState(): RosterWizardState {
  return {
    currentStep: 0,
    sport: null,
    name: '',
    gender: '',
    minAge: '',
    maxAge: '',
    maxPlayers: '',
    price: '0',
    visibility: null,
    invitedItems: [],
    minPlayerRating: '',
    isSubmitting: false,
    showSuccess: false,
    createdRosterId: null,
  };
}
