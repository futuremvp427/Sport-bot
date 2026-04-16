/**
 * scheduler-bets.test.ts — Vitest tests for:
 *   1. Scheduler tRPC procedures (status, start, stop)
 *   2. Bet history tRPC procedures (list, create, stats)
 *   3. Sport parameter passing through pipeline.run and pipeline.simulate
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock pythonApi ────────────────────────────────────────────
vi.mock("./pythonApi", () => ({
  getApiHealth: vi.fn().mockResolvedValue({ status: "healthy", timestamp: "2026-04-16T01:00:00Z", version: "2.0.0" }),
  getSystemHealth: vi.fn().mockResolvedValue({}),
  getSystemMemory: vi.fn().mockResolvedValue({}),
  getPythonDashboardSummary: vi.fn().mockResolvedValue({}),
  runPipeline: vi.fn(),
  runSimulation: vi.fn(),
  getWeightsHistory: vi.fn().mockResolvedValue([]),
  getRoiHistory: vi.fn().mockResolvedValue([]),
  getPatterns: vi.fn().mockResolvedValue([]),
  getBankrollHistory: vi.fn().mockResolvedValue([]),
  getBankrollSummary: vi.fn().mockResolvedValue({}),
}));

import { runPipeline, runSimulation } from "./pythonApi";
const mockRunPipeline = vi.mocked(runPipeline);
const mockRunSimulation = vi.mocked(runSimulation);

// ─── Mock pipelineScheduler ────────────────────────────────────
vi.mock("./pipelineScheduler", () => ({
  startScheduler: vi.fn(),
  stopScheduler: vi.fn(),
  getStatus: vi.fn(),
}));

import { startScheduler, stopScheduler, getStatus as getSchedulerStatus } from "./pipelineScheduler";
const mockStartScheduler = vi.mocked(startScheduler);
const mockStopScheduler = vi.mocked(stopScheduler);
const mockGetSchedulerStatus = vi.mocked(getSchedulerStatus);

// ─── Mock db ───────────────────────────────────────────────────
vi.mock("./db", () => ({
  getPlacedBets: vi.fn(),
  createPlacedBet: vi.fn(),
  getPlacedBetStats: vi.fn(),
  getUserNotifications: vi.fn().mockResolvedValue([]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  createNotification: vi.fn(),
  getNotificationPreferences: vi.fn().mockResolvedValue(null),
  upsertNotificationPreferences: vi.fn(),
  getUserPayments: vi.fn().mockResolvedValue([]),
}));

import { getPlacedBets, createPlacedBet, getPlacedBetStats } from "./db";
const mockGetPlacedBets = vi.mocked(getPlacedBets);
const mockCreatePlacedBet = vi.mocked(createPlacedBet);
const mockGetPlacedBetStats = vi.mocked(getPlacedBetStats);

// ─── Context helpers ───────────────────────────────────────────
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

  return {
    ctx: {
      user,
      req: { protocol: "https", headers: { origin: "https://test.example.com" } } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    },
  };
}

function createPublicContext(): { ctx: TrpcContext } {
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    },
  };
}

// ─── Setup ─────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// 1. SCHEDULER PROCEDURES
// ═══════════════════════════════════════════════════════════════

describe("scheduler.status", () => {
  it("returns scheduler status as public query", async () => {
    mockGetSchedulerStatus.mockReturnValue({
      running: false,
      intervalMs: 900000,
      sport: "nba",
      executionMode: "paper",
      runSimulation: true,
      lastRunAt: null,
      nextRunAt: null,
      runCount: 0,
      consecutiveErrors: 0,
      lastError: null,
      isExecuting: false,
    });

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scheduler.status();

    expect(result.running).toBe(false);
    expect(result.intervalMs).toBe(900000);
    expect(result.sport).toBe("nba");
    expect(mockGetSchedulerStatus).toHaveBeenCalledOnce();
  });

  it("returns active scheduler state with run count", async () => {
    mockGetSchedulerStatus.mockReturnValue({
      running: true,
      intervalMs: 600000,
      sport: "nfl",
      executionMode: "paper",
      runSimulation: true,
      lastRunAt: "2026-04-16T01:00:00Z",
      nextRunAt: "2026-04-16T01:10:00Z",
      runCount: 5,
      consecutiveErrors: 0,
      lastError: null,
      isExecuting: false,
    });

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scheduler.status();

    expect(result.running).toBe(true);
    expect(result.runCount).toBe(5);
    expect(result.sport).toBe("nfl");
  });
});

describe("scheduler.start", () => {
  it("starts scheduler when authenticated", async () => {
    mockStartScheduler.mockReturnValue({
      running: true,
      intervalMs: 900000,
      sport: "nba",
      executionMode: "paper",
      runSimulation: true,
      lastRunAt: null,
      nextRunAt: "2026-04-16T01:15:00Z",
      runCount: 0,
      consecutiveErrors: 0,
      lastError: null,
      isExecuting: false,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scheduler.start({
      intervalMinutes: 15,
      sport: "nba",
    });

    expect(result.running).toBe(true);
    expect(result.intervalMs).toBe(900000);
    expect(mockStartScheduler).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scheduler.start({ intervalMinutes: 15, sport: "nba" })
    ).rejects.toThrow();
  });

  it("validates interval range (min 1, max 1440)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scheduler.start({ intervalMinutes: 0, sport: "nba" })
    ).rejects.toThrow();

    await expect(
      caller.scheduler.start({ intervalMinutes: 1441, sport: "nba" })
    ).rejects.toThrow();
  });

  it("accepts different sport parameters", async () => {
    mockStartScheduler.mockReturnValue({
      running: true,
      intervalMs: 300000,
      sport: "mlb",
      executionMode: "paper",
      runSimulation: true,
      lastRunAt: null,
      nextRunAt: "2026-04-16T01:05:00Z",
      runCount: 0,
      consecutiveErrors: 0,
      lastError: null,
      isExecuting: false,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scheduler.start({
      intervalMinutes: 5,
      sport: "mlb",
    });

    expect(result.sport).toBe("mlb");
  });
});

describe("scheduler.stop", () => {
  it("stops scheduler when authenticated", async () => {
    mockStopScheduler.mockReturnValue({
      running: false,
      intervalMs: 900000,
      sport: "nba",
      executionMode: "paper",
      runSimulation: true,
      lastRunAt: "2026-04-16T01:00:00Z",
      nextRunAt: null,
      runCount: 3,
      consecutiveErrors: 0,
      lastError: null,
      isExecuting: false,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scheduler.stop();

    expect(result.running).toBe(false);
    expect(result.nextRunAt).toBeNull();
    expect(mockStopScheduler).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scheduler.stop()).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. BET HISTORY PROCEDURES
// ═══════════════════════════════════════════════════════════════

describe("bets.list", () => {
  it("returns paginated bet list when authenticated", async () => {
    mockGetPlacedBets.mockResolvedValue({
      bets: [
        {
          id: 1,
          userId: 1,
          sport: "nba",
          team: "Lakers",
          betType: "moneyline",
          odds: -150,
          stake: 5000,
          outcome: "win",
          profitLoss: 3333,
          createdAt: new Date("2026-04-16T01:00:00Z"),
          settledAt: new Date("2026-04-16T03:00:00Z"),
        },
      ],
      total: 1,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bets.list({
      sport: "nba",
      limit: 25,
      offset: 0,
    });

    expect(result.bets).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.bets[0].sport).toBe("nba");
    expect(result.bets[0].team).toBe("Lakers");
    expect(mockGetPlacedBets).toHaveBeenCalledWith(1, {
      sport: "nba",
      result: undefined,
      limit: 25,
      offset: 0,
    });
  });

  it("filters by result (win/loss/pending)", async () => {
    mockGetPlacedBets.mockResolvedValue({ bets: [], total: 0 });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.bets.list({ result: "win", limit: 50, offset: 0 });

    expect(mockGetPlacedBets).toHaveBeenCalledWith(1, {
      sport: undefined,
      result: "win",
      limit: 50,
      offset: 0,
    });
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.bets.list()).rejects.toThrow();
  });

  it("uses default limit and offset when not provided", async () => {
    mockGetPlacedBets.mockResolvedValue({ bets: [], total: 0 });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.bets.list();

    expect(mockGetPlacedBets).toHaveBeenCalledWith(1, {
      sport: undefined,
      result: undefined,
      limit: 100,
      offset: 0,
    });
  });
});

describe("bets.create", () => {
  it("creates a new bet when authenticated", async () => {
    mockCreatePlacedBet.mockResolvedValue({
      id: 1,
      userId: 1,
      sport: "nba",
      team: "Celtics",
      betType: "moneyline",
      odds: -200,
      stake: 10000,
      outcome: "pending",
      profitLoss: 0,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bets.create({
      sport: "nba",
      team: "Celtics",
      betType: "moneyline",
      odds: -200,
      stake: 10000,
    });

    expect(result).not.toBeNull();
    expect(result!.sport).toBe("nba");
    expect(result!.team).toBe("Celtics");
    expect(mockCreatePlacedBet).toHaveBeenCalledWith({
      userId: 1,
      sport: "nba",
      team: "Celtics",
      betType: "moneyline",
      odds: -200,
      stake: 10000,
      outcome: "pending",
      profitLoss: 0,
    });
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bets.create({
        sport: "nba",
        team: "Celtics",
        betType: "moneyline",
        odds: -200,
        stake: 10000,
      })
    ).rejects.toThrow();
  });

  it("validates minimum stake", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bets.create({
        sport: "nba",
        team: "Celtics",
        betType: "moneyline",
        odds: -200,
        stake: 0,
      })
    ).rejects.toThrow();
  });
});

describe("bets.stats", () => {
  it("returns bet statistics when authenticated", async () => {
    mockGetPlacedBetStats.mockResolvedValue({
      totalBets: 20,
      wins: 12,
      losses: 6,
      pending: 2,
      totalStaked: 100000,
      totalProfitLoss: 15000,
      winRate: 0.667,
      roi: 0.15,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bets.stats();

    expect(result.totalBets).toBe(20);
    expect(result.wins).toBe(12);
    expect(result.winRate).toBeCloseTo(0.667, 2);
    expect(result.roi).toBeCloseTo(0.15, 2);
    expect(mockGetPlacedBetStats).toHaveBeenCalledWith(1);
  });

  it("rejects unauthenticated callers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.bets.stats()).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. SPORT PARAMETER PASSING
// ═══════════════════════════════════════════════════════════════

describe("Sport parameter propagation", () => {
  it("pipeline.run passes sport to runPipeline", async () => {
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

    // Test with NFL
    await caller.pipeline.run({ sport: "nfl" });
    expect(mockRunPipeline).toHaveBeenCalledWith("nfl", "paper", true);

    // Test with MLB
    mockRunPipeline.mockClear();
    await caller.pipeline.run({ sport: "mlb" });
    expect(mockRunPipeline).toHaveBeenCalledWith("mlb", "paper", true);

    // Test with Soccer
    mockRunPipeline.mockClear();
    await caller.pipeline.run({ sport: "soccer" });
    expect(mockRunPipeline).toHaveBeenCalledWith("soccer", "paper", true);
  });

  it("pipeline.simulate passes sport to runSimulation", async () => {
    mockRunSimulation.mockResolvedValue({
      total_simulated_bets: 20,
      avg_roi_pct: 5.0,
      avg_max_drawdown: 800,
      avg_bankroll_end: 10500,
      overall_win_rate: 0.52,
      total_wins: 10,
      total_losses: 10,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test with NHL
    await caller.pipeline.simulate({ sport: "nhl", cycles: 10 });
    expect(mockRunSimulation).toHaveBeenCalledWith("nhl", 10);

    // Test with Boxing
    mockRunSimulation.mockClear();
    await caller.pipeline.simulate({ sport: "boxing", cycles: 5 });
    expect(mockRunSimulation).toHaveBeenCalledWith("boxing", 5);

    // Test with Golf
    mockRunSimulation.mockClear();
    await caller.pipeline.simulate({ sport: "golf", cycles: 50 });
    expect(mockRunSimulation).toHaveBeenCalledWith("golf", 50);
  });

  it("pipeline.run defaults to nba when no sport specified", async () => {
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
    await caller.pipeline.run({});

    expect(mockRunPipeline).toHaveBeenCalledWith("nba", "paper", true);
  });

  it("pipeline.simulate defaults to nba when no sport specified", async () => {
    mockRunSimulation.mockResolvedValue({
      total_simulated_bets: 20,
      avg_roi_pct: 5.0,
      avg_max_drawdown: 800,
      avg_bankroll_end: 10500,
      overall_win_rate: 0.52,
      total_wins: 10,
      total_losses: 10,
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.pipeline.simulate({});

    expect(mockRunSimulation).toHaveBeenCalledWith("nba", 20);
  });
});
