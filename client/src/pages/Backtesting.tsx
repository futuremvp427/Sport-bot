/*
  Backtesting — Strategy comparison with bankroll charts
  Design: Midnight Command — comparison table, area charts, glass cards
*/
import { useMockData } from "@/hooks/useMockData";
import { motion } from "framer-motion";
import { FlaskConical, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["oklch(0.765 0.177 163)", "oklch(0.585 0.233 277)", "oklch(0.712 0.194 13)"];

export default function Backtesting() {
  const { backtests } = useMockData();

  // Merge bankroll histories for chart
  const maxLen = Math.max(...backtests.map((b) => b.bankrollHistory.length));
  const chartData = Array.from({ length: maxLen }, (_, i) => {
    const point: Record<string, number> = { day: i + 1 };
    backtests.forEach((b) => {
      point[b.modelName] = Math.round(b.bankrollHistory[i] ?? b.bankrollHistory[b.bankrollHistory.length - 1]);
    });
    return point;
  });

  return (
    <div className="space-y-6">
      {/* Bankroll comparison chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Strategy Comparison — Bankroll Over Time</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              {backtests.map((b, i) => (
                <linearGradient key={b.id} id={`grad-${b.modelName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
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
              formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name.replace("_", " ")]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "oklch(0.65 0.02 260)" }}
              formatter={(value) => value.replace("_", " ")}
            />
            {backtests.map((b, i) => (
              <Area
                key={b.id}
                type="monotone"
                dataKey={b.modelName}
                stroke={COLORS[i]}
                strokeWidth={2}
                fill={`url(#grad-${b.modelName})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {backtests.map((bt, i) => {
          const isProfit = bt.roi > 0;
          return (
            <motion.div
              key={bt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.35 }}
              className={`glass-card p-5 ${isProfit ? "hover:border-profit/20" : "hover:border-loss/20"} transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{bt.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {bt.modelName.replace("_", " ")} · {bt.strategy.replace("_", " ")}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${isProfit ? "bg-profit/10" : "bg-loss/10"}`}>
                  {isProfit ? (
                    <TrendingUp className="w-4 h-4 text-profit" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-loss" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">ROI</span>
                  <span className={`data-value text-sm font-bold ${isProfit ? "text-profit" : "text-loss"}`}>
                    {bt.roi > 0 ? "+" : ""}{bt.roi}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Final Bankroll</span>
                  <span className="data-value text-sm font-semibold text-foreground">${bt.finalBankroll.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Hit Rate</span>
                  <span className="data-value text-sm text-foreground">{bt.hitRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Bets</span>
                  <span className="data-value text-sm text-foreground">{bt.totalBets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">W/L</span>
                  <span className="data-value text-sm text-foreground">
                    <span className="text-profit">{bt.winningBets}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-loss">{bt.losingBets}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Max Drawdown</span>
                  <span className="data-value text-sm text-loss">{bt.maxDrawdown}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Sharpe Ratio</span>
                  <span className={`data-value text-sm ${bt.sharpeRatio > 0 ? "text-profit" : "text-loss"}`}>
                    {bt.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Avg Edge</span>
                  <span className="data-value text-sm text-primary">{(bt.avgEdge * 100).toFixed(1)}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
