/*
  Dashboard — Main overview page
  Uses live NBA odds from The Odds API via tRPC
  Falls back to mock data if API unavailable
*/
import { trpc } from "@/lib/trpc";
import { useApiData } from "@/hooks/useApiData";
import KpiCard from "@/components/KpiCard";
import {
  Brain,
  TrendingUp,
  ArrowLeftRight,
  Wallet,
  Target,
  Activity,
  Zap,
  User,
  Crown,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663553168574/jq6JZvoy9UgVnVwa8ZhTqu/hero-bg-e7vPbmkXtkqBdhBN2nwqmv.webp";

const SAFE_SUMMARY = { totalGames: 0, liveGames: 0, totalPredictions: 19, correctPredictions: 11, pendingPredictions: 3, resolvedPredictions: 19, accuracy: 0.579, activeEdges: 8, totalEdgeValue: 0, arbitrageOpps: 3, playerPropsCount: 20, bankroll: 12195, bankrollChange: 2195, bankrollChangePct: 21.95, todayROI: 2.8, weekROI: 7.4, monthROI: 21.95, primaryPlatforms: ["Caesars Sportsbook", "PrizePicks"] };

export default function Dashboard() {
  const { summary: rawSummary, edges: rawEdges, predictions: rawPredictions, backtests: rawBacktests, arbitrage: rawArbitrage, playerProps: rawPlayerProps, isLoading } = useApiData();
  // Bulletproof safety — prevents crashes from HMR stale state or undefined values
  const mockSummary = (rawSummary && typeof rawSummary === "object" && typeof rawSummary.bankroll === "number") ? rawSummary : SAFE_SUMMARY;
  const mockEdges = Array.isArray(rawEdges) ? rawEdges : [];
  const predictions = Array.isArray(rawPredictions) ? rawPredictions : [];
  const backtests = Array.isArray(rawBacktests) && rawBacktests.length > 0 ? rawBacktests : [{ name: "Value Betting", roi: 0, bankrollHistory: [10000] }];
  const arbitrage = Array.isArray(rawArbitrage) ? rawArbitrage : [];
  const playerProps = Array.isArray(rawPlayerProps) ? rawPlayerProps : [];

  // Live odds from The Odds API (hooks must be before any conditional returns)
  const { data: liveOdds, isLoading: oddsLoading } = trpc.odds.summary.useQuery(undefined, {
    refetchInterval: 120_000, // Respect 120s cache
    staleTime: 120_000,
  });

  const { data: liveGames } = trpc.odds.nba.useQuery(undefined, {
    refetchInterval: 120_000,
    staleTime: 120_000,
  });

  // Don't render until mock data is ready
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading live NBA data...</p>
        </div>
      </div>
    );
  }

  const isLive = liveOdds?.source === "live" || liveOdds?.source === "cache";
  const liveValueBets = liveGames?.games?.filter((g) => g.is_value_bet) ?? [];

  const bestBacktest = backtests[0] ?? { name: "Loading...", roi: 0, bankrollHistory: [10000] };
  const bankrollData = bestBacktest.bankrollHistory.map((val, i) => ({
    day: i + 1,
    value: Math.round(val),
  }));

  const recentPreds = predictions.slice(0, 8);

  // Use live data if available, otherwise fall back to mock
  const totalGames = liveOdds?.total_games ?? mockSummary.activeEdges;
  const valueBetCount = liveOdds?.value_bets ?? mockEdges.filter((e) => e.edge >= 0.03).length;
  const avgEdge = liveOdds?.avg_edge ?? 4.2;

  const edgeBuckets = liveValueBets.length > 0
    ? [
        { range: "2-3%", count: liveValueBets.filter((g) => Math.abs(g.edge ?? 0) >= 2 && Math.abs(g.edge ?? 0) < 3).length },
        { range: "3-4%", count: liveValueBets.filter((g) => Math.abs(g.edge ?? 0) >= 3 && Math.abs(g.edge ?? 0) < 4).length },
        { range: "4-5%", count: liveValueBets.filter((g) => Math.abs(g.edge ?? 0) >= 4 && Math.abs(g.edge ?? 0) < 5).length },
        { range: "5-6%", count: liveValueBets.filter((g) => Math.abs(g.edge ?? 0) >= 5 && Math.abs(g.edge ?? 0) < 6).length },
        { range: "6%+", count: liveValueBets.filter((g) => Math.abs(g.edge ?? 0) >= 6).length },
      ]
    : [
        { range: "2-3%", count: mockEdges.filter((e) => e.edge >= 0.02 && e.edge < 0.03).length },
        { range: "3-4%", count: mockEdges.filter((e) => e.edge >= 0.03 && e.edge < 0.04).length },
        { range: "4-5%", count: mockEdges.filter((e) => e.edge >= 0.04 && e.edge < 0.05).length },
        { range: "5-6%", count: mockEdges.filter((e) => e.edge >= 0.05 && e.edge < 0.06).length },
        { range: "6%+", count: mockEdges.filter((e) => e.edge >= 0.06).length },
      ];

  const prizePicksProps = playerProps.filter((p) => p.platform === "PrizePicks").slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-xl overflow-hidden h-40 lg:h-48"
      >
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center h-full px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-1">
            Command Center
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Real-time intelligence across Caesars Sportsbook &amp; PrizePicks with ML predictions, edge detection, and arbitrage.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0a3d2a]/80 border border-[#1a6b45]/40 text-xs font-semibold text-[#4ade80]">
              <Crown className="w-3 h-3" /> Caesars
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2d1a4e]/80 border border-[#6b3fa0]/40 text-xs font-semibold text-[#c084fc]">
              <Zap className="w-3 h-3" /> PrizePicks
            </span>
            {/* Live data indicator */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
              isLive
                ? "bg-profit/10 border border-profit/30 text-profit"
                : "bg-muted/30 border border-border text-muted-foreground"
            }`}>
              {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {oddsLoading ? "Loading..." : isLive ? `Live · ${totalGames} NBA games` : "Simulated Data"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Bankroll"
          value={`$${mockSummary.bankroll.toLocaleString()}`}
          change={`+${mockSummary.bankrollChangePct}%`}
          changeType="profit"
          icon={Wallet}
          delay={0}
        />
        <KpiCard
          label="Value Bets"
          value={valueBetCount}
          change={isLive ? `${liveOdds?.strong_edges ?? 0} strong edges` : `${mockEdges.filter((e) => e.edge >= 0.03).length} on Caesars`}
          changeType="profit"
          icon={TrendingUp}
          delay={0.05}
        />
        <KpiCard
          label="Model Accuracy"
          value={`${(mockSummary.accuracy * 100).toFixed(1)}%`}
          change={`${mockSummary.correctPredictions}/${mockSummary.resolvedPredictions}`}
          changeType={mockSummary.accuracy > 0.52 ? "profit" : "loss"}
          icon={Target}
          delay={0.1}
        />
        <KpiCard
          label="Avg Edge"
          value={`${avgEdge}%`}
          change={isLive ? "Live NBA odds" : "Simulated"}
          changeType="neutral"
          icon={ArrowLeftRight}
          delay={0.15}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bankroll Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="lg:col-span-2 glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Bankroll Progression</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Best strategy: {bestBacktest.name}</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-profit/10">
              <Activity className="w-3 h-3 text-profit" />
              <span className="text-xs font-medium text-profit data-value">+{bestBacktest.roi}% ROI</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={bankrollData}>
              <defs>
                <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.765 0.177 163)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.765 0.177 163)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Bankroll"]}
              />
              <Area type="monotone" dataKey="value" stroke="oklch(0.765 0.177 163)" strokeWidth={2} fill="url(#bankrollGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Edge Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-1">Edge Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">
            {isLive ? `${valueBetCount} live value bets` : `${mockEdges.length} value bets`}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={edgeBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {edgeBuckets.map((_, i) => (
                  <Cell key={i} fill={`oklch(${0.585 + i * 0.04} 0.233 277)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Live NBA Games from Odds API */}
      {isLive && liveGames && liveGames.games.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27, duration: 0.35 }}
          className="glass-card p-5 border-profit/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-4 h-4 text-profit" />
            <h3 className="text-sm font-semibold text-foreground">Live NBA Odds</h3>
            <span className="ml-auto text-xs text-muted-foreground">{liveGames.games.length} games · Cached 120s</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Matchup</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Caesars</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">DraftKings</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Best Odds</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Model Edge</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Signal</th>
                </tr>
              </thead>
              <tbody>
                {liveGames.games.slice(0, 7).map((game) => (
                  <tr key={game.id} className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${game.is_value_bet ? "bg-profit/5" : ""}`}>
                    <td className="py-2.5 px-2">
                      <div className="font-medium text-foreground">{game.away_team}</div>
                      <div className="text-muted-foreground">@ {game.home_team}</div>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {game.caesars_home_odds !== null ? (
                        <div>
                          <div className="data-value text-foreground">{game.caesars_home_odds > 0 ? `+${game.caesars_home_odds}` : game.caesars_home_odds}</div>
                          <div className="text-muted-foreground">{game.caesars_away_odds !== null ? (game.caesars_away_odds > 0 ? `+${game.caesars_away_odds}` : game.caesars_away_odds) : "—"}</div>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {game.draftkings_home_odds !== null ? (
                        <div>
                          <div className="data-value text-foreground">{game.draftkings_home_odds > 0 ? `+${game.draftkings_home_odds}` : game.draftkings_home_odds}</div>
                          <div className="text-muted-foreground">{game.draftkings_away_odds !== null ? (game.draftkings_away_odds > 0 ? `+${game.draftkings_away_odds}` : game.draftkings_away_odds) : "—"}</div>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="data-value font-semibold text-profit">
                        {game.best_home_odds !== null ? (game.best_home_odds > 0 ? `+${game.best_home_odds}` : game.best_home_odds) : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{game.best_home_book ?? ""}</div>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      {game.edge !== null ? (
                        <span className={`data-value font-bold ${Math.abs(game.edge) >= 5 ? "text-profit" : Math.abs(game.edge) >= 3 ? "text-caution" : "text-muted-foreground"}`}>
                          {game.edge > 0 ? "+" : ""}{game.edge}%
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        game.recommendation === "BET HOME" || game.recommendation === "BET AWAY"
                          ? "bg-profit/15 text-profit"
                          : game.recommendation.startsWith("LEAN")
                          ? "bg-caution/15 text-caution"
                          : "bg-muted/30 text-muted-foreground"
                      }`}>
                        {game.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {liveOdds?.credits_remaining && (
            <p className="text-[10px] text-muted-foreground mt-3">
              API credits remaining: {liveOdds.credits_remaining} · Data source: The Odds API
            </p>
          )}
        </motion.div>
      )}

      {/* PrizePicks Player Props */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.35 }}
        className="glass-card p-5 border-[#6b3fa0]/20"
      >
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[#c084fc]" />
          <h3 className="text-sm font-semibold text-foreground">PrizePicks — Top Player Props</h3>
          <span className="ml-auto text-xs text-muted-foreground">{playerProps.length} props analyzed</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {prizePicksProps.map((prop) => (
            <div key={prop.id} className="p-3 rounded-lg bg-accent/50 border border-border hover:border-[#6b3fa0]/30 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-foreground">{prop.playerName}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prop.pick === "OVER" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"}`}>
                  {prop.pick}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-2">{prop.propType} · {prop.sport.toUpperCase()}</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-muted-foreground">Line</div>
                  <div className="data-value text-xs font-semibold text-foreground">{prop.line}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Predicted</div>
                  <div className="data-value text-xs font-semibold text-primary">{prop.predictedValue}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">Edge</div>
                  <div className="data-value text-xs font-bold text-profit">+{(prop.edge * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
