"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmSubscription = exports.createPaymentIntent = void 0;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../../config/env");
const apiResponse_1 = require("../../utils/apiResponse");
const prisma_1 = require("../../config/prisma");
const stripe = new stripe_1.default(env_1.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia" // or remove apiVersion if annoying
});
// POST /api/payments/create-intent
const createPaymentIntent = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { amount, currency = "usd", subscriptionDays = 30 } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json((0, apiResponse_1.fail)("Invalid amount"));
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json((0, apiResponse_1.fail)("User not found"));
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.name
            });
            customerId = customer.id;
            await prisma_1.prisma.user.update({
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
        return res.json((0, apiResponse_1.ok)({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        }, "Payment intent created"));
    }
    catch (err) {
        next(err);
    }
};
exports.createPaymentIntent = createPaymentIntent;
// (Optional) POST /api/payments/confirm – called by frontend AFTER success
const confirmSubscription = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { subscriptionDays = 30 } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json((0, apiResponse_1.fail)("User not found"));
        const now = new Date();
        const newExpire = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
            ? new Date(user.subscriptionExpiresAt.getTime() + subscriptionDays * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + subscriptionDays * 24 * 60 * 60 * 1000);
        const updated = await prisma_1.prisma.user.update({
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
        return res.json((0, apiResponse_1.ok)({
            subscriptionStatus: updated.subscriptionStatus,
            subscriptionExpiresAt: updated.subscriptionExpiresAt
        }, "Subscription activated"));
    }
    catch (err) {
        next(err);
    }
};
exports.confirmSubscription = confirmSubscription;
