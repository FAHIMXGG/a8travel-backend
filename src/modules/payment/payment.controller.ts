import { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import { env } from "../../config/env";
import { ok, fail } from "../../utils/apiResponse";
import { prisma } from "../../config/prisma";
import { sendEmail } from "../../utils/sendEmail";

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// POST /api/payments/create-checkout-session
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { amount, currency = "usd", subscriptionDays = 30, couponCode } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json(fail("Invalid amount"));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json(fail("User not found"));

    let finalAmount = amount;
    let discountAmount = 0;
    let couponId: string | null = null;
    let appliedCoupon = null;

    // Validate and apply coupon if provided
    if (couponCode) {
      // @ts-expect-error - Prisma client types are cached, but coupon model exists
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() }
      });

      if (!coupon) {
        return res.status(400).json(fail("Invalid coupon code"));
      }

      if (!coupon.isActive) {
        return res.status(400).json(fail("Coupon is not active"));
      }

      // Check if coupon has expired (expiresAt is now always required)
      if (new Date() > coupon.expiresAt) {
        return res.status(400).json(fail("Coupon has expired"));
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json(fail("Coupon usage limit exceeded"));
      }

      if (coupon.minAmount && amount < coupon.minAmount) {
        return res.status(400).json(
          fail(
            `Minimum purchase amount of ${coupon.minAmount / 100}${
              coupon.minAmount >= 1000 ? "" : " cents"
            } required`
          )
        );
      }

      // Calculate discount
      if (coupon.discountType === "PERCENTAGE") {
        discountAmount = Math.floor((amount * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
      } else {
        discountAmount = coupon.discountValue;
      }

      // Ensure discount doesn't exceed the amount
      if (discountAmount > amount) {
        discountAmount = amount;
      }

      finalAmount = amount - discountAmount;
      couponId = coupon.id;
      appliedCoupon = {
        code: coupon.code,
        discountAmount,
        discountType: coupon.discountType
      };
    }

    // Ensure Stripe customer
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

    // Frontend base URL (where Stripe will redirect back)
    const frontendBase = env.CLIENT_URL || "https://example.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: finalAmount, // Use discounted amount
            product_data: {
              name: "Premium Subscription",
              description: `Premium access for ${subscriptionDays} days${
                appliedCoupon
                  ? ` (${appliedCoupon.discountType === "PERCENTAGE" ? appliedCoupon.code : `Coupon ${appliedCoupon.code} applied`})`
                  : ""
              }`
            }
          }
        }
      ],
      success_url: `${frontendBase}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBase}/payment-cancel`,
      metadata: {
        userId: user.id,
        subscriptionDays: subscriptionDays.toString(),
        originalAmount: amount.toString(),
        finalAmount: finalAmount.toString(),
        discountAmount: discountAmount.toString(),
        couponId: couponId || "",
        couponCode: couponCode?.toUpperCase() || ""
      }
    });

    // This is what you're expecting: session.url like "https://checkout.stripe.com/c/pay/..."
    return res.json(
      ok(
        {
          checkoutUrl: session.url,
          sessionId: session.id,
          originalAmount: amount,
          finalAmount,
          discountAmount: appliedCoupon ? discountAmount : 0,
          coupon: appliedCoupon
        },
        "Checkout session created"
      )
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/confirm
// Called from your frontend AFTER Stripe redirects back to success page
export const confirmSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { subscriptionDays = 30, sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json(fail("sessionId is required"));
    }

    // Verify the session is paid
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res
        .status(400)
        .json(fail("Payment not completed. Cannot activate subscription."));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json(fail("User not found"));

    // Increment coupon usage count if coupon was used
    if (session.metadata?.couponId) {
      // @ts-expect-error - Prisma client types are cached, but coupon model exists
      await prisma.coupon.update({
        where: { id: session.metadata.couponId },
        data: {
          usedCount: {
            increment: 1
          }
        }
      });
    }

    const now = new Date();
    const newExpire =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? new Date(
            user.subscriptionExpiresAt.getTime() +
              subscriptionDays * 24 * 60 * 60 * 1000
          )
        : new Date(now.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: newExpire
      }
    });

    // Optional: send confirmation email
    try {
      await sendEmail(
        user.email,
        "Your subscription is active 🎉",
        `<p>Hi ${user.name},</p>
         <p>Thanks for subscribing! Your premium access is now active.</p>
         <p>Expires on: <b>${updated.subscriptionExpiresAt?.toISOString()}</b></p>
         <p>Happy travels! 🌍</p>`
      );
    } catch (emailErr) {
      console.error("Failed to send subscription email", emailErr);
    }

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
