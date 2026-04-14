/*
  API Service Layer — connects the dashboard to the Python backend.
  Falls back to local mock data when the backend is unavailable.
  
  Backend runs on port 8000 by default (FastAPI).
  Set VITE_API_BASE_URL env var to override.
*/
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Track backend availability
let backendAvailable: boolean | null = null;

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await api.get("/api/health", { timeout: 3000 });
    backendAvailable = res.status === 200;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

export function isBackendAvailable(): boolean | null {
  return backendAvailable;
}

// ─── Dashboard Summary ───────────────────────────────────────────
export async function fetchDashboardSummary() {
  const res = await api.get("/api/dashboard/summary");
  return res.data;
}

// ─── Games ───────────────────────────────────────────────────────
export async function fetchGames(sport?: string, status?: string) {
  const params: Record<string, string> = {};
  if (sport) params.sport = sport;
  if (status) params.status = status;
  const res = await api.get("/api/games", { params });
  return res.data;
}

export async function fetchLiveGames() {
  const res = await api.get("/api/games/live");
  return res.data;
}

// ─── Odds ────────────────────────────────────────────────────────
export async function fetchOdds(sport?: string) {
  const params: Record<string, string> = {};
  if (sport) params.sport = sport;
  const res = await api.get("/api/odds", { params });
  return res.data;
}

export async function syncLiveOdds(sport: string = "nba") {
  const res = await api.post("/api/odds/sync", null, { params: { sport } });
  return res.data;
}

// ─── Predictions ─────────────────────────────────────────────────
export async function fetchPredictions(sport?: string) {
  const params: Record<string, string> = {};
  if (sport) params.sport = sport;
  const res = await api.get("/api/predictions", { params });
  return res.data;
}

export async function generatePredictions(sport: string = "nba") {
  const res = await api.post("/api/predictions/generate", null, { params: { sport } });
  return res.data;
}

// ─── Edges / Decisions ───────────────────────────────────────────
export async function fetchEdges() {
  const res = await api.get("/api/edges");
  return res.data;
}

export async function fetchDecisions(sport: string = "nba") {
  const res = await api.get("/api/decisions", { params: { sport } });
  return res.data;
}

// ─── Arbitrage ───────────────────────────────────────────────────
export async function fetchArbitrage() {
  const res = await api.get("/api/arbitrage");
  return res.data;
}

export async function scanArbitrage(sport: string = "nba") {
  const res = await api.post("/api/arbitrage/scan", null, { params: { sport } });
  return res.data;
}

// ─── Backtesting ─────────────────────────────────────────────────
export async function fetchBacktests() {
  const res = await api.get("/api/backtests");
  return res.data;
}

export async function runBacktest(params: {
  sport?: string;
  model_name?: string;
  start_date?: string;
  end_date?: string;
}) {
  const res = await api.post("/api/backtests/run", null, { params });
  return res.data;
}

// ─── Models ──────────────────────────────────────────────────────
export async function fetchModelMetrics() {
  const res = await api.get("/api/models/metrics");
  return res.data;
}

export async function fetchModelPerformance(modelName: string = "gradient_boosting") {
  const res = await api.get("/api/models/performance", { params: { model_name: modelName } });
  return res.data;
}

// ─── Results / History ───────────────────────────────────────────
export async function fetchResults(sport?: string) {
  const params: Record<string, string> = {};
  if (sport) params.sport = sport;
  const res = await api.get("/api/results", { params });
  return res.data;
}

export async function fetchHistory() {
  const res = await api.get("/api/history");
  return res.data;
}

export default api;
