import { z } from "zod";

const roleEnum = z.enum(["STUDENT", "CREATOR", "AFFILIATE", "ADMIN"]);

export const createAchievementSchema = z.object({
  key: z.string().min(1, "key es requerido").max(50),
  title: z.string().min(1, "title es requerido").max(100),
  description: z.string().min(1, "description es requerido").max(500),
  icon: z.string().min(1, "icon es requerido").max(100),
  xpReward: z.number().int().min(0).default(0),
  role: roleEnum,
});

export const updateAchievementSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  icon: z.string().min(1).max(100).optional(),
  xpReward: z.number().int().min(0).optional(),
  role: roleEnum.optional(),
});

export const updateProgressSchema = z.object({
  achievementKey: z.string().min(1, "achievementKey es requerido"),
  progress: z.number().int().min(0, "progress debe ser un número positivo"),
  status: z.enum(["LOCKED", "IN_PROGRESS", "UNLOCKED"]).optional(),
});
