"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("./modules/user/user.routes"));
const payment_routes_1 = __importDefault(require("./modules/payment/payment.routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const travelPlan_routes_1 = __importDefault(require("./modules/travelPlan/travelPlan.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: env_1.env.CLIENT_URL,
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", user_routes_1.default);
app.use("/api/payments", payment_routes_1.default);
app.use("/api/travel-plans", travelPlan_routes_1.default);
// Health check
app.get("/health", (_req, res) => {
    res.json({ success: true, message: "API is healthy" });
});
// Error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
