/*
  Realistic mock data hooks — provides production-representative demo data.
  Accuracy targets: 55-60% (realistic for ML sports models).
  Primary platforms: Caesars Sportsbook, PrizePicks.
  In production, these would be replaced with real API calls.
*/
import { useState, useMemo } from "react";

// Types
export interface Game {
  id: number;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  scheduledTime: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

export interface Prediction {
  id: number;
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  predictedWinner: string;
  homeWinProb: number;
  awayWinProb: number;
  confidence: number;
  modelName: string;
  predictionTime: string;
  outcome?: "correct" | "incorrect" | "pending";
}

export interface Edge {
  id: number;
  homeTeam: string;
  awayTeam: string;
  side: string;
  team: string;
  odds: number;
  decimalOdds: number;
  impliedProb: number;
  predictedProb: number;
  edge: number;
  expectedValue: number;
  recommendedStake: number;
  confidence: number;
  sportsbook: string;
}

export interface ArbitrageOpp {
  id: number;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  bookA: string;
  bookB: string;
  sideA: string;
  sideB: string;
  oddsA: number;
  oddsB: number;
  profitPct: number;
  stakeA: number;
  stakeB: number;
  guaranteedProfit: number;
  status: string;
  detectedTime: string;
}

export interface PlayerProp {
  id: number;
  playerName: string;
  team: string;
  sport: string;
  propType: string;
  line: number;
  overProb: number;
  underProb: number;
  predictedValue: number;
  edge: number;
  pick: string;
  confidence: number;
  platform: string;
}

export interface BacktestResult {
  id: number;
  name: string;
  strategy: string;
  modelName: string;
  sport: string;
  initialBankroll: number;
  finalBankroll: number;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  roi: number;
  hitRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgEdge: number;
  bankrollHistory: number[];
}

export interface ModelMetric {
  modelName: string;
  sport: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
  brierScore: number;
  sampleSize: number;
  lastUpdated: string;
}

// Seeded random for deterministic results
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rng = seededRandom(42);
const rand = (min: number, max: number) => rng() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const TEAMS = {
  nba: [
    ["Los Angeles Lakers", "LAL"], ["Boston Celtics", "BOS"], ["Golden State Warriors", "GSW"],
    ["Milwaukee Bucks", "MIL"], ["Denver Nuggets", "DEN"], ["Phoenix Suns", "PHX"],
    ["Philadelphia 76ers", "PHI"], ["Miami Heat", "MIA"], ["Dallas Mavericks", "DAL"],
    ["Cleveland Cavaliers", "CLE"], ["Memphis Grizzlies", "MEM"], ["Sacramento Kings", "SAC"],
    ["New York Knicks", "NYK"], ["Oklahoma City Thunder", "OKC"],
  ],
  nfl: [
    ["Kansas City Chiefs", "KC"], ["San Francisco 49ers", "SF"], ["Philadelphia Eagles", "PHI"],
    ["Buffalo Bills", "BUF"], ["Dallas Cowboys", "DAL"], ["Baltimore Ravens", "BAL"],
    ["Detroit Lions", "DET"], ["Miami Dolphins", "MIA"],
  ],
  mlb: [
    ["New York Yankees", "NYY"], ["Los Angeles Dodgers", "LAD"], ["Houston Astros", "HOU"],
    ["Atlanta Braves", "ATL"], ["Texas Rangers", "TEX"], ["Baltimore Orioles", "BAL"],
  ],
};

// Primary platforms — Caesars and PrizePicks featured prominently
const SPORTSBOOKS = [
  "Caesars Sportsbook",
  "Caesars Sportsbook",
  "PrizePicks",
  "PrizePicks",
  "DraftKings",
  "FanDuel",
  "BetMGM",
];

const PLAYER_NAMES: Record<string, string[]> = {
  nba: [
    "LeBron James", "Jayson Tatum", "Stephen Curry", "Giannis Antetokounmpo",
    "Nikola Jokic", "Kevin Durant", "Luka Doncic", "Anthony Edwards",
    "Shai Gilgeous-Alexander", "Donovan Mitchell", "Ja Morant", "De'Aaron Fox",
    "Jalen Brunson", "Tyrese Haliburton", "Damian Lillard", "Devin Booker",
  ],
  nfl: [
    "Patrick Mahomes", "Josh Allen", "Jalen Hurts", "Lamar Jackson",
    "Dak Prescott", "Tua Tagovailoa", "Brock Purdy", "Jared Goff",
  ],
  mlb: [
    "Shohei Ohtani", "Aaron Judge", "Mookie Betts", "Ronald Acuna Jr.",
    "Corey Seager", "Gunnar Henderson", "Yordan Alvarez", "Freddie Freeman",
  ],
};

const PROP_TYPES: Record<string, { type: string; avgLine: number; stdDev: number }[]> = {
  nba: [
    { type: "Points", avgLine: 24.5, stdDev: 6 },
    { type: "Rebounds", avgLine: 8.5, stdDev: 3 },
    { type: "Assists", avgLine: 6.5, stdDev: 2.5 },
    { type: "Pts+Reb+Ast", avgLine: 38.5, stdDev: 8 },
    { type: "3-Pointers", avgLine: 2.5, stdDev: 1 },
  ],
  nfl: [
    { type: "Pass Yards", avgLine: 245.5, stdDev: 40 },
    { type: "Rush Yards", avgLine: 65.5, stdDev: 20 },
    { type: "Touchdowns", avgLine: 1.5, stdDev: 0.8 },
  ],
  mlb: [
    { type: "Hits", avgLine: 1.5, stdDev: 0.5 },
    { type: "RBIs", avgLine: 1.5, stdDev: 0.7 },
    { type: "Strikeouts (P)", avgLine: 6.5, stdDev: 2 },
  ],
};

function generateGames(count: number): Game[] {
  const games: Game[] = [];
  const sports = Object.keys(TEAMS) as (keyof typeof TEAMS)[];
  for (let i = 0; i < count; i++) {
    const sport = sports[i % sports.length];
    const teams = TEAMS[sport];
    const homeIdx = randInt(0, teams.length - 1);
    let awayIdx = randInt(0, teams.length - 1);
    while (awayIdx === homeIdx) awayIdx = randInt(0, teams.length - 1);
    const isFinished = i < count * 0.6; // 60% finished for accuracy calculation
    const date = new Date();
    date.setHours(date.getHours() + (isFinished ? -randInt(1, 72) : randInt(1, 72)));
    games.push({
      id: i + 1,
      sport,
      homeTeam: teams[homeIdx][0],
      awayTeam: teams[awayIdx][0],
      scheduledTime: date.toISOString(),
      status: isFinished ? "final" : "scheduled",
      homeScore: isFinished ? (sport === "nba" ? randInt(95, 125) : sport === "nfl" ? randInt(14, 35) : randInt(2, 8)) : undefined,
      awayScore: isFinished ? (sport === "nba" ? randInt(90, 120) : sport === "nfl" ? randInt(10, 31) : randInt(1, 7)) : undefined,
    });
  }
  return games;
}

/**
 * Generate predictions with GUARANTEED realistic accuracy (57-60%).
 * Instead of relying on RNG probability (which varies with seed),
 * we deterministically assign correct/incorrect outcomes to hit the target.
 */
function generatePredictions(games: Game[]): Prediction[] {
  const models = ["gradient_boosting", "random_forest", "logistic_regression"];

  // Separate finished and pending games
  const finishedGames = games.filter((g) => g.status === "final" && g.homeScore !== undefined && g.awayScore !== undefined);
  const totalFinished = finishedGames.length;
  const targetCorrect = Math.round(totalFinished * 0.579); // 57.9% accuracy — matches GB model

  // Build a deterministic correct/incorrect assignment for finished games
  // Spread correct predictions across the list (not all at start)
  const correctIndices = new Set<number>();
  const step = totalFinished / targetCorrect;
  for (let i = 0; i < targetCorrect; i++) {
    correctIndices.add(Math.min(Math.floor(i * step), totalFinished - 1));
  }
  // If we're short due to rounding, add more
  let idx = 0;
  while (correctIndices.size < targetCorrect && idx < totalFinished) {
    correctIndices.add(idx);
    idx++;
  }

  let finishedIdx = 0;

  return games.map((g, i) => {
    const modelName = models[i % models.length];
    let homeProb: number;
    let outcome: "correct" | "incorrect" | "pending" = "pending";

    if (g.status === "final" && g.homeScore !== undefined && g.awayScore !== undefined) {
      const homeWon = g.homeScore > g.awayScore;
      const isCorrect = correctIndices.has(finishedIdx);
      finishedIdx++;

      if (isCorrect) {
        homeProb = homeWon ? rand(0.54, 0.72) : rand(0.28, 0.46);
        outcome = "correct";
      } else {
        homeProb = homeWon ? rand(0.28, 0.46) : rand(0.54, 0.72);
        outcome = "incorrect";
      }
    } else {
      homeProb = rand(0.35, 0.65);
    }

    const predictedWinner = homeProb > 0.5 ? g.homeTeam : g.awayTeam;
    const confidence = Math.abs(homeProb - 0.5) * 2;

    return {
      id: i + 1,
      gameId: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      sport: g.sport,
      predictedWinner,
      homeWinProb: parseFloat(homeProb.toFixed(4)),
      awayWinProb: parseFloat((1 - homeProb).toFixed(4)),
      confidence: parseFloat(confidence.toFixed(4)),
      modelName,
      predictionTime: new Date(Date.now() - randInt(0, 86400000)).toISOString(),
      outcome,
    };
  });
}

function generateEdges(predictions: Prediction[]): Edge[] {
  const edges: Edge[] = [];
  predictions.forEach((p, i) => {
    if (p.confidence > 0.08 && p.outcome !== "incorrect") {
      const side = p.homeWinProb > 0.5 ? "home" : "away";
      const predictedProb = side === "home" ? p.homeWinProb : p.awayWinProb;
      const edgeSize = rand(0.025, 0.075); // 2.5% to 7.5% edge
      const impliedProb = predictedProb - edgeSize;
      if (impliedProb < 0.25) return; // skip unrealistic
      const decimalOdds = 1 / impliedProb;
      const americanOdds = decimalOdds >= 2 ? Math.round((decimalOdds - 1) * 100) : Math.round(-100 / (decimalOdds - 1));
      const ev = (predictedProb * (decimalOdds - 1)) - (1 - predictedProb);
      // Kelly fraction: (p * b - q) / b where b = decimal - 1, p = predicted, q = 1-p
      const b = decimalOdds - 1;
      const kellyFull = (predictedProb * b - (1 - predictedProb)) / b;
      const kellyStake = Math.max(0, kellyFull * 0.25 * 10000); // quarter Kelly on $10k bankroll

      edges.push({
        id: edges.length + 1,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        side,
        team: side === "home" ? p.homeTeam : p.awayTeam,
        odds: americanOdds,
        decimalOdds: parseFloat(decimalOdds.toFixed(3)),
        impliedProb: parseFloat(impliedProb.toFixed(4)),
        predictedProb: parseFloat(predictedProb.toFixed(4)),
        edge: parseFloat(edgeSize.toFixed(4)),
        expectedValue: parseFloat(ev.toFixed(4)),
        recommendedStake: parseFloat(Math.min(kellyStake, 500).toFixed(2)),
        confidence: p.confidence,
        sportsbook: SPORTSBOOKS[randInt(0, SPORTSBOOKS.length - 1)],
      });
    }
  });
  return edges.sort((a, b) => b.edge - a.edge);
}

function generateArbitrage(): ArbitrageOpp[] {
  const opps: ArbitrageOpp[] = [];
  // Realistic: 2-4 arb opportunities at any given time
  const scenarios = [
    {
      home: "Denver Nuggets", away: "Phoenix Suns",
      bookA: "Caesars Sportsbook", bookB: "DraftKings",
      oddsA: 185, oddsB: -165, profit: 1.8,
    },
    {
      home: "Boston Celtics", away: "Milwaukee Bucks",
      bookA: "PrizePicks", bookB: "Caesars Sportsbook",
      oddsA: 155, oddsB: -135, profit: 2.3,
    },
    {
      home: "Golden State Warriors", away: "Dallas Mavericks",
      bookA: "Caesars Sportsbook", bookB: "FanDuel",
      oddsA: 210, oddsB: -180, profit: 1.5,
    },
  ];

  scenarios.forEach((s, i) => {
    const totalStake = 1000;
    const stakeA = parseFloat((totalStake * rand(0.35, 0.55)).toFixed(2));
    const stakeB = parseFloat((totalStake - stakeA).toFixed(2));
    opps.push({
      id: i + 1,
      homeTeam: s.home,
      awayTeam: s.away,
      sport: "nba",
      bookA: s.bookA,
      bookB: s.bookB,
      sideA: "home",
      sideB: "away",
      oddsA: s.oddsA,
      oddsB: s.oddsB,
      profitPct: s.profit,
      stakeA,
      stakeB,
      guaranteedProfit: parseFloat((totalStake * s.profit / 100).toFixed(2)),
      status: "active",
      detectedTime: new Date(Date.now() - randInt(0, 3600000)).toISOString(),
    });
  });
  return opps;
}

function generatePlayerProps(): PlayerProp[] {
  const props: PlayerProp[] = [];
  const sports = ["nba", "nfl", "mlb"] as const;

  sports.forEach((sport) => {
    const players = PLAYER_NAMES[sport];
    const propTypes = PROP_TYPES[sport];
    const teams = TEAMS[sport];

    players.slice(0, 6).forEach((player, pi) => {
      const propType = propTypes[pi % propTypes.length];
      const line = parseFloat((propType.avgLine + rand(-propType.stdDev, propType.stdDev)).toFixed(1));
      const predictedValue = parseFloat((line + rand(-propType.stdDev * 0.6, propType.stdDev * 0.6)).toFixed(1));
      const overProb = predictedValue > line ? rand(0.52, 0.68) : rand(0.32, 0.48);
      const edge = Math.abs(overProb - 0.5) * rand(0.8, 1.2);
      const pick = overProb > 0.5 ? "OVER" : "UNDER";

      props.push({
        id: props.length + 1,
        playerName: player,
        team: teams[pi % teams.length][0],
        sport,
        propType: propType.type,
        line,
        overProb: parseFloat(overProb.toFixed(4)),
        underProb: parseFloat((1 - overProb).toFixed(4)),
        predictedValue,
        edge: parseFloat(edge.toFixed(4)),
        pick,
        confidence: parseFloat((Math.abs(overProb - 0.5) * 2).toFixed(4)),
        platform: pi % 2 === 0 ? "PrizePicks" : "Caesars Sportsbook",
      });
    });
  });

  return props.sort((a, b) => b.edge - a.edge);
}

function generateBacktests(): BacktestResult[] {
  // Realistic backtest results reflecting actual model performance
  const genHistory = (initial: number, dailyReturn: number, volatility: number, days: number) => {
    const history: number[] = [initial];
    for (let i = 1; i < days; i++) {
      const prev = history[i - 1];
      const change = prev * (dailyReturn + (rng() - 0.5) * volatility);
      history.push(parseFloat(Math.max(prev * 0.85, prev + change).toFixed(2)));
    }
    return history;
  };

  return [
    {
      id: 1, name: "GB Sharp Value", strategy: "value_betting", modelName: "gradient_boosting",
      sport: "nba", initialBankroll: 10000, finalBankroll: 13240, totalBets: 487,
      winningBets: 282, losingBets: 205, roi: 32.4, hitRate: 57.9, maxDrawdown: 7.2,
      sharpeRatio: 2.14, avgEdge: 0.048,
      bankrollHistory: genHistory(10000, 0.0018, 0.012, 60),
    },
    {
      id: 2, name: "RF Conservative", strategy: "value_betting", modelName: "random_forest",
      sport: "nba", initialBankroll: 10000, finalBankroll: 11850, totalBets: 312,
      winningBets: 178, losingBets: 134, roi: 18.5, hitRate: 57.1, maxDrawdown: 5.8,
      sharpeRatio: 1.67, avgEdge: 0.039,
      bankrollHistory: genHistory(10000, 0.0012, 0.008, 60),
    },
    {
      id: 3, name: "LR Baseline", strategy: "value_betting", modelName: "logistic_regression",
      sport: "nba", initialBankroll: 10000, finalBankroll: 10420, totalBets: 523,
      winningBets: 283, losingBets: 240, roi: 4.2, hitRate: 54.1, maxDrawdown: 9.4,
      sharpeRatio: 0.52, avgEdge: 0.022,
      bankrollHistory: genHistory(10000, 0.0003, 0.015, 60),
    },
  ];
}

function generateModelMetrics(): ModelMetric[] {
  // Realistic ML metrics for sports prediction models
  return [
    {
      modelName: "gradient_boosting", sport: "nba", accuracy: 0.579, precision: 0.594,
      recall: 0.568, f1: 0.581, rocAuc: 0.628, brierScore: 0.237, sampleSize: 2840,
      lastUpdated: new Date().toISOString(),
    },
    {
      modelName: "random_forest", sport: "nba", accuracy: 0.571, precision: 0.582,
      recall: 0.559, f1: 0.570, rocAuc: 0.618, brierScore: 0.241, sampleSize: 2840,
      lastUpdated: new Date().toISOString(),
    },
    {
      modelName: "logistic_regression", sport: "nba", accuracy: 0.541, precision: 0.553,
      recall: 0.531, f1: 0.542, rocAuc: 0.589, brierScore: 0.249, sampleSize: 2840,
      lastUpdated: new Date().toISOString(),
    },
  ];
}

export function useMockData() {
  const data = useMemo(() => {
    const games = generateGames(31);
    const predictions = generatePredictions(games);
    const edges = generateEdges(predictions);
    const arbitrage = generateArbitrage();
    const playerProps = generatePlayerProps();
    const backtests = generateBacktests();
    const modelMetrics = generateModelMetrics();

    const resolvedPredictions = predictions.filter((p) => p.outcome !== "pending");
    const correctPredictions = predictions.filter((p) => p.outcome === "correct").length;
    const pendingPredictions = predictions.filter((p) => p.outcome === "pending").length;
    const accuracy = resolvedPredictions.length > 0
      ? correctPredictions / resolvedPredictions.length
      : 0;

    // Best backtest for bankroll display
    const bestBacktest = backtests[0];

    return {
      games,
      predictions,
      edges,
      arbitrage,
      playerProps,
      backtests,
      modelMetrics,
      summary: {
        totalGames: games.length,
        liveGames: games.filter((g) => g.status === "scheduled").length,
        totalPredictions: predictions.length,
        correctPredictions,
        pendingPredictions,
        resolvedPredictions: resolvedPredictions.length,
        accuracy,
        activeEdges: edges.length,
        totalEdgeValue: edges.reduce((s, e) => s + e.expectedValue, 0),
        arbitrageOpps: arbitrage.length,
        playerPropsCount: playerProps.length,
        bankroll: bestBacktest.finalBankroll,
        bankrollChange: bestBacktest.finalBankroll - bestBacktest.initialBankroll,
        bankrollChangePct: bestBacktest.roi,
        todayROI: 2.8,
        weekROI: 7.4,
        monthROI: bestBacktest.roi,
        primaryPlatforms: ["Caesars Sportsbook", "PrizePicks"],
      },
    };
  }, []);

  return data;
}
