import { Router } from "express";
import * as UserController from "../controllers/user.controller.ts";
import type { IRouter } from "express";

const router: IRouter = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);

export default router;
