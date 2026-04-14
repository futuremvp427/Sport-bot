/*
  useApiData — Hybrid data hook.
  Attempts to fetch from the Python backend API first.
  Falls back to realistic mock data when the backend is unavailable.
  Shows a "Demo Mode" indicator when using mock data.
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
            predictions: resolved(predictions) || mockData.predictions,
            edges: resolved(edges) || mockData.edges,
            arbitrage: resolved(arbitrage) || mockData.arbitrage,
            backtests: resolved(backtests) || mockData.backtests,
            modelMetrics: resolved(modelMetrics) || mockData.modelMetrics,
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

  const data: MockDataShape = dataSource === "api" && apiData ? apiData : mockData;

  return {
    ...data,
    dataSource,
    error,
    isDemo: dataSource === "mock",
    isLoading: dataSource === "checking" || loading,
  };
}
