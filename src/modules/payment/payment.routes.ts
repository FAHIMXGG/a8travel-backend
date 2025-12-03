import { Router } from "express";
import {
  createCheckoutSession,
  confirmSubscription
} from "./payment.controller";
import { authGuard } from "../../middlewares/authMiddleware";

const router = Router();

// Create Stripe Checkout session (returns checkoutUrl)
router.post("/create-intent", authGuard(), createCheckoutSession);

// Confirm subscription after successful payment
router.post("/confirm", authGuard(), confirmSubscription);

export default router;
