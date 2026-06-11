import { Router, type IRouter } from "express";
import * as UsersController from "../controllers/users.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware);

router.get("/search", UsersController.searchUsers);
router.post("/avatar", UsersController.uploadAvatar);

router.get("/", loadProfile, requireRole("ADMIN"), UsersController.getAll);
router.patch("/:id/role", loadProfile, requireRole("ADMIN"), UsersController.updateRole);
router.patch("/:id/make-admin", loadProfile, requireRole("ADMIN"), UsersController.makeAdmin);
router.patch("/:id/ban", loadProfile, requireRole("ADMIN"), UsersController.toggleBan);

export default router;
