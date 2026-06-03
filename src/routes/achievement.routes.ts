import { Router } from "express";
import * as AchievementController from "../controllers/achievement.controller.ts";
import type { IRouter } from "express";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);

router.get("/user", AchievementController.getMyAchievements);
router.patch("/progress", AchievementController.updateProgress);

router.get("/templates", requireRole("ADMIN"), AchievementController.getAllTemplates);
router.post("/templates", requireRole("ADMIN"), AchievementController.createTemplate);
router.put("/templates/:id", requireRole("ADMIN"), AchievementController.updateTemplate);
router.delete("/templates/:id", requireRole("ADMIN"), AchievementController.deleteTemplate);

export default router;
