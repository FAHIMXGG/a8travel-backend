import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/prisma";
import { ok, fail } from "../../utils/apiResponse";
import {
  createTravelPlanSchema,
  reviewSchema,
  updateTravelPlanStatusSchema,
  updateTravelPlanSchema
} from "./travelPlan.validation";

// ---------------------- Helpers ----------------------

// Auto status based on dates + participants/max
const deriveStatus = (plan: any) => {
  const now = new Date();

  if (plan.status === "CANCELED" || plan.status === "CLOSED") return plan.status;

  if (plan.maxParticipants && plan.participantsCount >= plan.maxParticipants) {
    return "FULL";
  }

  if (now < plan.startDate) return "OPEN";
  if (now >= plan.startDate && now <= plan.endDate) return "ONGOING";
  return "ENDED";
};

// Attach participants [{ id, name }] to plans using TravelPlanParticipant + User
const attachParticipantsToPlans = async (plans: any | any[]) => {
  const isArray = Array.isArray(plans);
  const list = isArray ? plans : [plans];

  if (list.length === 0) {
    return isArray ? [] : null;
  }

  const planIds = list.map((p) => p.id);

  const participantRows = await prisma.travelPlanParticipant.findMany({
    where: { planId: { in: planIds } }
  });

  const userIds = Array.from(new Set(participantRows.map((p) => p.userId)));

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true }
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const byPlan: Record<string, { id: string; name: string | null }[]> = {};

  for (const row of participantRows) {
    const u = userMap.get(row.userId);
    if (!byPlan[row.planId]) byPlan[row.planId] = [];
    byPlan[row.planId].push({
      id: row.userId,
      name: u?.name ?? null
    });
  }

  const withParticipants = list.map((plan) => ({
    ...plan,
    participants: byPlan[plan.id] || []
  }));

  return isArray ? withParticipants : withParticipants[0];
};

// Attach host info (name, image, ratingAverage, ratingCount)
const attachHostInfo = async (plans: any | any[]) => {
  const isArray = Array.isArray(plans);
  const list = isArray ? plans : [plans];

  if (list.length === 0) return isArray ? [] : null;

  const hostIds = Array.from(new Set(list.map((p) => p.hostId)));

  const hosts = await prisma.user.findMany({
    where: { id: { in: hostIds } },
    select: {
      id: true,
      name: true,
      image: true,
      ratingAverage: true,
      ratingCount: true
    }
  });

  const hostMap = new Map(hosts.map((h) => [h.id, h]));

  const finalPlans = list.map((plan) => {
    const host = hostMap.get(plan.hostId);
    return {
      ...plan,
      hostName: host?.name ?? null,
      hostImage: host?.image ?? null,
      hostRatingAverage: host?.ratingAverage ?? 0,
      hostRatingCount: host?.ratingCount ?? 0
    };
  });

  return isArray ? finalPlans : finalPlans[0];
};

// Attach reviews [{ id, reviewerId, name, rating, comment, createdAt }]
const attachReviewsToPlans = async (plans: any | any[]) => {
  const isArray = Array.isArray(plans);
  const list = isArray ? plans : [plans];

  if (list.length === 0) return isArray ? [] : null;

  const planIds = list.map((p) => p.id);

  const reviewRows = await prisma.travelPlanReview.findMany({
    where: { planId: { in: planIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      planId: true,
      reviewerId: true,
      rating: true,
      comment: true,
      createdAt: true
    }
  });

  const reviewerIds = Array.from(new Set(reviewRows.map((r) => r.reviewerId)));

  const reviewers = await prisma.user.findMany({
    where: { id: { in: reviewerIds } },
    select: { id: true, name: true }
  });

  const reviewerMap = new Map(reviewers.map((u) => [u.id, u]));

  const byPlan: Record<string, any[]> = {};
  for (const r of reviewRows) {
    const u = reviewerMap.get(r.reviewerId);
    if (!byPlan[r.planId]) byPlan[r.planId] = [];
    byPlan[r.planId].push({
      id: r.id,
      reviewerId: r.reviewerId,
      name: u?.name ?? null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    });
  }

  const final = list.map((plan) => ({
    ...plan,
    reviews: byPlan[plan.id] || []
  }));

  return isArray ? final : final[0];
};

// ---------------------- Controllers ----------------------

// POST /api/travel-plans
export const createTravelPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const parsed = createTravelPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const data = parsed.data;

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (startDate >= endDate) {
      return res.status(400).json(fail("Start date must be before end date"));
    }

    const plan = await prisma.travelPlan.create({
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

    const withHost = await attachHostInfo(plan);

    return res.status(201).json(
      ok(
        {
          ...withHost,
          status: deriveStatus(plan),
          participants: [],
          participantsCount: plan.participantsCount,
          reviews: []
        },
        "Travel plan created"
      )
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-plans (public list with filters + pagination, includes participants + host + reviews)
export const getAllTravelPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { destination, fromDate, toDate, tags, page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.max(parseInt(limit as string, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
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
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        where.tags = { hasSome: tagList };
      }
    }

    const [total, plansRaw] = await Promise.all([
      prisma.travelPlan.count({ where }),
      prisma.travelPlan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { startDate: "asc" }
      })
    ]);

    const withParticipants = (await attachParticipantsToPlans(plansRaw)) as any[];
    const withHostInfo = (await attachHostInfo(withParticipants)) as any[];
    const withReviews = (await attachReviewsToPlans(withHostInfo)) as any[];

    const result = withReviews.map((plan) => ({
      ...plan,
      participantsCount: plan.participants.length,
      status: deriveStatus(plan)
    }));

    return res.json(
      ok({
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        data: result
      })
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-plans/match (same behavior as list, semantic "match")
export const matchTravelPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return getAllTravelPlans(req, res, next);
};

// GET /api/travel-plans/search
export const searchTravelPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query = "", page = "1", limit = "10" } = req.query;

    const q = String(query).trim();
    if (!q) {
      return res.status(400).json(fail("Search query is required"));
    }

    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.max(parseInt(limit as string, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    // Search hosts by name/email
    const matchedHosts = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } }
        ]
      },
      select: { id: true }
    });

    const hostIds = matchedHosts.map((u) => u.id);

    const or: any[] = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { destinationCountry: { contains: q, mode: "insensitive" } },
      { destinationCity: { contains: q, mode: "insensitive" } },
      { contact: { contains: q, mode: "insensitive" } },
      { groupChatLink: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } }
    ];

    // TravelType enum matching
    const qLower = q.toLowerCase();
    const travelTypeMap: Record<string, "SOLO" | "FAMILY" | "FRIENDS"> = {
      solo: "SOLO",
      family: "FAMILY",
      friends: "FRIENDS"
    };
    const travelTypeValue = travelTypeMap[qLower];
    if (travelTypeValue) {
      or.push({ travelType: travelTypeValue });
    }

    // search by hostId if host name/email matches
    if (hostIds.length > 0) {
      or.push({ hostId: { in: hostIds } });
    }

    const where: any = {
      isPublic: true,
      OR: or
    };

    const [total, plansRaw] = await Promise.all([
      prisma.travelPlan.count({ where }),
      prisma.travelPlan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" }
      })
    ]);

    const withParticipants = await attachParticipantsToPlans(plansRaw);
    const withHostInfo = await attachHostInfo(withParticipants);
    const withReviews = (await attachReviewsToPlans(withHostInfo)) as any[];

    const result = withReviews.map((plan) => ({
      ...plan,
      participantsCount: plan.participants.length,
      status: deriveStatus(plan)
    }));

    return res.json(
      ok({
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        data: result
      })
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-plans/my (host's own plans, includes participants + host + reviews)
export const getMyTravelPlans = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.max(parseInt(limit as string, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const where = { hostId: req.user.id };

    const [total, plansRaw] = await Promise.all([
      prisma.travelPlan.count({ where }),
      prisma.travelPlan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { startDate: "desc" }
      })
    ]);

    const withParticipants = (await attachParticipantsToPlans(plansRaw)) as any[];
    const withHostInfo = (await attachHostInfo(withParticipants)) as any[];
    const withReviews = (await attachReviewsToPlans(withHostInfo)) as any[];

    const result = withReviews.map((plan) => ({
      ...plan,
      participantsCount: plan.participants.length,
      status: deriveStatus(plan)
    }));

    return res.json(
      ok({
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        data: result
      })
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-plans/admin (admin view all plans with filters/pagination + participants + host + reviews)
export const adminListTravelPlans = async (
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
      hostId,
      destination,
      status
    } = req.query as {
      page?: string;
      limit?: string;
      hostId?: string;
      destination?: string;
      status?: string;
    };

    const pageNum = Math.max(parseInt(page || "1", 10), 1);
    const limitNum = Math.max(parseInt(limit || "10", 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (hostId) {
      where.hostId = hostId;
    }

    if (destination) {
      where.OR = [
        { destinationCountry: { contains: destination, mode: "insensitive" } },
        { destinationCity: { contains: destination, mode: "insensitive" } }
      ];
    }

    if (status) {
      where.status = status;
    }

    const [total, plansRaw] = await Promise.all([
      prisma.travelPlan.count({ where }),
      prisma.travelPlan.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" }
      })
    ]);

    const withParticipants = (await attachParticipantsToPlans(plansRaw)) as any[];
    const withHostInfo = (await attachHostInfo(withParticipants)) as any[];
    const withReviews = (await attachReviewsToPlans(withHostInfo)) as any[];

    const result = withReviews.map((plan) => ({
      ...plan,
      participantsCount: plan.participants.length,
      status: deriveStatus(plan)
    }));

    return res.json(
      ok({
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        },
        data: result
      })
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-plans/:id (single plan + participants + host + reviews)
export const getTravelPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const planRaw = await prisma.travelPlan.findUnique({
      where: { id }
    });

    if (!planRaw) return res.status(404).json(fail("Travel plan not found"));

    const withParticipants = await attachParticipantsToPlans(planRaw);
    const withHost = await attachHostInfo(withParticipants);
    const finalPlan = await attachReviewsToPlans(withHost);

    return res.json(
      ok({
        ...finalPlan,
        participantsCount: finalPlan.participants.length,
        status: deriveStatus(finalPlan)
      })
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/travel-plans/:id (host or admin can edit)
export const updateTravelPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));
    const { id } = req.params;

    const plan = await prisma.travelPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json(fail("Travel plan not found"));

    if (plan.hostId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Only host or admin can edit this plan"));
    }

    const parsed = updateTravelPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const data = parsed.data as any;

    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
      return res.status(400).json(fail("Start date must be before end date"));
    }

    const updatedRaw = await prisma.travelPlan.update({
      where: { id },
      data
    });

    const withParticipants = await attachParticipantsToPlans(updatedRaw);
    const withHost = await attachHostInfo(withParticipants);
    const finalPlan = await attachReviewsToPlans(withHost);

    return res.json(
      ok(
        {
          ...finalPlan,
          participantsCount: finalPlan.participants.length,
          status: deriveStatus(finalPlan)
        },
        "Travel plan updated"
      )
    );
  } catch (err) {
    next(err);
  }
};

// PATCH /api/travel-plans/:id/status (host or admin)
export const updateTravelPlanStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { id } = req.params;
    const parsed = updateTravelPlanStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const plan = await prisma.travelPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json(fail("Travel plan not found"));

    if (plan.hostId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Only host or admin can change status"));
    }

    const updatedRaw = await prisma.travelPlan.update({
      where: { id },
      data: { status: parsed.data.status }
    });

    const withParticipants = await attachParticipantsToPlans(updatedRaw);
    const withHost = await attachHostInfo(withParticipants);
    const finalPlan = await attachReviewsToPlans(withHost);

    return res.json(
      ok(
        {
          ...finalPlan,
          participantsCount: finalPlan.participants.length,
          status: deriveStatus(finalPlan)
        },
        "Status updated"
      )
    );
  } catch (err) {
    next(err);
  }
};

// DELETE /api/travel-plans/:id (host or admin)
export const deleteTravelPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { id } = req.params;

    const plan = await prisma.travelPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json(fail("Travel plan not found"));

    if (plan.hostId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Only host or admin can delete this plan"));
    }

    await prisma.travelPlanParticipant.deleteMany({ where: { planId: id } });
    await prisma.travelPlanReview.deleteMany({ where: { planId: id } });
    await prisma.travelPlan.delete({ where: { id } });

    return res.json(ok(null, "Travel plan deleted"));
  } catch (err) {
    next(err);
  }
};

// POST /api/travel-plans/:id/join
export const joinTravelPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { id } = req.params;
    const userId = req.user.id;

    const plan = await prisma.travelPlan.findUnique({
      where: { id }
    });

    if (!plan) return res.status(404).json(fail("Travel plan not found"));

    const status = deriveStatus(plan);
    if (status !== "OPEN" && status !== "ONGOING") {
      return res.status(400).json(fail("You cannot join this plan at this time"));
    }

    if (plan.hostId === userId) {
      return res.status(400).json(fail("Host cannot join their own plan"));
    }

    const existing = await prisma.travelPlanParticipant.findUnique({
      where: { userId_planId: { userId, planId: id } }
    });

    if (existing) {
      return res.status(400).json(fail("You already joined this plan"));
    }

    if (plan.maxParticipants && plan.participantsCount >= plan.maxParticipants) {
      return res.status(400).json(fail("This plan is full"));
    }

    await prisma.travelPlanParticipant.create({
      data: {
        userId,
        planId: id
      }
    });

    await prisma.travelPlan.update({
      where: { id },
      data: {
        participantsCount: { increment: 1 }
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        travelHistory: {
          push: id
        }
      }
    });

    return res.json(ok(null, "Joined travel plan"));
  } catch (err) {
    next(err);
  }
};

// GET /api/travel-plans/:id/participants (host or admin)
export const getPlanParticipants = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { id } = req.params;
    const userId = req.user.id;

    const plan = await prisma.travelPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json(fail("Travel plan not found"));

    if (plan.hostId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json(fail("Only host or admin can view participants"));
    }

    const participants = await prisma.travelPlanParticipant.findMany({
      where: { planId: id }
    });

    const userIds = participants.map((p) => p.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true }
    });

    return res.json(
      ok({
        count: participants.length,
        users
      })
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/travel-plans/:id/reviews
export const createOrUpdateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { id } = req.params;
    const userId = req.user.id;

    const plan = await prisma.travelPlan.findUnique({
      where: { id }
    });

    if (!plan) return res.status(404).json(fail("Travel plan not found"));

    const status = deriveStatus(plan);
    if (status !== "ENDED") {
      return res
        .status(400)
        .json(fail("You can only review a trip after it is completed"));
    }

    const joined = await prisma.travelPlanParticipant.findUnique({
      where: { userId_planId: { userId, planId: id } }
    });

    if (!joined) {
      return res.status(400).json(fail("You did not join this plan"));
    }

    if (plan.hostId === userId) {
      return res.status(400).json(fail("Host cannot review their own plan"));
    }

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail("Validation error", parsed.error.format()));
    }

    const { rating, comment } = parsed.data;

    const existing = await prisma.travelPlanReview.findUnique({
      where: {
        planId_reviewerId: {
          planId: id,
          reviewerId: userId
        }
      }
    });

    let review;
    if (existing) {
      review = await prisma.travelPlanReview.update({
        where: { id: existing.id },
        data: {
          rating,
          comment
        }
      });
    } else {
      review = await prisma.travelPlanReview.create({
        data: {
          planId: id,
          hostId: plan.hostId,
          reviewerId: userId,
          rating,
          comment
        }
      });
    }

    const stats = await prisma.travelPlanReview.aggregate({
      where: { hostId: plan.hostId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.user.update({
      where: { id: plan.hostId },
      data: {
        ratingAverage: stats._avg.rating ?? 0,
        ratingCount: stats._count.rating
      }
    });

    return res.json(ok(review, "Review saved"));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/travel-plans/:id/reviews/:reviewId
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json(fail("Unauthorized"));

    const { id, reviewId } = req.params;
    const userId = req.user.id;

    const review = await prisma.travelPlanReview.findUnique({
      where: { id: reviewId }
    });

    if (!review || review.planId !== id) {
      return res.status(404).json(fail("Review not found"));
    }

    if (review.reviewerId !== userId) {
      return res.status(403).json(fail("You can only delete your own review"));
    }

    await prisma.travelPlanReview.delete({
      where: { id: reviewId }
    });

    const stats = await prisma.travelPlanReview.aggregate({
      where: { hostId: review.hostId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await prisma.user.update({
      where: { id: review.hostId },
      data: {
        ratingAverage: stats._avg.rating ?? 0,
        ratingCount: stats._count.rating
      }
    });

    return res.json(ok(null, "Review deleted"));
  } catch (err) {
    next(err);
  }
};
