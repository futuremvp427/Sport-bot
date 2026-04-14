/*
  Predictions — Full predictions table with filters
  Design: Midnight Command — glass cards, data tables, status badges
*/
import { useState, useMemo } from "react";
import { useMockData } from "@/hooks/useMockData";
import { motion } from "framer-motion";
import { Brain, Filter, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Predictions() {
  const { predictions } = useMockData();
  const [sportFilter, setSportFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const filtered = useMemo(() => {
    return predictions.filter((p) => {
      if (sportFilter !== "all" && p.sport !== sportFilter) return false;
      if (outcomeFilter !== "all" && p.outcome !== outcomeFilter) return false;
      return true;
    });
  }, [predictions, sportFilter, outcomeFilter]);

  const stats = useMemo(() => {
    const resolved = predictions.filter((p) => p.outcome !== "pending");
    const correct = predictions.filter((p) => p.outcome === "correct").length;
    return {
      total: predictions.length,
      pending: predictions.filter((p) => p.outcome === "pending").length,
      correct,
      incorrect: predictions.filter((p) => p.outcome === "incorrect").length,
      accuracy: resolved.length > 0 ? correct / resolved.length : 0,
    };
  }, [predictions]);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-caution" },
          { label: "Correct", value: stats.correct, color: "text-profit" },
          { label: "Incorrect", value: stats.incorrect, color: "text-loss" },
          { label: "Accuracy", value: `${(stats.accuracy * 100).toFixed(1)}%`, color: stats.accuracy > 0.52 ? "text-profit" : "text-loss" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="glass-card p-4 text-center"
          >
            <div className={`data-value text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
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
          {["all", "correct", "incorrect", "pending"].map((o) => (
            <button
              key={o}
              onClick={() => setOutcomeFilter(o)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                outcomeFilter === o
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-accent text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {o === "all" ? "All" : o.charAt(0).toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="glass-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/30">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Matchup</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Sport</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Pick</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Home %</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Away %</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground font-medium">Confidence</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground font-medium">Model</th>
                <th className="text-center py-3 px-4 text-xs text-muted-foreground font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pred, i) => (
                <motion.tr
                  key={pred.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.02 * i }}
                  className="border-b border-border/40 hover:bg-accent/20 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground text-xs">{pred.homeTeam}</div>
                    <div className="text-muted-foreground text-[11px]">vs {pred.awayTeam}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent text-muted-foreground uppercase">
                      {pred.sport}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground text-xs">{pred.predictedWinner}</td>
                  <td className="py-3 px-4 text-right data-value text-xs">
                    {(pred.homeWinProb * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right data-value text-xs">
                    {(pred.awayWinProb * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-accent overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pred.confidence * 100}%` }}
                        />
                      </div>
                      <span className="data-value text-xs text-foreground">{(pred.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{pred.modelName.replace("_", " ")}</td>
                  <td className="py-3 px-4 text-center">
                    {pred.outcome === "correct" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-profit/15 text-profit text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> WIN
                      </span>
                    )}
                    {pred.outcome === "incorrect" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-loss/15 text-loss text-[10px] font-semibold">
                        <XCircle className="w-3 h-3" /> LOSS
                      </span>
                    )}
                    {pred.outcome === "pending" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold">
                        <Clock className="w-3 h-3" /> PENDING
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
