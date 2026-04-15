/**
 * useApiData.ts — Unified data hook for all dashboard pages.
 *
 * PRIMARY SOURCE: trpc.odds.nbaEnhanced (live NBA odds + multi-layer model)
 * FALLBACK:       useMockData() — only when VITE_USE_MOCK_DATA=true (dev only)
 *
 * The Python FastAPI backend on port 8000 has been REMOVED.
 * There is no automatic silent fallback to mock data in production.
 *
 * Return shape:
 *   { data, isLoading, error, source }
 *   source: "trpc-live" | "mock-dev"
 *
 * All page shapes (Edge, Prediction, ArbitrageOpp, etc.) are populated
 * from the centralized transform layer in lib/transforms/oddsTransforms.ts.
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useMockData } from "./useMockData";
import {
  transformGamesToEdges,
  transformGamesToPredictions,
  transformGamesToArbitrage,
  type EnhancedGame,
} from "@/lib/transforms/oddsTransforms";
import type {
  Game,
  Prediction,
  Edge,
  ArbitrageOpp,
  PlayerProp,
  BacktestResult,
  ModelMetric,
} from "./useMockData";

// ─── Re-export types for consumers ───────────────────────────────
export type DataSource = "trpc-live" | "mock-dev" | "loading";
export type { Game, Prediction, Edge, ArbitrageOpp, PlayerProp, BacktestResult, ModelMetric };

// ─── Summary shape ────────────────────────────────────────────────
export interface SummaryShape {
  totalGames: number;
  liveGames: number;
  totalPredictions: number;
  correctPredictions: number;
  pendingPredictions: number;
  resolvedPredictions: number;
  accuracy: number;
  activeEdges: number;
  totalEdgeValue: number;
  arbitrageOpps: number;
  playerPropsCount: number;
  bankroll: number;
  bankrollChange: number;
  bankrollChangePct: number;
  todayROI: number;
  weekROI: number;
  monthROI: number;
  primaryPlatforms: string[];
}

export interface ApiDataReturn {
  // Raw enhanced game data (for detail panels)
  enhancedGames: EnhancedGame[];
  // Page data shapes
  games: Game[];
  predictions: Prediction[];
  edges: Edge[];
  arbitrage: ArbitrageOpp[];
  playerProps: PlayerProp[];
  backtests: BacktestResult[];
  modelMetrics: ModelMetric[];
  summary: SummaryShape;
  // Status
  isLoading: boolean;
  error: string | null;
  source: DataSource;
  // Convenience aliases (backwards compat)
  dataSource: DataSource;
  isDemo: boolean;
}

// ─── Dev-only mock flag ───────────────────────────────────────────
// Set VITE_USE_MOCK_DATA=true in .env.local to force mock data in development.
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === "true";

// ─── Safe fallback constants ──────────────────────────────────────
const SAFE_SUMMARY: SummaryShape = {
  totalGames: 0,
  liveGames: 0,
  totalPredictions: 0,
  correctPredictions: 0,
  pendingPredictions: 0,
  resolvedPredictions: 0,
  accuracy: 0,
  activeEdges: 0,
  totalEdgeValue: 0,
  arbitrageOpps: 0,
  playerPropsCount: 0,
  bankroll: 10000,
  bankrollChange: 0,
  bankrollChangePct: 0,
  todayROI: 0,
  weekROI: 0,
  monthROI: 0,
  primaryPlatforms: [],
};

const SAFE_BACKTEST: BacktestResult = {
  id: 0,
  name: "Value Betting",
  strategy: "value_betting",
  modelName: "gradient_boosting",
  sport: "nba",
  initialBankroll: 10000,
  finalBankroll: 10000,
  totalBets: 0,
  winningBets: 0,
  losingBets: 0,
  roi: 0,
  hitRate: 0,
  maxDrawdown: 0,
  sharpeRatio: 0,
  avgEdge: 0,
  bankrollHistory: [10000],
};

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

// ─── Summary builder from live games ─────────────────────────────
function buildLiveSummary(
  games: EnhancedGame[],
  edges: Edge[],
  arbitrage: ArbitrageOpp[],
  mockSummary: SummaryShape
): SummaryShape {
  const avgEdge =
    edges.length > 0
      ? Math.round(
          (edges.reduce((s, e) => s + Math.abs(e.edge), 0) / edges.length) * 10
        ) / 10
      : 0;

  return {
    ...mockSummary, // keep bankroll / ROI from mock until live tracking is built
    totalGames: games.length,
    liveGames: games.length,
    totalPredictions: games.length,
    pendingPredictions: games.length,
    activeEdges: games.filter((g) => g.is_value_bet).length,
    totalEdgeValue: avgEdge,
    arbitrageOpps: arbitrage.length,
    primaryPlatforms: ["Caesars Sportsbook", "DraftKings", "FanDuel"],
  };
}

// ─── Main hook ────────────────────────────────────────────────────
export function useApiData(): ApiDataReturn {
  // Always call hooks unconditionally (React rules)
  const mockData = useMockData();

  // Live tRPC query — primary source
  const {
    data: liveResult,
    isLoading: trpcLoading,
    error: trpcError,
  } = trpc.odds.nbaEnhanced.useQuery(undefined, {
    // Disable tRPC query when mock mode is forced
    enabled: !USE_MOCK,
    staleTime: 60_000,        // 1 min client stale time
    refetchInterval: 120_000, // 2 min auto-refresh
    retry: 2,
  });

  // ── MOCK-DEV PATH ─────────────────────────────────────────────
  if (USE_MOCK) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[useApiData] source=mock-dev (VITE_USE_MOCK_DATA=true)");
    }
    const mockSummary = mockData.summary ?? SAFE_SUMMARY;
    const backtests =
      Array.isArray(mockData.backtests) && mockData.backtests.length > 0
        ? mockData.backtests
        : [SAFE_BACKTEST];
    return {
      enhancedGames: [],
      games: safeArray<Game>(mockData.games),
      predictions: safeArray<Prediction>(mockData.predictions),
      edges: safeArray<Edge>(mockData.edges),
      arbitrage: safeArray<ArbitrageOpp>(mockData.arbitrage),
      playerProps: safeArray<PlayerProp>(mockData.playerProps),
      backtests,
      modelMetrics: safeArray<ModelMetric>(mockData.modelMetrics),
      summary: mockSummary,
      isLoading: false,
      error: null,
      source: "mock-dev",
      dataSource: "mock-dev",
      isDemo: true,
    };
  }

  // ── LIVE tRPC PATH ────────────────────────────────────────────
  const liveGames = useMemo(
    () => safeArray<EnhancedGame>(liveResult?.games),
    [liveResult]
  );

  const liveEdges = useMemo(() => transformGamesToEdges(liveGames), [liveGames]);
  const livePredictions = useMemo(() => transformGamesToPredictions(liveGames), [liveGames]);
  const liveArbitrage = useMemo(() => transformGamesToArbitrage(liveGames), [liveGames]);

  const mockSummary = mockData.summary ?? SAFE_SUMMARY;
  const liveSummary = useMemo(
    () =>
      liveGames.length > 0
        ? buildLiveSummary(liveGames, liveEdges, liveArbitrage, mockSummary)
        : null,
    [liveGames, liveEdges, liveArbitrage, mockSummary]
  );

  const hasLive = !trpcLoading && liveGames.length > 0;
  const source: DataSource = trpcLoading ? "loading" : "trpc-live";

  if (process.env.NODE_ENV !== "production") {
    console.debug(
      `[useApiData] source=${source} games=${liveGames.length} edges=${liveEdges.length} arb=${liveArbitrage.length}`
    );
  }

  const backtests =
    Array.isArray(mockData.backtests) && mockData.backtests.length > 0
      ? mockData.backtests
      : [SAFE_BACKTEST];

  return {
    enhancedGames: liveGames,
    games: safeArray<Game>(mockData.games),
    predictions: hasLive ? livePredictions : [],
    edges: hasLive ? liveEdges : [],
    arbitrage: hasLive ? liveArbitrage : [],
    playerProps: safeArray<PlayerProp>(mockData.playerProps),
    backtests,
    modelMetrics: safeArray<ModelMetric>(mockData.modelMetrics),
    summary: liveSummary ?? (hasLive ? SAFE_SUMMARY : mockSummary),
    isLoading: trpcLoading,
    error: trpcError ? String(trpcError) : null,
    source,
    dataSource: source,
    isDemo: !hasLive && !trpcLoading,
  };
}
