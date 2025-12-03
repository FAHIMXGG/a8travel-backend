"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserAdminSchema = exports.updatePasswordSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    image: zod_1.z.string().url().optional(),
    bio: zod_1.z.string().max(500).optional(),
    travelInterests: zod_1.z.array(zod_1.z.string()).optional(),
    visitedCountries: zod_1.z.array(zod_1.z.string()).optional(),
    currentLocation: zod_1.z.string().optional(),
    gallery: zod_1.z.array(zod_1.z.string()).optional()
});
exports.updatePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(6)
});
// Admin: set role/block
exports.updateUserAdminSchema = zod_1.z.object({
    role: zod_1.z.enum(["USER", "ADMIN", "MODERATOR"]).optional(),
    isBlocked: zod_1.z.boolean().optional()
});
