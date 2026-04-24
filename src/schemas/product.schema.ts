import { z } from "zod";

export const updateProductSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  desctiption: z.string().min(3).max(255).optional(),
  price: z.number().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});
