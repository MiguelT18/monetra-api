import { z } from "zod";

const productStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

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

export const createProductSchema = z
  .object({
    title: z.string().min(3).max(100),
    description: z.string().min(10).max(5000),
    price: z.number().positive().max(999_999),
    status: productStatusSchema.optional(),
    affiliateEnabled: z.boolean().optional(),
    commissionRate: z.number().min(0).max(100).nullable().optional(),
    affiliateCookieDays: z.number().int().min(1).max(365).optional(),
  })
  .superRefine(affiliateValidation);

export const updateProductSchema = z
  .object({
    title: z.string().min(3).max(100).optional(),
    description: z.string().min(10).max(5000).optional(),
    price: z.number().positive().max(999_999).optional(),
    status: productStatusSchema.optional(),
    affiliateEnabled: z.boolean().optional(),
    commissionRate: z.number().min(0).max(100).nullable().optional(),
    affiliateCookieDays: z.number().int().min(1).max(365).optional(),
  })
  .superRefine(affiliateValidation);

export const productIdParamSchema = z.object({
  id: z.uuid("ID de producto inválido"),
});