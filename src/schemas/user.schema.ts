import { z } from "zod";

const avatarSchema = z
  .string()
  .max(350_000, "La imagen es demasiado grande")
  .refine(
    (value) =>
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image/"),
    "La foto debe ser una URL o una imagen válida",
  );

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  fullname: z.string().min(2).max(100).optional(),
  bio: z.string().max(160).optional().nullable(),
  avatar: avatarSchema.optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(["CREATOR", "AFFILIATE", "STUDENT"]).optional(),
});
