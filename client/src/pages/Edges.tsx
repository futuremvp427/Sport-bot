/*
  Edges — Value bet opportunities with edge, EV, and Kelly sizing
  Design: Midnight Command — glass cards, profit-colored data
  Platforms: Caesars Sportsbook and PrizePicks featured
*/
import { useApiData } from "@/hooks/useApiData";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Percent, Target, Crown } from "lucide-react";
import { useState, useMemo } from "react";

function PlatformBadge({ name }: { name: string }) {
  if (name === "Caesars Sportsbook") {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0a3d2a]/60 text-[#4ade80]">Caesars</span>;
  }
  if (name === "PrizePicks") {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2d1a4e]/60 text-[#c084fc]">PrizePicks</span>;
  }
  return <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-accent text-muted-foreground">{name}</span>;
}

export default function Edges() {
  const { edges: rawEdges, isLoading } = useApiData();
  const edges = Array.isArray(rawEdges) ? rawEdges : [];
  const [platformFilter, setPlatformFilter] = useState("all");

  const filtered = useMemo(() => {
    if (platformFilter === "all") return edges;
    return edges.filter((e) => e.sportsbook === platformFilter);
  }, [edges, platformFilter]);

  const totalEV = filtered.reduce((s, e) => s + e.expectedValue, 0);
  const avgEdge = filtered.length > 0 ? filtered.reduce((s, e) => s + e.edge, 0) / filtered.length : 0;
  const totalStake = filtered.reduce((s, e) => s + e.recommendedStake, 0);

  const platforms = ["all", "Caesars Sportsbook", "PrizePicks", "DraftKings", "FanDuel", "BetMGM"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Value Bets Found", value: filtered.length, icon: TrendingUp, color: "text-profit" },
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

      {/* Platform filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-2"
      >
        <Crown className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground mr-1">Platform:</span>
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setPlatformFilter(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              platformFilter === p
                ? p === "Caesars Sportsbook" ? "bg-[#0a3d2a]/80 text-[#4ade80] border border-[#1a6b45]/40"
                : p === "PrizePicks" ? "bg-[#2d1a4e]/80 text-[#c084fc] border border-[#6b3fa0]/40"
                : "bg-primary/20 text-primary border border-primary/30"
                : "bg-accent text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {p === "all" ? "All Platforms" : p === "Caesars Sportsbook" ? "Caesars" : p}
          </button>
        ))}
      </motion.div>

      {/* Edges cards */}
      <div className="space-y-3">
        {filtered.map((edge, i) => (
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
                  <PlatformBadge name={edge.sportsbook} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {edge.homeTeam} vs {edge.awayTeam}
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
