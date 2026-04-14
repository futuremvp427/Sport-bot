import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Bell, TrendingUp, ArrowLeftRight, Cpu, Trophy, Settings, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const ALERT_TYPES = [
  { key: "edgeAlerts" as const, label: "Value Bet Alerts", desc: "Get notified when high-edge bets are detected on Caesars or PrizePicks", icon: TrendingUp, color: "text-green-400" },
  { key: "arbAlerts" as const, label: "Arbitrage Alerts", desc: "Instant alerts for cross-book arbitrage opportunities", icon: ArrowLeftRight, color: "text-blue-400" },
  { key: "modelUpdates" as const, label: "Model Updates", desc: "When ML models are retrained or accuracy changes significantly", icon: Cpu, color: "text-purple-400" },
  { key: "betResults" as const, label: "Bet Results", desc: "Outcome notifications for tracked predictions", icon: Trophy, color: "text-amber-400" },
  { key: "systemAlerts" as const, label: "System Alerts", desc: "Platform maintenance, data source changes, and system updates", icon: Settings, color: "text-slate-400" },
];

export default function NotificationSettings() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { data: prefs, isLoading } = trpc.notificationPreferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const updatePrefs = trpc.notificationPreferences.update.useMutation({
    onSuccess: () => toast.success("Preferences saved"),
  });
  const createTest = trpc.notifications.createTest.useMutation({
    onSuccess: () => toast.success("Test notification sent! Check the bell icon."),
  });

  const [testType, setTestType] = useState<string>("edge_alert");

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Bell className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-lg font-medium">Sign in to manage notifications</p>
        <p className="text-sm mt-1">You need to be logged in to configure alert preferences.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose which alerts you want to receive in your notification center.</p>
      </div>

      {/* Alert toggles */}
      <div className="space-y-3">
        {ALERT_TYPES.map((alert) => {
          const Icon = alert.icon;
          const isEnabled = prefs ? (prefs as any)[alert.key] : true;
          return (
            <div
              key={alert.key}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-accent flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${alert.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.label}</p>
                  <p className="text-xs text-muted-foreground">{alert.desc}</p>
                </div>
              </div>
              <button
                onClick={() => updatePrefs.mutate({ [alert.key]: !isEnabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isEnabled ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Min edge threshold */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Minimum Edge Threshold</p>
            <p className="text-xs text-muted-foreground">Only alert for value bets with edge above this percentage</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              defaultValue={prefs?.minEdgeThreshold ?? 3}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= 20) updatePrefs.mutate({ minEdgeThreshold: val });
              }}
              className="w-16 h-8 rounded-lg border border-border bg-background text-center text-sm text-foreground"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Test notification */}
      <div className="p-4 rounded-xl border border-dashed border-border bg-card/50">
        <h3 className="text-sm font-medium text-foreground mb-2">Send Test Notification</h3>
        <p className="text-xs text-muted-foreground mb-3">Send yourself a test alert to verify notifications are working.</p>
        <div className="flex items-center gap-2">
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="edge_alert">Edge Alert</option>
            <option value="arb_alert">Arbitrage Alert</option>
            <option value="model_update">Model Update</option>
            <option value="bet_result">Bet Result</option>
            <option value="system">System Alert</option>
          </select>
          <button
            onClick={() =>
              createTest.mutate({
                type: testType as any,
                title: testType === "edge_alert"
                  ? "Value Bet Detected: Lakers ML +145"
                  : testType === "arb_alert"
                  ? "Arbitrage: Caesars vs DraftKings"
                  : testType === "model_update"
                  ? "Model Retrained: Accuracy 59.2%"
                  : testType === "bet_result"
                  ? "Bet Won: Celtics -3.5 ✓"
                  : "System maintenance scheduled",
                message: testType === "edge_alert"
                  ? "Caesars has Lakers ML at +145 (implied 40.8%). Our model gives 48.3% — that's a 7.5% edge with +EV of $3.75 per $50 bet."
                  : testType === "arb_alert"
                  ? "Guaranteed $12.40 profit: Bet $245 on Caesars (Over 218.5 at -110) and $255 on DraftKings (Under 219 at -108)."
                  : testType === "model_update"
                  ? "Gradient Boosting model retrained on 2,450 new games. Accuracy improved from 57.9% to 59.2%. Calibration score: 0.91."
                  : testType === "bet_result"
                  ? "Your tracked prediction on Celtics -3.5 was correct! Final score: Celtics 112, Heat 106. Season record: 11-8 (57.9%)."
                  : "Scheduled maintenance on April 20 from 2-4 AM ET. Odds feeds may be temporarily unavailable.",
              })
            }
            disabled={createTest.isPending}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Send Test
          </button>
        </div>
      </div>
    </div>
  );
}
