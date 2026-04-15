/*
  fatigueService.ts — Schedule fatigue and rest day analysis.
  
  Detects back-to-backs, 3-in-4 games, rest day differential,
  and road trip burden. Uses The Odds API scores endpoint when
  available; falls back to a deterministic seeded model.
  
  Adjustment range: clamped to ±0.05 probability.
  Feature flag: ENABLE_FATIGUE
*/

import { ENV } from "../_core/env";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CacheEntry<T> { data: T; timestamp: number; }
const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): T | null {
  const e = cache[key] as CacheEntry<T> | undefined;
  if (!e || Date.now() - e.timestamp > CACHE_TTL_MS) return null;
  return e.data;
}
function setCache<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

// ─── Types ───────────────────────────────────────────────────────

export interface ScheduleLoad {
  team: string;
  restDays: number;
  gamesLast7Days: number;
  gamesLast4Days: number;
  isBackToBack: boolean;
  isThreeInFour: boolean;
  consecutiveRoadGames: number;
  fatigueScore: number;   // 0-1
  source: "live" | "seeded";
}

export interface FatigueAdjustment {
  value: number;               // probability shift for home team, clamped ±0.05
  restAdvantage: number;       // positive = home team has more rest
  confidenceReduction: number;
  explanation: string;
  source: "live" | "seeded";
}

// ─── Deterministic seeded model ───────────────────────────────────

function seededLoad(team: string, gameDate: string): ScheduleLoad {
  // Deterministic hash from team + date
  const hash = (team + gameDate).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const bucket = hash % 100;

  let restDays = 2;
  let gamesLast7 = 3;
  let gamesLast4 = 2;
  let isB2B = false;
  let is3in4 = false;
  let roadGames = 0;

  if (bucket < 15) {
    // ~15%: back-to-back
    restDays = 0; isB2B = true; gamesLast4 = 3; gamesLast7 = 4;
  } else if (bucket < 25) {
    // ~10%: 3-in-4
    restDays = 1; is3in4 = true; gamesLast4 = 3; gamesLast7 = 4;
  } else if (bucket < 40) {
    // ~15%: 1 rest day
    restDays = 1; gamesLast4 = 2; gamesLast7 = 3;
  } else if (bucket < 70) {
    // ~30%: 2 rest days (most common)
    restDays = 2; gamesLast4 = 2; gamesLast7 = 3;
  } else {
    // ~30%: 3+ rest days
    restDays = 3 + (bucket % 3); gamesLast4 = 1; gamesLast7 = 2;
  }

  if (bucket > 60 && bucket < 75) roadGames = 2 + (bucket % 3);

  let fatigueScore = 0;
  if (isB2B) fatigueScore += 0.50;
  else if (is3in4) fatigueScore += 0.35;
  else if (restDays === 1) fatigueScore += 0.20;
  if (roadGames >= 3) fatigueScore += 0.15;
  if (gamesLast7 >= 4) fatigueScore += 0.10;

  return {
    team, restDays, gamesLast7Days: gamesLast7, gamesLast4Days: gamesLast4,
    isBackToBack: isB2B, isThreeInFour: is3in4, consecutiveRoadGames: roadGames,
    fatigueScore: Math.min(1, Math.round(fatigueScore * 100) / 100),
    source: "seeded",
  };
}

// ─── Public functions ─────────────────────────────────────────────

/** Get rest days for a team */
export async function getRestDays(team: string, gameDate?: string): Promise<number> {
  const load = await getScheduleLoad(team, gameDate);
  return load.restDays;
}

/** Check if team is on a back-to-back */
export async function isBackToBack(team: string, gameDate?: string): Promise<boolean> {
  const load = await getScheduleLoad(team, gameDate);
  return load.isBackToBack;
}

/** Get full schedule load for a team */
export async function getScheduleLoad(team: string, gameDate?: string): Promise<ScheduleLoad> {
  const dateStr = gameDate
    ? new Date(gameDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const key = `fatigue:${team}:${dateStr}`;
  const cached = getCached<ScheduleLoad>(key);
  if (cached) return cached;

  // Try live schedule from Odds API scores endpoint
  if (ENV.oddsApiKey) {
    try {
      const url = new URL(`${ODDS_API_BASE}/sports/basketball_nba/scores`);
      url.searchParams.set("apiKey", ENV.oddsApiKey);
      url.searchParams.set("daysFrom", "7");
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const scores: any[] = await res.json();
        const games = scores
          .filter(g => (g.home_team === team || g.away_team === team) && g.completed)
          .sort((a, b) => new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime());

        if (games.length > 0) {
          const now = new Date(gameDate || Date.now());
          const lastGame = new Date(games[0].commence_time);
          const restDays = Math.max(0, Math.floor((now.getTime() - lastGame.getTime()) / 86400000));
          const last7 = games.filter(g => (now.getTime() - new Date(g.commence_time).getTime()) <= 7 * 86400000);
          const last4 = games.filter(g => (now.getTime() - new Date(g.commence_time).getTime()) <= 4 * 86400000);
          const isB2B = restDays === 0;
          const is3in4 = last4.length >= 3;
          let roadGames = 0;
          for (const g of games) { if (g.away_team === team) roadGames++; else break; }

          let fatigueScore = 0;
          if (isB2B) fatigueScore += 0.50;
          else if (is3in4) fatigueScore += 0.35;
          else if (restDays === 1) fatigueScore += 0.20;
          if (roadGames >= 3) fatigueScore += 0.15;
          if (last7.length >= 4) fatigueScore += 0.10;

          const load: ScheduleLoad = {
            team, restDays, gamesLast7Days: last7.length, gamesLast4Days: last4.length,
            isBackToBack: isB2B, isThreeInFour: is3in4, consecutiveRoadGames: roadGames,
            fatigueScore: Math.min(1, Math.round(fatigueScore * 100) / 100),
            source: "live",
          };
          setCache(key, load);
          return load;
        }
      }
    } catch (err) {
      console.warn(`[FatigueService] Live schedule unavailable for ${team}:`, err);
    }
  }

  const load = seededLoad(team, dateStr);
  setCache(key, load);
  return load;
}

/**
 * Calculate fatigue adjustment for a matchup.
 * Positive value = home team has rest advantage.
 * Clamped to ±0.05.
 */
export async function getFatigueAdjustment(homeTeam: string, awayTeam: string, gameDate?: string): Promise<FatigueAdjustment> {
  const [hLoad, aLoad] = await Promise.all([
    getScheduleLoad(homeTeam, gameDate),
    getScheduleLoad(awayTeam, gameDate),
  ]);

  let value = 0;
  let confidenceReduction = 0;
  const parts: string[] = [];

  if (hLoad.isBackToBack && !aLoad.isBackToBack) {
    value -= 0.04; confidenceReduction += 0.04;
    parts.push(`${homeTeam} on back-to-back`);
  } else if (!hLoad.isBackToBack && aLoad.isBackToBack) {
    value += 0.04;
    parts.push(`${awayTeam} on back-to-back — ${homeTeam} has rest advantage`);
  }

  if (hLoad.isThreeInFour && !aLoad.isThreeInFour) {
    value -= 0.025; confidenceReduction += 0.02;
    parts.push(`${homeTeam} playing 3rd game in 4 nights`);
  } else if (!hLoad.isThreeInFour && aLoad.isThreeInFour) {
    value += 0.025;
    parts.push(`${awayTeam} playing 3rd game in 4 nights`);
  }

  const restDiff = hLoad.restDays - aLoad.restDays;
  if (!hLoad.isBackToBack && !aLoad.isBackToBack && Math.abs(restDiff) >= 2) {
    const adj = 0.015 * Math.min(Math.abs(restDiff), 3) * Math.sign(restDiff);
    value += adj;
    parts.push(`Rest differential: ${homeTeam} ${hLoad.restDays}d vs ${awayTeam} ${aLoad.restDays}d`);
  }

  if (aLoad.consecutiveRoadGames >= 3) {
    value += 0.02;
    parts.push(`${awayTeam} on extended road trip (${aLoad.consecutiveRoadGames} games)`);
  }

  if (parts.length === 0) {
    parts.push(`Similar rest: ${homeTeam} ${hLoad.restDays}d vs ${awayTeam} ${aLoad.restDays}d`);
  }

  const source = hLoad.source === "live" || aLoad.source === "live" ? "live" : "seeded";

  return {
    value: Math.max(-0.05, Math.min(0.05, Math.round(value * 1000) / 1000)),
    restAdvantage: restDiff,
    confidenceReduction: Math.round(confidenceReduction * 100) / 100,
    explanation: parts.join("; "),
    source,
  };
}
