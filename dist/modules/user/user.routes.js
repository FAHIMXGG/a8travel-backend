"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// current user from cookie / bearer token
router.get("/me", (0, authMiddleware_1.authGuard)(), user_controller_1.getMe);
// any user by id
router.get("/:id", (0, authMiddleware_1.authGuard)(), user_controller_1.getUserProfile);
router.patch("/:id", (0, authMiddleware_1.authGuard)(), user_controller_1.updateProfile);
router.patch("/:id/password", (0, authMiddleware_1.authGuard)(), user_controller_1.updatePassword);
router.patch("/:id/admin", (0, authMiddleware_1.authGuard)([client_1.Role.ADMIN]), user_controller_1.updateUserAdmin);
exports.default = router;
