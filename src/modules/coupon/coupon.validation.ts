import { z } from "zod";

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().max(500).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().positive(),
  minAmount: z.number().int().nonnegative().optional(),
  maxDiscount: z.number().int().nonnegative().optional(),
  expiresAt: z.string().datetime("Expiration date is required and must be a valid date"),
  usageLimit: z.number().int().positive().optional(),
  isActive: z.boolean().default(true)
});

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  amount: z.number().positive()
});

