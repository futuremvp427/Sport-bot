import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import Stripe from "stripe";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  getNotificationPreferences,
  upsertNotificationPreferences,
  getUserPayments,
} from "./db";
import { PLANS } from "./products";
import { fetchNbaOdds, fetchNbaOddsEnhanced, getCacheStatus } from "./oddsService";
import { FEATURE_FLAGS, getActiveLayers } from "./featureFlags";
import {
  getApiHealth,
  getSystemHealth,
  getSystemMemory,
  getPythonDashboardSummary,
  runPipeline,
  runSimulation,
  getWeightsHistory,
  getRoiHistory,
  getPatterns,
  getBankrollHistory,
  getBankrollSummary,
} from "./pythonApi";
import {
  startScheduler,
  stopScheduler,
  getStatus as getSchedulerStatus,
} from "./pipelineScheduler";
import {
  getPlacedBets,
  createPlacedBet,
  getPlacedBetStats,
} from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Notifications ──────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getUserNotifications(ctx.user.id, input?.limit ?? 50);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.notificationId, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    // Create a test notification (for demo purposes)
    createTest: protectedProcedure
      .input(
        z.object({
          type: z.enum(["edge_alert", "arb_alert", "model_update", "bet_result", "system", "subscription"]),
          title: z.string().max(256),
          message: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createNotification({
          userId: ctx.user.id,
          type: input.type,
          title: input.title,
          message: input.message,
        });
        return { success: true };
      }),
  }),

  // ─── Notification Preferences ───────────────────────────────────
  notificationPreferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const prefs = await getNotificationPreferences(ctx.user.id);
      return (
        prefs ?? {
          edgeAlerts: true,
          arbAlerts: true,
          modelUpdates: true,
          betResults: true,
          systemAlerts: true,
          minEdgeThreshold: 3,
        }
      );
    }),

    update: protectedProcedure
      .input(
        z.object({
          edgeAlerts: z.boolean().optional(),
          arbAlerts: z.boolean().optional(),
          modelUpdates: z.boolean().optional(),
          betResults: z.boolean().optional(),
          systemAlerts: z.boolean().optional(),
          minEdgeThreshold: z.number().min(1).max(20).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ─── Live Odds (NBA) ────────────────────────────────────────────
  odds: router({
    // Full NBA odds with processing (cached 120s)
    nba: publicProcedure.query(async () => {
      return fetchNbaOdds();
    }),

    // Value bets only (edge > 3%)
    valueBets: publicProcedure.query(async () => {
      const result = await fetchNbaOdds();
      const valueBets = result.games.filter((g) => g.is_value_bet);
      return { ...result, games: valueBets };
    }),

    // Cache status (no API call)
    cacheStatus: publicProcedure.query(() => {
      return getCacheStatus();
    }),

    // Enhanced NBA odds — full multi-layer model (historical + injuries + fatigue)
    nbaEnhanced: publicProcedure.query(async () => {
      return fetchNbaOddsEnhanced();
    }),

    // Value bets from enhanced model
    valueBetsEnhanced: publicProcedure.query(async () => {
      const result = await fetchNbaOddsEnhanced();
      const valueBets = result.games.filter((g) => g.is_value_bet);
      return { ...result, games: valueBets };
    }),

    // Debug: sample enhanced predictions (1-5 games, lightweight)
    debugEnhancedPrediction: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(5).default(2) }).optional())
      .query(async ({ input }) => {
        const result = await fetchNbaOddsEnhanced();
        const sample = result.games.slice(0, input?.limit ?? 2);
        return {
          source: result.source,
          active_flags: FEATURE_FLAGS,
          active_layers: getActiveLayers(),
          sample_predictions: sample.map((g) => ({
            matchup: `${g.home_team} vs ${g.away_team}`,
            market_implied_home: g.implied_home_prob,
            final_model_home: g.model_home_prob,
            edge: g.edge,
            confidence: g.confidence,
            recommendation: g.recommendation,
            is_value_bet: g.is_value_bet,
            active_layers: g.active_layers,
            explanation: g.model_output?.explanation ?? null,
          })),
        };
      }),

    // Dashboard summary stats
    summary: publicProcedure.query(async () => {
      const result = await fetchNbaOdds();
      const games = result.games;
      const valueBets = games.filter((g) => g.is_value_bet);
      const betHome = games.filter((g) => g.recommendation === "BET HOME" || g.recommendation === "BET AWAY");

      return {
        source: result.source,
        total_games: games.length,
        value_bets: valueBets.length,
        strong_edges: betHome.length,
        avg_edge: games.length
          ? Math.round(
              (games.reduce((s, g) => s + Math.abs(g.edge ?? 0), 0) / games.length) * 10
            ) / 10
          : 0,
        credits_remaining: result.credits_remaining,
        cache_status: getCacheStatus(),
      };
    }),
  }),

  // ─── Pipeline / System Intelligence ─────────────────────────────
  pipeline: router({
    /** Quick health check */
    health: publicProcedure.query(async () => {
      try {
        return await getApiHealth();
      } catch {
        return { status: "offline", timestamp: new Date().toISOString(), version: "unknown" };
      }
    }),

    /** Full system health (self-healing) */
    systemHealth: publicProcedure.query(async () => {
      return getSystemHealth();
    }),

    /** System memory snapshot */
    memory: publicProcedure.query(async () => {
      return getSystemMemory();
    }),

    /** Python dashboard summary */
    dashboardSummary: publicProcedure.query(async () => {
      return getPythonDashboardSummary();
    }),

    /** Run the full pipeline */
    run: protectedProcedure
      .input(
        z.object({
          sport: z.string().default("nba"),
          executionMode: z.enum(["paper", "live"]).default("paper"),
          runSimulation: z.boolean().default(true),
        })
      )
      .mutation(async ({ input }) => {
        return runPipeline(input.sport, input.executionMode, input.runSimulation);
      }),

    /** Run simulation only */
    simulate: protectedProcedure
      .input(
        z.object({
          sport: z.string().default("nba"),
          cycles: z.number().min(1).max(100).default(20),
        })
      )
      .mutation(async ({ input }) => {
        return runSimulation(input.sport, input.cycles);
      }),

    /** Weights history */
    weightsHistory: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return getWeightsHistory(input?.limit ?? 50);
      }),

    /** ROI history */
    roiHistory: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return getRoiHistory(input?.limit ?? 50);
      }),

    /** Detected patterns */
    patterns: publicProcedure
      .input(z.object({ sport: z.string().optional(), limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return getPatterns(input?.sport, input?.limit ?? 50);
      }),

    /** Bankroll history */
    bankrollHistory: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(1000).default(100) }).optional())
      .query(async ({ input }) => {
        return getBankrollHistory(input?.limit ?? 100);
      }),

    /** Bankroll summary */
    bankrollSummary: publicProcedure.query(async () => {
      return getBankrollSummary();
    }),
  }),

  // ─── Scheduler ──────────────────────────────────────────────────
  scheduler: router({
    status: publicProcedure.query(() => {
      return getSchedulerStatus();
    }),

    start: protectedProcedure
      .input(
        z.object({
          intervalMinutes: z.number().min(1).max(1440).default(15),
          sport: z.string().default("nba"),
          executionMode: z.enum(["paper", "live"]).default("paper"),
          runSimulation: z.boolean().default(true),
          runImmediately: z.boolean().default(true),
        }).optional()
      )
      .mutation(({ input }) => {
        return startScheduler(input ?? undefined);
      }),

    stop: protectedProcedure.mutation(() => {
      return stopScheduler();
    }),
  }),

  // ─── Bet History ────────────────────────────────────────────────
  bets: router({
    list: protectedProcedure
      .input(
        z.object({
          sport: z.string().optional(),
          result: z.enum(["win", "loss", "pending"]).optional(),
          limit: z.number().min(1).max(500).default(100),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        return getPlacedBets(ctx.user.id, {
          sport: input?.sport,
          result: input?.result,
          limit: input?.limit ?? 100,
          offset: input?.offset ?? 0,
        });
      }),

    create: protectedProcedure
      .input(
        z.object({
          sport: z.string(),
          team: z.string(),
          betType: z.string(),
          odds: z.number(),
          stake: z.number().min(0.01),
          outcome: z.enum(["win", "loss", "pending"]).default("pending"),
          profitLoss: z.number().default(0),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createPlacedBet({
          userId: ctx.user.id,
          sport: input.sport,
          team: input.team,
          betType: input.betType,
          odds: input.odds,
          stake: input.stake,
          outcome: input.outcome,
          profitLoss: input.profitLoss,
        });
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getPlacedBetStats(ctx.user.id);
    }),
  }),

  // ─── Stripe / Billing ───────────────────────────────────────────
  billing: router({
    plans: publicProcedure.query(() => {
      return PLANS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        features: p.features,
        popular: p.popular ?? false,
      }));
    }),

    createCheckout: protectedProcedure
      .input(
        z.object({
          planId: z.enum(["pro", "elite"]),
          interval: z.enum(["month", "year"]).default("month"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const plan = PLANS.find((p) => p.id === input.planId);
        if (!plan) throw new Error("Invalid plan");

        const priceInCents = input.interval === "year" ? plan.priceYearly : plan.priceMonthly;
        const origin = ctx.req.headers.origin || ctx.req.headers.referer || "";

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            plan_id: input.planId,
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
          },
          allow_promotion_codes: true,
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `${plan.name} Plan`,
                  description: plan.description,
                },
                unit_amount: priceInCents,
                recurring: { interval: input.interval },
              },
              quantity: 1,
            },
          ],
          success_url: `${origin}/billing?success=true`,
          cancel_url: `${origin}/pricing?cancelled=true`,
        });

        return { url: session.url };
      }),

    subscription: protectedProcedure.query(async ({ ctx }) => {
      return {
        tier: ctx.user.subscriptionTier || "free",
        stripeSubscriptionId: ctx.user.stripeSubscriptionId,
      };
    }),

    payments: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(async ({ ctx, input }) => {
        return getUserPayments(ctx.user.id, input?.limit ?? 20);
      }),

    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user.stripeSubscriptionId) {
        throw new Error("No active subscription to cancel");
      }
      await stripe.subscriptions.cancel(ctx.user.stripeSubscriptionId);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
