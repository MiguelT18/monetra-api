import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import ReviewService from "../services/review.service.ts";
import { z } from "zod";

const productIdParamSchema = z.object({
  id: z.uuid("ID de producto inválido"),
});

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const listReviews: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await ReviewService.listByProduct(id, page, limit);

    res.json(ok("Reseñas del producto", result));
  },
);

export const createReview: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);
    const data = createReviewSchema.parse(req.body);

    const review = await ReviewService.create(
      id,
      req.profile!.id,
      data.rating,
      data.comment,
    );

    res.status(201).json(ok("Reseña creada correctamente", { review }));
  },
);
