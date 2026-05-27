import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import AffiliationService from "../services/affiliation.service.ts";
import { productIdParamSchema } from "../schemas/product.schema.ts";

/** Comprueba si un afiliado puede unirse a un producto (sin crear la afiliación aún). */
export const checkAffiliateEligibility: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: productId } = productIdParamSchema.parse(req.params);

    const eligibility = await AffiliationService.checkEligibility(
      productId,
      req.profile!.id,
    );

    res.json(ok("Elegibilidad de afiliación", eligibility));
  },
);

export const joinProductAsAffiliate: RequestHandler = asyncHandler(
  async (req: Request, _res: Response) => {
    const { id: productId } = productIdParamSchema.parse(req.params);

    await AffiliationService.joinProduct(productId, req.profile!.id);
  },
);
