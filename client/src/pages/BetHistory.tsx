/**
 * BetHistory — Full bet tracking page with filters, stats, and sortable table.
 * Pulls from the dashboard DB via tRPC bets.* procedures.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  History,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  DollarSign,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";

const SPORTS = [
  { value: "", label: "All Sports" },
  { value: "nba", label: "NBA" },
  { value: "nfl", label: "NFL" },
  { value: "mlb", label: "MLB" },
  { value: "nhl", label: "NHL" },
  { value: "soccer", label: "Soccer" },
  { value: "golf", label: "Golf" },
  { value: "boxing", label: "Boxing" },
];

const RESULTS = [
  { value: "", label: "All Results" },
  { value: "win", label: "Wins" },
  { value: "loss", label: "Losses" },
  { value: "pending", label: "Pending" },
];

const PAGE_SIZE = 25;

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const colors: Record<string, string> = {
    win: "bg-profit/15 text-profit border-profit/30",
    loss: "bg-loss/15 text-loss border-loss/30",
    pending: "bg-caution/15 text-caution border-caution/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${colors[outcome] ?? "bg-muted/30 text-muted-foreground border-border"}`}
    >
      {outcome === "win" && <Trophy className="w-3 h-3" />}
      {outcome === "loss" && <TrendingDown className="w-3 h-3" />}
      {outcome === "pending" && <Clock className="w-3 h-3" />}
      {outcome.toUpperCase()}
    </span>
  );
}

const anim = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3 },
});

export default function BetHistory() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sportFilter, setSportFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [page, setPage] = useState(0);

  // ── Queries ────────────────────────────────────────────────────
  const { data: betsData, isLoading: betsLoading } = trpc.bets.list.useQuery(
    {
      sport: sportFilter || undefined,
      result: (resultFilter as "win" | "loss" | "pending") || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: isAuthenticated, staleTime: 10_000 }
  );

  const { data: stats, isLoading: statsLoading } = trpc.bets.stats.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const bets = betsData?.bets ?? [];
  const total = betsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(0);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card max-w-md">
          <CardContent className="p-8 text-center">
            <History className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Sign In Required</h3>
            <p className="text-sm text-muted-foreground">
              Log in to view your bet history and track your performance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...anim(0)} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Bet History
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track all placed bets, outcomes, and profit/loss
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div {...anim(0.05)} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Bets</span>
            </div>
            <div className="text-xl font-bold data-value text-foreground">
              {stats?.totalBets ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-4 h-4 text-profit" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <div className="text-xl font-bold data-value text-profit">
              {((stats?.winRate ?? 0) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats?.wins ?? 0}W / {stats?.losses ?? 0}L / {stats?.pending ?? 0}P
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Staked</span>
            </div>
            <div className="text-xl font-bold data-value text-foreground">
              {formatCurrency(stats?.totalStaked ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              {(stats?.totalProfitLoss ?? 0) >= 0 ? (
                <TrendingUp className="w-4 h-4 text-profit" />
              ) : (
                <TrendingDown className="w-4 h-4 text-loss" />
              )}
              <span className="text-xs text-muted-foreground">P&L</span>
            </div>
            <div
              className={`text-xl font-bold data-value ${(stats?.totalProfitLoss ?? 0) >= 0 ? "text-profit" : "text-loss"}`}
            >
              {formatCurrency(stats?.totalProfitLoss ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">ROI</span>
            </div>
            <div
              className={`text-xl font-bold data-value ${(stats?.roi ?? 0) >= 0 ? "text-profit" : "text-loss"}`}
            >
              {((stats?.roi ?? 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div {...anim(0.1)} className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1.5 flex-wrap">
          {SPORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => handleFilterChange(setSportFilter, s.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                sportFilter === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/30 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <div className="flex gap-1.5 flex-wrap">
          {RESULTS.map((r) => (
            <button
              key={r.value}
              onClick={() => handleFilterChange(setResultFilter, r.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                resultFilter === r.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/30 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bets Table */}
      <motion.div {...anim(0.15)}>
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Placed Bets
              <Badge variant="outline" className="ml-2 text-[10px]">
                {total} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {betsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : bets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <History className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No bets found</p>
                <p className="text-xs mt-1">
                  {sportFilter || resultFilter
                    ? "Try adjusting your filters"
                    : "Bets placed through the pipeline will appear here"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Sport</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Team</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Odds</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Stake</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">Result</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map((bet) => (
                        <tr
                          key={bet.id}
                          className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {new Date(bet.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="uppercase font-medium text-foreground">{bet.sport}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{bet.team}</td>
                          <td className="py-2.5 px-3 text-foreground capitalize">{bet.betType}</td>
                          <td className="py-2.5 px-3 text-right data-value text-foreground">
                            {formatOdds(bet.odds)}
                          </td>
                          <td className="py-2.5 px-3 text-right data-value text-foreground">
                            {formatCurrency(bet.stake)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <OutcomeBadge outcome={bet.outcome} />
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right data-value font-bold ${
                              bet.profitLoss > 0
                                ? "text-profit"
                                : bet.profitLoss < 0
                                ? "text-loss"
                                : "text-muted-foreground"
                            }`}
                          >
                            {bet.profitLoss > 0 ? "+" : ""}
                            {formatCurrency(bet.profitLoss)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="h-7 px-2"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="h-7 px-2"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
