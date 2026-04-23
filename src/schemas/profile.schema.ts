import { z } from "zod";

export const profileResponseSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  fullname: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  role: z.enum(["PRODUCER", "AFFILIATE", "STUDENT"]),
  createdAt: z.date(),
});

export type ProfileResponse = z.infer<typeof profileResponseSchema>;
