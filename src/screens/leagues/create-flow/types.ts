import { SportType } from '../../../types';

// ── Day of week ──

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Roster invite shape ──

export interface LeagueRosterInvite {
  id: string;
  name: string;
}

// ── Wizard state ──

export interface LeagueWizardState {
  currentStep: number; // 0-3
  // Step 0: Sport
  sport: SportType | null;
  // Step 1: How
  hostName: string;
  leagueFormat: 'season' | 'season_with_playoffs' | 'tournament' | null;
  frequency: 'block' | 'weekly' | 'biweekly' | 'monthly' | null;
  startDate: Date | null;
  endDate: Date | null; // only for block schedule
  gamesPerRound: string;
  numberOfRounds: string;
  playoffTeamCount: string;
  playoffFormat: 'single_elimination' | 'double_elimination' | 'round_robin' | null;
  gameDays: DayOfWeek[]; // for weekly/biweekly/monthly
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  seriesEndDate: string; // auto-calculated, read-only
  // Step 2: Schedule Preview (derived from step 1, no additional state)
  // Step 3: Who
  gender: string;
  minAge: string;
  maxAge: string;
  skillLevel: string;
  visibility: 'private' | 'public' | null;
  invitedRosters: LeagueRosterInvite[];
  minPlayerRating: string;
  // Submission
  isSubmitting: boolean;
  showSuccess: boolean;
  createdLeagueId: string | null;
}

// ── Wizard actions ──

export type LeagueWizardAction =
  | { type: 'SET_SPORT'; sport: SportType }
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_LEAGUE_FORMAT'; format: 'season' | 'season_with_playoffs' | 'tournament' }
  | { type: 'SET_FREQUENCY'; frequency: 'block' | 'weekly' | 'biweekly' | 'monthly' }
  | { type: 'TOGGLE_DAY'; day: DayOfWeek }
  | { type: 'ADD_ROSTER'; roster: LeagueRosterInvite }
  | { type: 'REMOVE_ROSTER'; id: string }
  | { type: 'SET_VISIBILITY'; visibility: 'private' | 'public' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; leagueId: string }
  | { type: 'SUBMIT_FAIL' };

// ── Helpers ──

export function getSeasonFromDate(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 2 && month <= 4) return `Spring ${year}`;
  if (month >= 5 && month <= 7) return `Summer ${year}`;
  if (month >= 8 && month <= 10) return `Fall ${year}`;
  return `Winter ${year}`;
}

export function createInitialLeagueState(): LeagueWizardState {
  return {
    currentStep: 0,
    sport: null,
    hostName: '',
    leagueFormat: null,
    frequency: null,
    startDate: null,
    endDate: null,
    gamesPerRound: '',
    numberOfRounds: '',
    playoffTeamCount: '',
    playoffFormat: null,
    gameDays: [],
    timeStart: '',
    timeEnd: '',
    seriesEndDate: '',
    gender: '',
    minAge: '',
    maxAge: '',
    skillLevel: '',
    visibility: null,
    invitedRosters: [],
    minPlayerRating: '',
    isSubmitting: false,
    showSuccess: false,
    createdLeagueId: null,
  };
}
