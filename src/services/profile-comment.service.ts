import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";

class ProfileCommentService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async listByProfile(profileId: string, page = 1, limit = 20, viewerId?: string) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.profileComments.findMany({
        where: {
          profileId,
          ...(viewerId && viewerId !== profileId
            ? { user: { blockedBy: { none: { blockerId: profileId } } } }
            : {}),
        },
        select: {
          id: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullname: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.profileComments.count({ where: { profileId } }),
    ]);

    return {
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(profileId: string, userId: string, comment: string) {
    if (!comment || comment.trim().length === 0) {
      throw new HttpError(400, "El comentario no puede estar vacío");
    }

    if (comment.length > 1000) {
      throw new HttpError(400, "El comentario no puede exceder 1000 caracteres");
    }

    const profile = await this.prisma.profiles.findUnique({
      where: { id: profileId },
      select: { id: true },
    });

    if (!profile) {
      throw new HttpError(404, "Perfil no encontrado");
    }

    if (profileId === userId) {
      throw new HttpError(400, "No puedes comentar en tu propio perfil");
    }

    const blocked = await this.prisma.blockedProfiles.findUnique({
      where: { blockerId_blockedId: { blockerId: profileId, blockedId: userId } },
    });

    if (blocked) {
      throw new HttpError(403, "Has sido bloqueado por el dueño de este perfil");
    }

    return this.prisma.profileComments.create({
      data: { profileId, userId, comment: comment.trim() },
      select: {
        id: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  async delete(commentId: string, requesterId: string) {
    const comment = await this.prisma.profileComments.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, profileId: true },
    });

    if (!comment) {
      throw new HttpError(404, "Comentario no encontrado");
    }

    if (comment.userId !== requesterId && comment.profileId !== requesterId) {
      throw new HttpError(403, "No tienes permiso para eliminar este comentario");
    }

    await this.prisma.profileComments.delete({ where: { id: commentId } });

    return { deleted: true };
  }

  async report(commentId: string, reportedBy: string, reason?: string) {
    const comment = await this.prisma.profileComments.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new HttpError(404, "Comentario no encontrado");
    }

    const existing = await this.prisma.reportedProfileComments.findFirst({
      where: { commentId, reportedBy },
    });

    if (existing) {
      throw new HttpError(400, "Ya has reportado este comentario");
    }

    return this.prisma.reportedProfileComments.create({
      data: { commentId, reportedBy, reason: reason ?? null },
      select: { id: true, createdAt: true },
    });
  }

  async listReports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.reportedProfileComments.findMany({
        where: { dismissed: false },
        select: {
          id: true,
          reason: true,
          createdAt: true,
          comment: {
            select: {
              id: true,
              comment: true,
              createdAt: true,
              user: {
                select: { id: true, fullname: true, username: true, avatar: true },
              },
              profile: {
                select: { id: true, fullname: true, username: true },
              },
            },
          },
          reporter: {
            select: { id: true, fullname: true, username: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.reportedProfileComments.count({ where: { dismissed: false } }),
    ]);

    return { reports, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async dismissReport(reportId: string) {
    const report = await this.prisma.reportedProfileComments.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new HttpError(404, "Reporte no encontrado");
    }

    await this.prisma.reportedProfileComments.update({
      where: { id: reportId },
      data: { dismissed: true },
    });

    return { dismissed: true };
  }

  async deleteCommentAsAdmin(commentId: string) {
    const comment = await this.prisma.profileComments.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new HttpError(404, "Comentario no encontrado");
    }

    await this.prisma.profileComments.delete({ where: { id: commentId } });

    return { deleted: true };
  }

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new HttpError(400, "No puedes bloquearte a ti mismo");
    }

    const blockedUser = await this.prisma.profiles.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });

    if (!blockedUser) {
      throw new HttpError(404, "Usuario no encontrado");
    }

    const existing = await this.prisma.blockedProfiles.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    if (existing) {
      throw new HttpError(400, "Ya has bloqueado a este usuario");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.blockedProfiles.create({
        data: { blockerId, blockedId },
      });

      await tx.profileComments.deleteMany({
        where: { profileId: blockerId, userId: blockedId },
      });
    });

    return { blocked: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    const existing = await this.prisma.blockedProfiles.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    if (!existing) {
      throw new HttpError(404, "Bloqueo no encontrado");
    }

    await this.prisma.blockedProfiles.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    return { unblocked: true };
  }

  async getProfileCommentCount(profileId: string) {
    return this.prisma.profileComments.count({ where: { profileId } });
  }

  async isBlocked(profileId: string, userId: string) {
    const blocked = await this.prisma.blockedProfiles.findUnique({
      where: { blockerId_blockedId: { blockerId: profileId, blockedId: userId } },
    });
    return !!blocked;
  }

  async getBlockedUsers(profileId: string) {
    return this.prisma.blockedProfiles.findMany({
      where: { blockerId: profileId },
      select: {
        id: true,
        createdAt: true,
        blocked: {
          select: { id: true, fullname: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new ProfileCommentService();
