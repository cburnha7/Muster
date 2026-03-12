/**
 * Player Rating System Types
 * 
 * Formula:
 * - game_rating = 1 + mean(rating of all participants)
 * - vote_share = votes_received / votes_actually_cast
 * - game_score = vote_share × game_rating
 * - player_rating = mean(game_scores over last 20 games [pickup] or current season [league])
 * - new player default = 1.0
 */

export interface PlayerRating {
  userId: string;
  currentRating: number; // Current overall rating
  pickupRating: number; // Rating for pickup games (last 20 games)
  leagueRating: number; // Rating for league games (current season)
  totalGamesPlayed: number;
  pickupGamesPlayed: number;
  leagueGamesPlayed: number;
  lastUpdated: Date;
}

export interface GameParticipation {
  id: string;
  userId: string;
  eventId: string;
  gameScore: number; // Calculated: vote_share × game_rating
  votesReceived: number;
  votesCast: number; // How many votes this player cast
  gameRating: number; // The game's overall rating
  participantCount: number;
  playedAt: Date;
  eventType: 'game' | 'practice' | 'pickup' | 'camp'; // Game/Practice use season-based, Pickup uses last 20
  seasonId?: string; // For game/practice events
}

export interface PlayerVote {
  id: string;
  eventId: string;
  voterId: string; // User who cast the vote
  votedForId: string; // User who received the vote
  createdAt: Date;
}

export interface GameRatingCalculation {
  eventId: string;
  gameRating: number; // 1 + mean(rating of all participants)
  participantRatings: Map<string, number>; // userId -> their rating at time of game
  totalVotesCast: number;
  votesPerPlayer: Map<string, number>; // userId -> votes received
}

export interface RatingHistory {
  userId: string;
  ratings: RatingSnapshot[];
}

export interface RatingSnapshot {
  rating: number;
  gamesPlayed: number;
  timestamp: Date;
  eventType: 'game' | 'practice' | 'pickup' | 'camp';
}

// Constants
export const RATING_CONSTANTS = {
  DEFAULT_RATING: 1.0,
  PICKUP_GAMES_WINDOW: 20, // Last 20 games for pickup rating
  MIN_GAMES_FOR_RATING: 3, // Minimum games before rating is considered stable
  MAX_RATING: 5.0, // Theoretical maximum (if you get all votes in a 5.0 rated game)
  MIN_RATING: 0.0, // Theoretical minimum
} as const;
