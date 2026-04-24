import type { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";

export const addXP: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, xp } = req.body;

    res.status(200).json(ok("An amoun of xp was added", { userId, xp }));
  },
);
