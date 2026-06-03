import { Router, type IRouter } from "express";
import * as UsersController from "../controllers/users.controller.ts";
import { authMiddleware } from "../middleware/auth.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware);

router.get("/search", UsersController.searchUsers);
router.post("/avatar", UsersController.uploadAvatar);

export default router;
