import { Router, type IRouter } from "express";
import * as ProfileCommentController from "../controllers/profile-comment.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.get("/:id/comments", ProfileCommentController.listComments);
router.get("/:id/comments/count", ProfileCommentController.getProfileCommentCount);
router.get("/:id/check-blocked", ProfileCommentController.checkBlocked);

router.use(authMiddleware);

router.post("/:id/comments", ProfileCommentController.createComment);
router.delete("/:id/comments/:commentId", ProfileCommentController.deleteComment);
router.post("/:id/comments/:commentId/report", ProfileCommentController.reportComment);
router.post("/:id/block", ProfileCommentController.blockUser);
router.delete("/:id/block/:blockedId", ProfileCommentController.unblockUser);
router.get("/:id/blocked", ProfileCommentController.getBlockedUsers);

router.get("/reports", loadProfile, requireRole("ADMIN"), ProfileCommentController.listReports);
router.post("/reports/:reportId/dismiss", loadProfile, requireRole("ADMIN"), ProfileCommentController.dismissReport);
router.delete("/reports/:reportId/comment/:commentId", loadProfile, requireRole("ADMIN"), ProfileCommentController.adminDeleteComment);

export default router;
