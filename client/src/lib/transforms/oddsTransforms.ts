/**
 * oddsTransforms.ts — Centralized transform layer.
 *
 * Maps the live `EnhancedGame` shape returned by `trpc.odds.nbaEnhanced`
 * into the frontend page shapes: Edge, Prediction, ArbitrageOpp.
 *
 * All mappers are pure functions with no side-effects.
 * Safe defaults are applied for every optional field.
 */

import type {
  Edge,
  Prediction,
  ArbitrageOpp,
} from "@/hooks/useMockData";

// ─── EnhancedGame shape (mirrors server/oddsService.ts) ──────────
// We define a local type here so the client does not import server code.

export interface EnhancedGame {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  start_time: string;
  // Per-book odds
  caesars_home_odds: number | null;
  caesars_away_odds: number | null;
  draftkings_home_odds: number | null;
  draftkings_away_odds: number | null;
  fanduel_home_odds: number | null;
  fanduel_away_odds: number | null;
  // Best available
  best_home_odds: number | null;
  best_away_odds: number | null;
  best_home_book: string | null;
  best_away_book: string | null;
  // Market implied probabilities (0-100)
  implied_home_prob: number | null;
  implied_away_prob: number | null;
  // Model probabilities (0-100)
  model_home_prob: number | null;
  model_away_prob: number | null;
  // Edge (percentage points, positive = home value)
  edge: number | null;
  is_value_bet: boolean;
  recommendation: string;
  // Enhanced fields
  confidence: number | null;
  active_layers: Record<string, string> | null;
  model_output: {
    explanation?: {
      base?: string;
      historical?: string;
      injuries?: string;
      fatigue?: string;
      weather?: string;
      numeric?: {
        historicalAdjustment?: number;
        injuryAdjustment?: number;
        fatigueAdjustment?: number;
      };
    };
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Convert American odds to decimal odds. */
function americanToDecimal(odds: number): number {
  if (odds > 0) return +(odds / 100 + 1).toFixed(3);
  return +(100 / Math.abs(odds) + 1).toFixed(3);
}

/** Round to N decimal places. */
function round(n: number, places = 2): number {
  return Math.round(n * 10 ** places) / 10 ** places;
}

// ─── mapEnhancedOddsToEdge ────────────────────────────────────────

/**
 * Maps a single EnhancedGame to one or two Edge records (home + away).
 * Only produces an Edge when odds are available.
 * Edge values come directly from the model — no invented numbers.
 */
export function mapEnhancedOddsToEdge(game: EnhancedGame, startId = 1): Edge[] {
  const edges: Edge[] = [];
  let id = startId;

  const homeProb  = game.model_home_prob  !== null ? game.model_home_prob  / 100 : null;
  const awayProb  = game.model_away_prob  !== null ? game.model_away_prob  / 100 : null;
  const impliedH  = game.implied_home_prob !== null ? game.implied_home_prob / 100 : null;
  const impliedA  = game.implied_away_prob !== null ? game.implied_away_prob / 100 : null;
  const edgeVal   = game.edge ?? 0;
  const conf      = game.confidence ?? 0;

  if (game.best_home_odds !== null && homeProb !== null && impliedH !== null) {
    const dec = americanToDecimal(game.best_home_odds);
    edges.push({
      id: id++,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      side: "home",
      team: game.home_team,
      odds: game.best_home_odds,
      decimalOdds: dec,
      impliedProb: round(impliedH * 100, 1),
      predictedProb: round(homeProb * 100, 1),
      edge: round(edgeVal, 1),
      expectedValue: round(edgeVal * dec / 100, 3),
      recommendedStake: Math.max(0, Math.round(edgeVal * 200)),
      confidence: round(conf, 0),
      sportsbook: game.best_home_book ?? "Best Available",
    });
  }

  if (game.best_away_odds !== null && awayProb !== null && impliedA !== null) {
    const dec = americanToDecimal(game.best_away_odds);
    const awayEdge = round(-edgeVal, 1);
    edges.push({
      id: id++,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      side: "away",
      team: game.away_team,
      odds: game.best_away_odds,
      decimalOdds: dec,
      impliedProb: round(impliedA * 100, 1),
      predictedProb: round(awayProb * 100, 1),
      edge: awayEdge,
      expectedValue: round(awayEdge * dec / 100, 3),
      recommendedStake: Math.max(0, Math.round(Math.abs(awayEdge) * 200)),
      confidence: round(conf, 0),
      sportsbook: game.best_away_book ?? "Best Available",
    });
  }

  return edges;
}

// ─── mapEnhancedOddsToPrediction ─────────────────────────────────

/**
 * Maps a single EnhancedGame to a Prediction record.
 * Predicted winner is determined by the model probability, not market odds.
 */
export function mapEnhancedOddsToPrediction(game: EnhancedGame, id: number): Prediction {
  const homeProb = game.model_home_prob ?? 50;
  const awayProb = game.model_away_prob ?? 50;

  return {
    id,
    gameId: id,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    sport: "nba",
    predictedWinner: homeProb >= awayProb ? game.home_team : game.away_team,
    homeWinProb: round(homeProb, 1),
    awayWinProb: round(awayProb, 1),
    confidence: round(game.confidence ?? 0, 0),
    modelName: "Multi-Layer Engine",
    predictionTime: new Date().toISOString(),
    outcome: "pending" as const,
  };
}

// ─── mapEnhancedOddsToArbitrageOpp ───────────────────────────────

/**
 * Maps a single EnhancedGame to an ArbitrageOpp if a true arbitrage exists.
 * Returns null if no arbitrage opportunity is present.
 *
 * Arbitrage exists when: (1/homeDecimal + 1/awayDecimal) < 1
 * This means the combined implied probability is below 100%.
 */
export function mapEnhancedOddsToArbitrageOpp(
  game: EnhancedGame,
  id: number
): ArbitrageOpp | null {
  if (game.best_home_odds === null || game.best_away_odds === null) return null;

  const homeDec = americanToDecimal(game.best_home_odds);
  const awayDec = americanToDecimal(game.best_away_odds);
  const impliedTotal = 1 / homeDec + 1 / awayDec;

  if (impliedTotal >= 1) return null; // No genuine arbitrage

  const profitPct = round((1 - impliedTotal) * 100, 2);
  const totalStake = 1000;
  const stakeHome = Math.round((totalStake / homeDec) / impliedTotal);
  const stakeAway = Math.round((totalStake / awayDec) / impliedTotal);
  const guaranteedProfit = Math.round(totalStake * profitPct / 100);

  return {
    id,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    sport: "nba",
    bookA: game.best_home_book ?? "Book A",
    bookB: game.best_away_book ?? "Book B",
    sideA: game.home_team,
    sideB: game.away_team,
    oddsA: game.best_home_odds,
    oddsB: game.best_away_odds,
    profitPct,
    stakeA: stakeHome,
    stakeB: stakeAway,
    guaranteedProfit,
    status: "active",
    detectedTime: new Date().toISOString(),
  };
}

// ─── Batch transform helpers ──────────────────────────────────────

/** Transform all games to Edge[] in a single pass. */
export function transformGamesToEdges(games: EnhancedGame[]): Edge[] {
  const result: Edge[] = [];
  let id = 1;
  for (const game of games) {
    const edges = mapEnhancedOddsToEdge(game, id);
    id += edges.length;
    result.push(...edges);
  }
  return result;
}

/** Transform all games to Prediction[]. */
export function transformGamesToPredictions(games: EnhancedGame[]): Prediction[] {
  return games.map((g, i) => mapEnhancedOddsToPrediction(g, i + 1));
}

/** Transform all games to ArbitrageOpp[] (only real arb opportunities). */
export function transformGamesToArbitrage(games: EnhancedGame[]): ArbitrageOpp[] {
  const result: ArbitrageOpp[] = [];
  let id = 1;
  for (const game of games) {
    const opp = mapEnhancedOddsToArbitrageOpp(game, id);
    if (opp) {
      result.push(opp);
      id++;
    }
  }
  return result;
}
