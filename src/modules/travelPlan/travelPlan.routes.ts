import { Router } from "express";
import { authGuard } from "../../middlewares/authMiddleware";
import {
  createTravelPlan,
  getAllTravelPlans,
  matchTravelPlans,
  getTravelPlanById,
  joinTravelPlan,
  getPlanParticipants,
  createOrUpdateReview,
  deleteReview,
  updateTravelPlanStatus
} from "./travelPlan.controller";

const router = Router();

// suggested endpoints
router.post("/", authGuard(), createTravelPlan);              // POST /api/travel-plans
router.get("/", getAllTravelPlans);                           // GET /api/travel-plans
router.get("/match", matchTravelPlans);                       // GET /api/travel-plans/match

// extra useful endpoints
router.get("/:id", getTravelPlanById);                        // GET /api/travel-plans/:id
router.post("/:id/join", authGuard(), joinTravelPlan);        // POST /api/travel-plans/:id/join
router.get("/:id/participants", authGuard(), getPlanParticipants); // GET /api/travel-plans/:id/participants
router.patch("/:id/status", authGuard(), updateTravelPlanStatus);  // PATCH /api/travel-plans/:id/status (host)

router.post("/:id/reviews", authGuard(), createOrUpdateReview);    // POST /api/travel-plans/:id/reviews
router.delete("/:id/reviews/:reviewId", authGuard(), deleteReview); // DELETE /api/travel-plans/:id/reviews/:reviewId

export default router;
