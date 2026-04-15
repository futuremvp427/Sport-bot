/*
  useApiData — Hybrid data hook.
  Attempts to fetch from the Python backend API first.
  Falls back to realistic mock data when the backend is unavailable.
  Uses Array.isArray checks for bulletproof null safety.
*/
import { useState, useEffect, useRef } from "react";
import {
  checkBackendHealth,
  fetchDashboardSummary,
  fetchPredictions,
  fetchEdges,
  fetchArbitrage,
  fetchBacktests,
  fetchModelMetrics,
} from "@/lib/api";
import { useMockData } from "./useMockData";
import type {
  Game,
  Prediction,
  Edge,
  ArbitrageOpp,
  PlayerProp,
  BacktestResult,
  ModelMetric,
} from "./useMockData";

export type DataSource = "api" | "mock" | "checking";

// Re-export types for consumers
export type { Game, Prediction, Edge, ArbitrageOpp, PlayerProp, BacktestResult, ModelMetric };

interface MockDataShape {
  games: Game[];
  predictions: Prediction[];
  edges: Edge[];
  arbitrage: ArbitrageOpp[];
  playerProps: PlayerProp[];
  backtests: BacktestResult[];
  modelMetrics: ModelMetric[];
  summary: {
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
  };
}

interface ApiDataReturn extends MockDataShape {
  dataSource: DataSource;
  error: string | null;
  isDemo: boolean;
  isLoading: boolean;
}

const SAFE_SUMMARY = {
  totalGames: 0,
  liveGames: 0,
  totalPredictions: 0,
  correctPredictions: 0,
  pendingPredictions: 0,
  resolvedPredictions: 0,
  accuracy: 0.579,
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
  primaryPlatforms: ["Caesars Sportsbook", "PrizePicks"],
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

/** Safely coerce a value to an array — handles null, undefined, and non-arrays */
function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

export function useApiData(): ApiDataReturn {
  const [dataSource, setDataSource] = useState<DataSource>("checking");
  const [apiData, setApiData] = useState<MockDataShape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mockData = useMockData();
  const checkedRef = useRef(false);

  // Check backend health and fetch data if available
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    async function init() {
      try {
        const available = await checkBackendHealth();
        if (available) {
          const [summary, predictions, edges, arbitrage, backtests, modelMetrics] =
            await Promise.allSettled([
              fetchDashboardSummary(),
              fetchPredictions(),
              fetchEdges(),
              fetchArbitrage(),
              fetchBacktests(),
              fetchModelMetrics(),
            ]);

          const resolved = (r: PromiseSettledResult<any>) =>
            r.status === "fulfilled" ? r.value : null;

          setApiData({
            summary: resolved(summary) || mockData.summary,
            predictions: safeArray(resolved(predictions)) || mockData.predictions,
            edges: safeArray(resolved(edges)) || mockData.edges,
            arbitrage: safeArray(resolved(arbitrage)) || mockData.arbitrage,
            backtests: safeArray(resolved(backtests)) || mockData.backtests,
            modelMetrics: safeArray(resolved(modelMetrics)) || mockData.modelMetrics,
            games: mockData.games,
            playerProps: mockData.playerProps,
          });
          setDataSource("api");
        } else {
          setDataSource("mock");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to backend");
        setDataSource("mock");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Pick the right data source
  const raw = dataSource === "api" && apiData ? apiData : mockData;

  // Bulletproof safe data — Array.isArray prevents crashes from HMR stale state
  const safeEdges = Array.isArray(raw?.edges) ? raw.edges : [];
  const safePredictions = Array.isArray(raw?.predictions) ? raw.predictions : [];
  const safeArbitrage = Array.isArray(raw?.arbitrage) ? raw.arbitrage : [];
  const safePlayerProps = Array.isArray(raw?.playerProps) ? raw.playerProps : [];
  const safeModelMetrics = Array.isArray(raw?.modelMetrics) ? raw.modelMetrics : [];
  const safeGames = Array.isArray(raw?.games) ? raw.games : [];
  const safeBacktests = Array.isArray(raw?.backtests) && raw.backtests.length > 0
    ? raw.backtests
    : [SAFE_BACKTEST];
  const safeSummary = raw?.summary && typeof raw.summary === "object"
    ? raw.summary
    : SAFE_SUMMARY;

  return {
    games: safeGames,
    predictions: safePredictions,
    edges: safeEdges,
    arbitrage: safeArbitrage,
    playerProps: safePlayerProps,
    backtests: safeBacktests,
    modelMetrics: safeModelMetrics,
    summary: safeSummary,
    dataSource,
    error,
    isDemo: dataSource === "mock",
    isLoading: dataSource === "checking" || loading,
  };
}
