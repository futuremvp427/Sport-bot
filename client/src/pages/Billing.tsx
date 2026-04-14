import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { CreditCard, Crown, Zap, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearch } from "wouter";
import { useEffect } from "react";

export default function Billing() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const success = params.get("success");

  const { data: subscription, isLoading: subLoading } = trpc.billing.subscription.useQuery(undefined, { enabled: isAuthenticated });
  const { data: payments = [], isLoading: payLoading } = trpc.billing.payments.useQuery({ limit: 20 }, { enabled: isAuthenticated });
  const cancelSub = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => toast.success("Subscription cancelled. You'll retain access until the end of your billing period."),
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (success === "true") {
      toast.success("Payment successful! Your subscription is now active.");
    }
  }, [success]);

  if (authLoading || subLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <CreditCard className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-lg font-medium">Sign in to view billing</p>
      </div>
    );
  }

  const tierConfig: Record<string, { label: string; icon: typeof Zap; color: string; bg: string }> = {
    free: { label: "Free Plan", icon: Zap, color: "text-muted-foreground", bg: "bg-muted" },
    pro: { label: "Pro Plan", icon: Zap, color: "text-primary", bg: "bg-primary/10" },
    elite: { label: "Elite Plan", icon: Crown, color: "text-amber-400", bg: "bg-amber-400/10" },
  };

  const tier = tierConfig[subscription?.tier || "free"] || tierConfig.free;
  const TierIcon = tier.icon;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Billing & Subscription</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription plan and view payment history.</p>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${tier.bg} flex items-center justify-center`}>
              <TierIcon className={`w-5 h-5 ${tier.color}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{tier.label}</h3>
              <p className="text-sm text-muted-foreground">
                {subscription?.tier === "free"
                  ? "Limited features — upgrade for full access"
                  : "Full access to all platform features"}
              </p>
            </div>
          </div>
          {subscription?.tier !== "free" && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to cancel your subscription?")) {
                  cancelSub.mutate();
                }
              }}
              disabled={cancelSub.isPending}
              className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {cancelSub.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Subscription"}
            </button>
          )}
        </div>
        {subscription?.tier === "free" && (
          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Upgrade Plan <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Payment history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
        </div>
        {payLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CreditCard className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No payments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-sm text-foreground">{p.description || "Payment"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    ${(p.amount / 100).toFixed(2)} {p.currency?.toUpperCase()}
                  </p>
                  <p className="text-xs text-green-400">{p.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
