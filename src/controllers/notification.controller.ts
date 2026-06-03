import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import { HttpError } from "../errors/http-error.ts";
import NotificationService from "../services/notification.service.ts";

export const send: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, title, message } = req.body;

    if (!userId || !title || !message) {
      throw new HttpError(400, "Faltan campos requeridos (userId, title, message)");
    }

    const notification = await NotificationService.create({
      userId,
      senderId: req.user!.id,
      title,
      message,
    });

    res.status(201).json(ok("Notificación enviada", { notification }));
  },
);

export const getUserNotifications: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const [notifications, total] = await Promise.all([
      NotificationService.getByUser(userId, limit, offset),
      NotificationService.getTotalCount(userId),
    ]);

    res.json(ok("Notificaciones obtenidas", { notifications, total }));
  },
);

export const getUnreadCount: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const count = await NotificationService.getUnreadCount(userId);

    res.json(ok("Notificaciones no leídas", { count }));
  },
);

export const markRead: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user!.id;

    await NotificationService.markAsRead(id, userId);

    res.json(ok("Notificación marcada como leída"));
  },
);

export const markAllRead: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const result = await NotificationService.markAllAsRead(userId);

    res.json(ok("Todas las notificaciones marcadas como leídas", { count: result.count }));
  },
);

export const remove: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user!.id;

    await NotificationService.delete(id, userId);

    res.json(ok("Notificación eliminada"));
  },
);

export const removeAll: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const result = await NotificationService.deleteAll(userId);

    res.json(ok("Todas las notificaciones eliminadas", { count: result.count }));
  },
);
