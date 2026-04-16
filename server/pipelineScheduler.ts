/**
 * pipelineScheduler.ts — Background scheduler that triggers pipeline.run on a recurring interval.
 *
 * Features:
 *   - Configurable interval (default 15 minutes)
 *   - Start / stop / status controls exposed via tRPC
 *   - Tracks last run time, next run time, run count, and errors
 *   - Auto-starts on server boot (configurable)
 *   - Prevents overlapping runs
 */

import { runPipeline } from "./pythonApi";

// ─── State ──────────────────────────────────────────────────────

interface SchedulerState {
  running: boolean;
  intervalMs: number;
  sport: string;
  executionMode: "paper" | "live";
  runSimulation: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  consecutiveErrors: number;
  lastError: string | null;
  isExecuting: boolean;
}

let state: SchedulerState = {
  running: false,
  intervalMs: 15 * 60 * 1000, // 15 minutes default
  sport: "nba",
  executionMode: "paper",
  runSimulation: true,
  lastRunAt: null,
  nextRunAt: null,
  runCount: 0,
  consecutiveErrors: 0,
  lastError: null,
  isExecuting: false,
};

let timer: ReturnType<typeof setTimeout> | null = null;

// ─── Core loop ──────────────────────────────────────────────────

async function executePipelineRun(): Promise<void> {
  if (state.isExecuting) {
    console.log("[Scheduler] Skipping — previous run still executing");
    return;
  }

  state.isExecuting = true;
  const startTime = Date.now();

  try {
    console.log(`[Scheduler] Running pipeline: sport=${state.sport}, mode=${state.executionMode}`);
    const result = await runPipeline(state.sport, state.executionMode, state.runSimulation);
    state.lastRunAt = new Date().toISOString();
    state.runCount++;
    state.consecutiveErrors = 0;
    state.lastError = null;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[Scheduler] Pipeline complete in ${elapsed}s: ${result.pipeline_stages.selected} bets selected`
    );
  } catch (err) {
    state.consecutiveErrors++;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error(`[Scheduler] Pipeline error (${state.consecutiveErrors} consecutive):`, state.lastError);

    // Back off after 5 consecutive errors
    if (state.consecutiveErrors >= 5) {
      console.warn("[Scheduler] Too many consecutive errors — stopping scheduler");
      stopScheduler();
      return;
    }
  } finally {
    state.isExecuting = false;
  }

  // Schedule next run
  if (state.running) {
    scheduleNext();
  }
}

function scheduleNext(): void {
  if (timer) clearTimeout(timer);
  state.nextRunAt = new Date(Date.now() + state.intervalMs).toISOString();
  timer = setTimeout(() => executePipelineRun(), state.intervalMs);
}

// ─── Public API ─────────────────────────────────────────────────

export function startScheduler(options?: {
  intervalMinutes?: number;
  sport?: string;
  executionMode?: "paper" | "live";
  runSimulation?: boolean;
  runImmediately?: boolean;
}): SchedulerState {
  if (state.running) {
    // Update config without restarting
    if (options?.intervalMinutes) state.intervalMs = options.intervalMinutes * 60 * 1000;
    if (options?.sport) state.sport = options.sport;
    if (options?.executionMode) state.executionMode = options.executionMode;
    if (options?.runSimulation !== undefined) state.runSimulation = options.runSimulation;
    scheduleNext();
    return getStatus();
  }

  if (options?.intervalMinutes) state.intervalMs = options.intervalMinutes * 60 * 1000;
  if (options?.sport) state.sport = options.sport;
  if (options?.executionMode) state.executionMode = options.executionMode;
  if (options?.runSimulation !== undefined) state.runSimulation = options.runSimulation;

  state.running = true;
  state.consecutiveErrors = 0;
  state.lastError = null;

  console.log(
    `[Scheduler] Started: interval=${state.intervalMs / 60000}min, sport=${state.sport}, mode=${state.executionMode}`
  );

  if (options?.runImmediately !== false) {
    // Run immediately, then schedule recurring
    executePipelineRun();
  } else {
    scheduleNext();
  }

  return getStatus();
}

export function stopScheduler(): SchedulerState {
  state.running = false;
  state.nextRunAt = null;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  console.log("[Scheduler] Stopped");
  return getStatus();
}

export function getStatus(): SchedulerState {
  return { ...state };
}
