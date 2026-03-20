/**
 * FairScheduler — Deterministic, fair schedule generation engine.
 *
 * Separated into five stages:
 *   1. Validation
 *   2. Slot generation
 *   3. Matchup generation (with fairness balancing)
 *   4. Slot assignment (with conflict avoidance)
 *   5. Playoff / tournament bracket generation
 *
 * All Date operations use UTC to avoid timezone drift.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RosterInfo {
  id: string;
  name: string;
}

export interface SchedulerInput {
  scheduleType: 'season' | 'season_playoffs' | 'tournament';
  frequency: 'all_at_once' | 'weekly' | 'monthly';
  startDate: Date;
  endDate?: Date | null;
  teams: RosterInfo[];
  regularSeasonGamesPerTeam: number;
  allowedDaysOfWeek: number[]; // 0=Sun … 6=Sat
  gameTimeWindowStart: string; // "HH:MM"
  gameTimeWindowEnd: string;   // "HH:MM"
  playoffTeamCount?: number;
  eliminationType?: 'single' | 'double';
}

export interface ScheduledGame {
  gameNumber: number;
  date: string;       // YYYY-MM-DD
  dayOfWeek: string;  // e.g. "Saturday"
  time: string;       // "HH:MM"
  homeTeam: RosterInfo;
  awayTeam: RosterInfo;
  round: number;
  scheduledAt: Date;   // full UTC Date
}

export interface BracketGame extends ScheduledGame {
  flag: 'playoffs' | 'tournament';
  bracketRound: number;
  bracketPosition: number;
  placeholderLabel?: string;
}

export interface TeamSummary {
  team: RosterInfo;
  games: number;
  home: number;
  away: number;
  byes: number;
  opponents: Record<string, number>; // opponentId → count
}

export interface SchedulerOutput {
  isValid: boolean;
  warnings: string[];
  playableSlots: Date[];
  regularSeasonGames: ScheduledGame[];
  playoffGames: BracketGame[];
  teamSummary: TeamSummary[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const GAME_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_DAYS = 365;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function toMinutes(hhmm: string): number {
  const { h, m } = parseTime(hhmm);
  return h * 60 + m;
}

function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeUTC(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}


// ─── 1. Validation ──────────────────────────────────────────────────────────

function validate(input: SchedulerInput): string[] {
  const errors: string[] = [];
  const { teams, regularSeasonGamesPerTeam, allowedDaysOfWeek, scheduleType, playoffTeamCount, eliminationType } = input;
  const n = teams.length;

  if (n < 2) {
    errors.push('At least 2 rosters are required.');
  }

  if (scheduleType !== 'tournament') {
    if (regularSeasonGamesPerTeam < 1) {
      errors.push('regularSeasonGamesPerTeam must be at least 1.');
    }

    // Each game involves 2 teams. Total games = (n * gamesPerTeam) / 2.
    // This must be an integer, so n * gamesPerTeam must be even.
    if (n >= 2 && regularSeasonGamesPerTeam >= 1 && (n * regularSeasonGamesPerTeam) % 2 !== 0) {
      // Odd total — not perfectly achievable. We'll warn, not reject.
      // The scheduler will get as close as possible.
    }
  }

  if (allowedDaysOfWeek.length === 0) {
    errors.push('At least one allowed day of week must be provided.');
  }

  if (toMinutes(input.gameTimeWindowEnd) - toMinutes(input.gameTimeWindowStart) < 120) {
    errors.push('Time window must be at least 2 hours to fit one game.');
  }

  if (scheduleType === 'season_playoffs') {
    if (!playoffTeamCount || playoffTeamCount < 2) {
      errors.push('playoffTeamCount must be at least 2 for season with playoffs.');
    }
    if (playoffTeamCount && playoffTeamCount > n) {
      errors.push(`playoffTeamCount (${playoffTeamCount}) exceeds number of rosters (${n}).`);
    }
    if (!eliminationType) {
      errors.push('eliminationType is required for season with playoffs.');
    }
  }

  if (scheduleType === 'tournament') {
    if (!eliminationType) {
      errors.push('eliminationType is required for tournament format.');
    }
  }

  return errors;
}

// ─── 2. Slot Generation ────────────────────────────────────────────────────

/**
 * Generate all playable time slots based on frequency, date range, allowed days, and time window.
 * Each slot is 2 hours. Multiple slots per day if the window is wide enough.
 * All dates are UTC.
 */
function generateSlots(input: SchedulerInput): Date[] {
  const { frequency, startDate, endDate, allowedDaysOfWeek, gameTimeWindowStart, gameTimeWindowEnd } = input;
  const windowStart = toMinutes(gameTimeWindowStart);
  const windowEnd = toMinutes(gameTimeWindowEnd);

  const limitDate = endDate
    ? new Date(endDate)
    : new Date(startDate.getTime() + MAX_DAYS * 24 * 60 * 60 * 1000);

  const slots: Date[] = [];
  const current = new Date(startDate);

  while (current <= limitDate) {
    const dayOfWeek = current.getUTCDay();

    // For "all_at_once", use every day. For weekly/monthly, respect allowedDaysOfWeek.
    const dayAllowed = frequency === 'all_at_once' || allowedDaysOfWeek.includes(dayOfWeek);

    if (dayAllowed) {
      let slotMinutes = windowStart;
      while (slotMinutes + 120 <= windowEnd) {
        const slot = new Date(current);
        slot.setUTCHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
        slots.push(slot);
        slotMinutes += 120;
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return slots;
}


// ─── 3. Matchup Generation (Fair Round-Robin) ──────────────────────────────

interface Matchup {
  home: RosterInfo;
  away: RosterInfo;
  round: number;
}

/**
 * Generate fair round-robin matchups.
 *
 * Fairness rules enforced:
 *   1. Every roster plays exactly `gamesPerTeam` games (if mathematically possible).
 *   2. Home/away balance: no roster differs by more than 1 between home and away counts.
 *   3. Opponent distribution: matchups are spread as evenly as possible across opponents.
 *   4. Deterministic — no randomness.
 *
 * Algorithm:
 *   - Use the standard circle method for round-robin scheduling.
 *   - Repeat full cycles until we have enough total games.
 *   - Alternate home/away on even/odd cycles for balance.
 *   - Track per-roster game counts and stop adding games for rosters that have reached their target.
 */
function generateFairMatchups(teams: RosterInfo[], gamesPerTeam: number): { matchups: Matchup[]; warnings: string[] } {
  const warnings: string[] = [];
  const n = teams.length;

  // Total games needed: (n * gamesPerTeam) / 2
  // If n * gamesPerTeam is odd, we can't perfectly satisfy — round down and warn.
  let totalGames: number;
  if ((n * gamesPerTeam) % 2 !== 0) {
    totalGames = Math.floor((n * gamesPerTeam) / 2);
    warnings.push(
      `With ${n} rosters and ${gamesPerTeam} games each, perfect balance is impossible (odd total). ` +
      `One roster will play ${gamesPerTeam - 1} games instead of ${gamesPerTeam}.`
    );
  } else {
    totalGames = (n * gamesPerTeam) / 2;
  }

  // For odd number of rosters, add a BYE placeholder for the circle method
  const rosterList = [...teams];
  const hasOddRosters = n % 2 !== 0;
  if (hasOddRosters) {
    rosterList.push({ id: 'BYE', name: 'BYE' });
  }

  const totalRosters = rosterList.length;
  const roundsPerCycle = totalRosters - 1;

  // Track per-roster stats for fairness
  const gameCount = new Map<string, number>();   // rosterId → total games played
  const homeCount = new Map<string, number>();   // rosterId → home games
  const awayCount = new Map<string, number>();   // rosterId → away games
  const opponentCount = new Map<string, Map<string, number>>(); // rosterId → (opponentId → count)

  for (const t of teams) {
    gameCount.set(t.id, 0);
    homeCount.set(t.id, 0);
    awayCount.set(t.id, 0);
    opponentCount.set(t.id, new Map());
  }

  const matchups: Matchup[] = [];
  let roundNum = 1;
  let cycle = 0;

  while (matchups.length < totalGames) {
    for (let round = 0; round < roundsPerCycle && matchups.length < totalGames; round++) {
      // Collect candidate matchups for this round
      const candidates: Array<{ home: RosterInfo; away: RosterInfo }> = [];

      for (let i = 0; i < totalRosters / 2; i++) {
        // Circle method indices
        const homeIdx = i === 0 ? 0 : ((round + i - 1) % (totalRosters - 1)) + 1;
        const awayIdx = i === 0
          ? ((round + totalRosters / 2 - 1) % (totalRosters - 1)) + 1
          : ((round + totalRosters - 1 - i - 1) % (totalRosters - 1)) + 1;

        let home = rosterList[homeIdx];
        let away = rosterList[awayIdx];

        // Skip BYE matchups
        if (home.id === 'BYE' || away.id === 'BYE') continue;

        // Home/away balancing: alternate on even/odd cycles,
        // then fine-tune based on current home/away counts.
        if (cycle % 2 !== 0) {
          [home, away] = [away, home];
        }

        // Further balance: if home has more home games than away games, swap
        const hHome = homeCount.get(home.id) || 0;
        const hAway = awayCount.get(home.id) || 0;
        const aHome = homeCount.get(away.id) || 0;
        const aAway = awayCount.get(away.id) || 0;

        if (hHome - hAway > aHome - aAway) {
          [home, away] = [away, home];
        }

        candidates.push({ home, away });
      }

      // Sort candidates by fairness priority:
      //   1. Rosters with fewest games played first (unmet game counts)
      //   2. Opponents faced fewest times first (opponent distribution)
      candidates.sort((a, b) => {
        const aMinGames = Math.min(gameCount.get(a.home.id) || 0, gameCount.get(a.away.id) || 0);
        const bMinGames = Math.min(gameCount.get(b.home.id) || 0, gameCount.get(b.away.id) || 0);
        if (aMinGames !== bMinGames) return aMinGames - bMinGames;

        const aOppCount = opponentCount.get(a.home.id)?.get(a.away.id) || 0;
        const bOppCount = opponentCount.get(b.home.id)?.get(b.away.id) || 0;
        return aOppCount - bOppCount;
      });

      for (const { home, away } of candidates) {
        if (matchups.length >= totalGames) break;

        // Skip if both rosters have already reached their target
        const hGames = gameCount.get(home.id) || 0;
        const aGames = gameCount.get(away.id) || 0;
        if (hGames >= gamesPerTeam && aGames >= gamesPerTeam) continue;

        matchups.push({ home, away, round: roundNum });

        // Update tracking
        gameCount.set(home.id, hGames + 1);
        gameCount.set(away.id, aGames + 1);
        homeCount.set(home.id, (homeCount.get(home.id) || 0) + 1);
        awayCount.set(away.id, (awayCount.get(away.id) || 0) + 1);

        const homeOpp = opponentCount.get(home.id)!;
        homeOpp.set(away.id, (homeOpp.get(away.id) || 0) + 1);
        const awayOpp = opponentCount.get(away.id)!;
        awayOpp.set(home.id, (awayOpp.get(home.id) || 0) + 1);
      }

      roundNum++;
    }
    cycle++;

    // Safety: prevent infinite loop if we can't generate enough matchups
    if (cycle > totalGames * 2) {
      warnings.push('Could not generate all requested games within cycle limit.');
      break;
    }
  }

  // Check home/away balance and warn if any roster differs by more than 1
  for (const t of teams) {
    const h = homeCount.get(t.id) || 0;
    const a = awayCount.get(t.id) || 0;
    if (Math.abs(h - a) > 1) {
      warnings.push(`Roster "${t.name}" has ${h} home and ${a} away games (imbalance > 1).`);
    }
  }

  return { matchups, warnings };
}


// ─── 4. Slot Assignment (Conflict-Free) ────────────────────────────────────

/**
 * Assign matchups to time slots ensuring no roster is double-booked.
 *
 * Strategy:
 *   - Process matchups in order (round-robin order preserves fairness).
 *   - For each matchup, find the earliest available slot where neither
 *     the home nor away roster is already playing.
 *   - Track which rosters are busy at each slot.
 *
 * This ensures:
 *   - No overlapping games for any roster.
 *   - Earliest valid slots are used first.
 *   - Idle gaps are minimized because we greedily fill earliest slots.
 */
function assignSlotsToMatchups(
  matchups: Matchup[],
  slots: Date[],
): { games: ScheduledGame[]; warnings: string[] } {
  const warnings: string[] = [];

  if (matchups.length === 0 || slots.length === 0) {
    return { games: [], warnings };
  }

  // ── Step 1: Group slots by calendar day (UTC) ──
  // Each "day" has an ordered list of slot indices.
  const dayKey = (d: Date) => formatDateUTC(d); // "YYYY-MM-DD"
  const dayOrder: string[] = []; // ordered unique day keys
  const daySlots = new Map<string, number[]>(); // dayKey → slot indices

  for (let si = 0; si < slots.length; si++) {
    const dk = dayKey(slots[si]);
    if (!daySlots.has(dk)) {
      daySlots.set(dk, []);
      dayOrder.push(dk);
    }
    daySlots.get(dk)!.push(si);
  }

  // ── Step 2: Spread-first assignment ──
  // Strategy: cycle through days round-robin, assigning at most one game per
  // day per pass before moving to the next day. Within a day, pick the
  // earliest slot that doesn't conflict with rosters already playing that slot.
  // This minimises games-per-day and games-per-roster-per-day.

  const slotBusy = new Map<number, Set<string>>(); // slotIndex → busy rosterIds
  const dayGameCount = new Map<string, number>();   // dayKey → games assigned
  const rosterDayCount = new Map<string, number>(); // `${rosterId}|${dayKey}` → games on that day

  for (const dk of dayOrder) {
    dayGameCount.set(dk, 0);
  }

  const games: ScheduledGame[] = [];
  const unassigned = [...matchups]; // mutable queue
  let gameNumber = 1;

  // Keep iterating until all matchups are assigned or we can't make progress
  while (unassigned.length > 0) {
    let progressThisPass = false;

    // One pass: try to place one game per day, cycling through days in order
    for (const dk of dayOrder) {
      if (unassigned.length === 0) break;

      const slotsForDay = daySlots.get(dk)!;

      // Try each unassigned matchup, preferring the one whose rosters have
      // the fewest games on this day (to spread roster load).
      let bestIdx = -1;
      let bestSlot = -1;
      let bestRosterDayLoad = Infinity;

      for (let mi = 0; mi < unassigned.length; mi++) {
        const m = unassigned[mi];
        const homeId = m.home.id;
        const awayId = m.away.id;

        // Roster load on this day if we assign here
        const homeLoad = rosterDayCount.get(`${homeId}|${dk}`) ?? 0;
        const awayLoad = rosterDayCount.get(`${awayId}|${dk}`) ?? 0;
        const maxLoad = Math.max(homeLoad, awayLoad);

        if (maxLoad >= bestRosterDayLoad) continue; // not better

        // Find earliest non-conflicting slot on this day
        for (const si of slotsForDay) {
          const busy = slotBusy.get(si);
          if (busy && (busy.has(homeId) || busy.has(awayId))) continue;
          // Found a valid slot with lower roster-day load
          bestIdx = mi;
          bestSlot = si;
          bestRosterDayLoad = maxLoad;
          break; // earliest slot for this matchup on this day
        }
      }

      if (bestIdx === -1) continue; // no matchup fits this day right now

      // Assign the best matchup to the best slot
      const matchup = unassigned.splice(bestIdx, 1)[0];
      const slot = slots[bestSlot];
      const homeId = matchup.home.id;
      const awayId = matchup.away.id;

      if (!slotBusy.has(bestSlot)) slotBusy.set(bestSlot, new Set());
      slotBusy.get(bestSlot)!.add(homeId);
      slotBusy.get(bestSlot)!.add(awayId);

      dayGameCount.set(dk, (dayGameCount.get(dk) ?? 0) + 1);
      rosterDayCount.set(`${homeId}|${dk}`, (rosterDayCount.get(`${homeId}|${dk}`) ?? 0) + 1);
      rosterDayCount.set(`${awayId}|${dk}`, (rosterDayCount.get(`${awayId}|${dk}`) ?? 0) + 1);

      games.push({
        gameNumber,
        date: formatDateUTC(slot),
        dayOfWeek: DAY_NAMES[slot.getUTCDay()],
        time: formatTimeUTC(slot),
        homeTeam: matchup.home,
        awayTeam: matchup.away,
        round: matchup.round,
        scheduledAt: slot,
      });

      gameNumber++;
      progressThisPass = true;
    }

    // If we went through all days without placing anything, we're stuck
    if (!progressThisPass) {
      for (const m of unassigned) {
        warnings.push(
          `Could not schedule game: ${m.home.name} vs ${m.away.name} (Round ${m.round}) — no available slot.`
        );
      }
      break;
    }
  }

  // Sort games chronologically (they may be out of order from the round-robin day cycling)
  games.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  // Re-number after sorting
  for (let i = 0; i < games.length; i++) {
    games[i].gameNumber = i + 1;
  }

  return { games, warnings };
}

// ─── 5. Bracket Generation ─────────────────────────────────────────────────

/**
 * Generate single-elimination bracket.
 * Handles byes when roster count is not a power of 2.
 */
function generateSingleEliminationBracket(
  teams: RosterInfo[],
  slots: Date[],
  slotOffset: number, // start assigning from this slot index
): { games: BracketGame[]; warnings: string[]; slotsUsed: number } {
  const warnings: string[] = [];
  const n = teams.length;

  // Round up to next power of 2
  let bracketSize = 1;
  while (bracketSize < n) bracketSize *= 2;

  const byeRoster: RosterInfo = { id: 'BYE', name: 'BYE' };
  const seeded = [...teams];
  while (seeded.length < bracketSize) seeded.push(byeRoster);

  if (bracketSize > n) {
    warnings.push(`${bracketSize - n} bye(s) added to fill the bracket.`);
  }

  const totalRounds = Math.log2(bracketSize);
  const allMatchups: Array<{
    home: RosterInfo;
    away: RosterInfo;
    bracketRound: number;
    bracketPosition: number;
    gameNumber: number;
    placeholderLabel?: string;
  }> = [];

  let gameNumber = 1;

  // Round 1: actual rosters with byes
  for (let i = 0; i < bracketSize / 2; i++) {
    allMatchups.push({
      home: seeded[i * 2],
      away: seeded[i * 2 + 1],
      bracketRound: 1,
      bracketPosition: i + 1,
      gameNumber,
    });
    gameNumber++;
  }

  // Subsequent rounds: placeholder labels
  let prevRoundStart = 1;
  let gamesInPrevRound = bracketSize / 2;

  for (let roundNum = 2; roundNum <= totalRounds; roundNum++) {
    const gamesInRound = gamesInPrevRound / 2;
    for (let i = 0; i < gamesInRound; i++) {
      const homeGameNum = prevRoundStart + i * 2;
      const awayGameNum = prevRoundStart + i * 2 + 1;
      allMatchups.push({
        home: { id: `winner-${homeGameNum}`, name: `Winner of Game ${homeGameNum}` },
        away: { id: `winner-${awayGameNum}`, name: `Winner of Game ${awayGameNum}` },
        bracketRound: roundNum,
        bracketPosition: i + 1,
        gameNumber,
        placeholderLabel: `Winner of Game ${homeGameNum} vs Winner of Game ${awayGameNum}`,
      });
      gameNumber++;
    }
    prevRoundStart += gamesInPrevRound;
    gamesInPrevRound = gamesInRound;
  }

  // Assign to slots sequentially from slotOffset
  const games: BracketGame[] = [];
  let si = slotOffset;

  for (const m of allMatchups) {
    if (si >= slots.length) {
      warnings.push(`Not enough slots for bracket game ${m.gameNumber}.`);
      continue;
    }
    const slot = slots[si];
    games.push({
      gameNumber: m.gameNumber,
      date: formatDateUTC(slot),
      dayOfWeek: DAY_NAMES[slot.getUTCDay()],
      time: formatTimeUTC(slot),
      homeTeam: m.home,
      awayTeam: m.away,
      round: 200 + m.bracketRound,
      scheduledAt: slot,
      flag: 'playoffs',
      bracketRound: m.bracketRound,
      bracketPosition: m.bracketPosition,
      placeholderLabel: m.placeholderLabel,
    });
    si++;
  }

  return { games, warnings, slotsUsed: si - slotOffset };
}


/**
 * Generate double-elimination bracket.
 * Winners bracket + losers bracket + grand final.
 * Total games = 2*(bracketSize - 1) without reset.
 */
function generateDoubleEliminationBracket(
  teams: RosterInfo[],
  slots: Date[],
  slotOffset: number,
): { games: BracketGame[]; warnings: string[]; slotsUsed: number } {
  const warnings: string[] = [];
  const n = teams.length;

  let bracketSize = 1;
  while (bracketSize < n) bracketSize *= 2;

  const byeRoster: RosterInfo = { id: 'BYE', name: 'BYE' };
  const seeded = [...teams];
  while (seeded.length < bracketSize) seeded.push(byeRoster);

  if (bracketSize > n) {
    warnings.push(`${bracketSize - n} bye(s) added to fill the bracket.`);
  }

  const winnersRounds = Math.log2(bracketSize);
  const allMatchups: Array<{
    home: RosterInfo;
    away: RosterInfo;
    bracketRound: number;
    bracketPosition: number;
    gameNumber: number;
    placeholderLabel?: string;
  }> = [];

  let gameNumber = 1;
  let bracketRoundCounter = 1;

  // === Winners Bracket ===
  const wbGamesByRound: number[][] = [];

  // WB Round 1
  const wbR1Games = bracketSize / 2;
  const wbR1Nums: number[] = [];
  for (let i = 0; i < wbR1Games; i++) {
    allMatchups.push({
      home: seeded[i * 2],
      away: seeded[i * 2 + 1],
      bracketRound: bracketRoundCounter,
      bracketPosition: i + 1,
      gameNumber,
    });
    wbR1Nums.push(gameNumber);
    gameNumber++;
  }
  wbGamesByRound.push(wbR1Nums);
  bracketRoundCounter++;

  // WB subsequent rounds
  let wbPrev = wbR1Nums;
  for (let wr = 1; wr < winnersRounds; wr++) {
    const gamesInRound = wbPrev.length / 2;
    const roundNums: number[] = [];
    for (let i = 0; i < gamesInRound; i++) {
      const hg = wbPrev[i * 2];
      const ag = wbPrev[i * 2 + 1];
      allMatchups.push({
        home: { id: `winner-${hg}`, name: `Winner of Game ${hg}` },
        away: { id: `winner-${ag}`, name: `Winner of Game ${ag}` },
        bracketRound: bracketRoundCounter,
        bracketPosition: i + 1,
        gameNumber,
        placeholderLabel: `Winner of Game ${hg} vs Winner of Game ${ag}`,
      });
      roundNums.push(gameNumber);
      gameNumber++;
    }
    wbGamesByRound.push(roundNums);
    wbPrev = roundNums;
    bracketRoundCounter++;
  }

  // === Losers Bracket ===
  const totalLbRounds = 2 * (winnersRounds - 1);
  const wbR1Losers = wbGamesByRound[0];
  let lbPrev: number[] = [];

  // LB Round 1: losers from WB R1 play each other
  const lbR1Games = wbR1Losers.length / 2;
  for (let i = 0; i < lbR1Games; i++) {
    const hLabel = `Loser of Game ${wbR1Losers[i * 2]}`;
    const aLabel = `Loser of Game ${wbR1Losers[i * 2 + 1]}`;
    allMatchups.push({
      home: { id: `loser-${wbR1Losers[i * 2]}`, name: hLabel },
      away: { id: `loser-${wbR1Losers[i * 2 + 1]}`, name: aLabel },
      bracketRound: bracketRoundCounter,
      bracketPosition: i + 1,
      gameNumber,
      placeholderLabel: `${hLabel} vs ${aLabel}`,
    });
    lbPrev.push(gameNumber);
    gameNumber++;
  }
  bracketRoundCounter++;

  // Remaining LB rounds
  let wbDropIdx = 1;
  for (let lbRound = 2; lbRound <= totalLbRounds; lbRound++) {
    const roundNums: number[] = [];

    if (lbRound % 2 === 0) {
      // Cross-bracket: LB survivors vs WB losers
      const wbLosers = wbGamesByRound[wbDropIdx];
      for (let i = 0; i < lbPrev.length; i++) {
        const hLabel = `Winner of Game ${lbPrev[i]}`;
        const loserNum = wbLosers?.[i] ?? lbPrev[i];
        const aLabel = wbLosers?.[i] ? `Loser of Game ${wbLosers[i]}` : `Winner of Game ${lbPrev[i]}`;
        allMatchups.push({
          home: { id: `winner-${lbPrev[i]}`, name: hLabel },
          away: { id: `loser-${loserNum}`, name: aLabel },
          bracketRound: bracketRoundCounter,
          bracketPosition: i + 1,
          gameNumber,
          placeholderLabel: `${hLabel} vs ${aLabel}`,
        });
        roundNums.push(gameNumber);
        gameNumber++;
      }
      wbDropIdx++;
    } else {
      // Within LB: survivors play each other
      const gamesInRound = lbPrev.length / 2;
      for (let i = 0; i < gamesInRound; i++) {
        const hg = lbPrev[i * 2];
        const ag = lbPrev[i * 2 + 1];
        allMatchups.push({
          home: { id: `winner-${hg}`, name: `Winner of Game ${hg}` },
          away: { id: `winner-${ag}`, name: `Winner of Game ${ag}` },
          bracketRound: bracketRoundCounter,
          bracketPosition: i + 1,
          gameNumber,
          placeholderLabel: `Winner of Game ${hg} vs Winner of Game ${ag}`,
        });
        roundNums.push(gameNumber);
        gameNumber++;
      }
    }

    lbPrev = roundNums;
    bracketRoundCounter++;
  }

  // === Grand Final ===
  const wbFinal = wbGamesByRound[wbGamesByRound.length - 1][0];
  const lbFinal = lbPrev[0];
  allMatchups.push({
    home: { id: 'wb-winner', name: `Winner of Game ${wbFinal}` },
    away: { id: 'lb-winner', name: `Winner of Game ${lbFinal}` },
    bracketRound: bracketRoundCounter,
    bracketPosition: 1,
    gameNumber,
    placeholderLabel: `Winner of Game ${wbFinal} vs Winner of Game ${lbFinal}`,
  });

  // Assign to slots
  const games: BracketGame[] = [];
  let si = slotOffset;

  for (const m of allMatchups) {
    if (si >= slots.length) {
      warnings.push(`Not enough slots for bracket game ${m.gameNumber}.`);
      continue;
    }
    const slot = slots[si];
    games.push({
      gameNumber: m.gameNumber,
      date: formatDateUTC(slot),
      dayOfWeek: DAY_NAMES[slot.getUTCDay()],
      time: formatTimeUTC(slot),
      homeTeam: m.home,
      awayTeam: m.away,
      round: 200 + m.bracketRound,
      scheduledAt: slot,
      flag: 'tournament',
      bracketRound: m.bracketRound,
      bracketPosition: m.bracketPosition,
      placeholderLabel: m.placeholderLabel,
    });
    si++;
  }

  return { games, warnings, slotsUsed: si - slotOffset };
}


// ─── Team Summary Builder ──────────────────────────────────────────────────

function buildTeamSummary(
  teams: RosterInfo[],
  regularGames: ScheduledGame[],
  bracketGames: BracketGame[],
  hasOddRosters: boolean,
): TeamSummary[] {
  const summaries = new Map<string, TeamSummary>();

  for (const t of teams) {
    summaries.set(t.id, {
      team: t,
      games: 0,
      home: 0,
      away: 0,
      byes: 0,
      opponents: {},
    });
  }

  // Count regular season games
  for (const g of regularGames) {
    const home = summaries.get(g.homeTeam.id);
    const away = summaries.get(g.awayTeam.id);

    if (home) {
      home.games++;
      home.home++;
      home.opponents[g.awayTeam.id] = (home.opponents[g.awayTeam.id] || 0) + 1;
    }
    if (away) {
      away.games++;
      away.away++;
      away.opponents[g.homeTeam.id] = (away.opponents[g.homeTeam.id] || 0) + 1;
    }
  }

  // Count bracket games (only for real rosters, not placeholders)
  for (const g of bracketGames) {
    const home = summaries.get(g.homeTeam.id);
    const away = summaries.get(g.awayTeam.id);

    if (home && !g.homeTeam.id.startsWith('winner-') && !g.homeTeam.id.startsWith('loser-') && g.homeTeam.id !== 'BYE' && g.homeTeam.id !== 'wb-winner' && g.homeTeam.id !== 'lb-winner') {
      home.games++;
      home.home++;
    }
    if (away && !g.awayTeam.id.startsWith('winner-') && !g.awayTeam.id.startsWith('loser-') && g.awayTeam.id !== 'BYE' && g.awayTeam.id !== 'wb-winner' && g.awayTeam.id !== 'lb-winner') {
      away.games++;
      away.away++;
    }
  }

  // Calculate byes for odd roster counts
  if (hasOddRosters && regularGames.length > 0) {
    // In a round-robin with odd rosters, each roster gets one bye per cycle
    const maxGames = Math.max(...Array.from(summaries.values()).map(s => s.games));
    for (const s of summaries.values()) {
      s.byes = maxGames - s.games;
    }
  }

  return Array.from(summaries.values());
}

// ─── Main Entry Point ──────────────────────────────────────────────────────

/**
 * Generate a complete, fair schedule based on the provided configuration.
 * Returns validation results, scheduled games, bracket games, and fairness summary.
 */
export function generateSchedule(input: SchedulerInput): SchedulerOutput {
  // 1. Validate
  const validationErrors = validate(input);
  if (validationErrors.length > 0) {
    return {
      isValid: false,
      warnings: validationErrors,
      playableSlots: [],
      regularSeasonGames: [],
      playoffGames: [],
      teamSummary: [],
    };
  }

  const allWarnings: string[] = [];

  // 2. Generate slots
  const slots = generateSlots(input);

  if (slots.length === 0) {
    return {
      isValid: false,
      warnings: ['No playable slots found within the configured date range and time window.'],
      playableSlots: [],
      regularSeasonGames: [],
      playoffGames: [],
      teamSummary: [],
    };
  }

  let regularSeasonGames: ScheduledGame[] = [];
  let playoffGames: BracketGame[] = [];

  // 3. Schedule based on type
  if (input.scheduleType === 'tournament') {
    // Tournament only — no regular season
    const bracketFn = input.eliminationType === 'double'
      ? generateDoubleEliminationBracket
      : generateSingleEliminationBracket;

    const bracket = bracketFn(input.teams, slots, 0);
    playoffGames = bracket.games.map(g => ({ ...g, flag: 'tournament' as const }));
    allWarnings.push(...bracket.warnings);

  } else {
    // Season or season_playoffs — generate regular season first
    const { matchups, warnings: matchupWarnings } = generateFairMatchups(
      input.teams,
      input.regularSeasonGamesPerTeam,
    );
    allWarnings.push(...matchupWarnings);

    // Check if we have enough slots
    if (matchups.length > slots.length) {
      return {
        isValid: false,
        warnings: [
          `Not enough playable slots (${slots.length}) to schedule ${matchups.length} games. ` +
          `Expand the date range, add more allowed days, or widen the time window.`,
        ],
        playableSlots: slots,
        regularSeasonGames: [],
        playoffGames: [],
        teamSummary: [],
      };
    }

    const { games, warnings: slotWarnings } = assignSlotsToMatchups(matchups, slots);
    regularSeasonGames = games;
    allWarnings.push(...slotWarnings);

    // 4. Generate playoffs if needed
    if (input.scheduleType === 'season_playoffs' && input.playoffTeamCount && input.playoffTeamCount >= 2) {
      // Find the last regular season slot used, then start playoffs after a gap
      const lastRegularSlotIdx = regularSeasonGames.length > 0
        ? slots.findIndex(s => s.getTime() === regularSeasonGames[regularSeasonGames.length - 1].scheduledAt.getTime())
        : -1;

      // Start playoffs from the next available slot after the last regular season game
      // Skip at least one week (7 days) worth of slots for a break
      const lastRegularTime = regularSeasonGames.length > 0
        ? regularSeasonGames[regularSeasonGames.length - 1].scheduledAt.getTime()
        : input.startDate.getTime();
      const playoffStartTime = lastRegularTime + 7 * 24 * 60 * 60 * 1000;

      // Find the first slot at or after the playoff start time
      let playoffSlotOffset = slots.findIndex(s => s.getTime() >= playoffStartTime);
      if (playoffSlotOffset === -1) {
        // Generate additional slots for playoffs
        const playoffStartDate = new Date(playoffStartTime);
        const playoffInput: SchedulerInput = {
          ...input,
          startDate: playoffStartDate,
          endDate: input.endDate ?? new Date(playoffStartTime + 90 * 24 * 60 * 60 * 1000),
        };
        const playoffSlots = generateSlots(playoffInput);
        const allSlots = [...slots, ...playoffSlots];

        playoffSlotOffset = allSlots.findIndex(s => s.getTime() >= playoffStartTime);

        const bracketFn = input.eliminationType === 'double'
          ? generateDoubleEliminationBracket
          : generateSingleEliminationBracket;

        // Use TBD rosters for playoffs (seedings determined by standings)
        const tbdRosters: RosterInfo[] = Array.from({ length: input.playoffTeamCount }, (_, i) => ({
          id: `seed-${i + 1}`,
          name: `Seed #${i + 1}`,
        }));

        const bracket = bracketFn(tbdRosters, allSlots, playoffSlotOffset >= 0 ? playoffSlotOffset : allSlots.length);
        playoffGames = bracket.games.map(g => ({ ...g, flag: 'playoffs' as const }));
        allWarnings.push(...bracket.warnings);
      } else {
        const bracketFn = input.eliminationType === 'double'
          ? generateDoubleEliminationBracket
          : generateSingleEliminationBracket;

        const tbdRosters: RosterInfo[] = Array.from({ length: input.playoffTeamCount }, (_, i) => ({
          id: `seed-${i + 1}`,
          name: `Seed #${i + 1}`,
        }));

        const bracket = bracketFn(tbdRosters, slots, playoffSlotOffset);
        playoffGames = bracket.games.map(g => ({ ...g, flag: 'playoffs' as const }));
        allWarnings.push(...bracket.warnings);
      }
    }
  }

  // 5. Build team summary
  const teamSummary = buildTeamSummary(
    input.teams,
    regularSeasonGames,
    playoffGames,
    input.teams.length % 2 !== 0,
  );

  // Check for fairness warnings
  if (input.scheduleType !== 'tournament') {
    const gameCounts = teamSummary.map(s => s.games);
    const minGames = Math.min(...gameCounts);
    const maxGames = Math.max(...gameCounts);
    if (maxGames - minGames > 1) {
      allWarnings.push(
        `Game count imbalance: rosters play between ${minGames} and ${maxGames} games.`
      );
    }

    for (const s of teamSummary) {
      if (s.home + s.away > 0 && Math.abs(s.home - s.away) > 1) {
        allWarnings.push(
          `Home/away imbalance for "${s.team.name}": ${s.home} home, ${s.away} away.`
        );
      }
    }
  }

  return {
    isValid: true,
    warnings: allWarnings,
    playableSlots: slots,
    regularSeasonGames,
    playoffGames,
    teamSummary,
  };
}
