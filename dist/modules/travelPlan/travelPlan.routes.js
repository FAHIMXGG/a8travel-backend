"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const travelPlan_controller_1 = require("./travelPlan.controller");
const router = (0, express_1.Router)();
// suggested endpoints
router.post("/", (0, authMiddleware_1.authGuard)(), travelPlan_controller_1.createTravelPlan); // POST /api/travel-plans
router.get("/", travelPlan_controller_1.getAllTravelPlans); // GET /api/travel-plans
router.get("/match", travelPlan_controller_1.matchTravelPlans); // GET /api/travel-plans/match
// extra useful endpoints
router.get("/:id", travelPlan_controller_1.getTravelPlanById); // GET /api/travel-plans/:id
router.post("/:id/join", (0, authMiddleware_1.authGuard)(), travelPlan_controller_1.joinTravelPlan); // POST /api/travel-plans/:id/join
router.get("/:id/participants", (0, authMiddleware_1.authGuard)(), travelPlan_controller_1.getPlanParticipants); // GET /api/travel-plans/:id/participants
router.patch("/:id/status", (0, authMiddleware_1.authGuard)(), travelPlan_controller_1.updateTravelPlanStatus); // PATCH /api/travel-plans/:id/status (host)
router.post("/:id/reviews", (0, authMiddleware_1.authGuard)(), travelPlan_controller_1.createOrUpdateReview); // POST /api/travel-plans/:id/reviews
router.delete("/:id/reviews/:reviewId", (0, authMiddleware_1.authGuard)(), travelPlan_controller_1.deleteReview); // DELETE /api/travel-plans/:id/reviews/:reviewId
exports.default = router;
