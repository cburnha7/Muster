import { lightColors } from '../../theme/tokens';

/**
 * Player Rating Service
 *
 * Implements the rating system:
 * - game_rating = 1 + mean(rating of all participants)
 * - vote_share = votes_received / votes_actually_cast
 * - game_score = vote_share × game_rating
 * - player_rating = mean(game_scores over last 20 games [pickup] or current season [league])
 * - new player default = 1.0
 */

import {
  PlayerRating,
  GameParticipation,
  PlayerVote,
  GameRatingCalculation,
  RATING_CONSTANTS,
} from '../../types/rating';

export class PlayerRatingService {
  /**
   * Calculate the game rating for an event
   * Formula: 1 + mean(rating of all participants)
   */
  static calculateGameRating(participantRatings: number[]): number {
    if (participantRatings.length === 0) {
      return 1.0;
    }

    const meanRating =
      participantRatings.reduce((sum, rating) => sum + rating, 0) /
      participantRatings.length;
    return 1 + meanRating;
  }

  /**
   * Calculate vote share for a player
   * Formula: votes_received / votes_actually_cast
   */
  static calculateVoteShare(
    votesReceived: number,
    totalVotesCast: number
  ): number {
    if (totalVotesCast === 0) {
      return 0;
    }
    return votesReceived / totalVotesCast;
  }

  /**
   * Calculate game score for a player
   * Formula: vote_share × game_rating
   */
  static calculateGameScore(voteShare: number, gameRating: number): number {
    return voteShare * gameRating;
  }

  /**
   * Calculate player's overall rating from their game participations
   * - Pickup: mean of last 20 games
   * - League: mean of current season games
   */
  static calculatePlayerRating(
    gameParticipations: GameParticipation[],
    eventType: 'game' | 'practice' | 'pickup' | 'tournament'
  ): number {
    if (gameParticipations.length === 0) {
      return RATING_CONSTANTS.DEFAULT_RATING;
    }

    // Filter by event type
    const relevantGames = gameParticipations.filter(
      gp => gp.eventType === eventType
    );

    if (relevantGames.length === 0) {
      return RATING_CONSTANTS.DEFAULT_RATING;
    }

    // Sort by date (most recent first)
    const sortedGames = [...relevantGames].sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );

    // For pickup: take last 20 games
    // For league: take all games from current season (filtered by seasonId)
    const gamesToConsider =
      eventType === 'pickup'
        ? sortedGames.slice(0, RATING_CONSTANTS.PICKUP_GAMES_WINDOW)
        : sortedGames;

    // Calculate mean of game scores
    const totalScore = gamesToConsider.reduce(
      (sum, gp) => sum + gp.gameScore,
      0
    );
    const rating = totalScore / gamesToConsider.length;

    // Clamp rating between min and max
    return Math.max(
      RATING_CONSTANTS.MIN_RATING,
      Math.min(RATING_CONSTANTS.MAX_RATING, rating)
    );
  }

  /**
   * Process votes for a completed event and update all participant ratings
   */
  static async processEventRatings(
    eventId: string,
    participants: Array<{ userId: string; currentRating: number }>,
    votes: PlayerVote[],
    eventType: 'game' | 'practice' | 'pickup' | 'tournament',
    seasonId?: string
  ): Promise<GameRatingCalculation> {
    // Step 1: Calculate game rating
    const participantRatings = participants.map(p => p.currentRating);
    const gameRating = this.calculateGameRating(participantRatings);

    // Step 2: Count votes for each player
    const votesPerPlayer = new Map<string, number>();
    participants.forEach(p => votesPerPlayer.set(p.userId, 0));

    votes.forEach(vote => {
      const currentVotes = votesPerPlayer.get(vote.votedForId) || 0;
      votesPerPlayer.set(vote.votedForId, currentVotes + 1);
    });

    // Step 3: Calculate total votes cast
    const totalVotesCast = votes.length;

    // Step 4: Calculate game score for each participant
    const participantScores = new Map<string, number>();

    participants.forEach(participant => {
      const votesReceived = votesPerPlayer.get(participant.userId) || 0;
      const voteShare = this.calculateVoteShare(votesReceived, totalVotesCast);
      const gameScore = this.calculateGameScore(voteShare, gameRating);

      participantScores.set(participant.userId, gameScore);
    });

    return {
      eventId,
      gameRating,
      participantRatings: new Map(
        participants.map(p => [p.userId, p.currentRating])
      ),
      totalVotesCast,
      votesPerPlayer,
    };
  }

  /**
   * Create game participation records for all participants
   */
  static createGameParticipations(
    eventId: string,
    participants: Array<{ userId: string }>,
    calculation: GameRatingCalculation,
    votes: PlayerVote[],
    eventType: 'game' | 'practice' | 'pickup' | 'tournament',
    playedAt: Date,
    seasonId?: string
  ): Omit<GameParticipation, 'id' | 'createdAt' | 'updatedAt'>[] {
    // Count votes cast by each player
    const votesCastByPlayer = new Map<string, number>();
    votes.forEach(vote => {
      const currentCount = votesCastByPlayer.get(vote.voterId) || 0;
      votesCastByPlayer.set(vote.voterId, currentCount + 1);
    });

    return participants.map(participant => {
      const votesReceived =
        calculation.votesPerPlayer.get(participant.userId) || 0;
      const votesCast = votesCastByPlayer.get(participant.userId) || 0;
      const voteShare = this.calculateVoteShare(
        votesReceived,
        calculation.totalVotesCast
      );
      const gameScore = this.calculateGameScore(
        voteShare,
        calculation.gameRating
      );

      return {
        userId: participant.userId,
        eventId,
        gameScore,
        votesReceived,
        votesCast,
        gameRating: calculation.gameRating,
        participantCount: participants.length,
        playedAt,
        eventType,
        seasonId,
      };
    });
  }

  /**
   * Update player's overall rating based on their game history
   */
  static updatePlayerRating(
    userId: string,
    allGameParticipations: GameParticipation[]
  ): PlayerRating {
    const pickupGames = allGameParticipations.filter(
      gp => gp.eventType === 'pickup'
    );
    const gameEvents = allGameParticipations.filter(
      gp => gp.eventType === 'game'
    );
    const practiceEvents = allGameParticipations.filter(
      gp => gp.eventType === 'practice'
    );

    const pickupRating = this.calculatePlayerRating(pickupGames, 'pickup');
    const gameRating = this.calculatePlayerRating(gameEvents, 'game');
    const practiceRating = this.calculatePlayerRating(
      practiceEvents,
      'practice'
    );

    // Current rating is the weighted average of all event types
    // Pickup and games count more than practice
    let currentRating: number;
    const totalGames = pickupGames.length + gameEvents.length;
    const totalPractices = practiceEvents.length;

    if (totalGames > 0 && totalPractices > 0) {
      // Weight games/pickup 2x more than practice
      currentRating =
        (pickupRating * pickupGames.length +
          gameRating * gameEvents.length * 2 +
          practiceRating * totalPractices) /
        (pickupGames.length + gameEvents.length * 2 + totalPractices);
    } else if (totalGames > 0) {
      currentRating =
        pickupGames.length > 0 && gameEvents.length > 0
          ? (pickupRating + gameRating) / 2
          : pickupGames.length > 0
            ? pickupRating
            : gameRating;
    } else if (totalPractices > 0) {
      currentRating = practiceRating;
    } else {
      currentRating = RATING_CONSTANTS.DEFAULT_RATING;
    }

    return {
      userId,
      currentRating,
      pickupRating,
      leagueRating,
      totalGamesPlayed: allGameParticipations.length,
      pickupGamesPlayed: pickupGames.length,
      leagueGamesPlayed: leagueGames.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get rating display information
   */
  static getRatingDisplay(rating: number): {
    rating: number;
    stars: number;
    label: string;
    color: string;
  } {
    // Convert rating (0-5) to stars (0-5)
    const stars = Math.round(rating * 10) / 10; // Round to 1 decimal

    let label: string;
    let color: string;

    if (rating >= 4.0) {
      label = 'Elite';
      color = lightColors.gold; // Gold
    } else if (rating >= 3.0) {
      label = 'Advanced';
      color = lightColors.warning; // Orange
    } else if (rating >= 2.0) {
      label = 'Intermediate';
      color = lightColors.success; // Green
    } else if (rating >= 1.0) {
      label = 'Developing';
      color = lightColors.cobalt; // Blue
    } else {
      label = 'New Player';
      color = lightColors.inkMuted; // Gray
    }

    return {
      rating: Math.round(rating * 100) / 100, // Round to 2 decimals
      stars,
      label,
      color,
    };
  }

  /**
   * Check if a player has enough games for a stable rating
   */
  static hasStableRating(gamesPlayed: number): boolean {
    return gamesPlayed >= RATING_CONSTANTS.MIN_GAMES_FOR_RATING;
  }

  /**
   * Calculate rating trend (improving, declining, stable)
   */
  static calculateRatingTrend(
    recentGames: GameParticipation[],
    windowSize: number = 5
  ): 'improving' | 'declining' | 'stable' {
    if (recentGames.length < windowSize * 2) {
      return 'stable';
    }

    // Sort by date (most recent first)
    const sorted = [...recentGames].sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );

    // Compare recent window vs previous window
    const recentWindow = sorted.slice(0, windowSize);
    const previousWindow = sorted.slice(windowSize, windowSize * 2);

    const recentAvg =
      recentWindow.reduce((sum, gp) => sum + gp.gameScore, 0) /
      recentWindow.length;
    const previousAvg =
      previousWindow.reduce((sum, gp) => sum + gp.gameScore, 0) /
      previousWindow.length;

    const difference = recentAvg - previousAvg;
    const threshold = 0.1; // 10% change threshold

    if (difference > threshold) {
      return 'improving';
    } else if (difference < -threshold) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Get leaderboard rankings
   */
  static rankPlayers(
    players: PlayerRating[],
    type: 'overall' | 'pickup' | 'league' = 'overall'
  ): Array<PlayerRating & { rank: number }> {
    const ratingKey =
      type === 'pickup'
        ? 'pickupRating'
        : type === 'league'
          ? 'leagueRating'
          : 'currentRating';

    // Sort by rating (highest first)
    const sorted = [...players].sort((a, b) => b[ratingKey] - a[ratingKey]);

    // Assign ranks (handle ties)
    let currentRank = 1;
    return sorted.map((player, index) => {
      if (index > 0 && sorted[index - 1][ratingKey] !== player[ratingKey]) {
        currentRank = index + 1;
      }
      return {
        ...player,
        rank: currentRank,
      };
    });
  }
}
