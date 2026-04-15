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
  // model_home_prob, model_away_prob, implied_home_prob, implied_away_prob are 0-100 on the server
  // Edge interface uses 0-1 range (matching mock data contract)
  const homeProb  = game.model_home_prob  !== null ? game.model_home_prob  / 100 : null;
  const awayProb  = game.model_away_prob  !== null ? game.model_away_prob  / 100 : null;
  const impliedH  = game.implied_home_prob !== null ? game.implied_home_prob / 100 : null;
  const impliedA  = game.implied_away_prob !== null ? game.implied_away_prob / 100 : null;
  // edge is 0-100 on server (percentage points) → normalise to 0-1
  const edgeVal   = (game.edge ?? 0) / 100;
  // confidence is 0-100 on server → normalise to 0-1
  const conf      = (game.confidence ?? 0) / 100;
  if (game.best_home_odds !== null && homeProb !== null && impliedH !== null) {
    const dec = americanToDecimal(game.best_home_odds);
    const ev = (homeProb * (dec - 1)) - (1 - homeProb);
    const b = dec - 1;
    const kellyFull = (homeProb * b - (1 - homeProb)) / b;
    const kellyStake = Math.max(0, Math.round(kellyFull * 0.25 * 10000));
    edges.push({
      id: id++,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      side: "home",
      team: game.home_team,
      odds: game.best_home_odds,
      decimalOdds: round(dec, 3),
      impliedProb: round(impliedH, 4),
      predictedProb: round(homeProb, 4),
      edge: round(edgeVal, 4),
      expectedValue: round(ev, 4),
      recommendedStake: Math.min(kellyStake, 500),
      confidence: round(conf, 4),
      sportsbook: game.best_home_book ?? "Best Available",
    });
  }
  if (game.best_away_odds !== null && awayProb !== null && impliedA !== null) {
    const dec = americanToDecimal(game.best_away_odds);
    const awayEdge = round(-edgeVal, 4);
    const ev = (awayProb * (dec - 1)) - (1 - awayProb);
    const b = dec - 1;
    const kellyFull = (awayProb * b - (1 - awayProb)) / b;
    const kellyStake = Math.max(0, Math.round(kellyFull * 0.25 * 10000));
    edges.push({
      id: id++,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      side: "away",
      team: game.away_team,
      odds: game.best_away_odds,
      decimalOdds: round(dec, 3),
      impliedProb: round(impliedA, 4),
      predictedProb: round(awayProb, 4),
      edge: awayEdge,
      expectedValue: round(ev, 4),
      recommendedStake: Math.min(kellyStake, 500),
      confidence: round(conf, 4),
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
  // model_home_prob / model_away_prob are stored as 0-100 (e.g., 56.8)
  // The Prediction interface uses 0-1 range (matching mock data contract)
  const homeProb = (game.model_home_prob ?? 50) / 100;
  const awayProb = (game.model_away_prob ?? 50) / 100;
  // confidence is also 0-100 → normalise to 0-1
  const confidence = (game.confidence ?? 0) / 100;

  return {
    id,
    gameId: id,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    sport: "nba",
    predictedWinner: homeProb >= awayProb ? game.home_team : game.away_team,
    homeWinProb: round(homeProb, 4),
    awayWinProb: round(awayProb, 4),
    confidence: round(confidence, 4),
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

// ─── DetailedPredictionViewModel ────────────────────────────────

/**
 * View model consumed exclusively by PredictionDetailPanel.
 * All fields are safe — no nulls, no undefined.
 */
export interface DetailedPredictionViewModel {
  // Matchup
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  sport: string;
  // Market vs Model
  marketImpliedProbHome: number;   // 0-100
  marketImpliedProbAway: number;   // 0-100
  baseModelProbHome: number;       // 0-100 (before adjustments)
  finalModelProbHome: number;      // 0-100 (after all adjustments)
  finalModelProbAway: number;      // 0-100
  edgePct: number;                 // percentage points, positive = home value
  confidence: number;              // 0-100
  bestHomeOdds: number | null;
  bestAwayOdds: number | null;
  bestHomeBook: string;
  bestAwayBook: string;
  // Adjustment breakdown (probability deltas, 0-100 scale)
  historicalAdj: number;
  injuryAdj: number;
  fatigueAdj: number;
  weatherAdj: number;
  // Explanation text
  explanationBase: string;
  explanationHistorical: string;
  explanationInjuries: string;
  explanationFatigue: string;
  explanationWeather: string;
  explanationConfidenceReason: string;
  // Active layers
  activeLayers: Record<string, string>;
  // Recommendation
  recommendation: string;
  isValueBet: boolean;
}

/**
 * Maps a single EnhancedGame to a DetailedPredictionViewModel.
 * All fields have safe fallbacks — will never throw.
 */
export function mapEnhancedGameToPredictionDetail(
  game: EnhancedGame
): DetailedPredictionViewModel {
  const mo = game.model_output;
  const exp = mo?.explanation;
  const numeric = exp?.numeric;

  const marketH = game.implied_home_prob ?? 50;
  const marketA = game.implied_away_prob ?? 50;
  const finalH  = game.model_home_prob   ?? 50;
  const finalA  = game.model_away_prob   ?? 50;
  const edgePct = game.edge ?? 0;
  const conf    = game.confidence ?? 0;

  // Use market implied prob as the "base" before model adjustments
  const baseH = round(marketH, 1);

  return {
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    gameTime: game.start_time,
    sport: game.sport,
    marketImpliedProbHome: round(marketH, 1),
    marketImpliedProbAway: round(marketA, 1),
    baseModelProbHome: round(baseH, 1),
    finalModelProbHome: round(finalH, 1),
    finalModelProbAway: round(finalA, 1),
    edgePct: round(edgePct, 1),
    confidence: round(conf, 0),
    bestHomeOdds: game.best_home_odds,
    bestAwayOdds: game.best_away_odds,
    bestHomeBook: game.best_home_book ?? "Best Available",
    bestAwayBook: game.best_away_book ?? "Best Available",
    historicalAdj: round((numeric?.historicalAdjustment ?? 0) * 100, 2),
    injuryAdj:     round((numeric?.injuryAdjustment     ?? 0) * 100, 2),
    fatigueAdj:    round((numeric?.fatigueAdjustment    ?? 0) * 100, 2),
    weatherAdj:    0, // NBA is always indoors
    explanationBase:             exp?.base             ?? "Base market probability derived from best available odds.",
    explanationHistorical:       exp?.historical       ?? "Historical data layer unavailable.",
    explanationInjuries:         exp?.injuries         ?? "Injury data layer unavailable.",
    explanationFatigue:          exp?.fatigue          ?? "Fatigue data layer unavailable.",
    explanationWeather:          exp?.weather          ?? "Weather layer inactive (indoor sport).",
    explanationConfidenceReason: (mo as any)?.confidenceReason ?? "Confidence derived from edge magnitude and layer agreement.",
    activeLayers: game.active_layers ?? {},
    recommendation: game.recommendation ?? "HOLD",
    isValueBet: game.is_value_bet,
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
