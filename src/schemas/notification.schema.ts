import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z.string().min(1, "userId es requerido"),
  title: z.string().min(1, "title es requerido").max(200),
  message: z.string().min(1, "message es requerido").max(2000),
  link: z.string().optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().min(1, "ID de notificación requerido"),
});
