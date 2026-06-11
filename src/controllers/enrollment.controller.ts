import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import EnrollmentService from "../services/enrollment.service.ts";
import { productIdParamSchema } from "../schemas/product.schema.ts";

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
  async (req: Request, res: Response) => {
    const { id: productId } = productIdParamSchema.parse(req.params);

    const enrollment = await EnrollmentService.enroll(productId, req.profile!.id);

    res.status(201).json(ok("Inscripción realizada correctamente", { enrollment }));
  },
);

export const listMyEnrollments: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await EnrollmentService.listByStudent(req.profile!.id, page, limit);

    res.json(ok("Tus inscripciones", result));
  },
);
