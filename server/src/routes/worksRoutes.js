import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uuidParam } from "../middleware/validateParams.js";
import { deleteAttachment, downloadAttachment, receiveFile, uploadAttachment } from "../controllers/attachmentsController.js";
import {
  addWorkUpdate, assignStaff, createWork, deleteWork, getWork, listWorksHandler, unassignStaff, updateWork,
} from "../controllers/worksController.js";

const router = Router();
router.param("id", uuidParam);
router.param("staffId", uuidParam);
router.param("attachmentId", uuidParam);
router.use(requireAuth);

// Both roles. Staff results are always scoped to their own assignments in the service layer.
router.get("/", listWorksHandler);
router.get("/:id", getWork);
router.post("/:id/updates", addWorkUpdate);

// Files: admin, or staff assigned to the work. Authorisation happens in the controller.
router.post("/:id/attachments", receiveFile, uploadAttachment);
router.get("/:id/attachments/:attachmentId/download", downloadAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

// Admin only.
router.post("/", requireRole("admin"), createWork);
router.put("/:id", requireRole("admin"), updateWork);
router.delete("/:id", requireRole("admin"), deleteWork);
router.post("/:id/assign", requireRole("admin"), assignStaff);
router.delete("/:id/assign/:staffId", requireRole("admin"), unassignStaff);
export default router;
