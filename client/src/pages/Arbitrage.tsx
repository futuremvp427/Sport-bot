/*
  Arbitrage — Cross-book arbitrage opportunity scanner
  Design: Midnight Command — alert-style cards with profit highlighting
  Platforms: Caesars Sportsbook and PrizePicks featured
*/
import { useApiData } from "@/hooks/useApiData";
import { motion } from "framer-motion";
import { ArrowLeftRight, Shield, Clock, DollarSign } from "lucide-react";

function BookBadge({ name }: { name: string }) {
  if (name === "Caesars Sportsbook") {
    return <span className="font-bold text-[#4ade80]">Caesars</span>;
  }
  if (name === "PrizePicks") {
    return <span className="font-bold text-[#c084fc]">PrizePicks</span>;
  }
  return <span className="font-semibold text-foreground">{name}</span>;
}

export default function Arbitrage() {
  const { arbitrage: rawArbitrage, isLoading } = useApiData();
  const arbitrage = Array.isArray(rawArbitrage) ? rawArbitrage : [];

  const totalProfit = arbitrage.reduce((s, a) => s + a.guaranteedProfit, 0);
  const caesarsCount = arbitrage.filter((a) => a.bookA === "Caesars Sportsbook" || a.bookB === "Caesars Sportsbook").length;

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
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="w-4 h-4 text-caution" />
            <span className="text-xs text-muted-foreground">Active Opportunities</span>
          </div>
          <div className="data-value text-2xl font-bold text-caution">{arbitrage.length}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-profit" />
            <span className="text-xs text-muted-foreground">Total Guaranteed Profit</span>
          </div>
          <div className="data-value text-2xl font-bold text-profit">${totalProfit.toFixed(2)}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Risk Level</span>
          </div>
          <div className="text-2xl font-bold text-profit">Zero Risk</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#4ade80] font-bold">♛</span>
            <span className="text-xs text-muted-foreground">Involving Caesars</span>
          </div>
          <div className="data-value text-2xl font-bold text-[#4ade80]">{caesarsCount}</div>
        </motion.div>
      </div>

      {/* Arbitrage cards */}
      {arbitrage.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
          <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Arbitrage Opportunities</h3>
          <p className="text-xs text-muted-foreground">Scanning Caesars, PrizePicks, and other books for price discrepancies...</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {arbitrage.map((arb, i) => (
            <motion.div
              key={arb.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.35 }}
              className="glass-card p-5 border-caution/20 hover:border-profit/30 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{arb.homeTeam} vs {arb.awayTeam}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent text-muted-foreground uppercase">{arb.sport}</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(arb.detectedTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="data-value text-xl font-bold text-profit">+{arb.profitPct}%</div>
                  <div className="text-[10px] text-muted-foreground">guaranteed profit</div>
                </div>
              </div>

              {/* Two-side layout */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border ${arb.bookA === "Caesars Sportsbook" ? "bg-[#0a3d2a]/30 border-[#1a6b45]/30" : arb.bookA === "PrizePicks" ? "bg-[#2d1a4e]/30 border-[#6b3fa0]/30" : "bg-accent/50 border-border"}`}>
                  <div className="text-[10px] text-muted-foreground mb-1">Leg 1 — <BookBadge name={arb.bookA} /></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground capitalize">{arb.sideA}</span>
                    <span className="data-value text-xs font-bold text-foreground">{arb.oddsA > 0 ? `+${arb.oddsA}` : arb.oddsA}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Stake</span>
                    <span className="data-value text-xs font-semibold text-caution">${arb.stakeA}</span>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border ${arb.bookB === "Caesars Sportsbook" ? "bg-[#0a3d2a]/30 border-[#1a6b45]/30" : arb.bookB === "PrizePicks" ? "bg-[#2d1a4e]/30 border-[#6b3fa0]/30" : "bg-accent/50 border-border"}`}>
                  <div className="text-[10px] text-muted-foreground mb-1">Leg 2 — <BookBadge name={arb.bookB} /></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground capitalize">{arb.sideB}</span>
                    <span className="data-value text-xs font-bold text-foreground">{arb.oddsB > 0 ? `+${arb.oddsB}` : arb.oddsB}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Stake</span>
                    <span className="data-value text-xs font-semibold text-caution">${arb.stakeB}</span>
                  </div>
                </div>
              </div>

              {/* Profit bar */}
              <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-profit/10 border border-profit/20">
                <span className="text-xs font-medium text-profit">Guaranteed Profit</span>
                <span className="data-value text-sm font-bold text-profit">${arb.guaranteedProfit}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
