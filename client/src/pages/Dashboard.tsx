/*
  Dashboard — Main overview page
  Design: Midnight Command — KPI row, recent edges, predictions, bankroll chart
*/
import { useMockData } from "@/hooks/useMockData";
import KpiCard from "@/components/KpiCard";
import {
  LayoutDashboard,
  Brain,
  TrendingUp,
  ArrowLeftRight,
  Wallet,
  Target,
  Activity,
  Zap,
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

export default function Dashboard() {
  const { summary, edges, predictions, backtests, arbitrage } = useMockData();

  // Bankroll chart data
  const bestBacktest = backtests[0];
  const bankrollData = bestBacktest.bankrollHistory.map((val, i) => ({
    day: i + 1,
    value: Math.round(val),
  }));

  // Recent predictions for table
  const recentPreds = predictions.slice(0, 8);

  // Edge distribution
  const edgeBuckets = [
    { range: "2-3%", count: edges.filter((e) => e.edge >= 0.02 && e.edge < 0.03).length },
    { range: "3-4%", count: edges.filter((e) => e.edge >= 0.03 && e.edge < 0.04).length },
    { range: "4-5%", count: edges.filter((e) => e.edge >= 0.04 && e.edge < 0.05).length },
    { range: "5-6%", count: edges.filter((e) => e.edge >= 0.05 && e.edge < 0.06).length },
    { range: "6%+", count: edges.filter((e) => e.edge >= 0.06).length },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-xl overflow-hidden h-40 lg:h-48"
      >
        <img
          src={HERO_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center h-full px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-1">
            Command Center
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Real-time sports betting intelligence with ML predictions, edge detection, and arbitrage scanning.
          </p>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Bankroll"
          value={`$${summary.bankroll.toLocaleString()}`}
          change={`+${summary.bankrollChangePct}%`}
          changeType="profit"
          icon={Wallet}
          delay={0}
        />
        <KpiCard
          label="Active Edges"
          value={summary.activeEdges}
          change={`${edges.length} found`}
          changeType="profit"
          icon={TrendingUp}
          delay={0.05}
        />
        <KpiCard
          label="Model Accuracy"
          value={`${(summary.accuracy * 100).toFixed(1)}%`}
          change={`${summary.correctPredictions}/${summary.totalPredictions - summary.pendingPredictions}`}
          changeType={summary.accuracy > 0.52 ? "profit" : "loss"}
          icon={Target}
          delay={0.1}
        />
        <KpiCard
          label="Arbitrage Opps"
          value={summary.arbitrageOpps}
          change="Live"
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
              <p className="text-xs text-muted-foreground mt-0.5">Best backtest: {bestBacktest.name}</p>
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
                contentStyle={{
                  background: "oklch(0.17 0.015 260 / 95%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "oklch(0.93 0.005 260)",
                }}
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
          <p className="text-xs text-muted-foreground mb-4">{edges.length} value bets found</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={edgeBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.17 0.015 260 / 95%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "oklch(0.93 0.005 260)",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {edgeBuckets.map((_, i) => (
                  <Cell key={i} fill={`oklch(${0.585 + i * 0.04} 0.233 277)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Edges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-caution" />
            <h3 className="text-sm font-semibold text-foreground">Top Value Bets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Team</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Edge</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">EV</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Stake</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Book</th>
                </tr>
              </thead>
              <tbody>
                {edges.slice(0, 6).map((edge) => (
                  <tr key={edge.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 px-2 font-medium text-foreground">{edge.team}</td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="data-value text-profit font-semibold">
                        +{(edge.edge * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="data-value text-profit">
                        +{(edge.expectedValue * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right data-value text-foreground">
                      ${edge.recommendedStake.toFixed(0)}
                    </td>
                    <td className="py-2.5 px-2 text-muted-foreground">{edge.sportsbook}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Recent Predictions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recent Predictions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Matchup</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Prob</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Conf</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentPreds.map((pred) => (
                  <tr key={pred.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="py-2.5 px-2">
                      <div className="font-medium text-foreground">{pred.predictedWinner}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {pred.homeTeam} vs {pred.awayTeam}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right data-value text-foreground">
                      {(Math.max(pred.homeWinProb, pred.awayWinProb) * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right data-value text-foreground">
                      {(pred.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          pred.outcome === "correct"
                            ? "bg-profit/15 text-profit"
                            : pred.outcome === "incorrect"
                            ? "bg-loss/15 text-loss"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pred.outcome === "correct" ? "WIN" : pred.outcome === "incorrect" ? "LOSS" : "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Arbitrage Alerts */}
      {arbitrage.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
          className="glass-card p-5 border-caution/20 glow-primary"
        >
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="w-4 h-4 text-caution" />
            <h3 className="text-sm font-semibold text-foreground">Live Arbitrage Opportunities</h3>
            <span className="ml-auto text-xs text-muted-foreground">{arbitrage.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {arbitrage.map((arb) => (
              <div key={arb.id} className="p-3 rounded-lg bg-accent/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">
                    {arb.homeTeam} vs {arb.awayTeam}
                  </span>
                  <span className="data-value text-xs font-bold text-profit">
                    +{arb.profitPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{arb.bookA} / {arb.bookB}</span>
                  <span className="data-value text-profit">${arb.guaranteedProfit} profit</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
