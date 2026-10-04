import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { changePassword, login, logout, me, refresh } from "../controllers/authController.js";

const limiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

const router = Router();
router.post("/login", limiter, login);
router.post("/refresh", limiter, refresh);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);
router.post("/change-password", limiter, requireAuth, changePassword);
export default router;
