/**
 * Game Challenge API Service
 *
 * Handles API calls for the pickup game challenge flow.
 */

import { BaseApiService, defaultApiConfig } from './BaseApiService';

export interface CreateGameChallengeData {
  userId: string;
  challengerRosterId: string;
  opponentRosterId: string;
  facilityId: string;
  courtId: string;
  timeSlotId: string;
}

export interface GameChallengeParticipant {
  id: string;
  rosterId: string;
  role: 'home' | 'away';
  escrowAmount: number;
  paymentStatus: string;
  confirmedAt?: string | null;
  confirmationDeadline: string;
}

export interface GameChallengeResponse {
  id: string;
  status: string;
  bookingType: string;
  totalPrice: number;
  bookingHostType: string;
  bookingHostId: string;
  facility: { id: string; name: string; street: string; city: string };
  court: { id: string; name: string; sportType: string };
  participants: GameChallengeParticipant[];
  timeSlot: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
  };
  challengerRoster: { id: string; name: string };
  opponentRoster: { id: string; name: string };
}

export interface BalanceShortfall {
  rosterId: string;
  rosterName: string;
  role: string;
  required: number;
  shortfall: number;
}

export interface AcceptChallengeResponse extends GameChallengeResponse {
  homeRoster: { id: string; name: string };
  awayRoster: { id: string; name: string };
  balanceCheck: {
    home: { sufficient: boolean; shortfall: number };
    away: { sufficient: boolean; shortfall: number };
  };
}

export interface AcceptChallengeError {
  error: string;
  message: string;
  shortfalls: BalanceShortfall[];
}

class GameChallengeService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Create a new game challenge
   */
  async createChallenge(data: CreateGameChallengeData): Promise<GameChallengeResponse> {
    return this.post<GameChallengeResponse>('/game-challenges', data);
  }

  /**
   * Get a game challenge by booking ID
   */
  async getChallenge(bookingId: string): Promise<GameChallengeResponse> {
    return this.get<GameChallengeResponse>(`/game-challenges/${bookingId}`, {
      cacheOptions: { ttl: 15000 },
    });
  }

  /**
   * Accept a game challenge (opponent roster manager).
   * Runs balance checks against both rosters before proceeding.
   */
  async acceptChallenge(bookingId: string, userId: string): Promise<AcceptChallengeResponse> {
    return this.post<AcceptChallengeResponse>(`/game-challenges/${bookingId}/accept`, { userId });
  }
}

export const gameChallengeService = new GameChallengeService();
