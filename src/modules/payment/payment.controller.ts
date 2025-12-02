import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { env } from "../../config/env";
import { ok, fail } from "../../utils/apiResponse";
import { prisma } from "../../config/prisma";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia" as any // or remove apiVersion if annoying
});

// POST /api/payments/create-intent
export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { amount, currency = "usd", subscriptionDays = 30 } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json(fail("Invalid amount"));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json(fail("User not found"));

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata: {
        userId: user.id,
        subscriptionDays: subscriptionDays.toString()
      }
    });

    // In real app, you should confirm via webhook.
    // For demo: pretend successful and update immediately when frontend confirms.

    return res.json(
      ok(
        {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        },
        "Payment intent created"
      )
    );
  } catch (err) {
    next(err);
  }
};

// (Optional) POST /api/payments/confirm – called by frontend AFTER success
export const confirmSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { subscriptionDays = 30 } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json(fail("User not found"));

    const now = new Date();
    const newExpire =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? new Date(user.subscriptionExpiresAt.getTime() + subscriptionDays * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: newExpire
      }
    });

    // Send email confirmation
    // (reuse sendEmail util)
    // You can optionally add it here if you want:
    // await sendEmail(...)

    return res.json(
      ok(
        {
          subscriptionStatus: updated.subscriptionStatus,
          subscriptionExpiresAt: updated.subscriptionExpiresAt
        },
        "Subscription activated"
      )
    );
  } catch (err) {
    next(err);
  }
};
