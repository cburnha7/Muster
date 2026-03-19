import { User } from './index';
import { Team } from './index';
import { Event } from './index';

// League types
export interface League {
  id: string;
  name: string;
  description?: string;
  sportType: string;
  skillLevel: string;
  minPlayerRating?: number; // 0-100 percentile; null = open to all
  seasonId?: string;
  seasonName?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  isActive: boolean;
  pointsConfig: PointsConfig;
  imageUrl?: string;
  organizerId: string;
  organizer?: User;
  memberCount?: number;
  matchCount?: number;
  leagueType: 'team' | 'pickup';
  visibility: 'public' | 'private';
  membershipFee?: number;
  // League format
  leagueFormat?: 'season' | 'season_with_playoffs' | 'tournament';
  playoffTeamCount?: number | null;
  eliminationFormat?: 'single_elimination' | 'double_elimination' | null;
  gameFrequency?: 'all_at_once' | 'weekly' | 'monthly' | null;
  // Schedule management
  suggestedRosterSize?: number | null;
  minimumRosterSize?: number | null; // legacy alias
  registrationCloseDate?: Date | string | null;
  preferredGameDays?: number[];
  preferredTimeWindowStart?: string | null;
  preferredTimeWindowEnd?: string | null;
  seasonGameCount?: number | null;
  scheduleGenerated?: boolean;
  // Season configuration
  scheduleFrequency?: 'weekly' | 'monthly';
  seasonLength?: number | null;
  autoGenerateMatchups?: boolean;
  trackStandings?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PointsConfig {
  win: number;
  draw: number;
  loss: number;
}

export interface CreateLeagueData {
  name: string;
  description?: string;
  sportType: string;
  skillLevel: string;
  minPlayerRating?: number; // 0-100 percentile; null = open to all
  startDate?: Date | string;
  endDate?: Date | string;
  pointsConfig?: PointsConfig;
  imageUrl?: string;
  leagueType: 'team' | 'pickup';
  membershipFee?: number;
  // League format
  leagueFormat?: 'season' | 'season_with_playoffs' | 'tournament';
  playoffTeamCount?: number | null;
  eliminationFormat?: 'single_elimination' | 'double_elimination' | null;
  gameFrequency?: 'all_at_once' | 'weekly' | 'monthly' | null;
  // Schedule management
  suggestedRosterSize?: number | null;
  registrationCloseDate?: Date | string | null;
  preferredGameDays?: number[];
  preferredTimeWindowStart?: string | null;
  preferredTimeWindowEnd?: string | null;
  seasonGameCount?: number | null;
  // Season configuration
  scheduleFrequency?: 'weekly' | 'monthly';
  seasonLength?: number | null;
  autoGenerateMatchups?: boolean;
  trackStandings?: boolean;
}

export interface UpdateLeagueData {
  name?: string;
  description?: string;
  skillLevel?: string;
  minPlayerRating?: number | null; // 0-100 percentile; null = open to all
  startDate?: Date | string;
  endDate?: Date | string;
  pointsConfig?: PointsConfig;
  imageUrl?: string;
  isActive?: boolean;
  // League format
  leagueFormat?: 'season' | 'season_with_playoffs' | 'tournament';
  playoffTeamCount?: number | null;
  eliminationFormat?: 'single_elimination' | 'double_elimination' | null;
  gameFrequency?: 'all_at_once' | 'weekly' | 'monthly' | null;
  // Schedule management
  suggestedRosterSize?: number | null;
  registrationCloseDate?: Date | string | null;
  preferredGameDays?: number[];
  preferredTimeWindowStart?: string | null;
  preferredTimeWindowEnd?: string | null;
  seasonGameCount?: number | null;
  // Season configuration
  scheduleFrequency?: 'weekly' | 'monthly';
  seasonLength?: number | null;
  autoGenerateMatchups?: boolean;
  trackStandings?: boolean;
}

export interface LeagueFilters {
  sportType?: string;
  isActive?: boolean;
  search?: string;
}

// Match types
export interface Match {
  id: string;
  leagueId: string;
  league?: League;
  seasonId?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam?: Team;
  awayTeam?: Team;
  scheduledAt: Date | string;
  playedAt?: Date | string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  outcome?: MatchOutcome;
  eventId?: string;
  event?: Event;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MatchOutcome = 'home_win' | 'away_win' | 'draw';

export interface CreateMatchData {
  leagueId: string;
  seasonId?: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date | string;
  eventId?: string;
  notes?: string;
}

export interface UpdateMatchData {
  scheduledAt?: Date | string;
  status?: MatchStatus;
  notes?: string;
}

export interface RecordMatchResultData {
  homeScore: number;
  awayScore: number;
}

// Standings types
export interface TeamStanding {
  rank: number;
  team: Team;
  membership: LeagueMembership;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    form?: MatchOutcome[]; // Last 5 matches
  };
}

export interface LeagueMembership {
  id: string;
  leagueId: string;
  teamId: string;
  team?: Team;
  seasonId?: string;
  status: MembershipStatus;
  joinedAt: Date | string;
  leftAt?: Date | string;
  memberType: 'roster' | 'user';
  memberId: string;
  userId?: string;
  user?: User;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type MembershipStatus = 'active' | 'pending' | 'withdrawn';

// Player ranking types
export interface PlayerRanking {
  rank: number;
  player: User;
  team: Team;
  stats: {
    matchesPlayed: number;
    averageRating: number;
    totalVotes: number;
    goalsScored?: number;
    assists?: number;
    performanceScore: number;
  };
}

// Season types
export interface Season {
  id: string;
  leagueId: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSeasonData {
  leagueId: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
}

// Document types
export interface LeagueDocument {
  id: string;
  leagueId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  uploadedAt: Date | string;
  uploadedBy: string;
  uploader?: User;
}

export type DocumentType = 'rules' | 'insurance' | 'other';

// League event creation types
export interface CreateLeagueEventData {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  facilityId?: string;
  rosterIds?: string[]; // Only for Team Leagues
}

// League transaction types (financial ledger)
export interface LeagueTransaction {
  id: string;
  leagueId: string;
  seasonId: string;
  type: 'dues_received' | 'court_cost' | 'refund';
  amount: number;
  balanceAfter: number;
  description: string;
  rosterId?: string | null;
  facilityId?: string | null;
  rentalId?: string | null;
  matchId?: string | null;
  stripePaymentId?: string | null;
  createdAt: Date | string;
}

// Scheduling conflict types
export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: Array<{
    rosterId: string;
    rosterName: string;
    conflictingEventId: string;
    conflictingEventTitle: string;
    startTime: Date;
    endTime: Date;
  }>;
}
