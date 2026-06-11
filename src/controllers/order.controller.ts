import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import OrderService from "../services/order.service.ts";
import { z } from "zod";

const purchaseSchema = z.object({
  affiliateCode: z.string().optional(),
});

export const purchase: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: productId } = z.object({ id: z.string() }).parse(req.params);
    const { affiliateCode } = purchaseSchema.parse(req.body);

    const order = await OrderService.purchase(productId, req.profile!.id, affiliateCode);

    res.status(201).json(ok("Compra realizada correctamente", { order }));
  },
);

export const listMyOrders: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await OrderService.listByBuyer(req.profile!.id, page, limit);

    res.json(ok("Tus órdenes", result));
  },
);

export const getOrder: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);

    const order = await OrderService.getById(id, req.profile!.id);

    res.json(ok("Orden obtenida", { order }));
  },
);
