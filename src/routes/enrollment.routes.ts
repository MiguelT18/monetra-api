import { Router, type IRouter } from "express";
import * as EnrollmentController from "../controllers/enrollment.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);
router.use(requireRole("STUDENT"));

router.get("/", EnrollmentController.listMyEnrollments);

router.get("/:enrollmentId/content", EnrollmentController.getCourseContent);
router.post("/:enrollmentId/complete-lesson", EnrollmentController.completeLesson);
router.post("/:enrollmentId/video-token", EnrollmentController.getSignedVideoUrl);
router.get("/:enrollmentId/evaluation/:moduleIndex", EnrollmentController.getModuleEvaluation);
router.post("/:enrollmentId/evaluation/:moduleIndex/submit", EnrollmentController.submitModuleEvaluation);

export default router;
