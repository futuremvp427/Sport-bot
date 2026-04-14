/*
  Mock data hooks — provides realistic demo data for the dashboard.
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

// Helper to generate random data
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const TEAMS = {
  nba: [
    ["Los Angeles Lakers", "LAL"], ["Boston Celtics", "BOS"], ["Golden State Warriors", "GSW"],
    ["Milwaukee Bucks", "MIL"], ["Denver Nuggets", "DEN"], ["Phoenix Suns", "PHX"],
    ["Philadelphia 76ers", "PHI"], ["Miami Heat", "MIA"], ["Dallas Mavericks", "DAL"],
    ["Cleveland Cavaliers", "CLE"], ["Memphis Grizzlies", "MEM"], ["Sacramento Kings", "SAC"],
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

const SPORTSBOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "PointsBet", "BetRivers"];

function generateGames(count: number): Game[] {
  const games: Game[] = [];
  const sports = Object.keys(TEAMS) as (keyof typeof TEAMS)[];
  for (let i = 0; i < count; i++) {
    const sport = sports[i % sports.length];
    const teams = TEAMS[sport];
    const homeIdx = randInt(0, teams.length - 1);
    let awayIdx = randInt(0, teams.length - 1);
    while (awayIdx === homeIdx) awayIdx = randInt(0, teams.length - 1);
    const isFinished = Math.random() > 0.4;
    const date = new Date();
    date.setHours(date.getHours() + randInt(-48, 72));
    games.push({
      id: i + 1,
      sport,
      homeTeam: teams[homeIdx][0],
      awayTeam: teams[awayIdx][0],
      scheduledTime: date.toISOString(),
      status: isFinished ? "final" : "scheduled",
      homeScore: isFinished ? randInt(80, 130) : undefined,
      awayScore: isFinished ? randInt(80, 130) : undefined,
    });
  }
  return games;
}

function generatePredictions(games: Game[]): Prediction[] {
  return games.map((g, i) => {
    const homeProb = rand(0.3, 0.7);
    const confidence = Math.abs(homeProb - 0.5) * 2;
    const predictedWinner = homeProb > 0.5 ? g.homeTeam : g.awayTeam;
    let outcome: "correct" | "incorrect" | "pending" = "pending";
    if (g.status === "final" && g.homeScore !== undefined && g.awayScore !== undefined) {
      const actualWinner = g.homeScore > g.awayScore ? g.homeTeam : g.awayTeam;
      outcome = predictedWinner === actualWinner ? "correct" : "incorrect";
    }
    return {
      id: i + 1,
      gameId: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      sport: g.sport,
      predictedWinner,
      homeWinProb: homeProb,
      awayWinProb: 1 - homeProb,
      confidence,
      modelName: ["gradient_boosting", "random_forest", "logistic_regression"][i % 3],
      predictionTime: new Date().toISOString(),
      outcome,
    };
  });
}

function generateEdges(predictions: Prediction[]): Edge[] {
  const edges: Edge[] = [];
  predictions.forEach((p, i) => {
    if (p.confidence > 0.15) {
      const side = p.homeWinProb > 0.5 ? "home" : "away";
      const predictedProb = side === "home" ? p.homeWinProb : p.awayWinProb;
      const impliedProb = predictedProb - rand(0.02, 0.08);
      const decimalOdds = 1 / impliedProb;
      const americanOdds = decimalOdds >= 2 ? (decimalOdds - 1) * 100 : -100 / (decimalOdds - 1);
      const edge = predictedProb - impliedProb;
      const ev = (predictedProb * (decimalOdds - 1)) - ((1 - predictedProb));
      edges.push({
        id: i + 1,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        side,
        team: side === "home" ? p.homeTeam : p.awayTeam,
        odds: Math.round(americanOdds),
        decimalOdds: parseFloat(decimalOdds.toFixed(3)),
        impliedProb: parseFloat(impliedProb.toFixed(4)),
        predictedProb: parseFloat(predictedProb.toFixed(4)),
        edge: parseFloat(edge.toFixed(4)),
        expectedValue: parseFloat(ev.toFixed(4)),
        recommendedStake: parseFloat((rand(20, 150)).toFixed(2)),
        confidence: p.confidence,
        sportsbook: SPORTSBOOKS[randInt(0, SPORTSBOOKS.length - 1)],
      });
    }
  });
  return edges.sort((a, b) => b.edge - a.edge);
}

function generateArbitrage(): ArbitrageOpp[] {
  const opps: ArbitrageOpp[] = [];
  const count = randInt(1, 4);
  for (let i = 0; i < count; i++) {
    const teams = TEAMS.nba;
    const homeIdx = randInt(0, teams.length - 1);
    let awayIdx = randInt(0, teams.length - 1);
    while (awayIdx === homeIdx) awayIdx = randInt(0, teams.length - 1);
    const profitPct = rand(0.5, 3.5);
    const totalStake = 1000;
    opps.push({
      id: i + 1,
      homeTeam: teams[homeIdx][0],
      awayTeam: teams[awayIdx][0],
      sport: "nba",
      bookA: SPORTSBOOKS[randInt(0, 2)],
      bookB: SPORTSBOOKS[randInt(3, 5)],
      sideA: "home",
      sideB: "away",
      oddsA: randInt(110, 250),
      oddsB: randInt(-200, -110),
      profitPct: parseFloat(profitPct.toFixed(2)),
      stakeA: parseFloat((totalStake * rand(0.3, 0.7)).toFixed(2)),
      stakeB: parseFloat((totalStake * rand(0.3, 0.7)).toFixed(2)),
      guaranteedProfit: parseFloat((totalStake * profitPct / 100).toFixed(2)),
      status: "active",
      detectedTime: new Date().toISOString(),
    });
  }
  return opps;
}

function generateBacktests(): BacktestResult[] {
  return [
    {
      id: 1, name: "GB Value Betting", strategy: "value_betting", modelName: "gradient_boosting",
      sport: "nba", initialBankroll: 10000, finalBankroll: 12450, totalBets: 342,
      winningBets: 187, losingBets: 155, roi: 24.5, hitRate: 54.7, maxDrawdown: 8.3,
      sharpeRatio: 1.82, avgEdge: 0.042,
      bankrollHistory: Array.from({ length: 50 }, (_, i) => 10000 + (i * 50) + (Math.random() - 0.3) * 400),
    },
    {
      id: 2, name: "RF Conservative", strategy: "value_betting", modelName: "random_forest",
      sport: "nba", initialBankroll: 10000, finalBankroll: 11200, totalBets: 198,
      winningBets: 112, losingBets: 86, roi: 12.0, hitRate: 56.6, maxDrawdown: 5.1,
      sharpeRatio: 1.45, avgEdge: 0.035,
      bankrollHistory: Array.from({ length: 50 }, (_, i) => 10000 + (i * 25) + (Math.random() - 0.3) * 200),
    },
    {
      id: 3, name: "LR Baseline", strategy: "value_betting", modelName: "logistic_regression",
      sport: "nba", initialBankroll: 10000, finalBankroll: 9800, totalBets: 412,
      winningBets: 198, losingBets: 214, roi: -2.0, hitRate: 48.1, maxDrawdown: 12.5,
      sharpeRatio: -0.15, avgEdge: 0.018,
      bankrollHistory: Array.from({ length: 50 }, (_, i) => 10000 - (i * 4) + (Math.random() - 0.5) * 300),
    },
  ];
}

function generateModelMetrics(): ModelMetric[] {
  return [
    {
      modelName: "gradient_boosting", sport: "nba", accuracy: 0.587, precision: 0.602,
      recall: 0.571, f1: 0.586, rocAuc: 0.634, brierScore: 0.238, sampleSize: 1200,
      lastUpdated: new Date().toISOString(),
    },
    {
      modelName: "random_forest", sport: "nba", accuracy: 0.562, precision: 0.578,
      recall: 0.549, f1: 0.563, rocAuc: 0.612, brierScore: 0.245, sampleSize: 1200,
      lastUpdated: new Date().toISOString(),
    },
    {
      modelName: "logistic_regression", sport: "nba", accuracy: 0.531, precision: 0.542,
      recall: 0.518, f1: 0.530, rocAuc: 0.578, brierScore: 0.252, sampleSize: 1200,
      lastUpdated: new Date().toISOString(),
    },
  ];
}

export function useMockData() {
  const data = useMemo(() => {
    const games = generateGames(24);
    const predictions = generatePredictions(games);
    const edges = generateEdges(predictions);
    const arbitrage = generateArbitrage();
    const backtests = generateBacktests();
    const modelMetrics = generateModelMetrics();

    const totalPredictions = predictions.length;
    const correctPredictions = predictions.filter((p) => p.outcome === "correct").length;
    const pendingPredictions = predictions.filter((p) => p.outcome === "pending").length;
    const accuracy = totalPredictions - pendingPredictions > 0
      ? correctPredictions / (totalPredictions - pendingPredictions)
      : 0;

    return {
      games,
      predictions,
      edges,
      arbitrage,
      backtests,
      modelMetrics,
      summary: {
        totalGames: games.length,
        liveGames: games.filter((g) => g.status === "scheduled").length,
        totalPredictions,
        correctPredictions,
        pendingPredictions,
        accuracy,
        activeEdges: edges.length,
        totalEdgeValue: edges.reduce((s, e) => s + e.expectedValue, 0),
        arbitrageOpps: arbitrage.length,
        bankroll: 12450,
        bankrollChange: 2450,
        bankrollChangePct: 24.5,
        todayROI: 3.2,
        weekROI: 8.7,
        monthROI: 24.5,
      },
    };
  }, []);

  return data;
}
