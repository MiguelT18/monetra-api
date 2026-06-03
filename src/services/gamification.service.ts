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
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.gamifications.findUnique({
        where: { userId },
      });

      if (!current) {
        throw new Error("Gamification profile not found");
      }

      const newXP = current.xp + xpToAdd;
      const newLevel = this.calculateLevel(newXP);

      return tx.gamifications.update({
        where: { userId },
        data: {
          xp: newXP,
          level: newLevel,
        },
      });
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

  private xpForNextLevel(level: number): number {
    const linear = 50 * level;
    const logarithmic = 80 * Math.log(level + 1);
    const exponential = 5 * level * level;
    return Math.max(Math.floor(linear + logarithmic + exponential), 1);
  }

  private totalXpForLevel(level: number): number {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += this.xpForNextLevel(i);
    }
    return total;
  }

  private calculateLevel(xp: number): number {
    let low = 1;
    let high = 1000;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (this.totalXpForLevel(mid) <= xp) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return low;
  }
}

export default new GamificationService();
