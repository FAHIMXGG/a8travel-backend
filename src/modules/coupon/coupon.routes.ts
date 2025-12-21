import { Router } from "express";
import {
  createCoupon,
  listCoupons,
  validateCoupon,
  getCoupon,
  updateCoupon,
  deleteCoupon
} from "./coupon.controller";
import { authGuard } from "../../middlewares/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

// Admin routes
router.post("/", authGuard([Role.ADMIN]), createCoupon);
router.get("/", authGuard([Role.ADMIN]), listCoupons);
router.get("/:id", authGuard([Role.ADMIN]), getCoupon);
router.patch("/:id", authGuard([Role.ADMIN]), updateCoupon);
router.delete("/:id", authGuard([Role.ADMIN]), deleteCoupon);

// Public route (for validating coupon during checkout)
router.post("/validate", validateCoupon);

export default router;


