import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  notifications,
  InsertNotification,
  notificationPreferences,
  InsertNotificationPreference,
  payments,
  InsertPayment,
  placedBets,
  InsertPlacedBet,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Stripe User Helpers ────────────────────────────────────────

export async function updateUserStripe(userId: number, data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionTier?: "free" | "pro" | "elite" }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ─── Notification Helpers ───────────────────────────────────────

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return result[0]?.count ?? 0;
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
}

// ─── Notification Preferences ───────────────────────────────────

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertNotificationPreferences(userId: number, prefs: Partial<InsertNotificationPreference>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getNotificationPreferences(userId);
  if (existing) {
    await db.update(notificationPreferences).set({ ...prefs, updatedAt: new Date() }).where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({ userId, ...prefs });
  }
}

// ─── Payment Helpers ────────────────────────────────────────────

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(payments).values(data);
}

export async function getUserPayments(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt)).limit(limit);
}

// ─── Placed Bet Helpers ────────────────────────────────────────

export async function createPlacedBet(data: Omit<InsertPlacedBet, "id" | "createdAt" | "settledAt">) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(placedBets).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getPlacedBets(
  userId: number,
  filters: { sport?: string; result?: string; limit: number; offset: number }
) {
  const db = await getDb();
  if (!db) return { bets: [], total: 0 };

  const conditions = [eq(placedBets.userId, userId)];
  if (filters.sport) {
    conditions.push(eq(placedBets.sport, filters.sport));
  }
  if (filters.result) {
    conditions.push(eq(placedBets.outcome, filters.result as "win" | "loss" | "pending"));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [bets, countResult] = await Promise.all([
    db
      .select()
      .from(placedBets)
      .where(whereClause)
      .orderBy(desc(placedBets.createdAt))
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(placedBets)
      .where(whereClause),
  ]);

  return { bets, total: countResult[0]?.count ?? 0 };
}

export async function getPlacedBetStats(userId: number) {
  const db = await getDb();
  if (!db)
    return {
      totalBets: 0,
      wins: 0,
      losses: 0,
      pending: 0,
      totalStaked: 0,
      totalProfitLoss: 0,
      winRate: 0,
      roi: 0,
    };

  const result = await db
    .select({
      totalBets: sql<number>`count(*)`,
      wins: sql<number>`SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END)`,
      losses: sql<number>`SUM(CASE WHEN outcome = 'loss' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN outcome = 'pending' THEN 1 ELSE 0 END)`,
      totalStaked: sql<number>`COALESCE(SUM(stake), 0)`,
      totalProfitLoss: sql<number>`COALESCE(SUM(profitLoss), 0)`,
    })
    .from(placedBets)
    .where(eq(placedBets.userId, userId));

  const stats = result[0] ?? {
    totalBets: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    totalStaked: 0,
    totalProfitLoss: 0,
  };

  const settled = (stats.wins ?? 0) + (stats.losses ?? 0);
  return {
    ...stats,
    winRate: settled > 0 ? (stats.wins ?? 0) / settled : 0,
    roi: (stats.totalStaked ?? 0) > 0 ? (stats.totalProfitLoss ?? 0) / (stats.totalStaked ?? 0) : 0,
  };
}
