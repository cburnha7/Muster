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

  if (allowedDaysOfWeek.length === 0 && input.frequency !== 'all_at_once') {
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
 * Each "round" guarantees every roster plays exactly once (or gets a bye
 * if the roster count is odd). Rounds repeat cyclically until every roster
 * has played `gamesPerTeam` games. With odd rosters the bye rotates so a
 * different roster sits out each round.
 *
 * Algorithm — standard circle (polygon) method:
 *   - Pin roster[0] in place; rotate the remaining rosters each round.
 *   - One full cycle = (n-1) rounds where n = roster count (padded to even).
 *   - Repeat cycles, flipping home/away on alternate cycles for balance.
 */
function generateFairMatchups(teams: RosterInfo[], gamesPerTeam: number): { matchups: Matchup[]; warnings: string[] } {
  const warnings: string[] = [];
  const n = teams.length;

  if (n < 2) {
    warnings.push('Need at least 2 rosters to generate a schedule.');
    return { matchups: [], warnings };
  }

  // Total games needed: (n * gamesPerTeam) / 2
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

  // Pad to even for the circle method; BYE = bye week
  const rosterList = [...teams];
  const hasOddRosters = n % 2 !== 0;
  if (hasOddRosters) {
    rosterList.push({ id: 'BYE', name: 'BYE' });
  }
  const m = rosterList.length; // always even
  const roundsPerCycle = m - 1;

  // Tracking
  const gameCount = new Map<string, number>();
  const homeCount = new Map<string, number>();
  const awayCount = new Map<string, number>();
  for (const t of teams) {
    gameCount.set(t.id, 0);
    homeCount.set(t.id, 0);
    awayCount.set(t.id, 0);
  }

  const matchups: Matchup[] = [];
  let roundNum = 1;
  let cycle = 0;

  while (matchups.length < totalGames) {
    // Build the rotation array: pin index 0, rotate 1..(m-1)
    // For round r within a cycle, the rotation is:
    //   position 0 = rosterList[0]  (fixed)
    //   position k (1..m-1) = rosterList[1 + ((k - 1 + r) % (m - 1))]
    for (let r = 0; r < roundsPerCycle && matchups.length < totalGames; r++) {
      const rotated: RosterInfo[] = [rosterList[0]];
      for (let k = 1; k < m; k++) {
        rotated.push(rosterList[1 + ((k - 1 + r) % (m - 1))]);
      }

      // Pair: rotated[0] vs rotated[m-1], rotated[1] vs rotated[m-2], etc.
      const roundMatchups: Array<{ home: RosterInfo; away: RosterInfo }> = [];
      for (let i = 0; i < m / 2; i++) {
        let home = rotated[i];
        let away = rotated[m - 1 - i];

        // Skip BYE matchups
        if (home.id === 'BYE' || away.id === 'BYE') continue;

        // Home/away balancing: flip on odd cycles
        if (cycle % 2 !== 0) {
          [home, away] = [away, home];
        }

        // Fine-tune: if home already has more home games, swap
        const hHome = homeCount.get(home.id) || 0;
        const hAway = awayCount.get(home.id) || 0;
        const aHome = homeCount.get(away.id) || 0;
        const aAway = awayCount.get(away.id) || 0;
        if (hHome - hAway > aHome - aAway) {
          [home, away] = [away, home];
        }

        roundMatchups.push({ home, away });
      }

      // Check if any roster in this round has already hit their target.
      // If so, skip the entire round to avoid one roster playing while
      // their round-partner sits out (which breaks the 1-game-per-week rule).
      const allUnderTarget = roundMatchups.every(({ home, away }) => {
        return (gameCount.get(home.id) || 0) < gamesPerTeam &&
               (gameCount.get(away.id) || 0) < gamesPerTeam;
      });

      if (!allUnderTarget) {
        // Some rosters are done — skip this round entirely to keep balance
        continue;
      }

      // Commit the full round
      for (const { home, away } of roundMatchups) {
        matchups.push({ home, away, round: roundNum });
        gameCount.set(home.id, (gameCount.get(home.id) || 0) + 1);
        gameCount.set(away.id, (gameCount.get(away.id) || 0) + 1);
        homeCount.set(home.id, (homeCount.get(home.id) || 0) + 1);
        awayCount.set(away.id, (awayCount.get(away.id) || 0) + 1);
      }
      roundNum++;
    }
    cycle++;

    // Safety: prevent infinite loop
    if (cycle > totalGames * 4) {
      warnings.push('Could not generate all requested games within cycle limit.');
      break;
    }
  }

  // Check home/away balance
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
/**
 * Return the ISO week key for a UTC date (YYYY-Www).
 * ISO weeks start on Monday; week 1 contains the year's first Thursday.
 */
function isoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1..Sun=7)
  const dayNum = tmp.getUTCDay() || 7; // convert Sun=0 → 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Return "YYYY-MM" for a UTC date. */
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function assignSlotsToMatchups(
  matchups: Matchup[],
  slots: Date[],
  frequency: 'all_at_once' | 'weekly' | 'monthly' = 'weekly',
): { games: ScheduledGame[]; warnings: string[] } {
  const warnings: string[] = [];

  if (matchups.length === 0 || slots.length === 0) {
    return { games: [], warnings };
  }

  // ── Step 1: Group slots by calendar day (UTC) ──
  const dayKey = (d: Date) => formatDateUTC(d);
  const dayOrder: string[] = [];
  const daySlots = new Map<string, number[]>();

  for (let si = 0; si < slots.length; si++) {
    const dk = dayKey(slots[si]);
    if (!daySlots.has(dk)) {
      daySlots.set(dk, []);
      dayOrder.push(dk);
    }
    daySlots.get(dk)!.push(si);
  }

  // ── Step 2: Group matchups by round ──
  const roundOrder: number[] = [];
  const roundMatchups = new Map<number, Matchup[]>();
  for (const m of matchups) {
    if (!roundMatchups.has(m.round)) {
      roundMatchups.set(m.round, []);
      roundOrder.push(m.round);
    }
    roundMatchups.get(m.round)!.push(m);
  }

  // ── Step 3: Determine how many rounds fit per period ──
  // For weekly/monthly we spread rounds evenly across the available
  // periods. E.g. 12 rounds over 6 weeks → 2 rounds per week.
  // For all_at_once there is no spacing constraint.

  const periodKeyFn = frequency === 'weekly' ? (d: Date) => isoWeekKey(d)
    : frequency === 'monthly' ? (d: Date) => monthKey(d)
    : null;

  let maxRoundsPerPeriod = Infinity; // all_at_once — no limit

  if (periodKeyFn) {
    // Count distinct periods available in the slot pool
    const distinctPeriods = new Set<string>();
    for (const s of slots) distinctPeriods.add(periodKeyFn(s));
    const periodCount = distinctPeriods.size;

    // Spread rounds evenly: ceil so we don't run out of periods
    maxRoundsPerPeriod = periodCount > 0
      ? Math.ceil(roundOrder.length / periodCount)
      : roundOrder.length;
  }

  const usedSlots = new Set<number>();
  const periodRoundCount = new Map<string, number>(); // period → rounds placed so far
  const games: ScheduledGame[] = [];
  let gameNumber = 1;
  let dayIdx = 0;

  for (const roundNum of roundOrder) {
    const roundGames = roundMatchups.get(roundNum)!;
    let placed = false;

    for (let attempt = 0; attempt < dayOrder.length; attempt++) {
      const di = (dayIdx + attempt) % dayOrder.length;
      const dk = dayOrder[di];
      const slotsForDay = daySlots.get(dk)!;

      // Enforce even spread: skip if this period already has its share
      if (periodKeyFn) {
        const refSlot = slots[slotsForDay[0]];
        const pk = periodKeyFn(refSlot);
        if ((periodRoundCount.get(pk) || 0) >= maxRoundsPerPeriod) continue;
      }

      const availableSlots = slotsForDay.filter((si) => !usedSlots.has(si));
      if (availableSlots.length < roundGames.length) continue;

      const assignedSlots = availableSlots.slice(0, roundGames.length);

      // Track period usage
      if (periodKeyFn) {
        const refSlot = slots[slotsForDay[0]];
        const pk = periodKeyFn(refSlot);
        periodRoundCount.set(pk, (periodRoundCount.get(pk) || 0) + 1);
      }

      for (let gi = 0; gi < roundGames.length; gi++) {
        const matchup = roundGames[gi];
        const slotIdx = assignedSlots[gi];
        usedSlots.add(slotIdx);

        const slot = slots[slotIdx];
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
      }

      dayIdx = di + 1;
      placed = true;
      break;
    }

    if (!placed) {
      for (const m of roundGames) {
        warnings.push(
          `Could not schedule game: ${m.home.name} vs ${m.away.name} (Round ${m.round}) — no available day with enough slots.`
        );
      }
    }
  }

  // Sort games chronologically
  games.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
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

    const { games, warnings: slotWarnings } = assignSlotsToMatchups(matchups, slots, input.frequency);
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
