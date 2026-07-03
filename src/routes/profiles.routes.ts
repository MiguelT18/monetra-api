import { Router, type IRouter } from "express";
import * as ProfilesController from "../controllers/profiles.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router: IRouter = Router();

router.get("/:id/review-stats", authMiddleware, ProfilesController.getReviewStats);

export default router;
