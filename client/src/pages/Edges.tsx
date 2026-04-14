/*
  Edges — Value bet opportunities with edge, EV, and Kelly sizing
  Design: Midnight Command — glass cards, profit-colored data
*/
import { useMockData } from "@/hooks/useMockData";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Percent, Target } from "lucide-react";

export default function Edges() {
  const { edges } = useMockData();

  const totalEV = edges.reduce((s, e) => s + e.expectedValue, 0);
  const avgEdge = edges.length > 0 ? edges.reduce((s, e) => s + e.edge, 0) / edges.length : 0;
  const totalStake = edges.reduce((s, e) => s + e.recommendedStake, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Value Bets Found", value: edges.length, icon: TrendingUp, color: "text-profit" },
          { label: "Avg Edge", value: `${(avgEdge * 100).toFixed(1)}%`, icon: Percent, color: "text-primary" },
          { label: "Total EV", value: `+${(totalEV * 100).toFixed(1)}%`, icon: Target, color: "text-profit" },
          { label: "Total Recommended", value: `$${totalStake.toFixed(0)}`, icon: DollarSign, color: "text-caution" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className={`data-value text-xl font-bold ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Edges cards */}
      <div className="space-y-3">
        {edges.map((edge, i) => (
          <motion.div
            key={edge.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            className="glass-card p-4 hover:border-profit/20 transition-all duration-300"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Team info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground">{edge.team}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary uppercase">
                    {edge.side}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {edge.homeTeam} vs {edge.awayTeam} · {edge.sportsbook}
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Edge</div>
                  <div className="data-value text-sm font-bold text-profit">+{(edge.edge * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">EV</div>
                  <div className="data-value text-sm font-bold text-profit">+{(edge.expectedValue * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Odds</div>
                  <div className="data-value text-sm font-semibold text-foreground">
                    {edge.odds > 0 ? `+${edge.odds}` : edge.odds}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Predicted</div>
                  <div className="data-value text-sm font-semibold text-foreground">{(edge.predictedProb * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Implied</div>
                  <div className="data-value text-sm font-semibold text-muted-foreground">{(edge.impliedProb * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Confidence</div>
                  <div className="data-value text-sm font-semibold text-foreground">{(edge.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Kelly Stake</div>
                  <div className="data-value text-sm font-bold text-caution">${edge.recommendedStake.toFixed(0)}</div>
                </div>
              </div>
            </div>

            {/* Edge bar */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-accent overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(edge.edge * 100 * 10, 100)}%` }}
                  transition={{ delay: 0.1 * i + 0.3, duration: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-profit"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
