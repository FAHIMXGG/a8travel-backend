import { Router } from "express";
import { createPaymentIntent, confirmSubscription } from "./payment.controller";
import { authGuard } from "../../middlewares/authMiddleware";

const router = Router();

router.post("/create-intent", authGuard(), createPaymentIntent);
router.post("/confirm", authGuard(), confirmSubscription);

export default router;
