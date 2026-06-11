import { Router, type IRouter } from "express";
import * as EnrollmentController from "../controllers/enrollment.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);
router.use(requireRole("STUDENT"));

router.get("/", EnrollmentController.listMyEnrollments);

export default router;
