import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import CommissionService from "../services/commission.service.ts";

export const listMyCommissions: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await CommissionService.listByAffiliate(req.profile!.id, page, limit);

    res.json(ok("Tus comisiones", result));
  },
);

export const getStats: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const stats = await CommissionService.getStats(req.profile!.id);

    res.json(ok("Estadísticas de comisiones", stats));
  },
);
