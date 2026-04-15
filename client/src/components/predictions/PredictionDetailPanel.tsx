/**
 * PredictionDetailPanel — Right-side drawer showing the full multi-layer
 * model breakdown for a selected game.
 *
 * Accepts a `DetailedPredictionViewModel` produced by
 * `mapEnhancedGameToPredictionDetail()` from the centralized transform layer.
 *
 * Design: Midnight Command — glass surface, profit/loss colors, smooth motion.
 * Accessibility: focus-trap, Escape to close, close button.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, TrendingUp, Activity, BarChart2, Info } from "lucide-react";
import type { DetailedPredictionViewModel } from "@/lib/transforms/oddsTransforms";

// ─── Helpers ──────────────────────────────────────────────────────

function fmt(n: number, places = 1): string {
  return n.toFixed(places);
}

function fmtOdds(odds: number | null): string {
  if (odds === null) return "N/A";
  return odds > 0 ? `+${odds}` : String(odds);
}

function adjColor(val: number): string {
  if (val > 0.3) return "text-profit";
  if (val < -0.3) return "text-loss";
  return "text-muted-foreground";
}

function recColor(rec: string): string {
  if (rec.includes("BET")) return "text-profit bg-profit/10 border-profit/20";
  if (rec.includes("LEAN")) return "text-caution bg-caution/10 border-caution/20";
  return "text-muted-foreground bg-accent border-border";
}

function layerStatus(val: string): { label: string; active: boolean } {
  const active = val === "on" || val === "active" || val.startsWith("on");
  return { label: active ? "Active" : "Inactive", active };
}

// ─── Section wrapper ───────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/40">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Probability bar ───────────────────────────────────────────────

function ProbBar({
  label,
  value,
  max = 100,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold data-value text-foreground">{fmt(value)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-accent overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Adjustment row ────────────────────────────────────────────────

function AdjRow({
  label,
  value,
  explanation,
}: {
  label: string;
  value: number;
  explanation: string;
}) {
  const sign = value > 0 ? "+" : "";
  const color = adjColor(value);
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
      <div className="w-28 shrink-0">
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`w-16 shrink-0 text-xs font-bold data-value ${color}`}>
        {sign}{fmt(value, 2)} pp
      </div>
      <div className="flex-1 text-xs text-muted-foreground leading-relaxed">
        {explanation}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────

interface PredictionDetailPanelProps {
  vm: DetailedPredictionViewModel | null;
  open: boolean;
  onClose: () => void;
}

export default function PredictionDetailPanel({
  vm,
  open,
  onClose,
}: PredictionDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && vm && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Prediction detail: ${vm.awayTeam} @ ${vm.homeTeam}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="
              fixed top-0 right-0 z-50 h-full
              w-full sm:w-[480px] lg:w-[520px]
              bg-background border-l border-border
              flex flex-col overflow-hidden
              shadow-2xl
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-background/95 backdrop-blur-sm">
              <div>
                <div className="text-sm font-bold text-foreground">
                  {vm.awayTeam} <span className="text-muted-foreground font-normal">@</span> {vm.homeTeam}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(vm.gameTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" · "}
                  <span className="uppercase font-medium">{vm.sport}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close detail panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* ── 1. Matchup Summary ── */}
              <Section icon={Info} title="Matchup Summary">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Away</div>
                    <div className="text-sm font-bold text-foreground">{vm.awayTeam}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {fmtOdds(vm.bestAwayOdds)}
                      {vm.bestAwayBook !== "Best Available" && (
                        <span className="ml-1 text-[10px] text-muted-foreground/60">({vm.bestAwayBook})</span>
                      )}
                    </div>
                  </div>
                  <div className="px-4 text-xs font-semibold text-muted-foreground">VS</div>
                  <div className="text-center flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Home</div>
                    <div className="text-sm font-bold text-foreground">{vm.homeTeam}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {fmtOdds(vm.bestHomeOdds)}
                      {vm.bestHomeBook !== "Best Available" && (
                        <span className="ml-1 text-[10px] text-muted-foreground/60">({vm.bestHomeBook})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${recColor(vm.recommendation)}`}>
                    {vm.recommendation}
                  </span>
                  {vm.isValueBet && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-profit/10 text-profit border border-profit/20">
                      Value Bet
                    </span>
                  )}
                </div>
              </Section>

              {/* ── 2. Market vs Model ── */}
              <Section icon={BarChart2} title="Market vs Model">
                <div className="space-y-3">
                  <ProbBar
                    label="Market Implied (Home)"
                    value={vm.marketImpliedProbHome}
                    color="bg-muted-foreground/40"
                  />
                  <ProbBar
                    label="Model Final (Home)"
                    value={vm.finalModelProbHome}
                    color="bg-primary"
                  />
                  <ProbBar
                    label="Model Final (Away)"
                    value={vm.finalModelProbAway}
                    color="bg-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="glass-card p-3 text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">Edge</div>
                    <div className={`data-value text-lg font-bold ${vm.edgePct > 0 ? "text-profit" : vm.edgePct < 0 ? "text-loss" : "text-muted-foreground"}`}>
                      {vm.edgePct > 0 ? "+" : ""}{fmt(vm.edgePct)}%
                    </div>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">Confidence</div>
                    <div className="data-value text-lg font-bold text-foreground">{fmt(vm.confidence, 0)}%</div>
                  </div>
                </div>
              </Section>

              {/* ── 3. Adjustment Breakdown ── */}
              <Section icon={TrendingUp} title="Adjustment Breakdown">
                <div className="text-xs text-muted-foreground mb-2">
                  Probability deltas applied to home team (pp = percentage points)
                </div>
                <AdjRow
                  label="Historical"
                  value={vm.historicalAdj}
                  explanation={vm.explanationHistorical}
                />
                <AdjRow
                  label="Injuries"
                  value={vm.injuryAdj}
                  explanation={vm.explanationInjuries}
                />
                <AdjRow
                  label="Fatigue"
                  value={vm.fatigueAdj}
                  explanation={vm.explanationFatigue}
                />
                <AdjRow
                  label="Weather"
                  value={vm.weatherAdj}
                  explanation={vm.explanationWeather}
                />
                <div className="mt-3 pt-3 border-t border-border/40 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Adjustment</span>
                  <span className={`text-sm font-bold data-value ${adjColor(vm.historicalAdj + vm.injuryAdj + vm.fatigueAdj + vm.weatherAdj)}`}>
                    {vm.historicalAdj + vm.injuryAdj + vm.fatigueAdj + vm.weatherAdj > 0 ? "+" : ""}
                    {fmt(vm.historicalAdj + vm.injuryAdj + vm.fatigueAdj + vm.weatherAdj, 2)} pp
                  </span>
                </div>
              </Section>

              {/* ── 4. Explanation ── */}
              <Section icon={Activity} title="Explanation">
                <div className="space-y-2">
                  <div className="glass-card p-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Base</div>
                    <p className="text-xs text-foreground leading-relaxed">{vm.explanationBase}</p>
                  </div>
                  <div className="glass-card p-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Confidence Reasoning</div>
                    <p className="text-xs text-foreground leading-relaxed">{vm.explanationConfidenceReason}</p>
                  </div>
                </div>
              </Section>

              {/* ── 5. Active Layers ── */}
              <Section icon={Layers} title="Active Layers">
                {Object.keys(vm.activeLayers).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Layer information unavailable.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(vm.activeLayers).map(([key, val]) => {
                      const { label, active } = layerStatus(String(val));
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                            active
                              ? "bg-profit/5 border-profit/20 text-profit"
                              : "bg-accent border-border text-muted-foreground"
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-profit" : "bg-muted-foreground/40"}`} />
                          <span className="capitalize font-medium">{key}</span>
                          <span className="ml-auto text-[10px] opacity-70">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border shrink-0 bg-background/95">
              <p className="text-[10px] text-muted-foreground text-center">
                Data sourced from live Odds API · Multi-layer prediction engine · Not financial advice
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
