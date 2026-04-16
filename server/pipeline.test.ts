/**
 * pipeline.test.ts — Vitest tests for the pipeline tRPC router.
 *
 * Tests cover:
 *   1. Public query procedures (health, systemHealth, memory, dashboardSummary,
 *      weightsHistory, roiHistory, patterns, bankrollHistory, bankrollSummary)
 *   2. Protected mutation procedures (run, simulate) — auth gating
 *   3. Input validation for mutations
 *   4. Graceful fallback when Python backend is offline
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock the pythonApi module ──────────────────────────────────
vi.mock("./pythonApi", () => ({
  getApiHealth: vi.fn(),
  getSystemHealth: vi.fn(),
  getSystemMemory: vi.fn(),
  getPythonDashboardSummary: vi.fn(),
  runPipeline: vi.fn(),
  runSimulation: vi.fn(),
  getWeightsHistory: vi.fn(),
  getRoiHistory: vi.fn(),
  getPatterns: vi.fn(),
  getBankrollHistory: vi.fn(),
  getBankrollSummary: vi.fn(),
}));

import {
  getApiHealth,
  getSystemHealth,
  getSystemMemory,
  getPythonDashboardSummary,
  runPipeline,
  runSimulation,
  getWeightsHistory,
  getRoiHistory,
  getPatterns,
  getBankrollHistory,
  getBankrollSummary,
} from "./pythonApi";

const mockGetApiHealth = vi.mocked(getApiHealth);
const mockGetSystemHealth = vi.mocked(getSystemHealth);
const mockGetSystemMemory = vi.mocked(getSystemMemory);
const mockGetPythonDashboardSummary = vi.mocked(getPythonDashboardSummary);
const mockRunPipeline = vi.mocked(runPipeline);
const mockRunSimulation = vi.mocked(runSimulation);
const mockGetWeightsHistory = vi.mocked(getWeightsHistory);
const mockGetRoiHistory = vi.mocked(getRoiHistory);
const mockGetPatterns = vi.mocked(getPatterns);
const mockGetBankrollHistory = vi.mocked(getBankrollHistory);
const mockGetBankrollSummary = vi.mocked(getBankrollSummary);

// ─── Context helpers ────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    stripeCustomerId: null,
    subscriptionTier: "free",
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Setup / Teardown ───────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// 1. pipeline.health — public, with graceful offline fallback
// ═══════════════════════════════════════════════════════════════

describe("pipeline.health", () => {
  it("returns health data when Python backend is online", async () => {
    const healthData = { status: "healthy", timestamp: "2026-04-16T01:00:00Z", version: "2.0.0" };
    mockGetApiHealth.mockResolvedValue(healthData);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.health();

    expect(result).toEqual(healthData);
    expect(result.status).toBe("healthy");
    expect(mockGetApiHealth).toHaveBeenCalledOnce();
  });

  it("returns offline fallback when Python backend is down", async () => {
    mockGetApiHealth.mockRejectedValue(new Error("Connection refused"));

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.health();

    expect(result.status).toBe("offline");
    expect(result.version).toBe("unknown");
    expect(result.timestamp).toBeDefined();
  });

  it("is accessible without authentication", async () => {
    mockGetApiHealth.mockResolvedValue({ status: "healthy", timestamp: "2026-04-16T01:00:00Z", version: "2.0.0" });

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw
    const result = await caller.pipeline.health();
    expect(result.status).toBe("healthy");
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. pipeline.systemHealth — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.systemHealth", () => {
  it("returns comprehensive system health data", async () => {
    const sysHealth = {
      timestamp: "2026-04-16T01:00:00Z",
      api_health: {
        odds_api: { status: "healthy", response_count: 87, checked_at: "2026-04-16T01:00:00Z" },
        database: { status: "healthy", checked_at: "2026-04-16T01:00:00Z" },
      },
      model_health: { status: "healthy", should_retrain: false, reason: "OK", recent_accuracy: 0.6, historical_accuracy: 0.55 },
      data_freshness: { latest_bet: "2026-04-16T01:00:00Z", latest_odds: null, status: "fresh" },
      overall_status: "healthy",
      recommendations: [],
    };
    mockGetSystemHealth.mockResolvedValue(sysHealth);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.systemHealth();

    expect(result.overall_status).toBe("healthy");
    expect(result.api_health).toHaveProperty("odds_api");
    expect(result.model_health.status).toBe("healthy");
    expect(result.data_freshness.status).toBe("fresh");
    expect(result.recommendations).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. pipeline.memory — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.memory", () => {
  it("returns system memory snapshot", async () => {
    const memData = {
      timestamp: "2026-04-16T01:00:00Z",
      performance: { total_games: 0, total_predictions: 0, total_bets: 17, accuracy: 0 },
      roi: { total_bets: 10, winning_bets: 6, total_staked: 1000, total_profit: 150, roi_pct: 15 },
      patterns: [{ id: 1, sport: "nba", bet_type: "moneyline", win_rate: 0.6, sample_size: 10, last_seen: "2026-04-16" }],
      weights: { confidence_weight: 1.01, edge_weight: 0.99, kelly_weight: 1.005 },
      bankroll: { current_balance: 8500 },
    };
    mockGetSystemMemory.mockResolvedValue(memData);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.memory();

    expect(result.performance.total_bets).toBe(17);
    expect(result.roi.roi_pct).toBe(15);
    expect(result.weights.confidence_weight).toBe(1.01);
    expect(result.bankroll.current_balance).toBe(8500);
    expect(result.patterns).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. pipeline.dashboardSummary — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.dashboardSummary", () => {
  it("returns dashboard summary from Python backend", async () => {
    const summary = {
      total_games: 100,
      total_predictions: 80,
      total_bets: 17,
      total_arb_opps: 3,
      current_bankroll: 8500,
      accuracy: 0.58,
      total_outcomes: 12,
    };
    mockGetPythonDashboardSummary.mockResolvedValue(summary);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.dashboardSummary();

    expect(result.total_bets).toBe(17);
    expect(result.current_bankroll).toBe(8500);
    expect(result.accuracy).toBe(0.58);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. pipeline.run — protected mutation
// ═══════════════════════════════════════════════════════════════

describe("pipeline.run", () => {
  it("executes the full pipeline when authenticated", async () => {
    const pipelineResult = {
      pipeline_stages: { predictions: 3, decisions: 3, selected: 2, executed: 2 },
      selected_bets: [
        {
          sport: "nba", event_id: "g1", team: "Lakers", bet_type: "moneyline",
          probability: 0.6, odds: 150, confidence: 0.7, stake: 500,
          edge: 0.05, expected_value: 0.03, side: "home", model_name: "baseline", action: "bet",
        },
      ],
      learning: {
        intelligence: {
          performance: { total_bets: 10, wins: 6, losses: 4, win_rate: 0.6 },
          roi: { total_risked: 5000, total_profit: 750, roi: 0.15 },
          drawdown: { max_drawdown: 500 },
          learning: {
            feedback: [],
            updated_weights: { confidence_weight: 1.01, edge_weight: 0.99, kelly_weight: 1.005 },
            diagnostics: { pipeline_signals: 3, db_signals: 0, simulation_signals: 6, total_signals: 9, avg_error: 0.12 },
          },
        },
        updated_weights: { confidence_weight: 1.01, edge_weight: 0.99, kelly_weight: 1.005 },
        patterns: { "nba:moneyline": { win_rate: 0.6, sample_size: 10 } },
        weights_history_length: 5,
      },
      simulation: {
        total_cycles: 20, total_simulated_bets: 60, avg_roi_pct: 8.5,
        avg_max_drawdown: 1200, avg_bankroll_end: 10850, overall_win_rate: 0.55,
        total_wins: 33, total_losses: 27,
      },
      elapsed_seconds: 2.5,
    };
    mockRunPipeline.mockResolvedValue(pipelineResult);

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.run({
      sport: "nba",
      executionMode: "paper",
      runSimulation: true,
    });

    expect(result.pipeline_stages.predictions).toBe(3);
    expect(result.selected_bets).toHaveLength(1);
    expect(result.simulation).not.toBeNull();
    expect(result.learning.updated_weights.confidence_weight).toBe(1.01);
    expect(mockRunPipeline).toHaveBeenCalledWith("nba", "paper", true);
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.pipeline.run({ sport: "nba", executionMode: "paper", runSimulation: true })
    ).rejects.toThrow();
  });

  it("uses default values when no input is provided", async () => {
    mockRunPipeline.mockResolvedValue({
      pipeline_stages: { predictions: 0, decisions: 0, selected: 0, executed: 0 },
      selected_bets: [],
      learning: {
        intelligence: {
          performance: { total_bets: 0, wins: 0, losses: 0, win_rate: 0 },
          roi: { total_risked: 0, total_profit: 0, roi: 0 },
          drawdown: { max_drawdown: 0 },
          learning: {
            feedback: [],
            updated_weights: { confidence_weight: 1, edge_weight: 1, kelly_weight: 1 },
            diagnostics: { pipeline_signals: 0, db_signals: 0, simulation_signals: 0, total_signals: 0, avg_error: 0 },
          },
        },
        updated_weights: { confidence_weight: 1, edge_weight: 1, kelly_weight: 1 },
        patterns: {},
        weights_history_length: 0,
      },
      simulation: null,
      elapsed_seconds: 0.1,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Call with defaults
    const result = await caller.pipeline.run({});

    expect(mockRunPipeline).toHaveBeenCalledWith("nba", "paper", true);
    expect(result.elapsed_seconds).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. pipeline.simulate — protected mutation
// ═══════════════════════════════════════════════════════════════

describe("pipeline.simulate", () => {
  it("runs Monte Carlo simulation when authenticated", async () => {
    const simResult = {
      total_simulated_bets: 60,
      avg_roi_pct: 8.5,
      avg_max_drawdown: 1200,
      avg_bankroll_end: 10850,
      overall_win_rate: 0.55,
      total_wins: 33,
      total_losses: 27,
    };
    mockRunSimulation.mockResolvedValue(simResult);

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.simulate({ sport: "nba", cycles: 20 });

    expect(result.total_simulated_bets).toBe(60);
    expect(result.avg_roi_pct).toBe(8.5);
    expect(result.overall_win_rate).toBe(0.55);
    expect(mockRunSimulation).toHaveBeenCalledWith("nba", 20);
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.pipeline.simulate({ sport: "nba", cycles: 10 })
    ).rejects.toThrow();
  });

  it("validates cycles range (min 1, max 100)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // cycles = 0 should fail validation
    await expect(
      caller.pipeline.simulate({ sport: "nba", cycles: 0 })
    ).rejects.toThrow();

    // cycles = 101 should fail validation
    await expect(
      caller.pipeline.simulate({ sport: "nba", cycles: 101 })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. pipeline.weightsHistory — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.weightsHistory", () => {
  it("returns weight history entries", async () => {
    const weights = [
      { id: 1, confidence_weight: 1.01, edge_weight: 0.99, kelly_weight: 1.005, trigger_reason: "learning_cycle", recorded_at: "2026-04-16T01:00:00Z" },
      { id: 2, confidence_weight: 1.02, edge_weight: 0.98, kelly_weight: 1.01, trigger_reason: "memory_snapshot", recorded_at: "2026-04-16T02:00:00Z" },
    ];
    mockGetWeightsHistory.mockResolvedValue(weights);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.weightsHistory();

    expect(result).toHaveLength(2);
    expect(result[0].confidence_weight).toBe(1.01);
    expect(result[1].trigger_reason).toBe("memory_snapshot");
    expect(mockGetWeightsHistory).toHaveBeenCalledWith(50);
  });

  it("accepts custom limit", async () => {
    mockGetWeightsHistory.mockResolvedValue([]);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await caller.pipeline.weightsHistory({ limit: 10 });

    expect(mockGetWeightsHistory).toHaveBeenCalledWith(10);
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. pipeline.roiHistory — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.roiHistory", () => {
  it("returns ROI history entries", async () => {
    const roi = [
      { id: 1, sport: "nba", total_bets: 10, winning_bets: 6, total_staked: 1000, total_profit: 150, roi_pct: 15, max_drawdown: 0, recorded_at: "2026-04-16T01:00:00Z" },
    ];
    mockGetRoiHistory.mockResolvedValue(roi);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.roiHistory();

    expect(result).toHaveLength(1);
    expect(result[0].roi_pct).toBe(15);
    expect(result[0].winning_bets).toBe(6);
    expect(mockGetRoiHistory).toHaveBeenCalledWith(50);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. pipeline.patterns — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.patterns", () => {
  it("returns detected patterns", async () => {
    const patterns = [
      { id: 1, sport: "nba", bet_type: "moneyline", win_rate: 0.6, sample_size: 10, last_seen: "2026-04-16" },
    ];
    mockGetPatterns.mockResolvedValue(patterns);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.patterns();

    expect(result).toHaveLength(1);
    expect(result[0].win_rate).toBe(0.6);
    expect(mockGetPatterns).toHaveBeenCalledWith(undefined, 50);
  });

  it("passes sport filter when provided", async () => {
    mockGetPatterns.mockResolvedValue([]);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await caller.pipeline.patterns({ sport: "nfl", limit: 25 });

    expect(mockGetPatterns).toHaveBeenCalledWith("nfl", 25);
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. pipeline.bankrollHistory — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.bankrollHistory", () => {
  it("returns bankroll history entries", async () => {
    const history = [
      { id: 1, balance: 10000, change_amount: 0, change_reason: "initial", bet_id: null, timestamp: "2026-04-16T00:00:00Z" },
      { id: 2, balance: 9500, change_amount: -500, change_reason: "bet_placed:paper", bet_id: 1, timestamp: "2026-04-16T01:00:00Z" },
    ];
    mockGetBankrollHistory.mockResolvedValue(history);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.bankrollHistory();

    expect(result).toHaveLength(2);
    expect(result[0].balance).toBe(10000);
    expect(result[1].change_amount).toBe(-500);
    expect(mockGetBankrollHistory).toHaveBeenCalledWith(100);
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. pipeline.bankrollSummary — public
// ═══════════════════════════════════════════════════════════════

describe("pipeline.bankrollSummary", () => {
  it("returns bankroll summary statistics", async () => {
    const summary = {
      current_balance: 8500,
      total_entries: 10,
      peak_balance: 9500,
      trough_balance: 8062.5,
      max_drawdown_pct: 15.13,
    };
    mockGetBankrollSummary.mockResolvedValue(summary);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.bankrollSummary();

    expect(result.current_balance).toBe(8500);
    expect(result.peak_balance).toBe(9500);
    expect(result.max_drawdown_pct).toBeCloseTo(15.13, 1);
    expect(mockGetBankrollSummary).toHaveBeenCalledOnce();
  });
});
