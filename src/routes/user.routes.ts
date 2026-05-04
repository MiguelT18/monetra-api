import { Router } from "express";
import * as UserController from "../controllers/user.controller.ts";
import type { IRouter } from "express";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router: IRouter = Router();

router.post("/refresh-session", UserController.refreshSession);
router.get("/get-profile", authMiddleware, UserController.getUserProfile);
router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/logout", UserController.logout);
router.put("/profile", authMiddleware, UserController.updateProfile);

export default router;
