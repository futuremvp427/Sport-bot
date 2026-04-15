/*
  injuryService.ts — Injury / player availability layer.
  
  Detects key players out/doubtful/questionable and assigns weighted impact.
  Uses a deterministic seeded model (no live source yet — scaffold ready).
  When a live source (ESPN, RotoWire, FantasyPros) is added, replace
  generateSeededReport() with the live fetch and keep the interface identical.
  
  Adjustment range: clamped to ±0.08 probability.
  Feature flag: ENABLE_INJURIES
*/

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> { data: T; timestamp: number; }
const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string): T | null {
  const e = cache[key] as CacheEntry<T> | undefined;
  if (!e || Date.now() - e.timestamp > CACHE_TTL_MS) return null;
  return e.data;
}
function setCache<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

// ─── Types ───────────────────────────────────────────────────────

export type InjuryStatus = "out" | "doubtful" | "questionable" | "probable";

export interface PlayerInjury {
  playerName: string;
  position: string;
  status: InjuryStatus;
  impactWeight: number;  // 0-1, star = 0.7+, role player = 0.2-0.4
}

export interface TeamInjuryReport {
  team: string;
  injuries: PlayerInjury[];
  totalImpact: number;    // 0-1
  keyPlayerOut: boolean;
  source: "live" | "seeded" | "unavailable";
}

export interface InjuryAdjustment {
  value: number;               // probability shift for home team, clamped ±0.08
  homeTeamImpact: number;      // negative = home team weakened
  awayTeamImpact: number;
  confidenceReduction: number; // 0-0.12
  explanation: string;
  source: "live" | "seeded" | "unavailable";
}

// ─── Star dependency by team (how much team relies on top players) ─
const STAR_DEPENDENCY: Record<string, number> = {
  "Oklahoma City Thunder": 0.55, "Boston Celtics": 0.65,
  "Cleveland Cavaliers": 0.60,  "Golden State Warriors": 0.70,
  "Los Angeles Lakers": 0.80,   "Denver Nuggets": 0.78,
  "Minnesota Timberwolves": 0.65,"Memphis Grizzlies": 0.70,
  "Houston Rockets": 0.50,      "Dallas Mavericks": 0.75,
  "New York Knicks": 0.60,      "Indiana Pacers": 0.60,
  "Milwaukee Bucks": 0.78,      "Miami Heat": 0.60,
  "Philadelphia 76ers": 0.75,   "Chicago Bulls": 0.55,
  "Atlanta Hawks": 0.65,        "Toronto Raptors": 0.50,
  "Orlando Magic": 0.55,        "Charlotte Hornets": 0.50,
  "Detroit Pistons": 0.50,      "Washington Wizards": 0.45,
  "Brooklyn Nets": 0.50,        "Sacramento Kings": 0.65,
  "Phoenix Suns": 0.75,         "Los Angeles Clippers": 0.65,
  "Portland Trail Blazers": 0.55,"Utah Jazz": 0.50,
  "New Orleans Pelicans": 0.65, "San Antonio Spurs": 0.50,
};

function getStarDependency(team: string): number {
  if (STAR_DEPENDENCY[team]) return STAR_DEPENDENCY[team];
  const last = team.split(" ").pop()!;
  for (const [k, v] of Object.entries(STAR_DEPENDENCY)) {
    if (k.endsWith(last)) return v;
  }
  return 0.60;
}

// ─── Deterministic seeded model ───────────────────────────────────

function generateSeededReport(team: string): TeamInjuryReport {
  const dep = getStarDependency(team);
  // Deterministic hash — no Math.random()
  const hash = team.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const bucket = hash % 100;

  const injuries: PlayerInjury[] = [];
  let totalImpact = 0;
  let keyPlayerOut = false;

  if (bucket >= 85) {
    // ~15% chance: star player out
    injuries.push({ playerName: "Star Player", position: "G/F", status: "out", impactWeight: dep });
    totalImpact += dep * 0.8;
    keyPlayerOut = true;
  } else if (bucket >= 72) {
    // ~13% chance: key player doubtful
    injuries.push({ playerName: "Key Player", position: "F", status: "doubtful", impactWeight: 0.45 });
    totalImpact += 0.45 * 0.5;
  } else if (bucket >= 58) {
    // ~14% chance: role player questionable
    injuries.push({ playerName: "Role Player", position: "F/C", status: "questionable", impactWeight: 0.25 });
    totalImpact += 0.25 * 0.25;
  }
  // ~58% chance: no significant injuries

  return {
    team,
    injuries,
    totalImpact: Math.round(totalImpact * 100) / 100,
    keyPlayerOut,
    source: "seeded",
  };
}

// ─── Public functions ─────────────────────────────────────────────

/** Get injury report for a team */
export async function getTeamInjuries(team: string): Promise<TeamInjuryReport> {
  const key = `injuries:${team}`;
  const cached = getCached<TeamInjuryReport>(key);
  if (cached) return cached;

  // TODO: Replace with live source (ESPN / RotoWire / FantasyPros) when available
  const report = generateSeededReport(team);
  setCache(key, report);
  return report;
}

/** Get numerical impact of injuries for a team (0-1) */
export async function getKeyPlayerImpact(team: string): Promise<number> {
  const report = await getTeamInjuries(team);
  return report.totalImpact;
}

/**
 * Calculate injury adjustment for a matchup.
 * Positive value = home team benefits (away team more injured).
 * Clamped to ±0.08.
 */
export async function getInjuryAdjustment(homeTeam: string, awayTeam: string): Promise<InjuryAdjustment> {
  const [hReport, aReport] = await Promise.all([
    getTeamInjuries(homeTeam),
    getTeamInjuries(awayTeam),
  ]);

  // Each team's impact is negative (they are weakened)
  const homeImpact = -(hReport.totalImpact * 0.08);
  const awayImpact = -(aReport.totalImpact * 0.08);
  // Net: positive = home team has less injury burden
  const net = Math.max(-0.08, Math.min(0.08, awayImpact - homeImpact));

  let confidenceReduction = 0;
  const parts: string[] = [];

  if (hReport.keyPlayerOut) {
    parts.push(`${homeTeam} missing key player`);
    confidenceReduction += 0.06;
  } else if (hReport.injuries.length > 0) {
    parts.push(`${homeTeam} has ${hReport.injuries.length} player(s) on injury report`);
    confidenceReduction += 0.02;
  }
  if (aReport.keyPlayerOut) {
    parts.push(`${awayTeam} missing key player`);
    confidenceReduction += 0.06;
  } else if (aReport.injuries.length > 0) {
    parts.push(`${awayTeam} has ${aReport.injuries.length} player(s) on injury report`);
    confidenceReduction += 0.02;
  }

  const source = hReport.source === "live" || aReport.source === "live" ? "live" : "seeded";

  return {
    value: Math.round(net * 1000) / 1000,
    homeTeamImpact: Math.round(homeImpact * 1000) / 1000,
    awayTeamImpact: Math.round(awayImpact * 1000) / 1000,
    confidenceReduction: Math.min(0.12, Math.round(confidenceReduction * 100) / 100),
    explanation: parts.length > 0 ? parts.join("; ") : "No significant injuries detected",
    source,
  };
}
