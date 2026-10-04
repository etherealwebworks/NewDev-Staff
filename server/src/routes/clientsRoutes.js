import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uuidParam } from "../middleware/validateParams.js";
import {
  clientOptions, clientWorks, createClient, deleteClient, getClient, listClients, setClientStatus, updateClient,
} from "../controllers/clientsController.js";

const router = Router();
router.param("id", uuidParam);
router.use(requireAuth, requireRole("admin"));
router.get("/options", clientOptions);
router.get("/", listClients);
router.post("/", createClient);
router.get("/:id", getClient);
router.get("/:id/works", clientWorks);
router.put("/:id", updateClient);
router.patch("/:id/status", setClientStatus);
router.delete("/:id", deleteClient);
export default router;
