import { BaseApiService } from './BaseApiService';
import { apiConfig, API_ENDPOINTS, TIMEOUT_CONFIG } from './config';
import {
  User,
  UpdateProfileData,
  NotificationPreferences,
  Booking,
  Event,
  Team,
  PaginatedResponse,
  PaginationParams,
} from '../../types';
import { OnboardingData } from '../../types/auth';

export class UserService extends BaseApiService {
  constructor() {
    super(apiConfig);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.get<User>(API_ENDPOINTS.USERS.PROFILE);
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileData): Promise<User> {
    const data = {
      ...updates,
      // Convert Date to ISO string if present
      dateOfBirth: updates.dateOfBirth?.toISOString(),
    };

    return this.put<User>(API_ENDPOINTS.USERS.PROFILE, data);
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(
    image: File,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', image);

    return this.uploadFile<{ imageUrl: string }>(
      API_ENDPOINTS.USERS.PROFILE_IMAGE,
      formData,
      onProgress
    );
  }

  /**
   * Delete profile image
   */
  async deleteProfileImage(): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.USERS.PROFILE_IMAGE);
  }

  /**
   * Get user's bookings
   * UPDATED: Now sends userId as query parameter for development
   */
  async getUserBookings(
    status?: 'upcoming' | 'past' | 'cancelled',
    pagination?: PaginationParams,
    skipCache: boolean = false
  ): Promise<PaginatedResponse<Booking>> {
    // DEVELOPMENT: Add userId as query parameter for mock auth
    const { authService } = await import('../auth/AuthService');
    const currentUser = authService.getCurrentUser();
    
    const params = {
      ...pagination,
      status,
      ...(currentUser?.id && { userId: currentUser.id }), // Add userId to query params
    };

    console.log('📚 UserService.getUserBookings - params:', params);
    console.log('📚 UserService.getUserBookings - currentUser:', currentUser?.email, currentUser?.id);

    return this.get<PaginatedResponse<Booking>>(API_ENDPOINTS.USERS.BOOKINGS, { 
      params,
      cacheOptions: { skipCache }
    });
  }

  /**
   * Get user's created events
   */
  async getUserEvents(
    status?: 'active' | 'completed' | 'cancelled',
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Event>> {
    const params = {
      ...pagination,
      status,
    };

    return this.get<PaginatedResponse<Event>>(API_ENDPOINTS.USERS.EVENTS, { params });
  }

  /**
   * Get user's teams
   */
  async getUserTeams(pagination?: PaginationParams): Promise<PaginatedResponse<Team>> {
    const params = pagination || {};
    return this.get<PaginatedResponse<Team>>(API_ENDPOINTS.USERS.TEAMS, { params });
  }

  /**
   * Get user's leagues (organized + member of)
   */
  async getUserLeagues(): Promise<any[]> {
    return this.get<any[]>(API_ENDPOINTS.USERS.LEAGUES);
  }

  // TODO: Notification preferences - no backend route exists (API_ENDPOINTS.USERS.NOTIFICATIONS was removed)
  // async updateNotificationPreferences(
  //   preferences: NotificationPreferences
  // ): Promise<NotificationPreferences> {
  //   return this.put<NotificationPreferences>('/users/notifications', preferences);
  // }

  // async getNotificationPreferences(): Promise<NotificationPreferences> {
  //   return this.get<NotificationPreferences>('/users/notifications');
  // }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalBookings: number;
    totalEventsOrganized: number;
    totalTeams: number;
    favoritesSports: string[];
    totalSpent: number;
    totalEarned: number;
    averageRating?: number;
    reviewCount: number;
  }> {
    return this.get(`${API_ENDPOINTS.USERS.PROFILE}/stats`);
  }

  /**
   * Get user's booking history with detailed information
   */
  async getBookingHistory(
    startDate?: Date,
    endDate?: Date,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Booking & { event: Event }>> {
    const params = {
      ...pagination,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    };

    return this.get<PaginatedResponse<Booking & { event: Event }>>(
      `${API_ENDPOINTS.USERS.BOOKINGS}/history`,
      { params }
    );
  }

  /**
   * Get user's favorite facilities
   */
  async getFavoriteFacilities(pagination?: PaginationParams): Promise<PaginatedResponse<any>> {
    const params = pagination || {};
    return this.get<PaginatedResponse<any>>(`${API_ENDPOINTS.USERS.PROFILE}/favorites/facilities`, {
      params,
    });
  }

  /**
   * Add facility to favorites
   */
  async addFacilityToFavorites(facilityId: string): Promise<void> {
    return this.post<void>(`${API_ENDPOINTS.USERS.PROFILE}/favorites/facilities`, {
      facilityId,
    });
  }

  /**
   * Remove facility from favorites
   */
  async removeFacilityFromFavorites(facilityId: string): Promise<void> {
    return this.delete<void>(`${API_ENDPOINTS.USERS.PROFILE}/favorites/facilities/${facilityId}`);
  }

  /**
   * Get user's activity feed
   */
  async getActivityFeed(pagination?: PaginationParams): Promise<
    PaginatedResponse<{
      id: string;
      type: 'booking' | 'event_created' | 'team_joined' | 'achievement';
      title: string;
      description: string;
      timestamp: Date;
      data?: any;
    }>
  > {
    const params = pagination || {};
    return this.get(`${API_ENDPOINTS.USERS.PROFILE}/activity`, { params });
  }

  /**
   * Update user preferences (sports, skill levels, etc.)
   */
  async updatePreferences(preferences: {
    preferredSports?: string[];
    preferredSkillLevels?: string[];
    maxTravelDistance?: number;
    preferredTimeSlots?: string[];
    budgetRange?: { min: number; max: number };
  }): Promise<void> {
    return this.put<void>(`${API_ENDPOINTS.USERS.PROFILE}/preferences`, preferences);
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<{
    preferredSports: string[];
    preferredSkillLevels: string[];
    maxTravelDistance: number;
    preferredTimeSlots: string[];
    budgetRange: { min: number; max: number };
  }> {
    return this.get(`${API_ENDPOINTS.USERS.PROFILE}/preferences`);
  }

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.USERS.PROFILE, {
      data: { password },
    });
  }

  /**
   * Export user data (GDPR compliance)
   */
  async exportUserData(): Promise<{ downloadUrl: string; expiresAt: Date }> {
    return this.post<{ downloadUrl: string; expiresAt: Date }>(
      `${API_ENDPOINTS.USERS.PROFILE}/export`
    );
  }

  /**
   * Get user's achievements and badges
   */
  async getAchievements(): Promise<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: Date;
    progress?: number;
    maxProgress?: number;
  }[]> {
    return this.get(`${API_ENDPOINTS.USERS.PROFILE}/achievements`);
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const params = { username };
    return this.get<{ available: boolean }>(`${API_ENDPOINTS.USERS.PROFILE}/check-username`, {
      params,
    });
  }

  /**
   * Get user's calendar events (bookings and organized events)
   */
  async getCalendarEvents(
    startDate: Date,
    endDate: Date
  ): Promise<{
    bookings: (Booking & { event: Event })[];
    organizedEvents: Event[];
  }> {
    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    return this.get(`${API_ENDPOINTS.USERS.PROFILE}/calendar`, { params });
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<User[]> {
    const params = { query };
    return this.get<User[]>(`${API_ENDPOINTS.USERS.BASE}/search`, { params });
  }

  /**
   * Get leagues ready to schedule (Commissioner only)
   */
  async getLeaguesReadyToSchedule(): Promise<ReadyToScheduleLeague[]> {
    return this.get<ReadyToScheduleLeague[]>(`${API_ENDPOINTS.USERS.BASE}/leagues-ready-to-schedule`, {
      cacheOptions: { skipCache: true },
    });
  }

  /**
   * Get pending invitations (roster + league)
   */
  async getInvitations(): Promise<{
    rosterInvitations: RosterInvitation[];
    leagueInvitations: LeagueInvitation[];
    eventInvitations: EventInvitation[];
    total: number;
  }> {
    return this.get(`${API_ENDPOINTS.USERS.BASE}/invitations`, {
      cacheOptions: { skipCache: true }
    });
  }

  /**
   * Accept a roster invitation (join the roster)
   */
  async acceptRosterInvitation(rosterId: string): Promise<any> {
    return this.post(`/teams/${rosterId}/join`, {});
  }

  /**
   * Decline a roster invitation
   */
  async declineRosterInvitation(rosterId: string): Promise<void> {
    return this.post(`/teams/${rosterId}/leave`, {});
  }

  /**
   * Complete onboarding flow
   */
  async completeOnboarding(data: OnboardingData): Promise<{ user: User }> {
    return this.put<{ user: User }>(API_ENDPOINTS.USERS.ONBOARDING, data);
  }

  /**
   * Update user intents
   */
  async updateIntents(intents: string[]): Promise<{ user: User }> {
    return this.put<{ user: User }>(API_ENDPOINTS.USERS.INTENTS, { intents });
  }
}

export interface RosterInvitation {
  id: string;
  type: 'roster';
  rosterId: string;
  rosterName: string;
  sportType?: string;
  imageUrl?: string;
  playerCount: number;
  invitedAt: string;
}

export interface LeagueInvitation {
  id: string;
  type: 'league';
  leagueId: string;
  leagueName: string;
  sportType?: string;
  imageUrl?: string;
  leagueType: string;
  rosterId?: string;
  rosterName?: string;
  invitedAt: string;
}

export interface EventInvitation {
  id: string;
  type: 'event';
  eventId: string;
  eventTitle: string;
  sportType?: string;
  imageUrl?: string;
  startTime: string;
  facilityName?: string | null;
  leagueId?: string | null;
}

export interface ReadyToScheduleLeague {
  id: string;
  name: string;
  sportType?: string;
}

// Create and export singleton instance
export const userService = new UserService();
