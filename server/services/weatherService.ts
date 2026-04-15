/*
  weatherService.ts — Weather impact scaffold (INACTIVE for NBA).
  
  Weather only applies to outdoor sports: NFL, MLB, outdoor soccer.
  For NBA and all indoor sports, getWeatherAdjustment() returns zero
  adjustment immediately without any API call.
  
  Feature flag: ENABLE_WEATHER (default: false)
  
  To activate: set ENABLE_WEATHER=true in environment AND wire in a
  live weather source (wttr.in, OpenWeatherMap, etc.).
  
  Adjustment range: clamped to ±0.04 probability.
*/

// ─── Indoor sports — weather never applies ────────────────────────

const INDOOR_SPORTS = new Set([
  "basketball_nba", "basketball_ncaab", "basketball",
  "nba", "ncaab", "icehockey_nhl", "nhl",
  "mma_mixed_martial_arts", "mma",
]);

export function isIndoorSport(sport: string): boolean {
  const s = sport.toLowerCase();
  return INDOOR_SPORTS.has(s) || s.includes("basketball") || s.includes("hockey");
}

// ─── Types ───────────────────────────────────────────────────────

export interface WeatherContext {
  city: string;
  tempF: number;
  windMph: number;
  precipitationInch: number;
  condition: string;
  isSevere: boolean;
  applicable: boolean;   // false for indoor sports
  source: "live" | "unavailable" | "inactive";
}

export interface WeatherAdjustment {
  value: number;               // probability shift, clamped ±0.04
  confidenceReduction: number;
  favorUnder: boolean;
  explanation: string;
  source: "live" | "unavailable" | "inactive";
}

// ─── Public functions ─────────────────────────────────────────────

/** Get weather context for a game */
export async function getWeatherContext(homeTeam: string, sport: string): Promise<WeatherContext> {
  if (isIndoorSport(sport)) {
    return {
      city: "N/A", tempF: 70, windMph: 0, precipitationInch: 0,
      condition: "indoor", isSevere: false, applicable: false, source: "inactive",
    };
  }

  // TODO: Wire live weather source for outdoor sports
  // Example: const data = await fetch(`https://wttr.in/${city}?format=j1`);
  return {
    city: "N/A", tempF: 65, windMph: 5, precipitationInch: 0,
    condition: "clear", isSevere: false, applicable: true, source: "unavailable",
  };
}

/**
 * Calculate weather adjustment.
 * Returns zero for indoor sports (NBA) — no API call made.
 * Clamped to ±0.04.
 */
export async function getWeatherAdjustment(homeTeam: string, sport: string): Promise<WeatherAdjustment> {
  if (isIndoorSport(sport)) {
    return {
      value: 0, confidenceReduction: 0, favorUnder: false,
      explanation: "Inactive for indoor sport (NBA)",
      source: "inactive",
    };
  }

  const ctx = await getWeatherContext(homeTeam, sport);
  if (!ctx.applicable || ctx.source === "unavailable") {
    return {
      value: 0, confidenceReduction: 0, favorUnder: false,
      explanation: "Weather source unavailable — no adjustment applied",
      source: "unavailable",
    };
  }

  // Live weather logic (activated when ENABLE_WEATHER=true and source is wired)
  let value = 0;
  let confidenceReduction = 0;
  const parts: string[] = [];

  if (ctx.windMph > 25) {
    value -= 0.02; confidenceReduction += 0.04;
    parts.push(`Strong wind (${ctx.windMph}mph)`);
  }
  if (ctx.condition === "snow") {
    value -= 0.03; confidenceReduction += 0.06;
    parts.push("Snow conditions");
  } else if (ctx.condition === "rain" || ctx.condition === "storm") {
    value -= 0.02; confidenceReduction += 0.04;
    parts.push("Rain/storm conditions");
  }
  if (ctx.tempF < 20) {
    value -= 0.015; confidenceReduction += 0.03;
    parts.push(`Extreme cold (${ctx.tempF}°F)`);
  }

  return {
    value: Math.max(-0.04, Math.min(0.04, Math.round(value * 1000) / 1000)),
    confidenceReduction: Math.min(0.10, Math.round(confidenceReduction * 100) / 100),
    favorUnder: value < -0.015,
    explanation: parts.length > 0 ? parts.join("; ") : "Clear conditions — no adjustment",
    source: "live",
  };
}
