import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";

const router = Router();
router.use(requireAuth);
router.get("/", getSettings);
router.put("/", requireRole("admin"), updateSettings);
export default router;
