import { BaseApiService, defaultApiConfig } from './BaseApiService';
import {
  League,
  CreateLeagueData,
  UpdateLeagueData,
  LeagueFilters,
  TeamStanding,
  PlayerRanking,
  LeagueMembership,
  LeagueDocument,
  LeagueTransaction,
  CreateLeagueEventData,
  ConflictResult
} from '../../types/league';
import { Event } from '../../types';
import { PaginatedResponse } from '../../types';

export interface DeletionImpactSummary {
  leagueId: string;
  leagueName: string;
  eventCount: number;
  rentalCount: number;
  stripeRefunds: {
    count: number;
    totalAmount: number;
  };
  rosterBalanceRefunds: {
    count: number;
    totalAmount: number;
  };
}

export interface RosterStrikeData {
  rosterId: string;
  rosterName: string;
  rosterImageUrl: string | null;
  strikeCount: number;
}

export class LeagueService extends BaseApiService {
  constructor() {
    super(defaultApiConfig);
  }

  /**
   * Get all leagues with filtering and pagination
   */
  async getLeagues(
    filters?: LeagueFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<League>> {
    const params = {
      ...filters,
      page,
      limit
    };

    return this.get<PaginatedResponse<League>>('/leagues', {
      params,
      cacheOptions: { ttl: 60000 } // Cache for 1 minute
    });
  }

  /**
   * Get league by ID
   */
  async getLeagueById(id: string, skipCache: boolean = false): Promise<League> {
    return this.get<League>(`/leagues/${id}`, {
      cacheOptions: skipCache ? { skipCache: true } : { ttl: 30000 }
    });
  }

  /**
   * Create new league
   */
  async createLeague(data: CreateLeagueData, userId: string): Promise<League> {
    return this.post<League>('/leagues', {
      ...data,
      organizerId: userId
    });
  }

  /**
   * Update league
   */
  async updateLeague(id: string, data: UpdateLeagueData, userId: string): Promise<League> {
    return this.put<League>(`/leagues/${id}`, {
      ...data,
      userId
    });
  }

  /**
   * Delete league (cascade deletion with refunds)
   */
  async deleteLeague(id: string, userId: string): Promise<void> {
    return this.delete<void>(`/leagues/${id}`, {
      data: { userId }
    });
  }

  /**
   * Get deletion impact preview for a league
   */
  async getDeletionPreview(id: string): Promise<DeletionImpactSummary> {
    return this.get<DeletionImpactSummary>(`/leagues/${id}/deletion-preview`, {
      cacheOptions: { skipCache: true }
    });
  }

  /**
   * Get league standings
   */
  async getStandings(leagueId: string, seasonId?: string): Promise<TeamStanding[]> {
    const params = seasonId ? { seasonId } : {};
    return this.get<TeamStanding[]>(`/leagues/${leagueId}/standings`, {
      params,
      cacheOptions: { ttl: 5000 } // Cache for 5 seconds (standings update frequently)
    });
  }

  /**
   * Get player rankings
   */
  async getPlayerRankings(
    leagueId: string,
    seasonId?: string,
    sortBy: string = 'performanceScore',
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<PlayerRanking>> {
    const params = {
      seasonId,
      sortBy,
      page,
      limit
    };

    return this.get<PaginatedResponse<PlayerRanking>>(`/leagues/${leagueId}/player-rankings`, {
      params,
      cacheOptions: { ttl: 10000 } // Cache for 10 seconds
    });
  }

  /**
   * Join league with a team
   */
  async joinLeague(leagueId: string, teamId: string, userId: string): Promise<LeagueMembership> {
    return this.post<LeagueMembership>(`/leagues/${leagueId}/join`, {
      teamId,
      userId
    });
  }

  /**
   * Leave league
   */
  async leaveLeague(leagueId: string, teamId: string, userId: string): Promise<void> {
    return this.post<void>(`/leagues/${leagueId}/leave`, {
      teamId,
      userId
    });
  }

  /**
   * Get league members
   */
  async getMembers(
    leagueId: string,
    page: number = 1,
    limit: number = 50,
    includePending: boolean = false
  ): Promise<PaginatedResponse<LeagueMembership>> {
    const params: any = { page, limit };
    if (includePending) params.includePending = 'true';
    return this.get<PaginatedResponse<LeagueMembership>>(`/leagues/${leagueId}/members`, {
      params,
      cacheOptions: { ttl: 5000 } // Short TTL to keep roster lists fresh
    });
  }

  /**
   * Get league documents
   */
  async getDocuments(leagueId: string): Promise<LeagueDocument[]> {
    return this.get<LeagueDocument[]>(`/leagues/${leagueId}/documents`, {
      cacheOptions: { ttl: 60000 } // Cache for 1 minute
    });
  }

  /**
   * Upload document
   */
  async uploadDocument(
    leagueId: string,
    file: File | Blob,
    documentType: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<LeagueDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('userId', userId);
    formData.append('leagueId', leagueId);

    return this.uploadFile<LeagueDocument>(`/leagues/${leagueId}/documents`, formData, onProgress);
  }

  /**
   * Delete document
   */
  async deleteDocument(leagueId: string, documentId: string, userId: string): Promise<void> {
    return this.delete<void>(`/leagues/${leagueId}/documents/${documentId}`, {
      data: { userId }
    });
  }

  /**
   * Download document
   */
  async downloadDocument(leagueId: string, documentId: string): Promise<{ url: string; fileName: string; mimeType: string }> {
    return this.get<{ url: string; fileName: string; mimeType: string }>(
      `/leagues/${leagueId}/documents/${documentId}/download`
    );
  }

  /**
   * Search leagues by name
   */
  async searchLeagues(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ search: query }, page, limit);
  }

  /**
   * Get leagues by sport type
   */
  async getLeaguesBySport(sportType: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ sportType }, page, limit);
  }

  /**
   * Get active leagues
   */
  async getActiveLeagues(page: number = 1, limit: number = 20): Promise<PaginatedResponse<League>> {
    return this.getLeagues({ isActive: true }, page, limit);
  }

  /**
   * Join league as a roster (Team League — creates pending membership for public leagues)
   */
  async joinLeagueAsRoster(leagueId: string, rosterId: string, userId: string): Promise<LeagueMembership> {
    return this.post<LeagueMembership>(`/leagues/${leagueId}/join`, {
      rosterId,
      userId
    });
  }

  /**
   * Step Out of a league (sets membership to withdrawn)
   */
  async stepOutOfLeague(leagueId: string, userId: string, teamId?: string): Promise<void> {
    return this.post<void>(`/leagues/${leagueId}/leave`, {
      userId,
      ...(teamId && { teamId }),
    });
  }

  /**
   * Get pending join requests for a league (owner/admin only)
   */
  async getJoinRequests(leagueId: string, userId: string): Promise<LeagueMembership[]> {
    return this.get<LeagueMembership[]>(`/leagues/${leagueId}/join-requests`, {
      params: { userId }
    });
  }

  /**
   * Approve a pending join request
   */
  async approveJoinRequest(leagueId: string, requestId: string, userId: string): Promise<LeagueMembership> {
    return this.put<LeagueMembership>(`/leagues/${leagueId}/join-requests/${requestId}`, {
      action: 'approve',
      userId
    });
  }

  /**
   * Decline a pending join request
   */
  async declineJoinRequest(leagueId: string, requestId: string, userId: string): Promise<void> {
    return this.put<void>(`/leagues/${leagueId}/join-requests/${requestId}`, {
      action: 'decline',
      userId
    });
  }

  /**
   * Invite a roster to a private Team League
   */
  async inviteRoster(leagueId: string, rosterId: string, userId: string): Promise<LeagueMembership> {
    return this.post<LeagueMembership>(`/leagues/${leagueId}/invite-roster`, {
      rosterId,
      userId
    });
  }

  /**
   * Respond to a league invitation (accept or decline)
   */
  async respondToInvitation(leagueId: string, invitationId: string, accept: boolean, userId: string): Promise<any> {
    return this.put<any>(`/leagues/${leagueId}/invitations/${invitationId}`, {
      accept,
      userId
    });
  }

  /**
   * Get upcoming league events
   */
  async getLeagueEvents(leagueId: string): Promise<Event[]> {
    return this.get<Event[]>(`/leagues/${leagueId}/events`, {
      cacheOptions: { ttl: 30000 } // Cache for 30 seconds
    });
  }

  /**
   * Create a league event with optional roster assignment
   */
  async createLeagueEvent(leagueId: string, data: CreateLeagueEventData & { userId: string }): Promise<Event> {
    return this.post<Event>(`/leagues/${leagueId}/events`, data);
  }

  /**
   * Check scheduling conflicts for roster assignments
   */
  async checkSchedulingConflicts(
    leagueId: string,
    rosterIds: string[],
    startTime: Date,
    endTime: Date
  ): Promise<ConflictResult> {
    return this.post<ConflictResult>(`/leagues/${leagueId}/events/check-conflicts`, {
      rosterIds,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });
  }

  /**
   * Manually trigger schedule generation (commissioner only)
   */
  async generateSchedule(leagueId: string, userId: string): Promise<{ message: string; eventsCreated: number }> {
    return this.post<{ message: string; eventsCreated: number }>(`/leagues/${leagueId}/generate-schedule`, {
      userId
    });
  }

  /**
   * Get strike counts per roster for a season (commissioner only)
   */
  async getSeasonStrikes(
    leagueId: string,
    seasonId: string,
    userId?: string
  ): Promise<RosterStrikeData[]> {
    const params: any = {};
    if (userId) params.userId = userId;
    return this.get<RosterStrikeData[]>(
      `/leagues/${leagueId}/seasons/${seasonId}/strikes`,
      { params }
    );
  }

  /**
   * Remove a roster from a league (commissioner only)
   */
  async removeMembership(leagueId: string, membershipId: string, userId: string): Promise<{ message: string; removedMembershipId: string; rosterId: string }> {
    return this.delete<{ message: string; removedMembershipId: string; rosterId: string }>(
      `/leagues/${leagueId}/memberships/${membershipId}`,
      { data: { userId } }
    );
  }

  /**
   * Get league financial ledger for a season
   */
  async getLedger(leagueId: string, seasonId: string): Promise<{ transactions: LeagueTransaction[] }> {
    return this.get<{ transactions: LeagueTransaction[] }>(`/leagues/${leagueId}/ledger`, {
      params: { seasonId },
    });
  }
}

// Export singleton instance
export const leagueService = new LeagueService();
