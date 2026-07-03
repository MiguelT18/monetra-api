import { Router, type IRouter } from "express";
import * as UploadController from "../controllers/upload.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);

router.post(
  "/r2/request-upload",
  requireRole("CREATOR"),
  UploadController.requestUploadUrl,
);

router.post(
  "/r2/process",
  requireRole("CREATOR"),
  UploadController.startProcessing,
);

router.get(
  "/r2/upload-status/:uploadId",
  requireRole("CREATOR"),
  UploadController.checkUploadStatus,
);

router.post(
  "/r2/confirm-asset",
  requireRole("CREATOR"),
  UploadController.confirmAsset,
);

router.post(
  "/r2/confirm-intro",
  requireRole("CREATOR"),
  UploadController.confirmIntroVideo,
);

router.post(
  "/r2/confirm-affiliate-intro",
  requireRole("CREATOR"),
  UploadController.confirmAffiliateVideo,
);

router.post(
  "/r2/attachment-upload",
  requireRole("CREATOR"),
  UploadController.requestAttachmentUploadUrl,
);

router.post(
  "/r2/confirm-attachment",
  requireRole("CREATOR"),
  UploadController.confirmAttachment,
);

router.post(
  "/r2/remove-attachment",
  requireRole("CREATOR"),
  UploadController.removeAttachment,
);

export default router;
