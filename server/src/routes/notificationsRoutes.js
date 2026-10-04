import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uuidParam } from "../middleware/validateParams.js";
import { listNotifications, markAllRead, markRead, unreadCount } from "../controllers/notificationsController.js";

const router = Router();
router.param("id", uuidParam);
router.use(requireAuth);
router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);
export default router;
