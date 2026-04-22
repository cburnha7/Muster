import { SportType } from '../../../types';

// ── Day of week ──

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export const ALL_DAYS: DayOfWeek[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];

// ── Roster invite shape ──

export interface LeagueRosterInvite {
  id: string;
  name: string;
}

// ── Wizard state ──

export interface LeagueWizardState {
  currentStep: number; // 0-4
  // Step 0: Sport
  sport: SportType | null;
  // Step 1: How
  hostName: string;
  leagueFormat: 'season' | 'season_with_playoffs' | 'tournament' | null;
  frequency: 'block' | 'weekly' | 'biweekly' | 'monthly' | null;
  gameDays: DayOfWeek[];
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  gameDuration: number; // minutes: 30, 60, 90, 120
  numberOfGames: string; // total games in the league
  gamesPerPeriod: string; // games per week/biweek/month
  // Step 2: Who
  numberOfTeams: string;
  maxBirthYear: string; // e.g. "2014"
  gender: string;
  skillLevel: string;
  visibility: 'private' | 'public' | null;
  invitedRosters: LeagueRosterInvite[];
  minPlayerRating: string;
  coverImageUrl: string | null;
  // Step 3: Schedule Preview
  startDate: Date | null;
  endDate: Date | null;
  // Step 4: Invite (unchanged — reuses Step4Who visibility/invite section)
  // Legacy fields kept for backward compat
  gamesPerRound: string;
  numberOfRounds: string;
  playoffTeamCount: string;
  playoffFormat:
    | 'single_elimination'
    | 'double_elimination'
    | 'round_robin'
    | null;
  seriesEndDate: string;
  minAge: string;
  maxAge: string;
  // Submission
  isSubmitting: boolean;
  showSuccess: boolean;
  createdLeagueId: string | null;
}

// ── Wizard actions ──

export type LeagueWizardAction =
  | { type: 'SET_SPORT'; sport: SportType }
  | { type: 'SET_FIELD'; field: string; value: any }
  | {
      type: 'SET_LEAGUE_FORMAT';
      format: 'season' | 'season_with_playoffs' | 'tournament';
    }
  | {
      type: 'SET_FREQUENCY';
      frequency: 'block' | 'weekly' | 'biweekly' | 'monthly';
    }
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
  const month = date.getMonth(); // 0-11
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
    gameDays: [],
    timeStart: '',
    timeEnd: '',
    gameDuration: 60,
    numberOfGames: '',
    gamesPerPeriod: '',
    numberOfTeams: '',
    maxBirthYear: '',
    gender: '',
    skillLevel: '',
    visibility: null,
    invitedRosters: [],
    minPlayerRating: '',
    coverImageUrl: null,
    startDate: new Date(),
    endDate: null,
    gamesPerRound: '',
    numberOfRounds: '',
    playoffTeamCount: '',
    playoffFormat: null,
    seriesEndDate: '',
    minAge: '',
    maxAge: '',
    isSubmitting: false,
    showSuccess: false,
    createdLeagueId: null,
  };
}
