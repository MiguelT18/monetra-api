import * as ReviewController from "../controllers/review.controller.ts";
import { Router, type IRouter } from "express";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router({ mergeParams: true });

router.use(authMiddleware, loadProfile);

router.get("/", ReviewController.listReviews);
router.post("/", requireRole("STUDENT"), ReviewController.createReview);

export default router;
