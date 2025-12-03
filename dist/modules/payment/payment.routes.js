"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("./payment.controller");
const authMiddleware_1 = require("../../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post("/create-intent", (0, authMiddleware_1.authGuard)(), payment_controller_1.createPaymentIntent);
router.post("/confirm", (0, authMiddleware_1.authGuard)(), payment_controller_1.confirmSubscription);
exports.default = router;
