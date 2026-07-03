import { Router, type IRouter } from "express";
import * as AffiliationController from "../controllers/affiliation.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);
router.use(requireRole("AFFILIATE"));

router.get("/", AffiliationController.listMyAffiliations);
router.get("/:id", AffiliationController.getAffiliation);

export default router;
