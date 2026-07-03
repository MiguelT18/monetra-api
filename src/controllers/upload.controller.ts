import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import R2Service from "../services/r2.service.ts";
import { prisma } from "../lib/prisma.ts";
import { HttpError } from "../errors/http-error.ts";
import { z } from "zod";

export const requestUploadUrl: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await R2Service.requestUploadUrl();
    res.json(ok("URL de subida generada", result));
  },
);

export const startProcessing: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({ uploadId: z.string().min(1) })
      .parse(req.body);

    await R2Service.startTranscoding(body.uploadId);
    res.json(ok("Procesamiento iniciado"));
  },
);

export const checkUploadStatus: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { uploadId } = z
      .object({ uploadId: z.string().min(1) })
      .parse(req.params);

    const job = R2Service.getJob(uploadId);
    res.json(ok("Estado de la subida", {
      status: job.status,
      hlsUrl: job.hlsUrl,
      durationMinutes: job.durationMinutes,
      error: job.error,
    }));
  },
);

export const confirmAsset: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        lessonIndex: z.number().int().min(0),
        moduleIndex: z.number().int().min(0),
        uploadId: z.string().min(1),
        hlsUrl: z.string().min(1),
        durationMinutes: z.number().positive().optional(),
      })
      .parse(req.body);

    const product = await prisma.products.findUnique({
      where: { id: body.productId },
      select: { producerId: true, modules: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.producerId !== req.profile!.id) {
      throw new HttpError(403, "No eres el creador de este producto");
    }

    const modules: any[] = (product.modules as any[]) ?? [];
    const mod = modules[body.moduleIndex];
    if (!mod) throw new HttpError(400, "Módulo no encontrado");
    const lesson = mod.lessons?.[body.lessonIndex];
    if (!lesson) throw new HttpError(400, "Lección no encontrada");

    lesson.hlsUrl = body.hlsUrl;
    if (body.durationMinutes) {
      lesson.durationMinutes = Math.round(body.durationMinutes);
    }

    await prisma.products.update({
      where: { id: body.productId },
      data: { modules },
    });

    res.json(ok("Video confirmado en la lección"));
  },
);

export const confirmIntroVideo: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        hlsUrl: z.string().min(1),
      })
      .parse(req.body);

    const product = await prisma.products.findUnique({
      where: { id: body.productId },
      select: { producerId: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.producerId !== req.profile!.id) {
      throw new HttpError(403, "No eres el creador de este producto");
    }

    await prisma.products.update({
      where: { id: body.productId },
      data: { introVideoUrl: body.hlsUrl },
    });

    res.json(ok("Video de introducción actualizado"));
  },
);

export const confirmAffiliateVideo: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        hlsUrl: z.string().min(1),
      })
      .parse(req.body);

    const product = await prisma.products.findUnique({
      where: { id: body.productId },
      select: { producerId: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.producerId !== req.profile!.id) {
      throw new HttpError(403, "No eres el creador de este producto");
    }

    await prisma.products.update({
      where: { id: body.productId },
      data: { affiliateVideoUrl: body.hlsUrl },
    });

    res.json(ok("Video de introducción para afiliados actualizado"));
  },
);

export const requestAttachmentUploadUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({
        fileName: z.string().min(1),
        contentType: z.string().min(1),
      })
      .parse(req.body);

    const result = await R2Service.requestAttachmentUploadUrl(body.fileName, body.contentType);
    res.json(ok("URL de subida generada", result));
  },
);

export const confirmAttachment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        moduleIndex: z.number().int().min(0),
        lessonIndex: z.number().int().min(0),
        attachment: z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          url: z.string().min(1),
          type: z.string().min(1),
          size: z.number().int().positive(),
        }),
      })
      .parse(req.body);

    const product = await prisma.products.findUnique({
      where: { id: body.productId },
      select: { producerId: true, modules: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.producerId !== req.profile!.id) {
      throw new HttpError(403, "No eres el creador de este producto");
    }

    const modules: any[] = (product.modules as any[]) ?? [];
    const mod = modules[body.moduleIndex];
    if (!mod) throw new HttpError(400, "Módulo no encontrado");
    const lesson = mod.lessons?.[body.lessonIndex];
    if (!lesson) throw new HttpError(400, "Lección no encontrada");

    if (!Array.isArray(lesson.attachments)) {
      lesson.attachments = [];
    }
    lesson.attachments.push(body.attachment);

    await prisma.products.update({
      where: { id: body.productId },
      data: { modules },
    });

    res.json(ok("Archivo adjuntado a la lección"));
  },
);

export const removeAttachment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        moduleIndex: z.number().int().min(0),
        lessonIndex: z.number().int().min(0),
        attachmentId: z.string().min(1),
      })
      .parse(req.body);

    const product = await prisma.products.findUnique({
      where: { id: body.productId },
      select: { producerId: true, modules: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.producerId !== req.profile!.id) {
      throw new HttpError(403, "No eres el creador de este producto");
    }

    const modules: any[] = (product.modules as any[]) ?? [];
    const mod = modules[body.moduleIndex];
    if (!mod) throw new HttpError(400, "Módulo no encontrado");
    const lesson = mod.lessons?.[body.lessonIndex];
    if (!lesson) throw new HttpError(400, "Lección no encontrada");

    if (Array.isArray(lesson.attachments)) {
      lesson.attachments = lesson.attachments.filter(
        (a: any) => a.id !== body.attachmentId,
      );
    }

    await prisma.products.update({
      where: { id: body.productId },
      data: { modules },
    });

    res.json(ok("Archivo eliminado de la lección"));
  },
);
