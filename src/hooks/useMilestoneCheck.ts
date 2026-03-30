import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userService } from '../services/api/UserService';
import type { MilestoneData } from '../components/ui/MilestoneOverlay';

const STORAGE_KEY = '@muster_shown_milestones';

interface MilestoneDef {
  id: string;
  threshold: number;
  emoji: string;
  title: string;
  subtitle: string;
}

const GAME_MILESTONES: MilestoneDef[] = [
  { id: 'first_game', threshold: 1, emoji: '🎉', title: 'Your first game!', subtitle: 'Welcome to Muster. The journey starts here.' },
  { id: '5_games', threshold: 5, emoji: '🏅', title: '5 games played!', subtitle: "You're a regular now." },
  { id: '10_games', threshold: 10, emoji: '💪', title: '10 and counting!', subtitle: 'Dedication looks good on you.' },
  { id: '25_games', threshold: 25, emoji: '🏆', title: '25 games!', subtitle: "You're a Muster veteran." },
  { id: '50_games', threshold: 50, emoji: '🔥', title: '50 games!', subtitle: 'Absolute legend status.' },
];

/**
 * Client-side milestone detection hook.
 * Checks user stats against thresholds and shows unshown milestones.
 * Stores shown milestone IDs in AsyncStorage.
 */
export function useMilestoneCheck(): {
  pendingMilestone: MilestoneData | null;
  dismissMilestone: () => void;
} {
  const [pendingMilestone, setPendingMilestone] = useState<MilestoneData | null>(null);
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load shown milestones from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setShownIds(new Set(JSON.parse(raw)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Check for new milestones
  useEffect(() => {
    if (!loaded) return;

    const check = async () => {
      try {
        const stats = await userService.getUserStats();
        const totalGames = stats?.totalBookings ?? 0;

        // Find the highest unshown milestone the user qualifies for
        for (let i = GAME_MILESTONES.length - 1; i >= 0; i--) {
          const m = GAME_MILESTONES[i]!;
          if (totalGames >= m.threshold && !shownIds.has(m.id)) {
            setPendingMilestone({
              id: m.id,
              emoji: m.emoji,
              title: m.title,
              subtitle: m.subtitle,
            });
            break;
          }
        }
      } catch {
        // Stats unavailable — skip milestone check
      }
    };

    check();
  }, [loaded, shownIds]);

  const dismissMilestone = useCallback(() => {
    if (!pendingMilestone) return;
    const newIds = new Set(shownIds);
    newIds.add(pendingMilestone.id);
    setShownIds(newIds);
    setPendingMilestone(null);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...newIds])).catch(() => {});
  }, [pendingMilestone, shownIds]);

  return { pendingMilestone, dismissMilestone };
}
