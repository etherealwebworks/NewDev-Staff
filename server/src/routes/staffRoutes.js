import { Router } from "express";

import {
  requireAuth,
  requireRole,
} from "../middleware/auth.js";

import { uuidParam } from "../middleware/validateParams.js";

import {
  createStaff,
  deleteStaff,
  getStaff,
  listStaff,
  setStaffStatus,
  staffOptions,
  staffWorks,
  updateStaff,
} from "../controllers/staffController.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(requireAuth);

/*
|--------------------------------------------------------------------------
| Staff work access
|--------------------------------------------------------------------------
|
| GET /api/staff/:id/works
|
| Admin:
|   Can view any staff member's works.
|
| Staff:
|   Can only view their own works.
|
*/

router.get(
  "/:id/works",
  requireRole("admin", "staff"),
  staffWorks
);

/*
|--------------------------------------------------------------------------
| Admin-only staff management
|--------------------------------------------------------------------------
*/

router.use(requireRole("admin"));

router.get(
  "/options",
  staffOptions
);

router.get(
  "/",
  listStaff
);

router.post(
  "/",
  createStaff
);

router.get(
  "/:id",
  getStaff
);

router.put(
  "/:id",
  updateStaff
);

router.patch(
  "/:id/status",
  setStaffStatus
);

router.delete(
  "/:id",
  deleteStaff
);

router.param(
  "id",
  uuidParam
);

export default router;