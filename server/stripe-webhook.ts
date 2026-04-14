import { Request, Response } from "express";
import Stripe from "stripe";
import { updateUserStripe, createPayment, createNotification } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
        if (!userId) break;

        // Update customer ID on user
        if (session.customer) {
          await updateUserStripe(userId, { stripeCustomerId: session.customer as string });
        }

        // If subscription mode, update subscription
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const tier = session.metadata?.plan_id as "pro" | "elite" || "pro";
          await updateUserStripe(userId, {
            stripeSubscriptionId: sub.id,
            subscriptionTier: tier,
          });

          await createNotification({
            userId,
            type: "subscription",
            title: "Subscription Activated",
            message: `Your ${tier.charAt(0).toUpperCase() + tier.slice(1)} plan is now active. Enjoy full access to all features!`,
          });
        }

        // If payment mode, record payment
        if (session.mode === "payment" && session.payment_intent) {
          await createPayment({
            userId,
            stripePaymentIntentId: session.payment_intent as string,
            amount: session.amount_total || 0,
            currency: session.currency || "usd",
            status: "succeeded",
            description: session.metadata?.description || "One-time payment",
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const db = await getDb();
        if (!db) break;
        const customer = sub.customer as string;
        const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customer)).limit(1);
        if (userResult.length === 0) break;
        const user = userResult[0];

        if (sub.status === "active") {
          // Subscription renewed or updated
          await updateUserStripe(user.id, { stripeSubscriptionId: sub.id });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const db = await getDb();
        if (!db) break;
        const customer = sub.customer as string;
        const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customer)).limit(1);
        if (userResult.length === 0) break;
        const user = userResult[0];

        await updateUserStripe(user.id, {
          stripeSubscriptionId: null,
          subscriptionTier: "free",
        });

        await createNotification({
          userId: user.id,
          type: "subscription",
          title: "Subscription Cancelled",
          message: "Your subscription has been cancelled. You've been moved to the Free plan.",
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const db = await getDb();
        if (!db) break;
        const customer = invoice.customer as string;
        const userResult = await db.select().from(users).where(eq(users.stripeCustomerId, customer)).limit(1);
        if (userResult.length === 0) break;

        const paymentIntentId = (invoice as any).payment_intent as string | null;
        if (paymentIntentId) {
          await createPayment({
            userId: userResult[0].id,
            stripePaymentIntentId: paymentIntentId,
            stripeInvoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "succeeded",
            description: `Subscription invoice`,
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
  }

  res.json({ received: true });
}
