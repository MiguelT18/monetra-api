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
router.post("/forgot-password", UserController.forgotPassword);
router.post("/recovery-session", UserController.recoverySession);
router.post("/update-password", UserController.updatePassword);
router.get("/oauth/:provider", UserController.oauthUrl);
router.post("/oauth/callback", UserController.oauthCallback);
router.put("/profile", authMiddleware, UserController.updateProfile);
router.patch("/role", authMiddleware, UserController.updateRole);

export default router;
