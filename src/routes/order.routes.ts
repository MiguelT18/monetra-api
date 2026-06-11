import { Router, type IRouter } from "express";
import * as OrderController from "../controllers/order.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);

router.post("/purchase/:id", OrderController.purchase);
router.get("/", OrderController.listMyOrders);
router.get("/:id", OrderController.getOrder);

export default router;
