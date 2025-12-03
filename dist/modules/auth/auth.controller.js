"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../config/prisma");
const env_1 = require("../../config/env");
const apiResponse_1 = require("../../utils/apiResponse");
const auth_validation_1 = require("./auth.validation");
const sendEmail_1 = require("../../utils/sendEmail");
const jwtSecret = env_1.env.JWT_SECRET;
const signToken = (payload, options) => {
    return jsonwebtoken_1.default.sign(payload, jwtSecret, options);
};
const setAuthCookie = (res, token) => {
    res.cookie(env_1.env.COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: env_1.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};
// POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const parsed = auth_validation_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const { name, email, password } = parsed.data;
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(409).json((0, apiResponse_1.fail)("Email already in use"));
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash
            }
        });
        const token = signToken({ id: user.id, role: user.role }, { expiresIn: env_1.env.JWT_EXPIRES_IN || "7d" });
        setAuthCookie(res, token);
        return res.status(201).json((0, apiResponse_1.ok)({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token
        }, "Registered successfully"));
    }
    catch (err) {
        next(err);
    }
};
exports.register = register;
// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const parsed = auth_validation_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const { email, password } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || user.isBlocked) {
            return res.status(401).json((0, apiResponse_1.fail)("Invalid credentials"));
        }
        const match = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json((0, apiResponse_1.fail)("Invalid credentials"));
        }
        // downgrade expired subscription at login
        if (user.subscriptionStatus === "ACTIVE" &&
            user.subscriptionExpiresAt &&
            user.subscriptionExpiresAt < new Date()) {
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { subscriptionStatus: "EXPIRED" }
            });
            user.subscriptionStatus = "EXPIRED";
        }
        const token = signToken({ id: user.id, role: user.role }, { expiresIn: env_1.env.JWT_EXPIRES_IN || "7d" });
        setAuthCookie(res, token);
        return res.json((0, apiResponse_1.ok)({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            token
        }, "Logged in successfully"));
    }
    catch (err) {
        next(err);
    }
};
exports.login = login;
// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
    try {
        const parsed = auth_validation_1.forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const { email } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // don't reveal user existence
            return res.json((0, apiResponse_1.ok)(null, "If that email exists, OTP has been sent"));
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto_1.default.createHash("sha256").update(otp).digest("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { otpHash, otpExpiresAt: expires }
        });
        await (0, sendEmail_1.sendEmail)(user.email, "Reset your password", `<p>Your OTP code is <b>${otp}</b>. It expires in 15 minutes.</p>`);
        return res.json((0, apiResponse_1.ok)(null, "If that email exists, OTP has been sent"));
    }
    catch (err) {
        next(err);
    }
};
exports.forgotPassword = forgotPassword;
// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
    try {
        const parsed = auth_validation_1.resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const { email, otp, newPassword } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.otpHash || !user.otpExpiresAt) {
            return res.status(400).json((0, apiResponse_1.fail)("Invalid or expired OTP"));
        }
        if (user.otpExpiresAt < new Date()) {
            return res.status(400).json((0, apiResponse_1.fail)("OTP expired"));
        }
        const otpHash = crypto_1.default.createHash("sha256").update(otp).digest("hex");
        if (otpHash !== user.otpHash) {
            return res.status(400).json((0, apiResponse_1.fail)("Invalid OTP"));
        }
        const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                otpHash: null,
                otpExpiresAt: null
            }
        });
        return res.json((0, apiResponse_1.ok)(null, "Password reset successfully"));
    }
    catch (err) {
        next(err);
    }
};
exports.resetPassword = resetPassword;
// POST /api/auth/logout
const logout = async (_req, res) => {
    res.clearCookie(env_1.env.COOKIE_NAME);
    return res.json((0, apiResponse_1.ok)(null, "Logged out"));
};
exports.logout = logout;
