import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  fullname: z.string().min(2).max(100).optional(),
  bio: z.string().max(160).optional(),
  avatar: z.string().optional(),
  role: z.enum(["PRODUCER", "AFFILIATE", "STUDENT"]).optional(),
});
