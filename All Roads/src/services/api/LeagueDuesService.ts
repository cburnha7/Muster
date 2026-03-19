/**
 * League Dues API Service
 *
 * Handles API calls for roster-to-league season dues payments.
 */

import { BaseApiService, defaultApiConfig } from './BaseApiService';

export interface CreateLeagueDuesPaymentData {
  rosterId: string;
  leagueId: string;
  seasonId: string;
  managerId: string;
}

export interface CreateLeagueDuesPaymentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  platformFee: number;
}

export interface ConfirmLeagueDuesPaymentData {
  paymentIntentId: string;
  rosterId: string;
  leagueId: string;
  seasonId: string;
}

export interface ConfirmLeagueDuesResponse {
  status: string;
}

export interface LeagueDuesStatusResponse {
  paid: boolean;
  duesAmount: number | null;
  leagueName: string | null;
}

export interface RosterDuesStatusItem {
  rosterId: string;
  rosterName: string;
  sportType: string | null;
  imageUrl: string | null;
  membershipStatus: string;
  paid: boolean;
}

export interface LeagueRosterDuesStatusResponse {
  pricingType: string;
  duesAmount: number | null;
  rosters: RosterDuesStatusItem[];
}

class LeagueDuesService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Initiate a roster-to-league dues payment. Returns a Stripe client secret
   * for the frontend to complete payment.
   */
  async createPayment(data: CreateLeagueDuesPaymentData): Promise<CreateLeagueDuesPaymentResponse> {
    return this.post<CreateLeagueDuesPaymentResponse>('/league-dues', data);
  }

  /**
   * Confirm a league dues payment after Stripe payment succeeds.
   * Marks the roster as an active member of the league season.
   */
  async confirmPayment(data: ConfirmLeagueDuesPaymentData): Promise<ConfirmLeagueDuesResponse> {
    return this.post<ConfirmLeagueDuesResponse>('/league-dues/confirm', data);
  }

  /**
   * Get the dues payment status for a roster in a specific league and season.
   */
  async getStatus(
    rosterId: string,
    leagueId: string,
    seasonId: string,
  ): Promise<LeagueDuesStatusResponse> {
    return this.get<LeagueDuesStatusResponse>(
      `/league-dues/status?rosterId=${rosterId}&leagueId=${leagueId}&seasonId=${seasonId}`,
    );
  }

  /**
   * Get the dues payment status for ALL rosters in a league for a given season.
   * Used by commissioners to see which rosters have/haven't paid league dues.
   */
  async getLeagueRosterStatus(
    leagueId: string,
    seasonId: string,
  ): Promise<LeagueRosterDuesStatusResponse> {
    return this.get<LeagueRosterDuesStatusResponse>(
      `/league-dues/league-roster-status?leagueId=${leagueId}&seasonId=${seasonId}`,
    );
  }
}

export const leagueDuesService = new LeagueDuesService();
