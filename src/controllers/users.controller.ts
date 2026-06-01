import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import UserService from "../services/user.service.ts";

export const searchUsers: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const query = (req.query.q as string)?.trim();

    if (!query || query.length < 1) {
      res.json(ok("Resultados de búsqueda", { users: [] }));
      return;
    }

    const users = await UserService.searchUsers(query, 10, req.user!.id);

    res.json(ok("Resultados de búsqueda", { users }));
  },
);
