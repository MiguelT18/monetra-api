import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import AffiliationService from "../services/affiliation.service.ts";
import { productIdParamSchema } from "../schemas/product.schema.ts";

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
  async (req: Request, res: Response) => {
    const { id: productId } = productIdParamSchema.parse(req.params);

    const affiliation = await AffiliationService.joinProduct(productId, req.profile!.id);

    res.status(201).json(ok("Te has afiliado al producto correctamente", { affiliation }));
  },
);

export const listMyAffiliations: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await AffiliationService.listByAffiliate(req.profile!.id, page, limit);

    res.json(ok("Tus afiliaciones", result));
  },
);

export const getAffiliation: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const affiliation = await AffiliationService.getById(id, req.profile!.id);

    res.json(ok("Detalle de afiliación", affiliation));
  },
);
