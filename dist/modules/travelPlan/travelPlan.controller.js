"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.createOrUpdateReview = exports.getPlanParticipants = exports.joinTravelPlan = exports.updateTravelPlanStatus = exports.getTravelPlanById = exports.matchTravelPlans = exports.getAllTravelPlans = exports.createTravelPlan = void 0;
const prisma_1 = require("../../config/prisma");
const apiResponse_1 = require("../../utils/apiResponse");
const travelPlan_validation_1 = require("./travelPlan.validation");
// Helper: derive auto status based on dates + max participants
const deriveStatus = (plan) => {
    const now = new Date();
    // manual override stays if closed or canceled
    if (plan.status === "CANCELED" || plan.status === "CLOSED")
        return plan.status;
    if (plan.maxParticipants && plan.participantsCount >= plan.maxParticipants) {
        return "FULL";
    }
    if (now < plan.startDate)
        return "OPEN";
    if (now >= plan.startDate && now <= plan.endDate)
        return "ONGOING";
    return "ENDED";
};
// POST /api/travel-plans
const createTravelPlan = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const parsed = travelPlan_validation_1.createTravelPlanSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const data = parsed.data;
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        if (startDate >= endDate) {
            return res.status(400).json((0, apiResponse_1.fail)("Start date must be before end date"));
        }
        const plan = await prisma_1.prisma.travelPlan.create({
            data: {
                hostId: req.user.id,
                title: data.title,
                destinationCountry: data.destinationCountry,
                destinationCity: data.destinationCity,
                startDate,
                endDate,
                budgetMin: data.budgetMin,
                budgetMax: data.budgetMax,
                travelType: data.travelType,
                description: data.description,
                groupChatLink: data.groupChatLink,
                contact: data.contact,
                images: data.images ?? [],
                tags: data.tags ?? [],
                isPublic: data.isPublic ?? true,
                maxParticipants: data.maxParticipants
            }
        });
        const status = deriveStatus(plan);
        return res.status(201).json((0, apiResponse_1.ok)({ ...plan, status }, "Travel plan created"));
    }
    catch (err) {
        next(err);
    }
};
exports.createTravelPlan = createTravelPlan;
// GET /api/travel-plans  (list all, optional filters later)
// GET /api/travel-plans  (list all with pagination)
const getAllTravelPlans = async (req, res, next) => {
    try {
        const { destination, fromDate, toDate, tags, page = "1", limit = "10" } = req.query;
        const pageNum = Math.max(parseInt(page, 10), 1);
        const limitNum = Math.max(parseInt(limit, 10), 1);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            isPublic: true
        };
        if (destination && typeof destination === "string") {
            where.OR = [
                { destinationCountry: { contains: destination, mode: "insensitive" } },
                { destinationCity: { contains: destination, mode: "insensitive" } }
            ];
        }
        if (fromDate && typeof fromDate === "string") {
            const from = new Date(fromDate);
            where.startDate = { gte: from };
        }
        if (toDate && typeof toDate === "string") {
            const to = new Date(toDate);
            where.endDate = { lte: to };
        }
        if (tags && typeof tags === "string") {
            const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
            if (tagList.length > 0) {
                where.tags = { hasSome: tagList };
            }
        }
        const [total, plans] = await Promise.all([
            prisma_1.prisma.travelPlan.count({ where }),
            prisma_1.prisma.travelPlan.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { startDate: "asc" }
            })
        ]);
        const result = plans.map((plan) => ({
            ...plan,
            status: deriveStatus(plan)
        }));
        return res.json((0, apiResponse_1.ok)({
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            },
            data: result
        }));
    }
    catch (err) {
        next(err);
    }
};
exports.getAllTravelPlans = getAllTravelPlans;
// GET /api/travel-plans/match?destination=&fromDate=&toDate=&tags=
// GET /api/travel-plans/match  (search + pagination)
const matchTravelPlans = async (req, res, next) => {
    try {
        const { destination, fromDate, toDate, tags, page = "1", limit = "10" } = req.query;
        const pageNum = Math.max(parseInt(page, 10), 1);
        const limitNum = Math.max(parseInt(limit, 10), 1);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            isPublic: true
        };
        if (destination && typeof destination === "string") {
            where.OR = [
                { destinationCountry: { contains: destination, mode: "insensitive" } },
                { destinationCity: { contains: destination, mode: "insensitive" } }
            ];
        }
        if (fromDate && typeof fromDate === "string") {
            const from = new Date(fromDate);
            where.startDate = { gte: from };
        }
        if (toDate && typeof toDate === "string") {
            const to = new Date(toDate);
            where.endDate = { lte: to };
        }
        if (tags && typeof tags === "string") {
            const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
            if (tagList.length > 0) {
                where.tags = { hasSome: tagList };
            }
        }
        const [total, plans] = await Promise.all([
            prisma_1.prisma.travelPlan.count({ where }),
            prisma_1.prisma.travelPlan.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { startDate: "asc" }
            })
        ]);
        const result = plans.map((plan) => ({
            ...plan,
            status: deriveStatus(plan)
        }));
        return res.json((0, apiResponse_1.ok)({
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            },
            data: result
        }, "Matched travel plans"));
    }
    catch (err) {
        next(err);
    }
};
exports.matchTravelPlans = matchTravelPlans;
// GET /api/travel-plans/:id
const getTravelPlanById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const plan = await prisma_1.prisma.travelPlan.findUnique({
            where: { id }
        });
        if (!plan)
            return res.status(404).json((0, apiResponse_1.fail)("Travel plan not found"));
        const status = deriveStatus(plan);
        return res.json((0, apiResponse_1.ok)({ ...plan, status }));
    }
    catch (err) {
        next(err);
    }
};
exports.getTravelPlanById = getTravelPlanById;
// PATCH /api/travel-plans/:id/status  (host manual change)
const updateTravelPlanStatus = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { id } = req.params;
        const parsed = travelPlan_validation_1.updateTravelPlanStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const plan = await prisma_1.prisma.travelPlan.findUnique({ where: { id } });
        if (!plan)
            return res.status(404).json((0, apiResponse_1.fail)("Travel plan not found"));
        if (plan.hostId !== req.user.id) {
            return res.status(403).json((0, apiResponse_1.fail)("Only host can change status"));
        }
        const updated = await prisma_1.prisma.travelPlan.update({
            where: { id },
            data: { status: parsed.data.status }
        });
        const status = deriveStatus(updated);
        return res.json((0, apiResponse_1.ok)({ ...updated, status }, "Status updated"));
    }
    catch (err) {
        next(err);
    }
};
exports.updateTravelPlanStatus = updateTravelPlanStatus;
// POST /api/travel-plans/:id/join
const joinTravelPlan = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { id } = req.params;
        const userId = req.user.id;
        const plan = await prisma_1.prisma.travelPlan.findUnique({
            where: { id }
        });
        if (!plan)
            return res.status(404).json((0, apiResponse_1.fail)("Travel plan not found"));
        const status = deriveStatus(plan);
        if (status !== "OPEN" && status !== "ONGOING") {
            return res.status(400).json((0, apiResponse_1.fail)("You cannot join this plan at this time"));
        }
        if (plan.hostId === userId) {
            return res.status(400).json((0, apiResponse_1.fail)("Host cannot join their own plan"));
        }
        const existing = await prisma_1.prisma.travelPlanParticipant.findUnique({
            where: { userId_planId: { userId, planId: id } }
        });
        if (existing) {
            return res.status(400).json((0, apiResponse_1.fail)("You already joined this plan"));
        }
        // check max participants
        if (plan.maxParticipants && plan.participantsCount >= plan.maxParticipants) {
            return res.status(400).json((0, apiResponse_1.fail)("This plan is full"));
        }
        await prisma_1.prisma.travelPlanParticipant.create({
            data: {
                userId,
                planId: id
            }
        });
        await prisma_1.prisma.travelPlan.update({
            where: { id },
            data: {
                participantsCount: { increment: 1 }
            }
        });
        // add to user travel history
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                travelHistory: {
                    push: id
                }
            }
        });
        return res.json((0, apiResponse_1.ok)(null, "Joined travel plan"));
    }
    catch (err) {
        next(err);
    }
};
exports.joinTravelPlan = joinTravelPlan;
// GET /api/travel-plans/:id/participants  (host only)
const getPlanParticipants = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { id } = req.params;
        const userId = req.user.id;
        const plan = await prisma_1.prisma.travelPlan.findUnique({ where: { id } });
        if (!plan)
            return res.status(404).json((0, apiResponse_1.fail)("Travel plan not found"));
        if (plan.hostId !== userId) {
            return res.status(403).json((0, apiResponse_1.fail)("Only host can view participants"));
        }
        const participants = await prisma_1.prisma.travelPlanParticipant.findMany({
            where: { planId: id }
        });
        // You can later join with user info on frontend, or we can fetch basic user data:
        const userIds = participants.map((p) => p.userId);
        const users = await prisma_1.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, image: true }
        });
        return res.json((0, apiResponse_1.ok)({
            count: participants.length,
            users
        }));
    }
    catch (err) {
        next(err);
    }
};
exports.getPlanParticipants = getPlanParticipants;
// POST /api/travel-plans/:id/reviews
const createOrUpdateReview = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { id } = req.params;
        const userId = req.user.id;
        const plan = await prisma_1.prisma.travelPlan.findUnique({
            where: { id }
        });
        if (!plan)
            return res.status(404).json((0, apiResponse_1.fail)("Travel plan not found"));
        const status = deriveStatus(plan);
        if (status !== "ENDED") {
            return res
                .status(400)
                .json((0, apiResponse_1.fail)("You can only review a trip after it is completed"));
        }
        // must have joined the plan
        const joined = await prisma_1.prisma.travelPlanParticipant.findUnique({
            where: { userId_planId: { userId, planId: id } }
        });
        if (!joined) {
            return res.status(400).json((0, apiResponse_1.fail)("You did not join this plan"));
        }
        if (plan.hostId === userId) {
            return res.status(400).json((0, apiResponse_1.fail)("Host cannot review their own plan"));
        }
        const parsed = travelPlan_validation_1.reviewSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json((0, apiResponse_1.fail)("Validation error", parsed.error.format()));
        }
        const { rating, comment } = parsed.data;
        const existing = await prisma_1.prisma.travelPlanReview.findUnique({
            where: {
                planId_reviewerId: {
                    planId: id,
                    reviewerId: userId
                }
            }
        });
        let review;
        if (existing) {
            review = await prisma_1.prisma.travelPlanReview.update({
                where: { id: existing.id },
                data: {
                    rating,
                    comment
                }
            });
        }
        else {
            review = await prisma_1.prisma.travelPlanReview.create({
                data: {
                    planId: id,
                    hostId: plan.hostId,
                    reviewerId: userId,
                    rating,
                    comment
                }
            });
        }
        // recalc host rating
        const stats = await prisma_1.prisma.travelPlanReview.aggregate({
            where: { hostId: plan.hostId },
            _avg: { rating: true },
            _count: { rating: true }
        });
        await prisma_1.prisma.user.update({
            where: { id: plan.hostId },
            data: {
                ratingAverage: stats._avg.rating ?? 0,
                ratingCount: stats._count.rating
            }
        });
        return res.json((0, apiResponse_1.ok)(review, "Review saved"));
    }
    catch (err) {
        next(err);
    }
};
exports.createOrUpdateReview = createOrUpdateReview;
// DELETE /api/travel-plans/:id/reviews/:reviewId
const deleteReview = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json((0, apiResponse_1.fail)("Unauthorized"));
        const { id, reviewId } = req.params;
        const userId = req.user.id;
        const review = await prisma_1.prisma.travelPlanReview.findUnique({
            where: { id: reviewId }
        });
        if (!review || review.planId !== id) {
            return res.status(404).json((0, apiResponse_1.fail)("Review not found"));
        }
        if (review.reviewerId !== userId) {
            return res.status(403).json((0, apiResponse_1.fail)("You can only delete your own review"));
        }
        await prisma_1.prisma.travelPlanReview.delete({
            where: { id: reviewId }
        });
        // recalc host rating
        const stats = await prisma_1.prisma.travelPlanReview.aggregate({
            where: { hostId: review.hostId },
            _avg: { rating: true },
            _count: { rating: true }
        });
        await prisma_1.prisma.user.update({
            where: { id: review.hostId },
            data: {
                ratingAverage: stats._avg.rating ?? 0,
                ratingCount: stats._count.rating
            }
        });
        return res.json((0, apiResponse_1.ok)(null, "Review deleted"));
    }
    catch (err) {
        next(err);
    }
};
exports.deleteReview = deleteReview;
