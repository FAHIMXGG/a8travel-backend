import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import { errorHandler } from "./middlewares/errorHandler";
import travelPlanRoutes from "./modules/travelPlan/travelPlan.routes";


const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/travel-plans", travelPlanRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "API is healthy" });
});

// Error handler
app.use(errorHandler);

export default app;
