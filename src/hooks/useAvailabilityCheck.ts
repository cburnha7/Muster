import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api/config';
import { authService } from '../services/auth/AuthService';

interface DateWindow {
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

/**
 * Checks availability of players and rosters against a set of date/time windows.
 * Returns a map of invitee ID → boolean[] (one per date, true = available).
 */
export function useAvailabilityCheck(
  userIds: string[],
  rosterIds: string[],
  dates: DateWindow[],
) {
  const [availability, setAvailability] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(false);
  const prevKey = useRef('');

  useEffect(() => {
    const key = JSON.stringify({ userIds, rosterIds, dates });
    if (key === prevKey.current) return;
    prevKey.current = key;

    if ((userIds.length === 0 && rosterIds.length === 0) || dates.length === 0) {
      setAvailability({});
      return;
    }

    let cancelled = false;
    const check = async () => {
      setLoading(true);
      try {
        const token = authService.getToken();
        const res = await fetch(`${API_BASE_URL}/events/check-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userIds, rosterIds, dates }),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch {
        // Silently fail — availability is a nice-to-have indicator
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(check, 300); // debounce
    return () => { cancelled = true; clearTimeout(timer); };
  }, [userIds, rosterIds, dates]);

  return { availability, loading };
}
