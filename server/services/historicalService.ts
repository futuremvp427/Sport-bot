/*
  historicalService.ts — Historical team performance layer.
  
  Provides recent form, H2H records, home/away splits, and scoring trends.
  Uses The Odds API scores endpoint when available; falls back to a
  deterministic seeded model based on 2024-25 NBA team strength ratings.
  
  All results are cached for 6 hours (historical data changes slowly).
  Adjustment range: clamped to ±0.06 probability.
  
  Feature flag: ENABLE_HISTORICAL
*/

import { ENV } from "../_core/env";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry<T> { data: T; timestamp: number; source: "live" | "seeded"; }
const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): CacheEntry<T> | null {
  const e = cache[key] as CacheEntry<T> | undefined;
  if (!e || Date.now() - e.timestamp > CACHE_TTL_MS) return null;
  return e;
}
function setCache<T>(key: string, data: T, source: "live" | "seeded"): void {
  cache[key] = { data, timestamp: Date.now(), source };
}

// ─── NBA team strength ratings (2024-25 season) ───────────────────
// offense/defense: 0-1 scale; homeBonus: typical home-court advantage
const NBA_RATINGS: Record<string, { offense: number; defense: number; homeBonus: number }> = {
  "Oklahoma City Thunder":    { offense: 0.82, defense: 0.85, homeBonus: 0.06 },
  "Boston Celtics":           { offense: 0.88, defense: 0.84, homeBonus: 0.05 },
  "Cleveland Cavaliers":      { offense: 0.80, defense: 0.83, homeBonus: 0.06 },
  "Golden State Warriors":    { offense: 0.78, defense: 0.74, homeBonus: 0.07 },
  "Los Angeles Lakers":       { offense: 0.76, defense: 0.72, homeBonus: 0.06 },
  "Denver Nuggets":           { offense: 0.81, defense: 0.78, homeBonus: 0.08 },
  "Minnesota Timberwolves":   { offense: 0.77, defense: 0.82, homeBonus: 0.05 },
  "Memphis Grizzlies":        { offense: 0.72, defense: 0.70, homeBonus: 0.06 },
  "Houston Rockets":          { offense: 0.74, defense: 0.76, homeBonus: 0.06 },
  "Dallas Mavericks":         { offense: 0.79, defense: 0.75, homeBonus: 0.05 },
  "New York Knicks":          { offense: 0.77, defense: 0.78, homeBonus: 0.07 },
  "Indiana Pacers":           { offense: 0.78, defense: 0.71, homeBonus: 0.05 },
  "Milwaukee Bucks":          { offense: 0.76, defense: 0.73, homeBonus: 0.06 },
  "Miami Heat":               { offense: 0.73, defense: 0.75, homeBonus: 0.06 },
  "Philadelphia 76ers":       { offense: 0.71, defense: 0.70, homeBonus: 0.05 },
  "Chicago Bulls":            { offense: 0.68, defense: 0.67, homeBonus: 0.05 },
  "Atlanta Hawks":            { offense: 0.72, defense: 0.66, homeBonus: 0.05 },
  "Toronto Raptors":          { offense: 0.65, defense: 0.64, homeBonus: 0.05 },
  "Orlando Magic":            { offense: 0.70, defense: 0.74, homeBonus: 0.06 },
  "Charlotte Hornets":        { offense: 0.63, defense: 0.62, homeBonus: 0.05 },
  "Detroit Pistons":          { offense: 0.66, defense: 0.65, homeBonus: 0.05 },
  "Washington Wizards":       { offense: 0.60, defense: 0.59, homeBonus: 0.04 },
  "Brooklyn Nets":            { offense: 0.62, defense: 0.61, homeBonus: 0.05 },
  "Sacramento Kings":         { offense: 0.74, defense: 0.70, homeBonus: 0.06 },
  "Phoenix Suns":             { offense: 0.73, defense: 0.69, homeBonus: 0.06 },
  "Los Angeles Clippers":     { offense: 0.74, defense: 0.73, homeBonus: 0.05 },
  "Portland Trail Blazers":   { offense: 0.64, defense: 0.63, homeBonus: 0.06 },
  "Utah Jazz":                { offense: 0.62, defense: 0.61, homeBonus: 0.06 },
  "New Orleans Pelicans":     { offense: 0.70, defense: 0.69, homeBonus: 0.06 },
  "San Antonio Spurs":        { offense: 0.63, defense: 0.62, homeBonus: 0.05 },
};

function getRating(team: string) {
  if (NBA_RATINGS[team]) return NBA_RATINGS[team];
  // Partial match on last word (e.g. "Lakers" → "Los Angeles Lakers")
  const last = team.split(" ").pop()!;
  for (const [k, v] of Object.entries(NBA_RATINGS)) {
    if (k.endsWith(last)) return v;
  }
  return { offense: 0.70, defense: 0.70, homeBonus: 0.05 };
}

// ─── Types ───────────────────────────────────────────────────────

export interface TeamForm {
  team: string;
  last5WinRate: number;
  last10WinRate: number;
  avgPointsScored: number;
  avgPointsAllowed: number;
  avgMargin: number;
  homeWinRate: number;
  awayWinRate: number;
  source: "live" | "seeded";
}

export interface HeadToHeadRecord {
  teamA: string;
  teamB: string;
  teamAWins: number;
  teamBWins: number;
  totalGames: number;
  teamAWinRate: number;
  avgMarginTeamA: number;
  source: "seeded";
}

export interface HistoricalAdjustment {
  value: number;           // probability shift for home team, clamped ±0.06
  formDiff: number;
  h2hBias: number;
  homeAwaySplit: number;
  explanation: string;
  source: "live" | "seeded";
}

// ─── Seeded form generator (deterministic, no random) ────────────

function seededForm(team: string): TeamForm {
  const r = getRating(team);
  const strength = (r.offense + r.defense) / 2;
  // Deterministic derivation — no Math.random()
  const last10 = Math.round(Math.min(0.88, Math.max(0.12, strength - 0.05)) * 100) / 100;
  const last5  = Math.round(Math.min(0.90, Math.max(0.10, strength - 0.02)) * 100) / 100;
  const scored   = Math.round((95 + r.offense * 25) * 10) / 10;
  const allowed  = Math.round((95 + (1 - r.defense) * 25) * 10) / 10;
  return {
    team,
    last5WinRate: last5,
    last10WinRate: last10,
    avgPointsScored: scored,
    avgPointsAllowed: allowed,
    avgMargin: Math.round((scored - allowed) * 10) / 10,
    homeWinRate: Math.min(0.92, last10 + r.homeBonus),
    awayWinRate: Math.max(0.08, last10 - r.homeBonus),
    source: "seeded",
  };
}

// ─── Public functions ─────────────────────────────────────────────

/** Get recent form for a team (last 5 and 10 games) */
export async function getRecentForm(team: string): Promise<TeamForm> {
  const key = `form:${team}`;
  const cached = getCached<TeamForm>(key);
  if (cached) return cached.data;

  // Try The Odds API scores endpoint (uses existing API key, no extra credits)
  if (ENV.oddsApiKey) {
    try {
      const url = new URL(`${ODDS_API_BASE}/sports/basketball_nba/scores`);
      url.searchParams.set("apiKey", ENV.oddsApiKey);
      url.searchParams.set("daysFrom", "14");
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const scores: any[] = await res.json();
        const games = scores
          .filter(g => (g.home_team === team || g.away_team === team) && g.completed)
          .sort((a, b) => new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime());

        if (games.length >= 3) {
          const results = games.map(g => {
            const isHome = g.home_team === team;
            const myScore  = g.scores?.find((s: any) => s.name === team)?.score ?? 0;
            const oppScore = g.scores?.find((s: any) => s.name !== team)?.score ?? 0;
            return { won: Number(myScore) > Number(oppScore), isHome, margin: Number(myScore) - Number(oppScore) };
          });
          const l10 = results.slice(0, 10);
          const l5  = results.slice(0, 5);
          const homeGames = l10.filter(r => r.isHome);
          const awayGames = l10.filter(r => !r.isHome);
          const form: TeamForm = {
            team,
            last5WinRate:  l5.length  ? l5.filter(r => r.won).length  / l5.length  : 0.5,
            last10WinRate: l10.length ? l10.filter(r => r.won).length / l10.length : 0.5,
            avgPointsScored: 0,
            avgPointsAllowed: 0,
            avgMargin: l10.length ? Math.round(l10.reduce((s, r) => s + r.margin, 0) / l10.length * 10) / 10 : 0,
            homeWinRate: homeGames.length ? homeGames.filter(r => r.won).length / homeGames.length : 0.57,
            awayWinRate: awayGames.length ? awayGames.filter(r => r.won).length / awayGames.length : 0.43,
            source: "live",
          };
          setCache(key, form, "live");
          return form;
        }
      }
    } catch (err) {
      console.warn(`[HistoricalService] Scores API unavailable for ${team}:`, err);
    }
  }

  const form = seededForm(team);
  setCache(key, form, "seeded");
  return form;
}

/** Get last-N games stats (convenience wrapper) */
export async function getLastNGamesStats(team: string, n: number): Promise<{ winRate: number; avgMargin: number; source: string }> {
  const form = await getRecentForm(team);
  return {
    winRate: n <= 5 ? form.last5WinRate : form.last10WinRate,
    avgMargin: form.avgMargin,
    source: form.source,
  };
}

/** Get home/away split */
export async function getHomeAwaySplit(team: string): Promise<{ homeWinRate: number; awayWinRate: number; source: string }> {
  const form = await getRecentForm(team);
  return { homeWinRate: form.homeWinRate, awayWinRate: form.awayWinRate, source: form.source };
}

/** Get head-to-head record */
export async function getHeadToHead(homeTeam: string, awayTeam: string): Promise<HeadToHeadRecord> {
  const key = `h2h:${[homeTeam, awayTeam].sort().join("|")}`;
  const cached = getCached<HeadToHeadRecord>(key);
  if (cached) return cached.data;

  const rA = getRating(homeTeam);
  const rB = getRating(awayTeam);
  const sA = (rA.offense + rA.defense) / 2;
  const sB = (rB.offense + rB.defense) / 2;
  const total = 10;
  const teamAWinRate = Math.min(0.85, Math.max(0.15, 0.5 + (sA - sB) * 1.5));
  const teamAWins = Math.round(total * teamAWinRate);

  const h2h: HeadToHeadRecord = {
    teamA: homeTeam,
    teamB: awayTeam,
    teamAWins,
    teamBWins: total - teamAWins,
    totalGames: total,
    teamAWinRate: Math.round(teamAWinRate * 100) / 100,
    avgMarginTeamA: Math.round((sA - sB) * 12 * 10) / 10,
    source: "seeded",
  };
  setCache(key, h2h, "seeded");
  return h2h;
}

/**
 * Calculate the combined historical adjustment for a matchup.
 * Returns a probability shift for the home team, clamped to ±0.06.
 */
export async function getHistoricalAdjustment(homeTeam: string, awayTeam: string): Promise<HistoricalAdjustment> {
  const [hForm, aForm, h2h] = await Promise.all([
    getRecentForm(homeTeam),
    getRecentForm(awayTeam),
    getHeadToHead(homeTeam, awayTeam),
  ]);

  // Form differential (last-10 win rates)
  const formDiff = Math.max(-0.04, Math.min(0.04, (hForm.last10WinRate - aForm.last10WinRate) * 0.25));

  // H2H bias
  const h2hBias = Math.max(-0.03, Math.min(0.03, (h2h.teamAWinRate - 0.5) * 0.2));

  // Home/away split advantage
  const homeAdv = hForm.homeWinRate - hForm.last10WinRate;
  const awayDis = aForm.awayWinRate - aForm.last10WinRate;
  const homeAwaySplit = Math.max(-0.03, Math.min(0.03, (homeAdv - awayDis) * 0.5));

  const total = Math.max(-0.06, Math.min(0.06, formDiff + h2hBias + homeAwaySplit));

  const parts: string[] = [];
  if (Math.abs(formDiff) > 0.005)
    parts.push(`form diff ${formDiff > 0 ? "+" : ""}${(formDiff * 100).toFixed(1)}%`);
  if (Math.abs(h2hBias) > 0.005)
    parts.push(`H2H ${h2h.teamAWins}-${h2h.teamBWins} in favor of ${h2h.teamAWinRate > 0.5 ? homeTeam : awayTeam}`);
  if (Math.abs(homeAwaySplit) > 0.005)
    parts.push(`home/away split ${homeAwaySplit > 0 ? "+" : ""}${(homeAwaySplit * 100).toFixed(1)}%`);

  const source = hForm.source === "live" || aForm.source === "live" ? "live" : "seeded";

  return {
    value: Math.round(total * 1000) / 1000,
    formDiff: Math.round(formDiff * 1000) / 1000,
    h2hBias: Math.round(h2hBias * 1000) / 1000,
    homeAwaySplit: Math.round(homeAwaySplit * 1000) / 1000,
    explanation: parts.length > 0 ? parts.join("; ") : "No significant historical edge",
    source,
  };
}
