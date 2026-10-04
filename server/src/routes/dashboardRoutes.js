import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { calendar, dashboard } from "../controllers/dashboardController.js";

const router = Router();
router.use(requireAuth);
router.get("/", dashboard);
router.get("/calendar", calendar);
export default router;
