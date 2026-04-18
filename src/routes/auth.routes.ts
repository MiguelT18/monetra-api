import { Router } from "express";
import * as AuthController from "../controllers/auth.controller.js";
import type { IRouter } from "express";

const router: IRouter = Router();

router.post("/auth/register", AuthController.register);

export default router;
