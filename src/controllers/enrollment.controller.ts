import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import EnrollmentService from "../services/enrollment.service.ts";
import { productIdParamSchema } from "../schemas/product.schema.ts";

/** Comprueba si un estudiante puede acceder a un producto (sin matricular aún). */
export const checkEnrollmentEligibility: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: productId } = productIdParamSchema.parse(req.params);

    const eligibility = await EnrollmentService.checkEligibility(
      productId,
      req.profile!.id,
    );

    res.json(ok("Elegibilidad de acceso", eligibility));
  },
);

export const enrollInProduct: RequestHandler = asyncHandler(
  async (req: Request, _res: Response) => {
    const { id: productId } = productIdParamSchema.parse(req.params);

    await EnrollmentService.enroll(productId, req.profile!.id);
  },
);
