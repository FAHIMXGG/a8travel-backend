"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserAdmin = exports.updatePassword = exports.updateProfile = exports.getUserProfile = exports.getMe = void 0;
const prisma_1 = require("../../config/prisma");
const apiResponse_1 = require("../../utils/apiResponse");
const user_validation_1 = require("./user.validation");
const bcrypt_1 = __importDefault(require("bcrypt"));
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
    isBlocked: true
};
// GET /api/users/me
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: userPublicSelect
        });
        if (!user) {
            return res.status(404).json((0, apiResponse_1.fail)("User not found"));
        }
        return res.json((0, apiResponse_1.ok)(user));
    }
    catch (err) {
        next(err);
    }
};
exports.getMe = getMe;
// GET /api/users/:id
const getUserProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: userPublicSelect
        });
        if (!user)
            return res.status(404).json((0, apiResponse_1.fail)("User not found"));
        return res.json((0, apiResponse_1.ok)(user));
    }
    catch (err) {
        next(err);
    }
};
exports.getUserProfile = getUserProfile;
// PATCH /api/users/:id (self or admin)
const updateProfile = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.user || (req.user.id !== id && req.user.role !== "ADMIN")) {
            return res.status(403).json((0, apiResponse_1.fail)("Forbidden"));
        }
        const parsed = user_validation_1.updateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const data = parsed.data;
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data,
            select: userPublicSelect
        });
        return res.json((0, apiResponse_1.ok)(user, "Profile updated"));
    }
    catch (err) {
        next(err);
    }
};
exports.updateProfile = updateProfile;
// PATCH /api/users/:id/password
const updatePassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.user || req.user.id !== id) {
            return res.status(403).json((0, apiResponse_1.fail)("Forbidden"));
        }
        const parsed = user_validation_1.updatePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const { currentPassword, newPassword } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            return res.status(404).json((0, apiResponse_1.fail)("User not found"));
        const match = await bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!match)
            return res.status(400).json((0, apiResponse_1.fail)("Current password incorrect"));
        const passwordHash = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id },
            data: { passwordHash }
        });
        return res.json((0, apiResponse_1.ok)(null, "Password updated"));
    }
    catch (err) {
        next(err);
    }
};
exports.updatePassword = updatePassword;
// PATCH /api/users/:id/admin (admin can set moderator, block user)
const updateUserAdmin = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== "ADMIN") {
            return res.status(403).json((0, apiResponse_1.fail)("Forbidden"));
        }
        const { id } = req.params;
        const parsed = user_validation_1.updateUserAdminSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const user = await prisma_1.prisma.user.update({
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
        return res.json((0, apiResponse_1.ok)(user, "User updated by admin"));
    }
    catch (err) {
        next(err);
    }
};
exports.updateUserAdmin = updateUserAdmin;
