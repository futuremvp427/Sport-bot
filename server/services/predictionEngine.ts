/*
  predictionEngine.ts — Multi-layer probability engine.
  
  Replaces the old static getModelProb() with a structured pipeline:
  
  1. getBaseMarketProbabilities()  — vig-removed market consensus
  2. getHistoricalAdjustment()     — form, H2H, home/away splits (±0.06)
  3. getInjuryAdjustment()         — player availability (±0.08)
  4. getFatigueAdjustment()        — rest days, back-to-backs (±0.05)
  5. getWeatherAdjustment()        — outdoor sports only, default off (±0.04)
  6. getFinalModelProbability()    — combine all layers deterministically
  7. getPredictionExplanation()    — structured breakdown object
  
  Rules:
  - No Math.random() in production logic
  - Each layer is gated by FEATURE_FLAGS
  - Each layer fails gracefully (returns 0 adjustment on error)
  - Final probability clamped to [0.05, 0.95]
  - Home + away probabilities reconcile to 1.0
*/

import { FEATURE_FLAGS, getActiveLayers } from "../featureFlags";
import { getHistoricalAdjustment } from "./historicalService";
import { getInjuryAdjustment } from "./injuryService";
import { getFatigueAdjustment } from "./fatigueService";
import { getWeatherAdjustment, isIndoorSport } from "./weatherService";

// ─── Types ───────────────────────────────────────────────────────

export interface BaseMarketProbs {
  impliedHomeProb: number;   // raw from odds
  impliedAwayProb: number;
  fairHomeProb: number;      // vig-removed
  fairAwayProb: number;
  vigPct: number;
}

export interface ModelOutput {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  // Market
  marketProbHome: number;
  marketProbAway: number;
  // Adjustments (all as probability deltas for home team)
  baseModelProbHome: number;
  historicalAdjustment: number;
  injuryAdjustment: number;
  fatigueAdjustment: number;
  weatherAdjustment: number;
  // Final
  finalModelProbHome: number;
  finalModelProbAway: number;
  // Edge
  edgeHome: number;
  edgeAway: number;
  // Confidence (0-100)
  confidence: number;
  // Meta
  activeLayers: Record<string, string>;
  explanation: PredictionExplanation;
}

export interface PredictionExplanation {
  base: string;
  historical: string;
  injuries: string;
  fatigue: string;
  weather: string;
  confidenceReason: string;
  numeric: {
    marketProbHome: number;
    historicalAdjustment: number;
    injuryAdjustment: number;
    fatigueAdjustment: number;
    weatherAdjustment: number;
    finalModelProbHome: number;
    edgeHome: number;
  };
}

// ─── Step 1: Base market probabilities ───────────────────────────

/** Convert American odds to implied probability */
function americanToProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

/**
 * Extract vig-removed fair probabilities from best available odds.
 * Returns null if no odds available.
 */
export function getBaseMarketProbabilities(
  homeOdds: number | null,
  awayOdds: number | null
): BaseMarketProbs | null {
  if (homeOdds === null || awayOdds === null) return null;

  const rawHome = americanToProb(homeOdds);
  const rawAway = americanToProb(awayOdds);
  const total = rawHome + rawAway;
  const vigPct = Math.round((total - 1) * 1000) / 10;

  return {
    impliedHomeProb: Math.round(rawHome * 1000) / 1000,
    impliedAwayProb: Math.round(rawAway * 1000) / 1000,
    fairHomeProb: Math.round((rawHome / total) * 1000) / 1000,
    fairAwayProb: Math.round((rawAway / total) * 1000) / 1000,
    vigPct,
  };
}

// ─── Step 2-5: Layer adjustments (called from getFinalModelProbability) ─

// ─── Step 6: Final model probability ─────────────────────────────

/**
 * Combine all layers into a final model probability.
 * This is the main entry point — replaces the old getModelProb().
 */
export async function getFinalModelProbability(
  homeTeam: string,
  awayTeam: string,
  sport: string,
  homeOdds: number | null,
  awayOdds: number | null,
  gameDate?: string
): Promise<ModelOutput> {
  const activeLayers = getActiveLayers();

  // ── Base probability ──────────────────────────────────────────
  const market = getBaseMarketProbabilities(homeOdds, awayOdds);
  let baseModelProbHome = 0.5;
  let marketProbHome = 0.5;

  if (market) {
    // Apply a small, deterministic home-court advantage
    // NBA: ~57% home win rate historically → +3% over market
    const homeBias = sport.includes("nba") || sport.includes("basketball") ? 0.03 : 0.02;
    baseModelProbHome = Math.min(0.93, Math.max(0.07, market.fairHomeProb + homeBias));
    marketProbHome = market.fairHomeProb;
  }

  // ── Layer adjustments (parallel, each fails gracefully) ──────
  const [historicalResult, injuryResult, fatigueResult, weatherResult] = await Promise.all([
    FEATURE_FLAGS.ENABLE_HISTORICAL
      ? getHistoricalAdjustment(homeTeam, awayTeam).catch(err => {
          console.warn("[PredictionEngine] Historical layer error:", err);
          return null;
        })
      : null,

    FEATURE_FLAGS.ENABLE_INJURIES
      ? getInjuryAdjustment(homeTeam, awayTeam).catch(err => {
          console.warn("[PredictionEngine] Injury layer error:", err);
          return null;
        })
      : null,

    FEATURE_FLAGS.ENABLE_FATIGUE
      ? getFatigueAdjustment(homeTeam, awayTeam, gameDate).catch(err => {
          console.warn("[PredictionEngine] Fatigue layer error:", err);
          return null;
        })
      : null,

    FEATURE_FLAGS.ENABLE_WEATHER && !isIndoorSport(sport)
      ? getWeatherAdjustment(homeTeam, sport).catch(err => {
          console.warn("[PredictionEngine] Weather layer error:", err);
          return null;
        })
      : null,
  ]);

  // ── Extract adjustment values ─────────────────────────────────
  const historicalAdj = historicalResult?.value ?? 0;
  const injuryAdj     = injuryResult?.value ?? 0;
  const fatigueAdj    = fatigueResult?.value ?? 0;
  const weatherAdj    = weatherResult?.value ?? 0;

  // Update active layer statuses
  if (historicalResult) activeLayers.historical = `on (${historicalResult.source})`;
  else activeLayers.historical = FEATURE_FLAGS.ENABLE_HISTORICAL ? "error" : "off";

  if (injuryResult) activeLayers.injuries = `on (${injuryResult.source})`;
  else activeLayers.injuries = FEATURE_FLAGS.ENABLE_INJURIES ? "error" : "off";

  if (fatigueResult) activeLayers.fatigue = `on (${fatigueResult.source})`;
  else activeLayers.fatigue = FEATURE_FLAGS.ENABLE_FATIGUE ? "error" : "off";

  if (isIndoorSport(sport)) activeLayers.weather = "off (indoor sport)";
  else if (weatherResult) activeLayers.weather = `on (${weatherResult.source})`;
  else activeLayers.weather = FEATURE_FLAGS.ENABLE_WEATHER ? "error" : "off (default)";

  // ── Combine all adjustments ───────────────────────────────────
  const totalAdj = historicalAdj + injuryAdj + fatigueAdj + weatherAdj;
  const rawFinal = baseModelProbHome + totalAdj;
  const finalModelProbHome = Math.min(0.95, Math.max(0.05, rawFinal));
  const finalModelProbAway = Math.round((1 - finalModelProbHome) * 1000) / 1000;

  // ── Edge calculation ──────────────────────────────────────────
  const edgeHome = Math.round((finalModelProbHome - marketProbHome) * 1000) / 1000;
  const edgeAway = Math.round((finalModelProbAway - (1 - marketProbHome)) * 1000) / 1000;

  // ── Confidence score (0-100) ──────────────────────────────────
  const absEdge = Math.abs(edgeHome);
  const layersActive = [historicalResult, injuryResult, fatigueResult].filter(Boolean).length;
  const confidenceReduction = (injuryResult?.confidenceReduction ?? 0) + (fatigueResult?.confidenceReduction ?? 0);
  const rawConfidence = 60 + (absEdge * 150) + (layersActive * 4) - (confidenceReduction * 100);
  const confidence = Math.min(92, Math.max(42, Math.round(rawConfidence)));

  // ── Explanation ───────────────────────────────────────────────
  const explanation = FEATURE_FLAGS.ENABLE_EXPLAINABILITY
    ? getPredictionExplanation({
        market, baseModelProbHome, historicalResult, injuryResult,
        fatigueResult, weatherResult, finalModelProbHome, edgeHome,
        sport, marketProbHome, confidence, layersActive,
      })
    : {
        base: "Explainability disabled",
        historical: "off", injuries: "off", fatigue: "off", weather: "off",
        confidenceReason: "off",
        numeric: { marketProbHome, historicalAdjustment: 0, injuryAdjustment: 0, fatigueAdjustment: 0, weatherAdjustment: 0, finalModelProbHome, edgeHome },
      };

  // ── Log active layers ─────────────────────────────────────────
  console.log(`[PredictionEngine] ${homeTeam} vs ${awayTeam}`);
  console.log(`  ACTIVE LAYERS: ${Object.entries(activeLayers).map(([k, v]) => `${k}:${v}`).join(", ")}`);
  console.log(`  Base: ${(baseModelProbHome * 100).toFixed(1)}% → Final: ${(finalModelProbHome * 100).toFixed(1)}% | Edge: ${(edgeHome * 100).toFixed(1)}% | Confidence: ${confidence}`);

  return {
    homeTeam, awayTeam, sport,
    marketProbHome: Math.round(marketProbHome * 1000) / 1000,
    marketProbAway: Math.round((1 - marketProbHome) * 1000) / 1000,
    baseModelProbHome: Math.round(baseModelProbHome * 1000) / 1000,
    historicalAdjustment: Math.round(historicalAdj * 1000) / 1000,
    injuryAdjustment: Math.round(injuryAdj * 1000) / 1000,
    fatigueAdjustment: Math.round(fatigueAdj * 1000) / 1000,
    weatherAdjustment: Math.round(weatherAdj * 1000) / 1000,
    finalModelProbHome: Math.round(finalModelProbHome * 1000) / 1000,
    finalModelProbAway,
    edgeHome,
    edgeAway,
    confidence,
    activeLayers,
    explanation,
  };
}

// ─── Step 7: Explainability ───────────────────────────────────────

function getPredictionExplanation(ctx: {
  market: BaseMarketProbs | null;
  baseModelProbHome: number;
  historicalResult: Awaited<ReturnType<typeof getHistoricalAdjustment>> | null;
  injuryResult: Awaited<ReturnType<typeof getInjuryAdjustment>> | null;
  fatigueResult: Awaited<ReturnType<typeof getFatigueAdjustment>> | null;
  weatherResult: Awaited<ReturnType<typeof getWeatherAdjustment>> | null;
  finalModelProbHome: number;
  edgeHome: number;
  sport: string;
  marketProbHome: number;
  confidence: number;
  layersActive: number;
}): PredictionExplanation {
  const { market, baseModelProbHome, historicalResult, injuryResult, fatigueResult, weatherResult, finalModelProbHome, edgeHome, sport, marketProbHome, confidence, layersActive } = ctx;

  const baseStr = market
    ? `Market fair prob ${(marketProbHome * 100).toFixed(1)}% → base model ${(baseModelProbHome * 100).toFixed(1)}% (vig: ${market.vigPct}%)`
    : "No odds available — using 50/50 prior";

  const histStr = historicalResult
    ? (historicalResult.explanation || "No significant historical edge")
    : (FEATURE_FLAGS.ENABLE_HISTORICAL ? "Layer error — no adjustment" : "Layer disabled");

  const injStr = injuryResult
    ? (injuryResult.explanation || "No significant injuries")
    : (FEATURE_FLAGS.ENABLE_INJURIES ? "Layer error — no adjustment" : "Layer disabled");

  const fatStr = fatigueResult
    ? (fatigueResult.explanation || "Similar rest for both teams")
    : (FEATURE_FLAGS.ENABLE_FATIGUE ? "Layer error — no adjustment" : "Layer disabled");

  const weatherStr = isIndoorSport(sport)
    ? "Inactive for indoor sport (NBA)"
    : (weatherResult ? weatherResult.explanation : "Layer disabled (default off)");

  const absEdge = Math.abs(edgeHome);
  let confReason = "";
  if (absEdge > 0.06) confReason = `Strong edge (${(absEdge * 100).toFixed(1)}%) with ${layersActive} active layers`;
  else if (absEdge > 0.03) confReason = `Moderate edge (${(absEdge * 100).toFixed(1)}%) with ${layersActive} active layers`;
  else confReason = `Small edge (${(absEdge * 100).toFixed(1)}%) — ${layersActive} layers active, confidence limited`;

  return {
    base: baseStr,
    historical: histStr,
    injuries: injStr,
    fatigue: fatStr,
    weather: weatherStr,
    confidenceReason: confReason,
    numeric: {
      marketProbHome: Math.round(marketProbHome * 1000) / 1000,
      historicalAdjustment: historicalResult?.value ?? 0,
      injuryAdjustment: injuryResult?.value ?? 0,
      fatigueAdjustment: fatigueResult?.value ?? 0,
      weatherAdjustment: weatherResult?.value ?? 0,
      finalModelProbHome: Math.round(finalModelProbHome * 1000) / 1000,
      edgeHome,
    },
  };
}
