import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";

const NOTIFICATION_WITH_SENDER = {
  id: true,
  userId: true,
  senderId: true,
  title: true,
  message: true,
  read: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      username: true,
      fullname: true,
      role: true,
    },
  },
} as const;

class NotificationService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async create(data: {
    userId: string;
    senderId?: string;
    title: string;
    message: string;
  }) {
    return this.prisma.notifications.create({ data });
  }

  async getByUser(userId: string, limit = 20, offset?: number) {
    return this.prisma.notifications.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset ?? 0,
      select: NOTIFICATION_WITH_SENDER,
    });
  }

  async getTotalCount(userId: string) {
    return this.prisma.notifications.count({ where: { userId } });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notifications.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notifications.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notifications.count({
      where: { userId, read: false },
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.notifications.deleteMany({
      where: { id, userId },
    });
  }

  async deleteAll(userId: string) {
    return this.prisma.notifications.deleteMany({
      where: { userId },
    });
  }
}

export default new NotificationService();
