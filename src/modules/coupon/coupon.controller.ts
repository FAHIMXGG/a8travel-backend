import { Request, Response, NextFunction } from "express";
import { ok, fail } from "../../utils/apiResponse";
import { prisma } from "../../config/prisma";
import { createCouponSchema, validateCouponSchema } from "./coupon.validation";

// POST /api/coupons - Admin creates a coupon
export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden - Admin access required"));
    }

    const parsed = createCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(fail("Validation error", parsed.error.format()));
    }

    const data = parsed.data;

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: data.code }
    });

    if (existingCoupon) {
      return res.status(400).json(fail("Coupon code already exists"));
    }

    // Validate discount value based on type
    if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
      return res
        .status(400)
        .json(fail("Percentage discount cannot exceed 100%"));
    }

    // Validate expiration date is in the future
    const expiresAt = new Date(data.expiresAt);
    if (expiresAt <= new Date()) {
      return res
        .status(400)
        .json(fail("Expiration date must be in the future"));
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minAmount: data.minAmount,
        maxDiscount: data.maxDiscount,
        expiresAt,
        usageLimit: data.usageLimit,
        isActive: data.isActive ?? true,
        createdBy: req.user.id
      }
    });

    return res.json(ok(coupon, "Coupon created successfully"));
  } catch (err) {
    next(err);
  }
};

// GET /api/coupons - Admin lists all coupons
export const listCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden - Admin access required"));
    }

    const { page = "1", limit = "10", isActive } = req.query as {
      page?: string;
      limit?: string;
      isActive?: string;
    };

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const limitNum = Math.max(parseInt(limit || "10", 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [total, coupons] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Add expiration status to each coupon
    const couponsWithStatus = coupons.map(coupon => ({
      ...coupon,
      isExpired: new Date() > coupon.expiresAt
    }));

    return res.json(
      ok({
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        data: couponsWithStatus
      })
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/coupons/validate - Validate and calculate discount
export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = validateCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(fail("Validation error", parsed.error.format()));
    }

    const { code, amount } = parsed.data;

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) {
      return res.status(404).json(fail("Invalid coupon code"));
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json(fail("Coupon is not active"));
    }

    // Check if coupon has expired (expiresAt is now always required)
    if (new Date() > coupon.expiresAt) {
      return res.status(400).json(fail("Coupon has expired"));
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json(fail("Coupon usage limit exceeded"));
    }

    // Check minimum amount
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
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = Math.floor((amount * coupon.discountValue) / 100);
      // Apply max discount if specified
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // FIXED discount
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed the amount
    if (discountAmount > amount) {
      discountAmount = amount;
    }

    const finalAmount = amount - discountAmount;

    return res.json(
      ok(
        {
          coupon: {
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
          },
          originalAmount: amount,
          discountAmount,
          finalAmount
        },
        "Coupon is valid"
      )
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/coupons/:id - Get single coupon (Admin)
export const getCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden - Admin access required"));
    }

    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return res.status(404).json(fail("Coupon not found"));
    }

    return res.json(ok(coupon));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/coupons/:id - Update coupon (Admin)
export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden - Admin access required"));
    }

    const { id } = req.params;
    const parsed = createCouponSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(fail("Validation error", parsed.error.format()));
    }

    const data = parsed.data;

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!existingCoupon) {
      return res.status(404).json(fail("Coupon not found"));
    }

    // If code is being updated, check if new code already exists
    if (data.code && data.code !== existingCoupon.code) {
      const codeExists = await prisma.coupon.findUnique({
        where: { code: data.code }
      });
      if (codeExists) {
        return res.status(400).json(fail("Coupon code already exists"));
      }
    }

    // Validate discount value
    if (data.discountType === "PERCENTAGE" && data.discountValue && data.discountValue > 100) {
      return res
        .status(400)
        .json(fail("Percentage discount cannot exceed 100%"));
    }

    const updateData: any = { ...data };
    // If expiresAt is being updated, validate it's in the future
    if (data.expiresAt) {
      const newExpiresAt = new Date(data.expiresAt);
      if (newExpiresAt <= new Date()) {
        return res
          .status(400)
          .json(fail("Expiration date must be in the future"));
      }
      updateData.expiresAt = newExpiresAt;
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });

    return res.json(ok(coupon, "Coupon updated successfully"));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/coupons/:id - Delete coupon (Admin)
export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden - Admin access required"));
    }

    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id }
    });

    if (!coupon) {
      return res.status(404).json(fail("Coupon not found"));
    }

    await prisma.coupon.delete({
      where: { id }
    });

    return res.json(ok(null, "Coupon deleted successfully"));
  } catch (err) {
    next(err);
  }
};

