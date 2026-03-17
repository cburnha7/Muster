/**
 * Nightly Ratings Job
 *
 * Runs after debrief windows close to recalculate bracket/overall ratings
 * and percentiles for all players across all sports.
 */

import { recalculateAllRatings } from '../services/player-ratings';

export async function processNightlyRatings(): Promise<{
  usersProcessed: number;
  ratingsUpdated: number;
  percentilesUpdated: number;
  duration: number;
  errors: string[];
}> {
  const start = Date.now();

  const result = await recalculateAllRatings();

  return {
    ...result,
    duration: Date.now() - start,
  };
}
