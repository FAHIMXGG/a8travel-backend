import { Router } from "express";
import { authGuard } from "../../middlewares/authMiddleware";
import { Role } from "@prisma/client";
import {
  createTravelPlan,
  getAllTravelPlans,
  matchTravelPlans,
  getTravelPlanById,
  getMyTravelPlans,
  adminListTravelPlans,
  updateTravelPlan,
  updateTravelPlanStatus,
  deleteTravelPlan,
  joinTravelPlan,
  getPlanParticipants,
  createOrUpdateReview,
  deleteReview,
  searchTravelPlans,
  getMyTravelHistory
} from "./travelPlan.controller";

const router = Router();

// create
router.post("/", authGuard(), createTravelPlan);

// public list + match
router.get("/", getAllTravelPlans);
router.get("/match", matchTravelPlans);

router.get("/search", searchTravelPlans);

// host's own plans
router.get("/my", authGuard(), getMyTravelPlans);

// admin view all plans
router.get("/admin", authGuard([Role.ADMIN]), adminListTravelPlans);

// single plan
router.get("/:id", getTravelPlanById);

// manage plan (host or admin)
router.patch("/:id", authGuard(), updateTravelPlan);
router.patch("/:id/status", authGuard(), updateTravelPlanStatus);
router.delete("/:id", authGuard(), deleteTravelPlan);

// join & participants
router.post("/:id/join", authGuard(), joinTravelPlan);
router.get("/:id/participants", authGuard(), getPlanParticipants);

// reviews
router.post("/:id/reviews", authGuard(), createOrUpdateReview);
router.delete("/:id/reviews/:reviewId", authGuard(), deleteReview);

router.get("/me/travel-history", authGuard(), getMyTravelHistory);

export default router;
