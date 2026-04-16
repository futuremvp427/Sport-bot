import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Predictions from "./pages/Predictions";
import Edges from "./pages/Edges";
import Arbitrage from "./pages/Arbitrage";
import PlayerProps from "./pages/PlayerProps";
import Backtesting from "./pages/Backtesting";
import Models from "./pages/Models";
import Bankroll from "./pages/Bankroll";
import NotificationSettings from "./pages/NotificationSettings";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import SystemIntelligence from "./pages/SystemIntelligence";
import BetHistory from "./pages/BetHistory";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/predictions" component={Predictions} />
        <Route path="/edges" component={Edges} />
        <Route path="/arbitrage" component={Arbitrage} />
        <Route path="/props" component={PlayerProps} />
        <Route path="/backtesting" component={Backtesting} />
        <Route path="/models" component={Models} />
        <Route path="/bankroll" component={Bankroll} />
        <Route path="/notifications" component={NotificationSettings} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/billing" component={Billing} />
        <Route path="/system" component={SystemIntelligence} />
        <Route path="/bets" component={BetHistory} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.17 0.015 260 / 90%)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "oklch(0.93 0.005 260)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
