/**
 * SystemIntelligence — Full pipeline monitoring, health, learning, and simulation dashboard.
 * Connects to the Python Sports Betting Intelligence backend via tRPC pipeline.* procedures.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Cpu,
  Database,
  Gauge,
  Heart,
  LineChart,
  Play,
  RefreshCw,
  Server,
  Shield,
  Sliders,
  TrendingUp,
  Wallet,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ─── Status helpers ──────────────────────────────────────────────
function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "healthy":
    case "fresh":
    case "online":
      return "text-profit";
    case "degraded":
    case "stale":
      return "text-caution";
    case "unhealthy":
    case "offline":
    case "error":
      return "text-loss";
    default:
      return "text-muted-foreground";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case "healthy":
    case "fresh":
    case "online":
      return <CheckCircle2 className="w-4 h-4 text-profit" />;
    case "degraded":
    case "stale":
      return <AlertTriangle className="w-4 h-4 text-caution" />;
    default:
      return <XCircle className="w-4 h-4 text-loss" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-profit/15 text-profit border-profit/30",
    fresh: "bg-profit/15 text-profit border-profit/30",
    online: "bg-profit/15 text-profit border-profit/30",
    degraded: "bg-caution/15 text-caution border-caution/30",
    stale: "bg-caution/15 text-caution border-caution/30",
    unhealthy: "bg-loss/15 text-loss border-loss/30",
    offline: "bg-loss/15 text-loss border-loss/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${colors[status?.toLowerCase()] ?? "bg-muted/30 text-muted-foreground border-border"}`}>
      <StatusIcon status={status} />
      {status?.toUpperCase() ?? "UNKNOWN"}
    </span>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function SystemIntelligence() {
  const { isAuthenticated } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const utils = trpc.useUtils();

  // ── Queries ────────────────────────────────────────────────────
  const { data: health, isLoading: healthLoading } = trpc.pipeline.health.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: systemHealth, isLoading: sysHealthLoading } = trpc.pipeline.systemHealth.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: memory } = trpc.pipeline.memory.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });

  const { data: weightsHistory } = trpc.pipeline.weightsHistory.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: roiHistory } = trpc.pipeline.roiHistory.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: bankrollSummary } = trpc.pipeline.bankrollSummary.useQuery(undefined, {
    staleTime: 60_000,
  });

  const { data: bankrollHistory } = trpc.pipeline.bankrollHistory.useQuery(undefined, {
    staleTime: 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────
  const runPipeline = trpc.pipeline.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Pipeline complete: ${data.pipeline_stages.selected} bets selected`);
      utils.pipeline.memory.invalidate();
      utils.pipeline.weightsHistory.invalidate();
      utils.pipeline.roiHistory.invalidate();
      utils.pipeline.bankrollHistory.invalidate();
      utils.pipeline.bankrollSummary.invalidate();
      setIsRunning(false);
    },
    onError: (err) => {
      toast.error(`Pipeline failed: ${err.message}`);
      setIsRunning(false);
    },
  });

  const runSim = trpc.pipeline.simulate.useMutation({
    onSuccess: (data) => {
      toast.success(`Simulation complete: ${data.total_simulated_bets} bets simulated, ${(data.avg_roi_pct).toFixed(1)}% avg ROI`);
      setIsSimulating(false);
    },
    onError: (err) => {
      toast.error(`Simulation failed: ${err.message}`);
      setIsSimulating(false);
    },
  });

  // ── Derived data ───────────────────────────────────────────────
  const isOnline = health?.status === "healthy";
  const weightsData = (weightsHistory ?? []).slice().reverse().map((w, i) => ({
    idx: i + 1,
    confidence: w.confidence_weight,
    edge: w.edge_weight,
    kelly: w.kelly_weight,
    time: new Date(w.recorded_at).toLocaleTimeString(),
  }));

  const roiData = (roiHistory ?? []).slice().reverse().map((r, i) => ({
    idx: i + 1,
    roi: r.roi_pct,
    profit: r.total_profit,
    staked: r.total_staked,
    time: new Date(r.recorded_at).toLocaleTimeString(),
  }));

  const bankrollData = (bankrollHistory ?? []).slice().reverse().map((b, i) => ({
    idx: i + 1,
    balance: b.balance,
    change: b.change_amount,
    reason: b.change_reason,
    time: new Date(b.timestamp).toLocaleTimeString(),
  }));

  const radarData = memory
    ? [
        { subject: "Accuracy", value: (memory.performance.accuracy || 0) * 100, fullMark: 100 },
        { subject: "Win Rate", value: (memory.roi.total_bets > 0 ? (memory.roi.winning_bets / memory.roi.total_bets) * 100 : 0), fullMark: 100 },
        { subject: "ROI", value: Math.min(memory.roi.roi_pct, 100), fullMark: 100 },
        { subject: "Confidence", value: (memory.weights.confidence_weight ?? 1) * 50, fullMark: 100 },
        { subject: "Edge", value: (memory.weights.edge_weight ?? 1) * 50, fullMark: 100 },
        { subject: "Kelly", value: (memory.weights.kelly_weight ?? 1) * 50, fullMark: 100 },
      ]
    : [];

  const anim = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.3 },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            System Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline monitoring, self-healing, adaptive learning, and Monte Carlo simulation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={isOnline ? "online" : "offline"} />
          {isAuthenticated && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setIsRunning(true); runPipeline.mutate({}); }}
                disabled={isRunning || !isOnline}
                className="gap-1.5"
              >
                {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isRunning ? "Running..." : "Run Pipeline"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setIsSimulating(true); runSim.mutate({}); }}
                disabled={isSimulating || !isOnline}
                className="gap-1.5"
              >
                {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {isSimulating ? "Simulating..." : "Simulate"}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div {...anim(0.05)} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Bankroll</span>
            </div>
            <div className="text-xl font-bold data-value text-foreground">
              ${(bankrollSummary?.current_balance ?? memory?.bankroll?.current_balance ?? 10000).toLocaleString()}
            </div>
            {bankrollSummary && (
              <div className="text-xs text-muted-foreground mt-1">
                Peak: ${bankrollSummary.peak_balance.toLocaleString()} · DD: {bankrollSummary.max_drawdown_pct.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-4 h-4 text-profit" />
              <span className="text-xs text-muted-foreground">ROI</span>
            </div>
            <div className={`text-xl font-bold data-value ${(memory?.roi?.roi_pct ?? 0) >= 0 ? "text-profit" : "text-loss"}`}>
              {(memory?.roi?.roi_pct ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {memory?.roi?.winning_bets ?? 0}W / {(memory?.roi?.total_bets ?? 0) - (memory?.roi?.winning_bets ?? 0)}L
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Bets</span>
            </div>
            <div className="text-xl font-bold data-value text-foreground">
              {memory?.performance?.total_bets ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {memory?.patterns?.length ?? 0} patterns detected
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Confidence W</span>
            </div>
            <div className="text-xl font-bold data-value text-foreground">
              {(memory?.weights?.confidence_weight ?? 1).toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Edge: {(memory?.weights?.edge_weight ?? 1).toFixed(4)} · Kelly: {(memory?.weights?.kelly_weight ?? 1).toFixed(4)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Heart className="w-4 h-4 text-profit" />
              <span className="text-xs text-muted-foreground">System</span>
            </div>
            <div className="text-xl font-bold">
              <StatusBadge status={systemHealth?.overall_status ?? (isOnline ? "healthy" : "offline")} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Health + Memory Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health Panel */}
        <motion.div {...anim(0.1)}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Self-Healing Health Monitor
              </CardTitle>
              <CardDescription className="text-xs">
                API endpoints, model health, and data freshness
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sysHealthLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading health data...
                </div>
              ) : systemHealth ? (
                <>
                  {/* API Health */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">API Endpoints</h4>
                    <div className="space-y-2">
                      {Object.entries(systemHealth.api_health).map(([name, info]) => (
                        <div key={name} className="flex items-center justify-between p-2 rounded-md bg-accent/30">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={info.status} />
                            <span className="text-sm font-medium text-foreground capitalize">{name.replace(/_/g, " ")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {info.response_count !== undefined && (
                              <span className="text-xs text-muted-foreground">{info.response_count} responses</span>
                            )}
                            <Badge variant="outline" className={`text-[10px] ${statusColor(info.status)}`}>
                              {info.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Model Health */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Model Health</span>
                    </div>
                    <StatusBadge status={systemHealth.model_health.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{systemHealth.model_health.reason}</p>

                  <Separator />

                  {/* Data Freshness */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Data Freshness</span>
                    </div>
                    <StatusBadge status={systemHealth.data_freshness.status} />
                  </div>
                  {systemHealth.data_freshness.latest_bet && (
                    <p className="text-xs text-muted-foreground">
                      Last bet: {new Date(systemHealth.data_freshness.latest_bet).toLocaleString()}
                    </p>
                  )}

                  {/* Recommendations */}
                  {systemHealth.recommendations.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Recommendations</h4>
                        {systemHealth.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-caution">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            {rec}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Python backend is offline. Start the intelligence engine to see health data.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* System Radar */}
        <motion.div {...anim(0.15)}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                System Performance Radar
              </CardTitle>
              <CardDescription className="text-xs">
                Multi-dimensional view of system capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="oklch(1 0 0 / 10%)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "oklch(0.65 0.02 260)" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "oklch(0.5 0.02 260)" }} />
                    <Radar name="System" dataKey="value" stroke="oklch(0.765 0.177 163)" fill="oklch(0.765 0.177 163)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                  Run the pipeline to generate performance data
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row: Weights + ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Adaptive Weights Chart */}
        <motion.div {...anim(0.2)}>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Adaptive Weight History
              </CardTitle>
              <CardDescription className="text-xs">
                Confidence, edge, and Kelly weights evolve with each learning cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weightsData.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <ReLineChart data={weightsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }}
                    />
                    <Line type="monotone" dataKey="confidence" stroke="oklch(0.765 0.177 163)" strokeWidth={2} dot={false} name="Confidence" />
                    <Line type="monotone" dataKey="edge" stroke="oklch(0.7 0.15 250)" strokeWidth={2} dot={false} name="Edge" />
                    <Line type="monotone" dataKey="kelly" stroke="oklch(0.75 0.15 50)" strokeWidth={2} dot={false} name="Kelly" />
                  </ReLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                  {weightsData.length === 1 ? "Only 1 data point — run pipeline again to see trends" : "No weight history yet"}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ROI History Chart */}
        <motion.div {...anim(0.25)}>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-profit" />
                ROI History
              </CardTitle>
              <CardDescription className="text-xs">
                Return on investment tracked across learning cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roiData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={roiData}>
                    <defs>
                      <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.765 0.177 163)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="oklch(0.765 0.177 163)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                    <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "ROI"]}
                    />
                    <Area type="monotone" dataKey="roi" stroke="oklch(0.765 0.177 163)" strokeWidth={2} fill="url(#roiGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                  No ROI history yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bankroll Chart */}
      <motion.div {...anim(0.3)}>
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Pipeline Bankroll Tracker
            </CardTitle>
            <CardDescription className="text-xs">
              Real bankroll changes from paper trading execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bankrollData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={bankrollData}>
                  <defs>
                    <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.15 250)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.7 0.15 250)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                  <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.17 0.015 260 / 95%)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.93 0.005 260)" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
                  />
                  <Area type="monotone" dataKey="balance" stroke="oklch(0.7 0.15 250)" strokeWidth={2} fill="url(#bankGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                No bankroll history yet — run the pipeline to start tracking
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Patterns Table */}
      {memory && memory.patterns.length > 0 && (
        <motion.div {...anim(0.35)}>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Detected Patterns
              </CardTitle>
              <CardDescription className="text-xs">
                Sport/bet-type patterns discovered by the learning engine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Sport</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Bet Type</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Win Rate</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Sample Size</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memory.patterns.slice(0, 10).map((p) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground uppercase">{p.sport}</td>
                        <td className="py-2.5 px-3 text-foreground">{p.bet_type}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`data-value font-bold ${p.win_rate >= 0.55 ? "text-profit" : p.win_rate >= 0.45 ? "text-caution" : "text-loss"}`}>
                            {(p.win_rate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{p.sample_size}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {new Date(p.last_seen).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Last Pipeline Run Results */}
      {runPipeline.data && (
        <motion.div {...anim(0)} className="space-y-4">
          <Card className="glass-card border-profit/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-profit" />
                Last Pipeline Run
              </CardTitle>
              <CardDescription className="text-xs">
                {runPipeline.data.pipeline_stages.predictions} predictions → {runPipeline.data.pipeline_stages.decisions} decisions → {runPipeline.data.pipeline_stages.selected} selected → {runPipeline.data.pipeline_stages.executed} executed
                {runPipeline.data.elapsed_seconds && ` · ${runPipeline.data.elapsed_seconds.toFixed(2)}s`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runPipeline.data.selected_bets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Team</th>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Side</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Odds</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Edge</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">EV</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Stake</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runPipeline.data.selected_bets.map((bet, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="py-2.5 px-2 font-medium text-foreground">{bet.team}</td>
                          <td className="py-2.5 px-2 text-foreground capitalize">{bet.side}</td>
                          <td className="py-2.5 px-2 text-right data-value text-foreground">
                            {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className="data-value font-bold text-profit">{(bet.edge * 100).toFixed(1)}%</span>
                          </td>
                          <td className="py-2.5 px-2 text-right data-value text-foreground">{(bet.expected_value * 100).toFixed(1)}%</td>
                          <td className="py-2.5 px-2 text-right data-value font-semibold text-foreground">${bet.stake.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bets met the selection criteria this run.</p>
              )}

              {/* Simulation results */}
              {runPipeline.data.simulation && (
                <div className="mt-4 p-3 rounded-lg bg-accent/30 border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Monte Carlo Simulation</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Cycles</div>
                      <div className="data-value text-sm font-bold text-foreground">{runPipeline.data.simulation.total_cycles}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Avg ROI</div>
                      <div className={`data-value text-sm font-bold ${runPipeline.data.simulation.avg_roi_pct >= 0 ? "text-profit" : "text-loss"}`}>
                        {runPipeline.data.simulation.avg_roi_pct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Win Rate</div>
                      <div className="data-value text-sm font-bold text-foreground">{(runPipeline.data.simulation.overall_win_rate * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Max Drawdown</div>
                      <div className="data-value text-sm font-bold text-loss">${runPipeline.data.simulation.avg_max_drawdown.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Learning results */}
              {runPipeline.data.learning && (
                <div className="mt-4 p-3 rounded-lg bg-accent/30 border border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Learning Cycle</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Signals</div>
                      <div className="data-value text-sm font-bold text-foreground">
                        {runPipeline.data.learning.intelligence.learning.diagnostics.total_signals}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Avg Error</div>
                      <div className="data-value text-sm font-bold text-foreground">
                        {runPipeline.data.learning.intelligence.learning.diagnostics.avg_error.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Updated Conf W</div>
                      <div className="data-value text-sm font-bold text-foreground">
                        {runPipeline.data.learning.updated_weights.confidence_weight.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">History Length</div>
                      <div className="data-value text-sm font-bold text-foreground">
                        {runPipeline.data.learning.weights_history_length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
