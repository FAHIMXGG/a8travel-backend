import { Router } from "express";
import {
  getMe,
  getMyTravelHistory,
  adminListUsers,
  getUserProfile,
  updateProfile,
  updatePassword,
  updateUserAdmin,
  searchUsers,
  getAllUsers,
  getPopularTravellers
} from "./user.controller";
import { authGuard } from "../../middlewares/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

// current user from cookie / bearer token
router.get("/me", authGuard(), getMe);

// public: get all users with pagination
// GET /api/users/all?page=&limit=
router.get("/all", getAllUsers);

// public: get most popular travellers by rating
// GET /api/users/popular?limit=
router.get("/popular", getPopularTravellers);

// public: search users by any field
// GET /api/users/search?query=&visitedCountries=&travelInterests=&page=&limit=
// Examples:
//   ?query=john
//   ?visitedCountries=France,Italy
//   ?travelInterests=Adventure,Beach
//   ?query=john&visitedCountries=France&travelInterests=Adventure
router.get("/search", searchUsers);

// admin: list + search + filter + pagination
// GET /api/users?search=&status=&page=&limit=&id=
router.get("/", authGuard([Role.ADMIN]), adminListUsers);

// any user by id (authenticated)
// router.get("/:id", authGuard(), getUserProfile);
router.get("/:id", getUserProfile);

// self or admin profile update
router.patch("/:id", authGuard(), updateProfile);

// self password update
router.patch("/:id/password", authGuard(), updatePassword);

// admin manage role / block / unblock
router.patch("/:id/admin", authGuard([Role.ADMIN]), updateUserAdmin);

router.get("/me/travel-history", authGuard(), getMyTravelHistory);


export default router;
