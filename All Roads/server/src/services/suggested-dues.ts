/**
 * Suggested Dues Calculator
 *
 * Pure calculation logic for the suggested minimum dues amount.
 * Formula: ceil((gamesPerTeam × avgCourtCost) / rosterCount)
 *
 * This is advisory only — the commissioner can set any amount.
 * The margin above suggested_min_dues is the commissioner's earnings
 * for running the league.
 */

/**
 * Calculate the suggested minimum dues per roster for a paid league season.
 *
 * @param gamesPerTeam - Number of games each roster plays in the season
 * @param avgCourtCost - Average hourly court cost for the league's sport type
 * @param rosterCount  - Number of enrolled rosters in the season
 * @returns Suggested minimum dues amount (ceiled), or 0 if inputs are invalid
 */
export function calculateSuggestedDues(
  gamesPerTeam: number,
  avgCourtCost: number,
  rosterCount: number,
): number {
  if (rosterCount <= 0 || gamesPerTeam <= 0 || avgCourtCost <= 0) {
    return 0;
  }

  return Math.ceil((gamesPerTeam * avgCourtCost) / rosterCount);
}
