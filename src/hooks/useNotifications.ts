import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  userService,
  RosterInvitation,
  LeagueInvitation,
  EventInvitation,
  ReadyToScheduleLeague,
} from '../services/api/UserService';
import { debriefService } from '../services/api/DebriefService';
import { notificationsEventBus } from '../utils/notificationsEventBus';

export interface NotificationItem {
  id: string;
  type:
    | 'roster_invitation'
    | 'league_invitation'
    | 'event_invitation'
    | 'schedule_league'
    | 'debrief'
    | 'cancel_request'
    | 'game_challenge';
  title: string;
  subtitle: string;
  data: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const [invitations, readyLeagues, debriefBookings] = await Promise.all([
        userService.getInvitations().catch(() => ({
          rosterInvitations: [],
          leagueInvitations: [],
          eventInvitations: [],
          total: 0,
        })),
        userService.getLeaguesReadyToSchedule().catch(() => []),
        debriefService
          .getDebriefEvents()
          .then(res => res.data || [])
          .catch(() => []),
      ]);

      const notifs: NotificationItem[] = [];

      invitations.rosterInvitations.forEach(inv => {
        notifs.push({
          id: `roster-${inv.id}`,
          type: 'roster_invitation',
          title: 'Roster Invitation',
          subtitle: inv.rosterName,
          data: inv,
        });
      });

      invitations.leagueInvitations.forEach(inv => {
        notifs.push({
          id: `league-${inv.id}`,
          type: 'league_invitation',
          title: 'League Invitation',
          subtitle: inv.leagueName,
          data: inv,
        });
      });

      invitations.eventInvitations
        .filter(inv => inv.eventStatus === 'active' || !inv.eventStatus)
        .forEach(inv => {
          notifs.push({
            id: `event-${inv.id}`,
            type: 'event_invitation',
            title: 'Game Invitation',
            subtitle: inv.eventTitle,
            data: inv,
          });
        });

      readyLeagues
        .filter(l => l.isActive !== false)
        .forEach(league => {
          notifs.push({
            id: `schedule-${league.id}`,
            type: 'schedule_league',
            title: 'Schedule League Games',
            subtitle: league.name,
            data: league,
          });
        });

      debriefBookings.forEach((booking: any) => {
        notifs.push({
          id: `debrief-${booking.id}`,
          type: 'debrief',
          title: 'Debrief Pending',
          subtitle: booking.event?.title || 'Event',
          data: booking,
        });
      });

      setItems(notifs);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Refresh when explicitly triggered (e.g. after debrief submit)
  useEffect(() => {
    return notificationsEventBus.subscribe(refresh);
  }, [refresh]);

  return { items, count: items.length, loading, refresh };
}
