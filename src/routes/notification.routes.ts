import { Router, type IRouter } from "express";
import * as NotificationController from "../controllers/notification.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware);

router.get("/", loadProfile, NotificationController.getUserNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.patch("/read-all", NotificationController.markAllRead);
router.patch("/:id/read", NotificationController.markRead);
router.delete("/", NotificationController.removeAll);
router.delete("/:id", NotificationController.remove);
router.post("/send", loadProfile, requireRole("ADMIN"), NotificationController.send);

export default router;
