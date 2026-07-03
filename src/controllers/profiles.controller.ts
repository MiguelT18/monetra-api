import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import ReviewService from "../services/review.service.ts";
import { z } from "zod";

const profileIdParamSchema = z.object({
  id: z.uuid("ID de perfil inválido"),
});

export const getReviewStats: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = profileIdParamSchema.parse(req.params);
    const stats = await ReviewService.getProducerStats(id);
    res.json(ok("Estadísticas de reseñas del creador", stats));
  },
);
