import { Router, type IRouter } from "express";
import * as GamificationController from "../controllers/gamification.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);

router.get("/progress", GamificationController.getMyProgress);
router.get("/xp-recommendation", GamificationController.getXpRecommendation);
router.post("/xp", GamificationController.addXP);
router.get("/leaderboard", GamificationController.getLeaderBoard);

export default router;
