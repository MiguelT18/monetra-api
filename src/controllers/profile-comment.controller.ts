import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import ProfileCommentService from "../services/profile-comment.service.ts";
import { z } from "zod";

const commentSchema = z.object({
  comment: z.string().min(1).max(1000),
});

const reportSchema = z.object({
  reason: z.string().max(500).optional(),
});

const blockSchema = z.object({
  blockedId: z.string().uuid("ID de usuario inválido"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const listComments: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { page, limit } = listQuerySchema.parse(req.query);

    const result = await ProfileCommentService.listByProfile(id, page, limit, req.user?.id);

    res.json(ok("Comentarios del perfil", result));
  },
);

export const createComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { comment } = commentSchema.parse(req.body);
    const userId = req.user!.id;

    const created = await ProfileCommentService.create(id, userId, comment);

    res.json(ok("Comentario creado", created));
  },
);

export const deleteComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const commentId = req.params.commentId as string;
    const userId = req.user!.id;

    await ProfileCommentService.delete(commentId, userId);

    res.json(ok("Comentario eliminado"));
  },
);

export const reportComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const commentId = req.params.commentId as string;
    const { reason } = reportSchema.parse(req.body);
    const userId = req.user!.id;

    const report = await ProfileCommentService.report(commentId, userId, reason);

    res.json(ok("Comentario reportado", report));
  },
);

export const listReports: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = listQuerySchema.parse(req.query);

    const result = await ProfileCommentService.listReports(page, limit);

    res.json(ok("Reportes de comentarios", result));
  },
);

export const dismissReport: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const reportId = req.params.reportId as string;

    await ProfileCommentService.dismissReport(reportId);

    res.json(ok("Reporte desestimado"));
  },
);

export const adminDeleteComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const commentId = req.params.commentId as string;

    await ProfileCommentService.deleteCommentAsAdmin(commentId);

    res.json(ok("Comentario eliminado por administrador"));
  },
);

export const blockUser: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const blockerId = req.user!.id;
    const { blockedId } = blockSchema.parse(req.body);

    const result = await ProfileCommentService.block(blockerId, blockedId);

    res.json(ok("Usuario bloqueado", result));
  },
);

export const unblockUser: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const blockerId = req.user!.id;
    const blockedId = req.params.blockedId as string;

    const result = await ProfileCommentService.unblock(blockerId, blockedId);

    res.json(ok("Usuario desbloqueado", result));
  },
);

export const getBlockedUsers: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const profileId = req.user!.id;

    const blocked = await ProfileCommentService.getBlockedUsers(profileId);

    res.json(ok("Usuarios bloqueados", { blocked }));
  },
);

export const checkBlocked: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user?.id;

    if (!userId) {
      res.json(ok("Estado de bloqueo", { blocked: false }));
      return;
    }

    const blocked = await ProfileCommentService.isBlocked(id, userId);

    res.json(ok("Estado de bloqueo", { blocked }));
  },
);

export const getProfileCommentCount: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const count = await ProfileCommentService.getProfileCommentCount(id);

    res.json(ok("Cantidad de comentarios en perfil", { count }));
  },
);
