import { Router } from "express";
import {
  getMe,
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

// any user by id
router.get("/:id", authGuard(), getUserProfile);

router.patch("/:id", authGuard(), updateProfile);
router.patch("/:id/password", authGuard(), updatePassword);
router.patch("/:id/admin", authGuard([Role.ADMIN]), updateUserAdmin);

export default router;
