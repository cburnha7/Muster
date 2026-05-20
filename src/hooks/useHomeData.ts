/**
 * useHomeData — Cached data for the HomeScreen inbox/notification section.
 *
 * Uses useCachedFetch for instant rendering from AsyncStorage,
 * with background revalidation from the network.
 *
 * Service imports are done lazily inside fetcher functions to avoid
 * circular dependency issues with the module initialization order.
 */

import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { selectActiveUserId } from '../store/slices/contextSlice';
import { useCachedFetch } from './useCachedFetch';
import type {
  RosterInvitation,
  LeagueInvitation,
  EventInvitation,
  ReadyToScheduleLeague,
} from '../services/api/UserService';

interface InvitationsData {
  rosterInvitations: RosterInvitation[];
  leagueInvitations: LeagueInvitation[];
  eventInvitations: EventInvitation[];
}

export function useHomeData() {
  const user = useSelector(selectUser);
  const activeUserId = useSelector(selectActiveUserId);
  const userId = user?.id || '';
  const skip = !userId;

  // Cache keys scoped to user + active context
  const scope = activeUserId || userId;

  const invitations = useCachedFetch<InvitationsData>(
    `invitations_${scope}`,
    async () => {
      const { userService } = await import('../services/api/UserService');
      const result = await userService.getInvitations();
      return {
        rosterInvitations: result.rosterInvitations || [],
        leagueInvitations: result.leagueInvitations || [],
        eventInvitations: result.eventInvitations || [],
      };
    },
    { skip }
  );

  const readyToSchedule = useCachedFetch<ReadyToScheduleLeague[]>(
    `leagues_ready_${scope}`,
    async () => {
      const { userService } = await import('../services/api/UserService');
      return userService.getLeaguesReadyToSchedule();
    },
    { skip }
  );

  const debrief = useCachedFetch<any[]>(
    `debrief_${scope}`,
    async () => {
      const { debriefService } = await import('../services/api/DebriefService');
      const res = await debriefService.getDebriefEvents();
      return res.data || [];
    },
    { skip }
  );

  const userTeams = useCachedFetch<any[]>(
    `user_teams_${scope}`,
    async () => {
      const { userService } = await import('../services/api/UserService');
      const res = await userService.getUserTeams();
      return res.data || res || [];
    },
    { skip }
  );

  const organizedEvents = useCachedFetch<any[]>(
    `organized_events_${scope}`,
    async () => {
      const { userService } = await import('../services/api/UserService');
      const res = await userService.getUserEvents({ page: 1, limit: 100 });
      return res.data || [];
    },
    { skip }
  );

  const refresh = async () => {
    await Promise.all([
      invitations.refresh(),
      readyToSchedule.refresh(),
      debrief.refresh(),
      userTeams.refresh(),
      organizedEvents.refresh(),
    ]);
  };

  return {
    rosterInvitations: invitations.data?.rosterInvitations ?? [],
    leagueInvitations: invitations.data?.leagueInvitations ?? [],
    eventInvitations: invitations.data?.eventInvitations ?? [],
    readyToScheduleLeagues: readyToSchedule.data ?? [],
    debriefEvents: debrief.data ?? [],
    userTeams: userTeams.data ?? [],
    organizedEvents: organizedEvents.data ?? [],
    isLoading: invitations.loading && debrief.loading,
    error: invitations.error || debrief.error || null,
    refresh,
  };
}
