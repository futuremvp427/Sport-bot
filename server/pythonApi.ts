/**
 * pythonApi.ts — Proxy layer to the Python Sports Betting Intelligence backend.
 *
 * The Python FastAPI server runs on localhost:8000 and provides:
 *   - System health checks
 *   - Pipeline execution (predictions → decisions → execution → learning)
 *   - Simulation (Monte Carlo paper trading)
 *   - System memory (weights, ROI, patterns, bankroll)
 *   - Learning history (weights, ROI, patterns)
 *   - Bankroll tracking
 *   - Dashboard summary
 */

const PYTHON_API_BASE = process.env.PYTHON_API_URL || "http://localhost:8000";
const PYTHON_API_KEY = process.env.PYTHON_API_KEY || "dev-key";
const TIMEOUT_MS = 30_000;

// ─── Types ───────────────────────────────────────────────────────

export interface PythonApiResponse<T = unknown> {
  status: "success" | "error";
  data: T;
  message: string;
}

export interface SystemHealth {
  timestamp: string;
  api_health: Record<string, { status: string; response_count?: number; checked_at: string }>;
  model_health: { status: string; should_retrain: boolean; reason: string; recent_accuracy: number; historical_accuracy: number };
  data_freshness: { latest_bet: string | null; latest_odds: string | null; status: string };
  overall_status: string;
  recommendations: string[];
}

export interface SystemMemory {
  timestamp: string;
  performance: { total_games: number; total_predictions: number; total_bets: number; accuracy: number };
  roi: { total_bets: number; winning_bets: number; total_staked: number; total_profit: number; roi_pct: number };
  patterns: Array<{ id: number; sport: string; bet_type: string; win_rate: number; sample_size: number; last_seen: string }>;
  weights: { confidence_weight: number; edge_weight: number; kelly_weight: number };
  bankroll: { current_balance: number };
}

export interface WeightEntry {
  id: number;
  confidence_weight: number;
  edge_weight: number;
  kelly_weight: number;
  trigger_reason: string;
  recorded_at: string;
}

export interface RoiEntry {
  id: number;
  sport: string | null;
  total_bets: number;
  winning_bets: number;
  total_staked: number;
  total_profit: number;
  roi_pct: number;
  max_drawdown: number;
  recorded_at: string;
}

export interface BankrollEntry {
  id: number;
  balance: number;
  change_amount: number;
  change_reason: string;
  bet_id: number | null;
  timestamp: string;
}

export interface BankrollSummary {
  current_balance: number;
  total_entries: number;
  peak_balance: number;
  trough_balance: number;
  max_drawdown_pct: number;
}

export interface DashboardSummary {
  total_games: number;
  total_predictions: number;
  total_bets: number;
  total_arb_opps: number;
  current_bankroll: number;
  accuracy: number;
  total_outcomes: number;
}

export interface PipelineResult {
  pipeline_stages: { predictions: number; decisions: number; selected: number; executed: number };
  selected_bets: Array<{
    sport: string;
    event_id: string;
    team: string;
    bet_type: string;
    probability: number;
    odds: number;
    confidence: number;
    stake: number;
    edge: number;
    expected_value: number;
    side: string;
    model_name: string;
    action: string;
  }>;
  learning: {
    intelligence: {
      performance: { total_bets: number; wins: number; losses: number; win_rate: number };
      roi: { total_risked: number; total_profit: number; roi: number };
      drawdown: { max_drawdown: number };
      learning: {
        feedback: Array<{ game_id: string; error: number; abs_error: number; roi_signal: number }>;
        updated_weights: { confidence_weight: number; edge_weight: number; kelly_weight: number };
        diagnostics: { pipeline_signals: number; db_signals: number; simulation_signals: number; total_signals: number; avg_error: number };
      };
    };
    updated_weights: { confidence_weight: number; edge_weight: number; kelly_weight: number };
    patterns: Record<string, { win_rate: number; sample_size: number }>;
    weights_history_length: number;
  };
  simulation: {
    total_cycles: number;
    total_simulated_bets: number;
    avg_roi_pct: number;
    avg_max_drawdown: number;
    avg_bankroll_end: number;
    overall_win_rate: number;
    total_wins: number;
    total_losses: number;
  } | null;
  elapsed_seconds: number;
}

export interface SimulationResult {
  total_simulated_bets: number;
  avg_roi_pct: number;
  avg_max_drawdown: number;
  avg_bankroll_end: number;
  overall_win_rate: number;
  total_wins: number;
  total_losses: number;
}

// ─── Fetch helper ────────────────────────────────────────────────

async function pythonFetch<T>(
  path: string,
  options?: { method?: string; params?: Record<string, string | number | boolean> }
): Promise<T> {
  const url = new URL(path, PYTHON_API_BASE);
  if (options?.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, String(v));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: options?.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": PYTHON_API_KEY,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Python API ${path} returned ${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ──────────────────────────────────────────────────

/** Basic health check (fast) */
export async function getApiHealth(): Promise<{ status: string; timestamp: string; version: string }> {
  return pythonFetch("/api/health");
}

/** Comprehensive system health (self-healing module) */
export async function getSystemHealth(): Promise<SystemHealth> {
  const res = await pythonFetch<PythonApiResponse<SystemHealth>>("/api/system/health");
  return res.data;
}

/** System memory snapshot */
export async function getSystemMemory(): Promise<SystemMemory> {
  const res = await pythonFetch<PythonApiResponse<SystemMemory>>("/api/system/memory");
  return res.data;
}

/** Dashboard summary from Python DB */
export async function getPythonDashboardSummary(): Promise<DashboardSummary> {
  return pythonFetch("/api/dashboard/summary");
}

/** Run the full pipeline */
export async function runPipeline(
  sport = "nba",
  executionMode = "paper",
  runSimulation = true
): Promise<PipelineResult> {
  const res = await pythonFetch<PythonApiResponse<PipelineResult>>("/api/run", {
    method: "POST",
    params: { sport, execution_mode: executionMode, run_simulation: runSimulation },
  });
  if (res.status !== "success") throw new Error(res.message);
  return res.data;
}

/** Run simulation only */
export async function runSimulation(sport = "nba", cycles = 20): Promise<SimulationResult> {
  const res = await pythonFetch<PythonApiResponse<SimulationResult>>("/api/system/simulate", {
    method: "POST",
    params: { sport, cycles },
  });
  return res.data;
}

/** Weights history */
export async function getWeightsHistory(limit = 50): Promise<WeightEntry[]> {
  const res = await pythonFetch<PythonApiResponse<{ history: WeightEntry[] }>>("/api/learning/weights", {
    params: { limit },
  });
  return res.data.history;
}

/** ROI history */
export async function getRoiHistory(limit = 50): Promise<RoiEntry[]> {
  const res = await pythonFetch<PythonApiResponse<{ roi_history: RoiEntry[] }>>("/api/learning/roi", {
    params: { limit },
  });
  return res.data.roi_history;
}

/** Patterns */
export async function getPatterns(sport?: string, limit = 50): Promise<Array<{ id: number; sport: string; bet_type: string; win_rate: number; sample_size: number; last_seen: string }>> {
  const params: Record<string, string | number> = { limit };
  if (sport) params.sport = sport;
  const res = await pythonFetch<PythonApiResponse<{ patterns: Array<{ id: number; sport: string; bet_type: string; win_rate: number; sample_size: number; last_seen: string }> }>>("/api/learning/patterns", {
    params,
  });
  return res.data.patterns;
}

/** Bankroll history */
export async function getBankrollHistory(limit = 100): Promise<BankrollEntry[]> {
  return pythonFetch("/api/bankroll", { params: { limit } });
}

/** Bankroll summary */
export async function getBankrollSummary(): Promise<BankrollSummary> {
  return pythonFetch("/api/bankroll/summary");
}
