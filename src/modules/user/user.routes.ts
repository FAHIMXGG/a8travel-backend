import { Router } from "express";
import {
  getMe,
  adminListUsers,
  getUserProfile,
  updateProfile,
  updatePassword,
  updateUserAdmin
} from "./user.controller";
import { authGuard } from "../../middlewares/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

// current user from cookie / bearer token
router.get("/me", authGuard(), getMe);

// admin: list + search + filter + pagination
// GET /api/users?search=&status=&page=&limit=&id=
router.get("/", authGuard([Role.ADMIN]), adminListUsers);

// any user by id (authenticated)
router.get("/:id", authGuard(), getUserProfile);

// self or admin profile update
router.patch("/:id", authGuard(), updateProfile);

// self password update
router.patch("/:id/password", authGuard(), updatePassword);

// admin manage role / block / unblock
router.patch("/:id/admin", authGuard([Role.ADMIN]), updateUserAdmin);

export default router;
