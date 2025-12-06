import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { ok, fail } from "../../utils/apiResponse";
import {
  updateProfileSchema,
  updatePasswordSchema,
  updateUserAdminSchema
} from "./user.validation";
import bcrypt from "bcrypt";

// Common select for user public profile
const userPublicSelect = {
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
  isBlocked: true,
  createdAt: true
};

// GET /api/users/me
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json(fail("Unauthorized"));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userPublicSelect
    });

    if (!user) {
      return res.status(404).json(fail("User not found"));
    }

    return res.json(ok(user));
  } catch (err) {
    next(err);
  }
};

// GET /api/users (admin) – list + search + filter + pagination
export const adminListUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Forbidden"));
    }

    const {
      page = "1",
      limit = "10",
      search,
      status,
      id
    } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: "blocked" | "unblocked";
      id?: string;
    };

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const limitNum = Math.max(parseInt(limit || "10", 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // If specific ID is provided, ignore other filters
    if (id) {
      where.id = id;
    } else {
      if (search && search.trim().length > 0) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } }
        ];
      }

      if (status === "blocked") {
        where.isBlocked = true;
      } else if (status === "unblocked") {
        where.isBlocked = false;
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        select: userPublicSelect
      })
    ]);

    return res.json(
      ok({
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        data: users
      })
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id  (any authenticated user can see other profile)
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect
    });

    if (!user) return res.status(404).json(fail("User not found"));

    return res.json(ok(user));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id (self or admin)
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
      select: userPublicSelect
    });

    return res.json(ok(user, "Profile updated"));
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id/password
export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

// PATCH /api/users/:id/admin (admin can set moderator, block user, unblock user)
export const updateUserAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
