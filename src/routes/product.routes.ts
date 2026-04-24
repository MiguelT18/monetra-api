import * as ProductController from "../controllers/product.controller.ts";
import { Router, type IRouter } from "express";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router: IRouter = Router();

router.post("/create", authMiddleware, ProductController.createProduct);

export default router;
