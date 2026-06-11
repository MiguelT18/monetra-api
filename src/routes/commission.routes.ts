import { Router, type IRouter } from "express";
import * as CommissionController from "../controllers/commission.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);
router.use(requireRole("AFFILIATE"));

router.get("/", CommissionController.listMyCommissions);
router.get("/stats", CommissionController.getStats);

export default router;
