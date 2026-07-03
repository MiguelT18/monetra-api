import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import EnrollmentService from "../services/enrollment.service.ts";
import { productIdParamSchema } from "../schemas/product.schema.ts";
import { z } from "zod";

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

export const getCourseContent: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = z
      .object({ enrollmentId: z.string().uuid() })
      .parse(req.params);

    const content = await EnrollmentService.getCourseContent(
      enrollmentId,
      req.profile!.id,
    );

    res.json(ok("Contenido del curso", content));
  },
);

export const completeLesson: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = z
      .object({ enrollmentId: z.string().uuid() })
      .parse(req.params);

    const body = z
      .object({
        moduleIndex: z.number().int().min(0),
        lessonIndex: z.number().int().min(0),
      })
      .parse(req.body);

    const result = await EnrollmentService.completeLesson(
      enrollmentId,
      req.profile!.id,
      body.moduleIndex,
      body.lessonIndex,
    );

    res.json(ok("Lección completada", result));
  },
);

export const getSignedVideoUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId } = z
      .object({ enrollmentId: z.string().uuid() })
      .parse(req.params);

    const body = z
      .object({
        moduleIndex: z.number().int().min(0),
        lessonIndex: z.number().int().min(0),
      })
      .parse(req.body);

    const result = await EnrollmentService.getSignedVideoUrl(
      enrollmentId,
      req.profile!.id,
      body.moduleIndex,
      body.lessonIndex,
    );

    res.json(ok("URL de video obtenida", result));
  },
);

export const getModuleEvaluation: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId, moduleIndex } = z
      .object({
        enrollmentId: z.string().uuid(),
        moduleIndex: z.coerce.number().int().min(0),
      })
      .parse(req.params);

    const result = await EnrollmentService.getModuleEvaluation(
      enrollmentId,
      req.profile!.id,
      moduleIndex,
    );

    res.json(ok("Evaluación del módulo", result));
  },
);

export const submitModuleEvaluation: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { enrollmentId, moduleIndex } = z
      .object({
        enrollmentId: z.string().uuid(),
        moduleIndex: z.coerce.number().int().min(0),
      })
      .parse(req.params);

    const body = z
      .object({
        answers: z.array(
          z.object({
            questionId: z.string(),
            selectedIndex: z.number().int().min(0).optional(),
            selectedIndices: z.array(z.number().int().min(0)).optional(),
            textAnswer: z.string().optional(),
          }),
        ),
      })
      .parse(req.body);

    const result = await EnrollmentService.submitModuleEvaluation(
      enrollmentId,
      req.profile!.id,
      moduleIndex,
      body.answers as { questionId: string; selectedIndex?: number; selectedIndices?: number[]; textAnswer?: string }[],
    );

    res.json(ok("Evaluación enviada", result));
  },
);
