import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import NotificationService from "../services/notification.service.ts";
import ProductService from "../services/product.service.ts";


export const getUserNotifications: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const [notifications, total] = await Promise.all([
      NotificationService.getByUser(userId, limit, offset),
      NotificationService.getTotalCount(userId),
    ]);

    const isAdmin = req.profile?.role === "ADMIN";
    const processedNotifications = isAdmin
      ? notifications
      : notifications.map((n) => {
          const senderIsAdmin = n.sender?.role === "ADMIN";
          if (!senderIsAdmin) return n;
          return {
            ...n,
            senderId: null,
            sender: { id: null, username: null, fullname: "Equipo de Soporte", role: "STUDENT" as const },
          };
        });

    res.json(ok("Notificaciones obtenidas", { notifications: processedNotifications, total }));
  },
);

export const getUnreadCount: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const [count, pendingReviewCount] = await Promise.all([
      NotificationService.getUnreadCount(userId),
      req.profile?.role === "ADMIN" ? ProductService.countPendingReview() : Promise.resolve(0),
    ]);

    res.json(ok("Notificaciones no leídas", { count, pendingReviewCount }));
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
