/*
  oddsService.ts — Odds fetching, processing, and multi-layer prediction.
  
  The old getModelProb() (static home bias + random noise) has been replaced
  by getFinalModelProbability() from predictionEngine.ts which runs:
    1. Base market probability (vig-removed)
    2. Historical adjustment (form, H2H, home/away splits)
    3. Injury adjustment (player availability)
    4. Fatigue adjustment (rest days, back-to-backs)
    5. Weather adjustment (scaffold only, off for NBA)
  
  All existing exports (ProcessedGame, fetchNbaOdds, getCacheStatus) are
  preserved for backwards compatibility with existing tRPC procedures.
  
  New exports:
  - fetchNbaOddsEnhanced()  — returns games with full ModelOutput attached
  - EnhancedGame            — ProcessedGame + model breakdown
*/

import { ENV } from "./_core/env";
import { getFinalModelProbability, type ModelOutput } from "./services/predictionEngine";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_MS = 120_000; // 2 minutes — preserve existing behavior

// ─── Cache ────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; timestamp: number; }
const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): T | null {
  const entry = cache[key] as CacheEntry<T> | undefined;
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.data;
}
function setCache<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

// ─── Types ────────────────────────────────────────────────────────

export interface OddsGame {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
}

/** Core game record — unchanged from original for backwards compatibility */
export interface ProcessedGame {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  start_time: string;
  caesars_home_odds: number | null;
  caesars_away_odds: number | null;
  draftkings_home_odds: number | null;
  draftkings_away_odds: number | null;
  fanduel_home_odds: number | null;
  fanduel_away_odds: number | null;
  best_home_odds: number | null;
  best_away_odds: number | null;
  best_home_book: string | null;
  best_away_book: string | null;
  implied_home_prob: number | null;
  implied_away_prob: number | null;
  model_home_prob: number | null;
  model_away_prob: number | null;
  edge: number | null;
  is_value_bet: boolean;
  recommendation: string;
}

/** Enhanced game record — ProcessedGame + full model breakdown */
export interface EnhancedGame extends ProcessedGame {
  model_output: ModelOutput | null;
  confidence: number | null;
  active_layers: Record<string, string> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function americanToProb(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

// ─── processGames — synchronous, uses base model only ────────────
// (Used by fetchNbaOdds for backwards compatibility)

function processGames(raw: OddsGame[]): ProcessedGame[] {
  return raw.map((game) => {
    const bookOdds: Record<string, { home: number; away: number }> = {};

    for (const book of game.bookmakers) {
      const h2h = book.markets.find((m) => m.key === "h2h");
      if (!h2h) continue;
      const homeOutcome = h2h.outcomes.find((o) => o.name === game.home_team);
      const awayOutcome = h2h.outcomes.find((o) => o.name === game.away_team);
      if (homeOutcome && awayOutcome) {
        bookOdds[book.key] = { home: homeOutcome.price, away: awayOutcome.price };
      }
    }

    const caesars   = bookOdds["williamhill_us"] || bookOdds["caesars"] || null;
    const draftkings = bookOdds["draftkings"] || null;
    const fanduel    = bookOdds["fanduel"] || null;

    let bestHome: number | null = null;
    let bestAway: number | null = null;
    let bestHomeBook: string | null = null;
    let bestAwayBook: string | null = null;

    for (const [bookKey, odds] of Object.entries(bookOdds)) {
      const bookTitle = game.bookmakers.find((b) => b.key === bookKey)?.title || bookKey;
      if (bestHome === null || odds.home > bestHome) { bestHome = odds.home; bestHomeBook = bookTitle; }
      if (bestAway === null || odds.away > bestAway) { bestAway = odds.away; bestAwayBook = bookTitle; }
    }

    const homeProb = bestHome !== null ? americanToProb(bestHome) : null;
    const awayProb = bestAway !== null ? americanToProb(bestAway) : null;
    const totalProb = homeProb && awayProb ? homeProb + awayProb : null;
    const fairHomeProb = homeProb && totalProb ? homeProb / totalProb : homeProb;

    // Base model: vig-removed market + deterministic home bias (no random noise)
    const homeBias = 0.03;
    const modelHomeProb = fairHomeProb
      ? Math.min(0.95, Math.max(0.05, fairHomeProb + homeBias))
      : null;
    const modelAwayProb = modelHomeProb ? Math.round((1 - modelHomeProb) * 1000) / 1000 : null;

    // Edge vs raw implied (not vig-removed) for consistency with original behavior
    const edge = modelHomeProb && homeProb ? modelHomeProb - homeProb : null;
    const isValueBet = edge !== null && Math.abs(edge) > 0.03;

    let recommendation = "HOLD";
    if (edge !== null) {
      if (edge > 0.05) recommendation = "BET HOME";
      else if (edge < -0.05) recommendation = "BET AWAY";
      else if (edge > 0.03) recommendation = "LEAN HOME";
      else if (edge < -0.03) recommendation = "LEAN AWAY";
    }

    return {
      id: game.id,
      sport: game.sport_key,
      home_team: game.home_team,
      away_team: game.away_team,
      start_time: game.commence_time,
      caesars_home_odds: caesars?.home ?? null,
      caesars_away_odds: caesars?.away ?? null,
      draftkings_home_odds: draftkings?.home ?? null,
      draftkings_away_odds: draftkings?.away ?? null,
      fanduel_home_odds: fanduel?.home ?? null,
      fanduel_away_odds: fanduel?.away ?? null,
      best_home_odds: bestHome,
      best_away_odds: bestAway,
      best_home_book: bestHomeBook,
      best_away_book: bestAwayBook,
      implied_home_prob: homeProb ? Math.round(homeProb * 1000) / 10 : null,
      implied_away_prob: awayProb ? Math.round(awayProb * 1000) / 10 : null,
      model_home_prob: modelHomeProb ? Math.round(modelHomeProb * 1000) / 10 : null,
      model_away_prob: modelAwayProb ? Math.round(modelAwayProb * 1000) / 10 : null,
      edge: edge ? Math.round(edge * 1000) / 10 : null,
      is_value_bet: isValueBet,
      recommendation,
    };
  });
}

// ─── Public: fetchNbaOdds (original — backwards compatible) ───────

export async function fetchNbaOdds(): Promise<{
  games: ProcessedGame[];
  source: "live" | "cache" | "unavailable";
  credits_used?: string;
  credits_remaining?: string;
  error?: string;
}> {
  const cacheKey = "nba_odds";
  const cached = getCached<ProcessedGame[]>(cacheKey);
  if (cached) return { games: cached, source: "cache" };

  if (!ENV.oddsApiKey) {
    return { games: [], source: "unavailable", error: "ODDS_API_KEY not configured" };
  }

  try {
    const url = new URL(`${ODDS_API_BASE}/sports/basketball_nba/odds`);
    url.searchParams.set("apiKey", ENV.oddsApiKey);
    url.searchParams.set("regions", "us");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "american");

    console.log("[OddsAPI] Fetching live NBA odds...");
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Odds API error: ${res.status} ${res.statusText}`);

    const raw: OddsGame[] = await res.json();
    const processed = processGames(raw);
    setCache(cacheKey, processed);

    const creditsUsed = res.headers.get("x-requests-used") ?? undefined;
    const creditsRemaining = res.headers.get("x-requests-remaining") ?? undefined;
    console.log(`[OddsAPI] Got ${raw.length} games. Credits used: ${creditsUsed}, remaining: ${creditsRemaining}`);

    return { games: processed, source: "live", credits_used: creditsUsed, credits_remaining: creditsRemaining };
  } catch (err) {
    console.error("[OddsAPI] Error:", err);
    const stale = cache[cacheKey] as CacheEntry<ProcessedGame[]> | undefined;
    if (stale) return { games: stale.data, source: "cache", error: String(err) };
    return { games: [], source: "unavailable", error: String(err) };
  }
}

// ─── Public: fetchNbaOddsEnhanced (new — full multi-layer model) ──

/**
 * Fetch NBA odds and run the full multi-layer prediction engine on each game.
 * Results are cached separately from the base odds to avoid re-running layers.
 * Cache TTL: 5 minutes (longer than base odds — layer data changes slowly).
 */
export async function fetchNbaOddsEnhanced(): Promise<{
  games: EnhancedGame[];
  source: "live" | "cache" | "unavailable";
  credits_used?: string;
  credits_remaining?: string;
  error?: string;
}> {
  const enhancedCacheKey = "nba_odds_enhanced";
  const ENHANCED_TTL = 5 * 60 * 1000; // 5 minutes

  // Check enhanced cache
  const cachedEntry = cache[enhancedCacheKey] as CacheEntry<EnhancedGame[]> | undefined;
  if (cachedEntry && Date.now() - cachedEntry.timestamp < ENHANCED_TTL) {
    return { games: cachedEntry.data, source: "cache" };
  }

  // Fetch base odds first
  const baseResult = await fetchNbaOdds();
  if (baseResult.games.length === 0) {
    return { games: [], source: baseResult.source, error: baseResult.error };
  }

  // Run prediction engine on all games (parallel, batched)
  const BATCH_SIZE = 5;
  const enhanced: EnhancedGame[] = [];

  for (let i = 0; i < baseResult.games.length; i += BATCH_SIZE) {
    const batch = baseResult.games.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (game): Promise<EnhancedGame> => {
        try {
          const modelOutput = await getFinalModelProbability(
            game.home_team,
            game.away_team,
            game.sport,
            game.best_home_odds,
            game.best_away_odds,
            game.start_time
          );
          return {
            ...game,
            // Override base model fields with enhanced model output
            model_home_prob: Math.round(modelOutput.finalModelProbHome * 1000) / 10,
            model_away_prob: Math.round(modelOutput.finalModelProbAway * 1000) / 10,
            edge: Math.round(modelOutput.edgeHome * 1000) / 10,
            is_value_bet: Math.abs(modelOutput.edgeHome) > 0.03,
            recommendation: modelOutput.explanation.numeric.edgeHome > 0.05
              ? "BET HOME"
              : modelOutput.explanation.numeric.edgeHome < -0.05
              ? "BET AWAY"
              : modelOutput.explanation.numeric.edgeHome > 0.03
              ? "LEAN HOME"
              : modelOutput.explanation.numeric.edgeHome < -0.03
              ? "LEAN AWAY"
              : "HOLD",
            model_output: modelOutput,
            confidence: modelOutput.confidence,
            active_layers: modelOutput.activeLayers,
          };
        } catch (err) {
          console.warn(`[OddsService] Enhanced model failed for ${game.home_team} vs ${game.away_team}:`, err);
          return { ...game, model_output: null, confidence: null, active_layers: null };
        }
      })
    );
    enhanced.push(...batchResults);
  }

  cache[enhancedCacheKey] = { data: enhanced, timestamp: Date.now() };

  return {
    games: enhanced,
    source: baseResult.source,
    credits_used: baseResult.credits_used,
    credits_remaining: baseResult.credits_remaining,
  };
}

// ─── Public: getCacheStatus ───────────────────────────────────────

export function getCacheStatus() {
  const entry = cache["nba_odds"] as CacheEntry<ProcessedGame[]> | undefined;
  if (!entry) return { cached: false, age_seconds: 0, ttl_seconds: 120 };
  const age = Math.round((Date.now() - entry.timestamp) / 1000);
  return { cached: true, age_seconds: age, ttl_seconds: 120, games_cached: entry.data.length };
}
