import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";

const COMMISSION_WITH_DETAILS = {
  id: true,
  orderId: true,
  affiliationId: true,
  amount: true,
  status: true,
  order: {
    select: {
      id: true,
      total: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
  affiliation: {
    select: {
      code: true,
    },
  },
} as const;

class CommissionService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async listByAffiliate(affiliateId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [commissions, total] = await Promise.all([
      this.prisma.commissions.findMany({
        where: { profileId: affiliateId },
        select: COMMISSION_WITH_DETAILS,
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.commissions.count({ where: { profileId: affiliateId } }),
    ]);
    return {
      commissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(affiliateId: string) {
    const [pending, paid, rejected] = await Promise.all([
      this.prisma.commissions.aggregate({
        where: { profileId: affiliateId, status: "PENDING" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.commissions.aggregate({
        where: { profileId: affiliateId, status: "PAID" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.commissions.aggregate({
        where: { profileId: affiliateId, status: "REJECTED" },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      pending: {
        total: pending._sum.amount ?? 0,
        count: pending._count.id,
      },
      paid: {
        total: paid._sum.amount ?? 0,
        count: paid._count.id,
      },
      rejected: {
        total: rejected._sum.amount ?? 0,
        count: rejected._count.id,
      },
    };
  }
}

export default new CommissionService();
