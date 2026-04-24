/*
	Responsabilidades del servicio:

	getUserProgress
	createUserProgress
	addXP
	setLevel
	getLeaderboard
*/

import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";

class GamificationService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async getUserProgress(userId: string) {
    return this.prisma.gamifications.findUnique({
      where: { userId },
    });
  }

  async addXP(userId: string, xpToAdd: number) {
    const current = await this.prisma.gamifications.findUnique({
      where: { userId },
    });

    if (!current) {
      throw new Error("Gamification profile not found");
    }

    const newXP = current.xp + xpToAdd;
    const newLevel = this.calculateLevel(newXP);

    return this.prisma.gamifications.update({
      where: { userId },
      data: {
        xp: newXP,
        level: newLevel,
      },
    });
  }

  async getLeaderBoard(limit = 10) {
    return this.prisma.gamifications.findMany({
      take: limit,
      orderBy: {
        xp: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  private calculateLevel(xp: number): number {
    return Math.floor(xp / 100 + 1);
  }
}

export default new GamificationService();
