import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient, AchievementStatus } from "@prisma/client";

class AchievementService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async getUserAchievements(userId: string, role: string) {
    const templates = await this.prisma.achievement.findMany({
      where: { role: role as any },
      orderBy: { createdAt: "asc" },
    });

    const existing = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const existingMap = new Map(existing.map((e) => [e.achievementId, e]));
    const results = [];

    for (const template of templates) {
      let record = existingMap.get(template.id);

      if (!record) {
        record = await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: template.id,
            status: "LOCKED",
            progress: 0,
          },
          include: { achievement: true },
        });
      }

      results.push({
        id: record.achievement.key,
        title: record.achievement.title,
        description: record.achievement.description,
        icon: record.achievement.icon,
        xpReward: record.achievement.xpReward,
        status: record.status.toLowerCase(),
        progress: record.progress,
        unlockedAt: record.unlockedAt,
      });
    }

    return results;
  }

  async updateProgress(
    userId: string,
    achievementKey: string,
    progress: number,
    forceStatus?: AchievementStatus,
  ) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { key: achievementKey },
    });

    if (!achievement) {
      throw new Error(`Achievement '${achievementKey}' not found`);
    }

    const safeProgress = Math.max(0, Math.min(100, progress));
    let status = forceStatus;

    if (!status) {
      if (safeProgress >= 100) {
        status = "UNLOCKED";
      } else if (safeProgress > 0) {
        status = "IN_PROGRESS";
      } else {
        status = "LOCKED";
      }
    }

    const data: any = {
      progress: safeProgress,
      status,
    };

    if (status === "UNLOCKED") {
      data.unlockedAt = new Date();
    }

    return this.prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
      update: data,
      create: {
        userId,
        achievementId: achievement.id,
        ...data,
      },
    });
  }

  async getAllTemplates() {
    return this.prisma.achievement.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  }

  async createTemplate(data: {
    key: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    role: string;
  }) {
    return this.prisma.achievement.create({
      data: {
        key: data.key,
        title: data.title,
        description: data.description,
        icon: data.icon,
        xpReward: data.xpReward,
        role: data.role as any,
      },
    });
  }

  async updateTemplate(id: string, data: Partial<{
    title: string;
    description: string;
    icon: string;
    xpReward: number;
    role: string;
  }>) {
    return this.prisma.achievement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.icon && { icon: data.icon }),
        ...(data.xpReward !== undefined && { xpReward: data.xpReward }),
        ...(data.role && { role: data.role as any }),
      },
    });
  }

  async deleteTemplate(id: string) {
    await this.prisma.userAchievement.deleteMany({
      where: { achievementId: id },
    });
    return this.prisma.achievement.delete({
      where: { id },
    });
  }
}

export default new AchievementService();
