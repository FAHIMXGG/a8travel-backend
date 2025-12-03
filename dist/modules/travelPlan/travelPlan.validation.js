"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSchema = exports.updateTravelPlanStatusSchema = exports.createTravelPlanSchema = void 0;
const zod_1 = require("zod");
exports.createTravelPlanSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    destinationCountry: zod_1.z.string().optional(),
    destinationCity: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime(), // ISO string from frontend
    endDate: zod_1.z.string().datetime(),
    budgetMin: zod_1.z.number().int().nonnegative().optional(),
    budgetMax: zod_1.z.number().int().nonnegative().optional(),
    travelType: zod_1.z.enum(["SOLO", "FAMILY", "FRIENDS"]),
    description: zod_1.z.string().max(2000).optional(),
    groupChatLink: zod_1.z.string().url().optional(),
    contact: zod_1.z.string().min(3).optional(),
    images: zod_1.z.array(zod_1.z.string().url()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    isPublic: zod_1.z.boolean().optional(),
    maxParticipants: zod_1.z.number().int().positive().optional()
});
exports.updateTravelPlanStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["OPEN", "CLOSED", "CANCELED", "FULL"])
});
exports.reviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(2000).optional()
});
