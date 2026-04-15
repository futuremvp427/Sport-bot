/*
  featureFlags.ts — Central feature flag config for the prediction engine.
  
  Each layer can be toggled independently via environment variables.
  System runs gracefully if any layer is disabled or errors.
  
  Defaults:
  - ENABLE_HISTORICAL: true  (seeded model always available)
  - ENABLE_INJURIES:   true  (seeded model always available)
  - ENABLE_FATIGUE:    true  (seeded model always available)
  - ENABLE_WEATHER:    false (scaffold only — no live source for NBA)
  - ENABLE_EXPLAINABILITY: true
*/

function envBool(key: string, defaultVal: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultVal;
  return val.toLowerCase() === "true" || val === "1";
}

export const FEATURE_FLAGS = {
  /** Historical team form, H2H records, home/away splits */
  ENABLE_HISTORICAL: envBool("ENABLE_HISTORICAL", true),
  /** Injury / player availability impact */
  ENABLE_INJURIES: envBool("ENABLE_INJURIES", true),
  /** Schedule fatigue: back-to-backs, rest days, road trips */
  ENABLE_FATIGUE: envBool("ENABLE_FATIGUE", true),
  /** Weather impact — scaffold only, default OFF for NBA */
  ENABLE_WEATHER: envBool("ENABLE_WEATHER", false),
  /** Include structured explanation in each prediction */
  ENABLE_EXPLAINABILITY: envBool("ENABLE_EXPLAINABILITY", true),
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;

/** Return a human-readable summary of active layers */
export function getActiveLayers(): Record<string, string> {
  return {
    historical: FEATURE_FLAGS.ENABLE_HISTORICAL ? "on" : "off",
    injuries: FEATURE_FLAGS.ENABLE_INJURIES ? "on" : "off",
    fatigue: FEATURE_FLAGS.ENABLE_FATIGUE ? "on" : "off",
    weather: FEATURE_FLAGS.ENABLE_WEATHER ? "on" : "off (default for NBA)",
    explainability: FEATURE_FLAGS.ENABLE_EXPLAINABILITY ? "on" : "off",
  };
}
