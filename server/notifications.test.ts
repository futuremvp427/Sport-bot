import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    stripeCustomerId: null,
    subscriptionTier: "free",
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Billing Plans ─────────────────────────────────────────────

describe("billing.plans", () => {
  it("returns all 3 subscription plans as public data", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const plans = await caller.billing.plans();

    expect(plans).toHaveLength(3);
    expect(plans[0].id).toBe("free");
    expect(plans[0].priceMonthly).toBe(0);
    expect(plans[1].id).toBe("pro");
    expect(plans[1].priceMonthly).toBe(2999);
    expect(plans[1].popular).toBe(true);
    expect(plans[2].id).toBe("elite");
    expect(plans[2].priceMonthly).toBe(7999);

    for (const plan of plans) {
      expect(plan.features.length).toBeGreaterThan(0);
      for (const feature of plan.features) {
        expect(feature).toHaveProperty("text");
        expect(feature).toHaveProperty("included");
      }
    }
  });

  it("returns yearly pricing with 20% discount", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const plans = await caller.billing.plans();

    const pro = plans.find((p: any) => p.id === "pro")!;
    const elite = plans.find((p: any) => p.id === "elite")!;

    // Yearly should be less than 12 * monthly
    expect(pro.priceYearly).toBeLessThan(pro.priceMonthly * 12);
    expect(elite.priceYearly).toBeLessThan(elite.priceMonthly * 12);
  });
});

// ─── Billing Subscription ──────────────────────────────────────

describe("billing.subscription", () => {
  it("returns the current user subscription tier", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sub = await caller.billing.subscription();

    expect(sub).toHaveProperty("tier");
    expect(sub.tier).toBe("free");
    expect(sub).toHaveProperty("stripeSubscriptionId");
    expect(sub.stripeSubscriptionId).toBeNull();
  });
});

// ─── Billing Checkout ──────────────────────────────────────────

describe("billing.createCheckout", () => {
  it("validates plan ID input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Invalid plan should throw
    await expect(
      caller.billing.createCheckout({ planId: "invalid" as any, interval: "month" })
    ).rejects.toThrow();
  });
});

// ─── Billing Cancel ────────────────────────────────────────────

describe("billing.cancelSubscription", () => {
  it("throws when no active subscription exists", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.billing.cancelSubscription()).rejects.toThrow("No active subscription to cancel");
  });
});

// ─── Notification Preferences ──────────────────────────────────

describe("notificationPreferences.get", () => {
  it("returns default preferences when none are set", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const prefs = await caller.notificationPreferences.get();

    expect(prefs).toHaveProperty("edgeAlerts");
    expect(prefs).toHaveProperty("arbAlerts");
    expect(prefs).toHaveProperty("modelUpdates");
    expect(prefs).toHaveProperty("betResults");
    expect(prefs).toHaveProperty("systemAlerts");
    expect(prefs.edgeAlerts).toBe(true);
    expect(prefs.arbAlerts).toBe(true);
    expect(prefs.modelUpdates).toBe(true);
    expect(prefs.betResults).toBe(true);
    expect(prefs.systemAlerts).toBe(true);
    expect(prefs.minEdgeThreshold).toBe(3);
  });
});

// ─── Notifications ─────────────────────────────────────────────

describe("notifications.unreadCount", () => {
  it("returns a number for unread count", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const count = await caller.notifications.unreadCount();

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe("notifications.list", () => {
  it("returns an array of notifications", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const notifications = await caller.notifications.list({ limit: 10 });

    expect(Array.isArray(notifications)).toBe(true);
  });
});

describe("notifications.createTest", () => {
  it("accepts all notification types", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const types = ["edge_alert", "arb_alert", "model_update", "bet_result", "system"] as const;

    for (const type of types) {
      const result = await caller.notifications.createTest({
        type,
        title: `Test ${type}`,
        message: `Test message for ${type}`,
      });
      expect(result).toEqual({ success: true });
    }
  });

  it("rejects invalid notification types", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.notifications.createTest({
        type: "invalid_type" as any,
        title: "Test",
        message: "Test",
      })
    ).rejects.toThrow();
  });
});

describe("notifications.markAllRead", () => {
  it("marks all notifications as read successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.markAllRead();
    expect(result).toEqual({ success: true });
  });
});
