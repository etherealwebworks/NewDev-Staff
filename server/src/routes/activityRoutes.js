import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { listActivity } from "../controllers/activityController.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.get("/", listActivity);
export default router;
