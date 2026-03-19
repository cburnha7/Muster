/**
 * Player Dues API Service
 *
 * Handles API calls for player season dues payments.
 */

import { BaseApiService, defaultApiConfig } from './BaseApiService';

export interface CreateDuesPaymentData {
  playerId: string;
  rosterId: string;
  seasonId: string;
}

export interface CreateDuesPaymentResponse {
  paymentId: string;
  clientSecret: string;
  amount: number;
  platformFee: number;
}

export interface ConfirmDuesPaymentResponse {
  status: string;
}

export interface DuesStatusResponse {
  paid: boolean;
  paymentStatus: string | null;
  duesAmount: number | null;
  paymentId: string | null;
}

export interface PlayerDuesStatusItem {
  playerId: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  role: string;
  paid: boolean;
  paymentStatus: string | null;
}

export interface RosterDuesStatusResponse {
  duesAmount: number | null;
  players: PlayerDuesStatusItem[];
}

class PlayerDuesService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Initiate a player dues payment. Returns a Stripe client secret
   * for the frontend to complete payment.
   */
  async createPayment(data: CreateDuesPaymentData): Promise<CreateDuesPaymentResponse> {
    return this.post<CreateDuesPaymentResponse>('/player-dues', data);
  }

  /**
   * Confirm a dues payment after Stripe payment succeeds.
   */
  async confirmPayment(
    paymentId: string,
    paymentIntentId: string,
  ): Promise<ConfirmDuesPaymentResponse> {
    return this.post<ConfirmDuesPaymentResponse>(
      `/player-dues/${paymentId}/confirm`,
      { paymentIntentId },
    );
  }

  /**
   * Get the dues payment status for a player in a specific roster and season.
   */
  async getStatus(
    playerId: string,
    rosterId: string,
    seasonId: string,
  ): Promise<DuesStatusResponse> {
    return this.get<DuesStatusResponse>(
      `/player-dues/status?playerId=${playerId}&rosterId=${rosterId}&seasonId=${seasonId}`,
    );
  }

  /**
   * Get the dues payment status for ALL players in a roster for a given season.
   * Used by roster managers to see which players have/haven't paid.
   */
  async getRosterStatus(
    rosterId: string,
    seasonId: string,
  ): Promise<RosterDuesStatusResponse> {
    return this.get<RosterDuesStatusResponse>(
      `/player-dues/roster-status?rosterId=${rosterId}&seasonId=${seasonId}`,
    );
  }
}

export const playerDuesService = new PlayerDuesService();
