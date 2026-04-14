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
