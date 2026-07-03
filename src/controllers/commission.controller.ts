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

export const getByProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await CommissionService.aggregateByProduct(req.profile!.id);
    res.json(ok("Comisiones por producto", data));
  },
);

export const getHistory: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months as string) || 6));
    const data = await CommissionService.getMonthlyHistory(req.profile!.id, months);
    res.json(ok("Historial mensual de comisiones", data));
  },
);
