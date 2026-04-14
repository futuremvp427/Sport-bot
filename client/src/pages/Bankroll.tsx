/*
  Bankroll — Bankroll tracking, P&L, and performance metrics
  Design: Midnight Command — area chart, KPI cards, transaction log
  Platforms: Caesars Sportsbook and PrizePicks
*/
import { useApiData } from "@/hooks/useApiData";
import KpiCard from "@/components/KpiCard";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Bankroll() {
  const { summary, backtests } = useApiData();

  const bestBacktest = backtests[0];
  const bankrollData = bestBacktest.bankrollHistory.map((val, i) => ({
    day: i + 1,
    value: Math.round(val),
  }));

  // Realistic transactions with Caesars and PrizePicks
  const transactions = [
    { id: 1, type: "win", team: "Lakers ML", amount: 285, odds: "+155", time: "2h ago", platform: "Caesars Sportsbook" },
    { id: 2, type: "win", team: "LeBron O25.5 Pts", amount: 200, odds: "-110", time: "3h ago", platform: "PrizePicks" },
    { id: 3, type: "loss", team: "Celtics ML", amount: -120, odds: "-130", time: "5h ago", platform: "Caesars Sportsbook" },
    { id: 4, type: "win", team: "Jokic O10.5 Reb", amount: 175, odds: "+105", time: "6h ago", platform: "PrizePicks" },
    { id: 5, type: "win", team: "Nuggets -3.5", amount: 220, odds: "-110", time: "8h ago", platform: "Caesars Sportsbook" },
    { id: 6, type: "loss", team: "Curry O28.5 Pts", amount: -100, odds: "-115", time: "10h ago", platform: "PrizePicks" },
    { id: 7, type: "win", team: "Thunder ML", amount: 340, odds: "+210", time: "1d ago", platform: "Caesars Sportsbook" },
    { id: 8, type: "loss", team: "Bucks -5.5", amount: -150, odds: "-110", time: "1d ago", platform: "Caesars Sportsbook" },
    { id: 9, type: "win", team: "Tatum O7.5 Ast", amount: 190, odds: "+120", time: "1d ago", platform: "PrizePicks" },
    { id: 10, type: "win", team: "Knicks ML", amount: 155, odds: "+135", time: "2d ago", platform: "Caesars Sportsbook" },
  ];

  const pieData = [
    { name: "Wins", value: bestBacktest.winningBets, color: "oklch(0.765 0.177 163)" },
    { name: "Losses", value: bestBacktest.losingBets, color: "oklch(0.712 0.194 13)" },
  ];

  // Platform breakdown
  const caesarsTxns = transactions.filter((t) => t.platform === "Caesars Sportsbook");
  const prizePicksTxns = transactions.filter((t) => t.platform === "PrizePicks");
  const caesarsProfit = caesarsTxns.reduce((s, t) => s + t.amount, 0);
  const prizePicksProfit = prizePicksTxns.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Current Bankroll"
          value={`$${summary.bankroll.toLocaleString()}`}
          change={`+$${summary.bankrollChange.toLocaleString()}`}
          changeType="profit"
          icon={Wallet}
          delay={0}
        />
        <KpiCard
          label="Total ROI"
          value={`+${summary.monthROI}%`}
          change="This month"
          changeType="profit"
          icon={TrendingUp}
          delay={0.05}
        />
        <KpiCard
          label="Max Drawdown"
          value={`${bestBacktest.maxDrawdown}%`}
          change="Peak to trough"
          changeType="loss"
          icon={TrendingDown}
          iconColor="text-loss"
          delay={0.1}
        />
        <KpiCard
          label="Sharpe Ratio"
          value={bestBacktest.sharpeRatio.toFixed(2)}
          change={bestBacktest.sharpeRatio > 1 ? "Strong" : "Moderate"}
          changeType={bestBacktest.sharpeRatio > 1 ? "profit" : "neutral"}
          icon={Activity}
          delay={0.15}
        />
      </div>

      {/* Platform P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="glass-card p-5 border-[#1a6b45]/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-[#4ade80]">♛ Caesars Sportsbook</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Recent P&L</div>
              <div className={`data-value text-xl font-bold ${caesarsProfit >= 0 ? "text-profit" : "text-loss"}`}>
                {caesarsProfit >= 0 ? "+" : ""}${caesarsProfit}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Bets</div>
              <div className="data-value text-xl font-bold text-foreground">{caesarsTxns.length}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="data-value text-xl font-bold text-profit">
                {((caesarsTxns.filter((t) => t.type === "win").length / caesarsTxns.length) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="glass-card p-5 border-[#6b3fa0]/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-[#c084fc]">⚡ PrizePicks</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Recent P&L</div>
              <div className={`data-value text-xl font-bold ${prizePicksProfit >= 0 ? "text-profit" : "text-loss"}`}>
                {prizePicksProfit >= 0 ? "+" : ""}${prizePicksProfit}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Bets</div>
              <div className="data-value text-xl font-bold text-foreground">{prizePicksTxns.length}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="data-value text-xl font-bold text-profit">
                {((prizePicksTxns.filter((t) => t.type === "win").length / prizePicksTxns.length) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="lg:col-span-2 glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Bankroll Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={bankrollData}>
              <defs>
                <linearGradient id="bankrollGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.585 0.233 277)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.585 0.233 277)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Bankroll"]}
              />
              <Area type="monotone" dataKey="value" stroke="oklch(0.585 0.233 277)" strokeWidth={2} fill="url(#bankrollGrad2)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Win/Loss Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.765 0.177 163)" }} />
              <span className="text-xs text-muted-foreground">Wins ({bestBacktest.winningBets})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.712 0.194 13)" }} />
              <span className="text-xs text-muted-foreground">Losses ({bestBacktest.losingBets})</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-caution" />
          <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
        </div>
        <div className="space-y-2">
          {transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38 + 0.03 * i }}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-md ${tx.type === "win" ? "bg-profit/15" : "bg-loss/15"}`}>
                  {tx.type === "win" ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-profit" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-loss" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">{tx.team}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span>{tx.odds}</span>
                    <span>·</span>
                    <span>{tx.time}</span>
                    <span>·</span>
                    <span className={`font-semibold ${
                      tx.platform === "Caesars Sportsbook" ? "text-[#4ade80]" : "text-[#c084fc]"
                    }`}>
                      {tx.platform === "Caesars Sportsbook" ? "Caesars" : "PrizePicks"}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`data-value text-sm font-bold ${tx.type === "win" ? "text-profit" : "text-loss"}`}>
                {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount)}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
