/*
  predictionEngine.test.ts — Vitest tests for the multi-layer prediction engine.
  
  Tests cover:
  - Feature flags (defaults, env override)
  - Historical service (seeded model, adjustment clamping)
  - Injury service (seeded model, adjustment clamping)
  - Fatigue service (seeded model, back-to-back detection)
  - Weather service (indoor sport guard)
  - Prediction engine (full pipeline, determinism, probability bounds)
  - oddsService (base market probabilities, no random noise)
*/

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FEATURE_FLAGS, getActiveLayers } from "./featureFlags";
import { getHistoricalAdjustment, getRecentForm, getHeadToHead } from "./services/historicalService";
import { getInjuryAdjustment, getTeamInjuries } from "./services/injuryService";
import { getFatigueAdjustment, getScheduleLoad } from "./services/fatigueService";
import { getWeatherAdjustment, isIndoorSport } from "./services/weatherService";
import { getFinalModelProbability, getBaseMarketProbabilities } from "./services/predictionEngine";

// ─── Feature Flags ────────────────────────────────────────────────

describe("Feature Flags", () => {
  it("has correct defaults", () => {
    expect(FEATURE_FLAGS.ENABLE_HISTORICAL).toBe(true);
    expect(FEATURE_FLAGS.ENABLE_INJURIES).toBe(true);
    expect(FEATURE_FLAGS.ENABLE_FATIGUE).toBe(true);
    expect(FEATURE_FLAGS.ENABLE_WEATHER).toBe(false); // default off for NBA
    expect(FEATURE_FLAGS.ENABLE_EXPLAINABILITY).toBe(true);
  });

  it("getActiveLayers returns all layer keys", () => {
    const layers = getActiveLayers();
    expect(layers).toHaveProperty("historical");
    expect(layers).toHaveProperty("injuries");
    expect(layers).toHaveProperty("fatigue");
    expect(layers).toHaveProperty("weather");
    expect(layers).toHaveProperty("explainability");
  });
});

// ─── Base Market Probabilities ────────────────────────────────────

describe("getBaseMarketProbabilities", () => {
  it("returns null when odds are null", () => {
    expect(getBaseMarketProbabilities(null, null)).toBeNull();
    expect(getBaseMarketProbabilities(-110, null)).toBeNull();
  });

  it("correctly removes vig from -110/-110 (50/50 market)", () => {
    const result = getBaseMarketProbabilities(-110, -110);
    expect(result).not.toBeNull();
    expect(result!.fairHomeProb).toBeCloseTo(0.5, 2);
    expect(result!.fairAwayProb).toBeCloseTo(0.5, 2);
    expect(result!.vigPct).toBeGreaterThan(0);
  });

  it("correctly handles +150 / -180 odds", () => {
    const result = getBaseMarketProbabilities(150, -180);
    expect(result).not.toBeNull();
    // -180 implies ~64% probability
    expect(result!.fairAwayProb).toBeGreaterThan(0.6);
    expect(result!.fairHomeProb + result!.fairAwayProb).toBeCloseTo(1.0, 5);
  });

  it("fair probs sum to 1.0", () => {
    const odds = [
      [-110, -110],
      [-150, +130],
      [+200, -250],
      [-120, -105],
    ] as [number, number][];

    for (const [h, a] of odds) {
      const result = getBaseMarketProbabilities(h, a);
      expect(result).not.toBeNull();
      expect(result!.fairHomeProb + result!.fairAwayProb).toBeCloseTo(1.0, 5);
    }
  });
});

// ─── Historical Service ───────────────────────────────────────────

describe("Historical Service", () => {
  it("getRecentForm returns valid data for known NBA team", async () => {
    const form = await getRecentForm("Boston Celtics");
    expect(form.team).toBe("Boston Celtics");
    expect(form.last5WinRate).toBeGreaterThanOrEqual(0);
    expect(form.last5WinRate).toBeLessThanOrEqual(1);
    expect(form.last10WinRate).toBeGreaterThanOrEqual(0);
    expect(form.last10WinRate).toBeLessThanOrEqual(1);
    expect(form.homeWinRate).toBeGreaterThanOrEqual(0);
    expect(form.awayWinRate).toBeLessThanOrEqual(1);
    expect(["live", "seeded"]).toContain(form.source);
  });

  it("getRecentForm is deterministic for same team", async () => {
    const form1 = await getRecentForm("Los Angeles Lakers");
    const form2 = await getRecentForm("Los Angeles Lakers");
    expect(form1.last10WinRate).toBe(form2.last10WinRate);
  });

  it("getHeadToHead returns valid record", async () => {
    const h2h = await getHeadToHead("Boston Celtics", "Los Angeles Lakers");
    expect(h2h.totalGames).toBe(10);
    expect(h2h.teamAWins + h2h.teamBWins).toBe(10);
    expect(h2h.teamAWinRate).toBeGreaterThanOrEqual(0);
    expect(h2h.teamAWinRate).toBeLessThanOrEqual(1);
  });

  it("getHistoricalAdjustment is clamped to ±0.06", async () => {
    const adj = await getHistoricalAdjustment("Boston Celtics", "Washington Wizards");
    expect(adj.value).toBeGreaterThanOrEqual(-0.06);
    expect(adj.value).toBeLessThanOrEqual(0.06);
    expect(adj.explanation).toBeTruthy();
    expect(["live", "seeded"]).toContain(adj.source);
  });

  it("getHistoricalAdjustment is deterministic", async () => {
    const adj1 = await getHistoricalAdjustment("Denver Nuggets", "Utah Jazz");
    const adj2 = await getHistoricalAdjustment("Denver Nuggets", "Utah Jazz");
    expect(adj1.value).toBe(adj2.value);
  });
});

// ─── Injury Service ───────────────────────────────────────────────

describe("Injury Service", () => {
  it("getTeamInjuries returns valid report", async () => {
    const report = await getTeamInjuries("Golden State Warriors");
    expect(report.team).toBe("Golden State Warriors");
    expect(Array.isArray(report.injuries)).toBe(true);
    expect(report.totalImpact).toBeGreaterThanOrEqual(0);
    expect(report.totalImpact).toBeLessThanOrEqual(1);
    expect(["live", "seeded", "unavailable"]).toContain(report.source);
  });

  it("getInjuryAdjustment is clamped to ±0.08", async () => {
    const adj = await getInjuryAdjustment("Los Angeles Lakers", "Golden State Warriors");
    expect(adj.value).toBeGreaterThanOrEqual(-0.08);
    expect(adj.value).toBeLessThanOrEqual(0.08);
    expect(adj.confidenceReduction).toBeGreaterThanOrEqual(0);
    expect(adj.confidenceReduction).toBeLessThanOrEqual(0.12);
  });

  it("getInjuryAdjustment is deterministic", async () => {
    const adj1 = await getInjuryAdjustment("Milwaukee Bucks", "Miami Heat");
    const adj2 = await getInjuryAdjustment("Milwaukee Bucks", "Miami Heat");
    expect(adj1.value).toBe(adj2.value);
  });
});

// ─── Fatigue Service ──────────────────────────────────────────────

describe("Fatigue Service", () => {
  it("getScheduleLoad returns valid data", async () => {
    const load = await getScheduleLoad("Oklahoma City Thunder", "2025-04-15");
    expect(load.team).toBe("Oklahoma City Thunder");
    expect(load.restDays).toBeGreaterThanOrEqual(0);
    expect(load.fatigueScore).toBeGreaterThanOrEqual(0);
    expect(load.fatigueScore).toBeLessThanOrEqual(1);
    expect(["live", "seeded"]).toContain(load.source);
  });

  it("getScheduleLoad is deterministic for same team+date", async () => {
    const load1 = await getScheduleLoad("Denver Nuggets", "2025-04-15");
    const load2 = await getScheduleLoad("Denver Nuggets", "2025-04-15");
    expect(load1.restDays).toBe(load2.restDays);
    expect(load1.fatigueScore).toBe(load2.fatigueScore);
  });

  it("getFatigueAdjustment is clamped to ±0.05", async () => {
    const adj = await getFatigueAdjustment("Boston Celtics", "Miami Heat", "2025-04-15");
    expect(adj.value).toBeGreaterThanOrEqual(-0.05);
    expect(adj.value).toBeLessThanOrEqual(0.05);
    expect(adj.explanation).toBeTruthy();
  });
});

// ─── Weather Service ──────────────────────────────────────────────

describe("Weather Service", () => {
  it("isIndoorSport correctly identifies NBA as indoor", () => {
    expect(isIndoorSport("basketball_nba")).toBe(true);
    expect(isIndoorSport("basketball")).toBe(true);
    expect(isIndoorSport("nba")).toBe(true);
    expect(isIndoorSport("icehockey_nhl")).toBe(true);
  });

  it("isIndoorSport correctly identifies outdoor sports", () => {
    expect(isIndoorSport("americanfootball_nfl")).toBe(false);
    expect(isIndoorSport("baseball_mlb")).toBe(false);
  });

  it("getWeatherAdjustment returns zero for NBA (indoor)", async () => {
    const adj = await getWeatherAdjustment("Boston Celtics", "basketball_nba");
    expect(adj.value).toBe(0);
    expect(adj.source).toBe("inactive");
    expect(adj.explanation).toContain("indoor");
  });
});

// ─── Full Prediction Engine ───────────────────────────────────────

describe("Prediction Engine (getFinalModelProbability)", () => {
  it("returns valid output with odds", async () => {
    const output = await getFinalModelProbability(
      "Boston Celtics",
      "Los Angeles Lakers",
      "basketball_nba",
      -150,
      +130,
      "2025-04-15"
    );

    expect(output.homeTeam).toBe("Boston Celtics");
    expect(output.awayTeam).toBe("Los Angeles Lakers");
    expect(output.finalModelProbHome).toBeGreaterThanOrEqual(0.05);
    expect(output.finalModelProbHome).toBeLessThanOrEqual(0.95);
    expect(output.finalModelProbAway).toBeGreaterThanOrEqual(0.05);
    expect(output.finalModelProbAway).toBeLessThanOrEqual(0.95);
    // Probs should reconcile
    expect(output.finalModelProbHome + output.finalModelProbAway).toBeCloseTo(1.0, 2);
    expect(output.confidence).toBeGreaterThanOrEqual(42);
    expect(output.confidence).toBeLessThanOrEqual(92);
  });

  it("returns valid output without odds (fallback to 50/50)", async () => {
    const output = await getFinalModelProbability(
      "Denver Nuggets",
      "Utah Jazz",
      "basketball_nba",
      null,
      null,
      "2025-04-15"
    );
    expect(output.finalModelProbHome).toBeGreaterThanOrEqual(0.05);
    expect(output.finalModelProbHome).toBeLessThanOrEqual(0.95);
  });

  it("is deterministic for same inputs", async () => {
    const out1 = await getFinalModelProbability(
      "Golden State Warriors", "Dallas Mavericks",
      "basketball_nba", -120, +100, "2025-04-15"
    );
    const out2 = await getFinalModelProbability(
      "Golden State Warriors", "Dallas Mavericks",
      "basketball_nba", -120, +100, "2025-04-15"
    );
    expect(out1.finalModelProbHome).toBe(out2.finalModelProbHome);
    expect(out1.confidence).toBe(out2.confidence);
  });

  it("includes explainability breakdown", async () => {
    const output = await getFinalModelProbability(
      "Milwaukee Bucks", "Indiana Pacers",
      "basketball_nba", -130, +110, "2025-04-15"
    );
    expect(output.explanation).toBeDefined();
    expect(output.explanation.base).toBeTruthy();
    expect(output.explanation.historical).toBeTruthy();
    expect(output.explanation.injuries).toBeTruthy();
    expect(output.explanation.fatigue).toBeTruthy();
    expect(output.explanation.weather).toContain("indoor");
    expect(output.explanation.numeric).toBeDefined();
    expect(output.explanation.numeric.finalModelProbHome).toBeGreaterThan(0);
  });

  it("active layers object contains all expected keys", async () => {
    const output = await getFinalModelProbability(
      "Phoenix Suns", "Sacramento Kings",
      "basketball_nba", -110, -110, "2025-04-15"
    );
    expect(output.activeLayers).toHaveProperty("historical");
    expect(output.activeLayers).toHaveProperty("injuries");
    expect(output.activeLayers).toHaveProperty("fatigue");
    expect(output.activeLayers).toHaveProperty("weather");
  });

  it("weather layer is inactive for NBA", async () => {
    const output = await getFinalModelProbability(
      "New York Knicks", "Miami Heat",
      "basketball_nba", -110, -110, "2025-04-15"
    );
    expect(output.activeLayers.weather).toContain("indoor");
  });

  it("total adjustments cannot dominate — final prob stays within 0.05-0.95", async () => {
    // Test with extreme team mismatch (strong vs weak)
    const output = await getFinalModelProbability(
      "Boston Celtics", "Washington Wizards",
      "basketball_nba", -400, +320, "2025-04-15"
    );
    expect(output.finalModelProbHome).toBeLessThanOrEqual(0.95);
    expect(output.finalModelProbAway).toBeGreaterThanOrEqual(0.05);
  });
});

// ─── Spec Phase 8 Verification Tests ─────────────────────────────

describe("Spec Verification: Fatigue affects back-to-backs", () => {
  it("fatigue adjustment is clamped and directionally correct for B2B scenario", async () => {
    const homeLoad = await getScheduleLoad("Miami Heat", "2025-04-15");
    const awayLoad = await getScheduleLoad("Boston Celtics", "2025-04-15");
    const adj = await getFatigueAdjustment("Miami Heat", "Boston Celtics", "2025-04-15");

    // Clamped to ±0.05 regardless of scenario
    expect(adj.value).toBeGreaterThanOrEqual(-0.05);
    expect(adj.value).toBeLessThanOrEqual(0.05);

    // Directional logic: if home is B2B and away is not → negative (home disadvantage)
    if (homeLoad.isBackToBack && !awayLoad.isBackToBack) {
      expect(adj.value).toBeLessThan(0);
      expect(adj.explanation).toMatch(/back-to-back/i);
    }
    // If away is B2B and home is not → positive (home advantage)
    if (!homeLoad.isBackToBack && awayLoad.isBackToBack) {
      expect(adj.value).toBeGreaterThan(0);
    }
  });

  it("rest day differential produces a non-zero adjustment when gap >= 2 days", async () => {
    // Find two teams with different rest day buckets on the same date
    const load1 = await getScheduleLoad("Oklahoma City Thunder", "2025-04-15");
    const load2 = await getScheduleLoad("Charlotte Hornets", "2025-04-15");
    const adj = await getFatigueAdjustment("Oklahoma City Thunder", "Charlotte Hornets", "2025-04-15");

    if (Math.abs(load1.restDays - load2.restDays) >= 2) {
      expect(adj.value).not.toBe(0);
    }
    expect(adj.explanation.length).toBeGreaterThan(0);
  });
});

describe("Spec Verification: Historical reflects recent performance", () => {
  it("strong team (Boston) has higher win rate than weak team (Washington)", async () => {
    const [bostonForm, wizardsForm] = await Promise.all([
      getRecentForm("Boston Celtics"),
      getRecentForm("Washington Wizards"),
    ]);
    expect(bostonForm.last10WinRate).toBeGreaterThan(wizardsForm.last10WinRate);
    expect(bostonForm.avgPointsScored).toBeGreaterThan(wizardsForm.avgPointsScored);
  });

  it("historical adjustment is positive when strong team is home vs weak away", async () => {
    const adj = await getHistoricalAdjustment("Boston Celtics", "Washington Wizards");
    expect(adj.value).toBeGreaterThan(0);
    expect(adj.value).toBeLessThanOrEqual(0.06);
  });

  it("historical adjustment is smaller (less positive) when weak team is home vs strong away", async () => {
    // Washington (weak) at home vs Boston (strong):
    // The home-court component partially offsets the form disadvantage,
    // so the result may be slightly positive — but it MUST be less than
    // the Boston-home scenario where both form AND home-court advantage align.
    const [adjBostonHome, adjWizardsHome] = await Promise.all([
      getHistoricalAdjustment("Boston Celtics", "Washington Wizards"),
      getHistoricalAdjustment("Washington Wizards", "Boston Celtics"),
    ]);
    // Boston home should always produce a higher adjustment than Wizards home
    expect(adjBostonHome.value).toBeGreaterThan(adjWizardsHome.value);
    // Both must be within ±0.06 bounds
    expect(adjWizardsHome.value).toBeGreaterThanOrEqual(-0.06);
    expect(adjWizardsHome.value).toBeLessThanOrEqual(0.06);
  });

  it("adjustment breakdown contains formDiff, h2hBias, homeAwaySplit", async () => {
    const adj = await getHistoricalAdjustment("Denver Nuggets", "Portland Trail Blazers");
    expect(typeof adj.formDiff).toBe("number");
    expect(typeof adj.h2hBias).toBe("number");
    expect(typeof adj.homeAwaySplit).toBe("number");
    expect(typeof adj.explanation).toBe("string");
  });
});

describe("Spec Verification: System stability when data is missing", () => {
  it("does not crash with null odds — falls back to 50/50 prior", async () => {
    const output = await getFinalModelProbability(
      "Unknown Team A", "Unknown Team B",
      "basketball_nba", null, null, "2025-04-15"
    );
    expect(output.finalModelProbHome).toBeGreaterThanOrEqual(0.05);
    expect(output.finalModelProbHome).toBeLessThanOrEqual(0.95);
    expect(output.finalModelProbHome + output.finalModelProbAway).toBeCloseTo(1.0, 3);
  });

  it("does not crash with completely unknown team names", async () => {
    const output = await getFinalModelProbability(
      "Fake City Ballers", "Mystery Town Hoopers",
      "basketball_nba", -110, -110, "2025-04-15"
    );
    expect(output.finalModelProbHome).toBeGreaterThanOrEqual(0.05);
    expect(output.finalModelProbHome).toBeLessThanOrEqual(0.95);
    expect(output.confidence).toBeGreaterThanOrEqual(42);
  });

  it("sample final output contains all required spec fields", async () => {
    const output = await getFinalModelProbability(
      "Los Angeles Lakers", "Golden State Warriors",
      "basketball_nba", -150, +130, "2025-04-15"
    );
    // Spec required output fields
    expect(output).toHaveProperty("marketProbHome");
    expect(output).toHaveProperty("baseModelProbHome");
    expect(output).toHaveProperty("historicalAdjustment");
    expect(output).toHaveProperty("fatigueAdjustment");
    expect(output).toHaveProperty("finalModelProbHome");
    expect(output).toHaveProperty("edgeHome");
    expect(output).toHaveProperty("confidence");
    // Probability validity
    expect(output.marketProbHome).toBeGreaterThan(0);
    expect(output.marketProbHome).toBeLessThan(1);
    expect(output.finalModelProbHome).toBeGreaterThan(0);
    expect(output.finalModelProbHome).toBeLessThan(1);
    // Adjustment bounds per spec
    expect(Math.abs(output.historicalAdjustment)).toBeLessThanOrEqual(0.06);
    expect(Math.abs(output.fatigueAdjustment)).toBeLessThanOrEqual(0.05);
    // Confidence range
    expect(output.confidence).toBeGreaterThanOrEqual(42);
    expect(output.confidence).toBeLessThanOrEqual(92);
    // Deterministic — no random noise
    const output2 = await getFinalModelProbability(
      "Los Angeles Lakers", "Golden State Warriors",
      "basketball_nba", -150, +130, "2025-04-15"
    );
    expect(output.finalModelProbHome).toBe(output2.finalModelProbHome);
    expect(output.historicalAdjustment).toBe(output2.historicalAdjustment);
    expect(output.fatigueAdjustment).toBe(output2.fatigueAdjustment);
  });
});
