import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { ok, fail } from "../../utils/apiResponse";
import {
  updateProfileSchema,
  updatePasswordSchema,
  updateUserAdminSchema
} from "./user.validation";
import bcrypt from "bcrypt";

// GET /api/users/:id
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        travelInterests: true,
        visitedCountries: true,
        currentLocation: true,
        gallery: true,
        ratingAverage: true,
        ratingCount: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        isBlocked: true
      }
    });

    if (!user) return res.status(404).json(fail("User not found"));

    return res.json(ok(user));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id (self or admin)
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user || (req.user.id !== id && req.user.role !== "ADMIN")) {
      return res.status(403).json(fail("Forbidden"));
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const data = parsed.data;

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        bio: true,
        travelInterests: true,
        visitedCountries: true,
        currentLocation: true,
        gallery: true,
        ratingAverage: true,
        ratingCount: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        isBlocked: true
      }
    });

    return res.json(ok(user, "Profile updated"));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/password
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user || req.user.id !== id) {
      return res.status(403).json(fail("Forbidden"));
    }

    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json(fail("User not found"));

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(400).json(fail("Current password incorrect"));

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    return res.json(ok(null, "Password updated"));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/admin (admin can set moderator, block user)
export const updateUserAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden"));
    }

    const { id } = req.params;
    const parsed = updateUserAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true
      }
    });

    return res.json(ok(user, "User updated by admin"));
  } catch (err) {
    next(err);
  }
};
