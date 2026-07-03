import { z } from "zod";

const productStatusSchema = z.enum(["DRAFT", "UNDER_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"]);

const affiliateValidation = (data: any, ctx: any) => {
  if (data.affiliateEnabled && data.commissionRate == null) {
    ctx.addIssue({
      code: "custom",
      message:
        "commissionRate es obligatorio cuando el programa de afiliados está activo",
      path: ["commissionRate"],
    });
  }
};

const attachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  type: z.string().min(1),
  size: z.number().int().positive(),
});

const lessonSchema = z.object({
  title: z.string().min(1).max(200),
  durationMinutes: z.number().int().positive().optional(),
  hlsUrl: z.string().optional(),
  content: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const moduleSchema = z.object({
  title: z.string().min(1).max(200),
  lessons: z.array(lessonSchema).min(1),
  evaluation: z.any().optional(),
});

export const createProductSchema = z
  .object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(5000),
    price: z.number().positive().max(999_999),
    category: z.string().min(1, "La categoría es obligatoria").max(50),
    thumbnail: z.string().nullable().optional(),
    status: productStatusSchema.optional(),
    affiliateEnabled: z.boolean().optional(),
    commissionRate: z.number().min(0).max(100).nullable().optional(),
    affiliateCookieDays: z.number().int().min(1).max(365).optional(),
    affiliateDescription: z.string().max(2000).optional(),
    affiliateVideoUrl: z.string().url().nullable().optional(),
    introVideoUrl: z.string().url().nullable().optional(),
    duration: z.number().int().positive().nullable().optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    modules: z.array(moduleSchema).nullable().optional(),
    draftChanges: z.any().optional(),
  })
  .superRefine(affiliateValidation);

export const updateProductSchema = z
  .object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(5000).optional(),
    price: z.number().positive().max(999_999).optional(),
    thumbnail: z.string().nullable().optional(),
    status: productStatusSchema.optional(),
    affiliateEnabled: z.boolean().optional(),
    commissionRate: z.number().min(0).max(100).nullable().optional(),
    affiliateCookieDays: z.number().int().min(1).max(365).optional(),
    affiliateDescription: z.string().max(2000).optional(),
    affiliateVideoUrl: z.string().url().nullable().optional(),
    introVideoUrl: z.string().url().nullable().optional(),
    category: z.string().min(1).max(50).nullable().optional(),
    duration: z.number().int().positive().nullable().optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    modules: z.array(moduleSchema).nullable().optional(),
    draftChanges: z.any().optional(),
  })
  .superRefine(affiliateValidation);

export const productIdParamSchema = z.object({
  id: z.uuid("ID de producto inválido"),
});