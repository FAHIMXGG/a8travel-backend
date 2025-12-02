import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import crypto from "crypto";

import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ok, fail } from "../../utils/apiResponse";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "./auth.validation";
import { sendEmail } from "../../utils/sendEmail";
import { Role } from "@prisma/client";

const jwtSecret: Secret = env.JWT_SECRET as Secret;

const signToken = (payload: object, options?: SignOptions) => {
  return jwt.sign(payload, jwtSecret, options);
};

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json(fail("Email already in use"));

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    });

    const token = signToken(
      { id: user.id, role: user.role as Role },
      { expiresIn: (env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d" }
    );

    setAuthCookie(res, token);

    return res.status(201).json(
      ok(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          token
        },
        "Registered successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isBlocked) {
      return res.status(401).json(fail("Invalid credentials"));
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json(fail("Invalid credentials"));
    }

    // downgrade expired subscription at login
    if (
      user.subscriptionStatus === "ACTIVE" &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt < new Date()
    ) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: "EXPIRED" }
      });
      user.subscriptionStatus = "EXPIRED";
    }

    const token = signToken(
      { id: user.id, role: user.role as Role },
      { expiresIn: (env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d" }
    );

    setAuthCookie(res, token);

    return res.json(
      ok(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          token
        },
        "Logged in successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // don't reveal user existence
      return res.json(ok(null, "If that email exists, OTP has been sent"));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash, otpExpiresAt: expires }
    });

    await sendEmail(
      user.email,
      "Reset your password",
      `<p>Your OTP code is <b>${otp}</b>. It expires in 15 minutes.</p>`
    );

    return res.json(ok(null, "If that email exists, OTP has been sent"));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }
    const { email, otp, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json(fail("Invalid or expired OTP"));
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json(fail("OTP expired"));
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    if (otpHash !== user.otpHash) {
      return res.status(400).json(fail("Invalid OTP"));
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otpHash: null,
        otpExpiresAt: null
      }
    });

    return res.json(ok(null, "Password reset successfully"));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (_req: Request, res: Response) => {
  res.clearCookie(env.COOKIE_NAME);
  return res.json(ok(null, "Logged out"));
};
