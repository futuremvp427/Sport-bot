import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Check, X, Zap, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Pricing() {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const { isAuthenticated } = useAuth();
  const { data: plans = [] } = trpc.billing.plans.useQuery();
  const { data: subscription } = trpc.billing.subscription.useQuery(undefined, { enabled: isAuthenticated });
  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (planId === "free") return;
    createCheckout.mutate({ planId: planId as "pro" | "elite", interval });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">Unlock advanced analytics, real-time alerts, and AI-powered predictions.</p>

        {/* Interval toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className={`text-sm ${interval === "month" ? "text-foreground font-medium" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setInterval(interval === "month" ? "year" : "month")}
            className={`relative w-12 h-6 rounded-full transition-colors ${interval === "year" ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${interval === "year" ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm ${interval === "year" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            Yearly <span className="text-xs text-green-400 font-medium">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: any) => {
          const price = interval === "year" ? plan.priceYearly : plan.priceMonthly;
          const monthlyPrice = interval === "year" ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
          const isCurrent = subscription?.tier === plan.id;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                isPopular
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  Most Popular
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {plan.id === "elite" ? (
                    <Crown className="w-5 h-5 text-amber-400" />
                  ) : plan.id === "pro" ? (
                    <Zap className="w-5 h-5 text-primary" />
                  ) : null}
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                {price === 0 ? (
                  <div className="text-3xl font-bold text-foreground">Free</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">${(monthlyPrice / 100).toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                )}
                {interval === "year" && price > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${(price / 100).toFixed(2)} billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f: any, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    {f.included ? (
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${f.included ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrent || createCheckout.isPending}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isCurrent
                    ? "bg-muted text-muted-foreground cursor-default"
                    : isPopular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    : plan.id === "free"
                    ? "bg-muted text-muted-foreground hover:bg-accent"
                    : "bg-accent text-foreground hover:bg-accent/80"
                } disabled:opacity-50`}
              >
                {createCheckout.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : isCurrent ? (
                  "Current Plan"
                ) : plan.id === "free" ? (
                  "Get Started"
                ) : (
                  "Subscribe"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Test card info */}
      <div className="text-center text-xs text-muted-foreground/60 mt-4">
        <p>Test mode: Use card number <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">4242 4242 4242 4242</code> with any future expiry and CVC.</p>
      </div>
    </div>
  );
}
