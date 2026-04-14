/*
  Bankroll — Bankroll tracking, P&L, and performance metrics
  Design: Midnight Command — area chart, KPI cards, transaction log
*/
import { useMockData } from "@/hooks/useMockData";
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
  const { summary, backtests, edges } = useMockData();

  const bestBacktest = backtests[0];
  const bankrollData = bestBacktest.bankrollHistory.map((val, i) => ({
    day: i + 1,
    value: Math.round(val),
  }));

  // Simulated recent transactions
  const transactions = [
    { id: 1, type: "win", team: "Lakers", amount: 245, odds: "+155", time: "2h ago" },
    { id: 2, type: "loss", team: "Celtics", amount: -100, odds: "-120", time: "4h ago" },
    { id: 3, type: "win", team: "Warriors", amount: 180, odds: "+130", time: "6h ago" },
    { id: 4, type: "win", team: "Nuggets", amount: 320, odds: "+210", time: "8h ago" },
    { id: 5, type: "loss", team: "Bucks", amount: -150, odds: "-140", time: "12h ago" },
    { id: 6, type: "win", team: "Suns", amount: 95, odds: "+105", time: "1d ago" },
    { id: 7, type: "loss", team: "76ers", amount: -80, odds: "-110", time: "1d ago" },
    { id: 8, type: "win", team: "Heat", amount: 410, odds: "+275", time: "2d ago" },
  ];

  // Pie chart data
  const pieData = [
    { name: "Wins", value: bestBacktest.winningBets, color: "oklch(0.765 0.177 163)" },
    { name: "Losses", value: bestBacktest.losingBets, color: "oklch(0.712 0.194 13)" },
  ];

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

      {/* Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bankroll Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
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
                contentStyle={{
                  background: "oklch(0.17 0.015 260 / 95%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "oklch(0.93 0.005 260)",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Bankroll"]}
              />
              <Area type="monotone" dataKey="value" stroke="oklch(0.585 0.233 277)" strokeWidth={2} fill="url(#bankrollGrad2)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Win/Loss Pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="glass-card p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Win/Loss Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "oklch(0.17 0.015 260 / 95%)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "oklch(0.93 0.005 260)",
                }}
              />
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
        transition={{ delay: 0.3, duration: 0.35 }}
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
              transition={{ delay: 0.35 + 0.03 * i }}
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
                  <div className="text-[10px] text-muted-foreground">{tx.odds} · {tx.time}</div>
                </div>
              </div>
              <span
                className={`data-value text-sm font-bold ${tx.type === "win" ? "text-profit" : "text-loss"}`}
              >
                {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount)}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
