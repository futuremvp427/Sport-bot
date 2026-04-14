/**
 * Stripe product and pricing configuration for the Sports Betting Intelligence Platform.
 * These define the subscription tiers available to users.
 */

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents
  features: PlanFeature[];
  popular?: boolean;
  stripePriceIdMonthly?: string; // Set after creating in Stripe
  stripePriceIdYearly?: string;
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic predictions and limited features.",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      { text: "5 predictions per day", included: true },
      { text: "Basic model accuracy stats", included: true },
      { text: "Community picks feed", included: true },
      { text: "Value bet alerts", included: false },
      { text: "Arbitrage scanner", included: false },
      { text: "Player props analysis", included: false },
      { text: "Backtesting engine", included: false },
      { text: "Priority notifications", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Unlock advanced analytics and real-time alerts for serious bettors.",
    priceMonthly: 2999, // $29.99
    priceYearly: 28788, // $287.88 ($23.99/mo)
    popular: true,
    features: [
      { text: "Unlimited predictions", included: true },
      { text: "Full model comparison dashboard", included: true },
      { text: "Real-time value bet alerts", included: true },
      { text: "Arbitrage scanner (Caesars + 3 books)", included: true },
      { text: "PrizePicks player props analysis", included: true },
      { text: "Backtesting with 1 year history", included: true },
      { text: "Email + in-app notifications", included: true },
      { text: "Custom edge thresholds", included: false },
    ],
  },
  {
    id: "elite",
    name: "Elite",
    description: "Full platform access with AI-powered insights and custom strategies.",
    priceMonthly: 7999, // $79.99
    priceYearly: 76788, // $767.88 ($63.99/mo)
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Custom ML model training", included: true },
      { text: "Arbitrage scanner (all books)", included: true },
      { text: "Backtesting with 5 year history", included: true },
      { text: "Custom edge thresholds & Kelly sizing", included: true },
      { text: "Priority support & strategy calls", included: true },
      { text: "API access for automation", included: true },
      { text: "White-label reports", included: true },
    ],
  },
];

export function getPlanById(planId: string) {
  return PLANS.find((p) => p.id === planId);
}
