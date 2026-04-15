/*
  PlayerProps — PrizePicks player prop analysis
  Design: Midnight Command — prop cards with over/under picks
*/
import { useApiData } from "@/hooks/useApiData";
import { motion } from "framer-motion";
import { User, Zap, Filter, TrendingUp, Target } from "lucide-react";
import { useState, useMemo } from "react";

export default function PlayerProps() {
  const { playerProps: rawProps, isLoading } = useApiData();
  const playerProps = Array.isArray(rawProps) ? rawProps : [];
  const [sportFilter, setSportFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filtered = useMemo(() => {
    return playerProps.filter((p) => {
      if (sportFilter !== "all" && p.sport !== sportFilter) return false;
      if (platformFilter !== "all" && p.platform !== platformFilter) return false;
      return true;
    });
  }, [playerProps, sportFilter, platformFilter]);

  const avgEdge = filtered.length > 0 ? filtered.reduce((s, p) => s + p.edge, 0) / filtered.length : 0;
  const highConfCount = filtered.filter((p) => p.confidence > 0.15).length;

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
          { label: "Props Analyzed", value: filtered.length, icon: User, color: "text-[#c084fc]" },
          { label: "Avg Edge", value: `${(avgEdge * 100).toFixed(1)}%`, icon: TrendingUp, color: "text-profit" },
          { label: "High Confidence", value: highConfCount, icon: Target, color: "text-caution" },
          { label: "Platforms", value: "2 Active", icon: Zap, color: "text-primary" },
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

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>
        <div className="flex gap-1.5">
          {["all", "nba", "nfl", "mlb"].map((s) => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                sportFilter === s
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-accent text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {s === "all" ? "All Sports" : s.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {["all", "PrizePicks", "Caesars Sportsbook"].map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                platformFilter === p
                  ? p === "PrizePicks" ? "bg-[#2d1a4e]/80 text-[#c084fc] border border-[#6b3fa0]/40"
                  : p === "Caesars Sportsbook" ? "bg-[#0a3d2a]/80 text-[#4ade80] border border-[#1a6b45]/40"
                  : "bg-primary/20 text-primary border border-primary/30"
                  : "bg-accent text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {p === "all" ? "All" : p === "Caesars Sportsbook" ? "Caesars" : p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Props cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((prop, i) => (
          <motion.div
            key={prop.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.3 }}
            className={`glass-card p-4 hover:border-[#6b3fa0]/30 transition-all duration-300 ${
              prop.platform === "PrizePicks" ? "border-[#6b3fa0]/10" : "border-[#1a6b45]/10"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-foreground">{prop.playerName}</div>
                <div className="text-[10px] text-muted-foreground">{prop.team} · {prop.sport.toUpperCase()}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                prop.platform === "PrizePicks" ? "bg-[#2d1a4e]/60 text-[#c084fc]" : "bg-[#0a3d2a]/60 text-[#4ade80]"
              }`}>
                {prop.platform === "Caesars Sportsbook" ? "Caesars" : prop.platform}
              </span>
            </div>

            {/* Prop type and pick */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{prop.propType}</span>
              <span className={`text-sm font-bold px-3 py-1 rounded-md ${
                prop.pick === "OVER" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss"
              }`}>
                {prop.pick}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 rounded-md bg-accent/50">
                <div className="text-[10px] text-muted-foreground">Line</div>
                <div className="data-value text-sm font-bold text-foreground">{prop.line}</div>
              </div>
              <div className="text-center p-2 rounded-md bg-accent/50">
                <div className="text-[10px] text-muted-foreground">Predicted</div>
                <div className="data-value text-sm font-bold text-primary">{prop.predictedValue}</div>
              </div>
              <div className="text-center p-2 rounded-md bg-accent/50">
                <div className="text-[10px] text-muted-foreground">Edge</div>
                <div className="data-value text-sm font-bold text-profit">+{(prop.edge * 100).toFixed(1)}%</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Confidence</span>
                <span className="data-value text-[10px] font-semibold text-foreground">{(prop.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-accent overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${prop.confidence * 100}%` }}
                  transition={{ delay: 0.2 + 0.04 * i, duration: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#6b3fa0] to-[#c084fc]"
                />
              </div>
            </div>

            {/* Probabilities */}
            <div className="flex items-center justify-between mt-3 text-[10px]">
              <span className="text-muted-foreground">Over: <span className="data-value text-profit font-semibold">{(prop.overProb * 100).toFixed(1)}%</span></span>
              <span className="text-muted-foreground">Under: <span className="data-value text-loss font-semibold">{(prop.underProb * 100).toFixed(1)}%</span></span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
