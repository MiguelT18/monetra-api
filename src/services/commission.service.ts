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

  async aggregateByProduct(affiliateId: string) {
    const commissions = await this.prisma.commissions.findMany({
      where: { profileId: affiliateId },
      select: {
        amount: true,
        order: {
          select: {
            product: { select: { title: true } },
          },
        },
      },
    });

    const map = new Map<string, { total: number; count: number }>();
    for (const c of commissions) {
      const title = c.order.product.title;
      const entry = map.get(title) ?? { total: 0, count: 0 };
      entry.total += c.amount;
      entry.count += 1;
      map.set(title, entry);
    }

    const result = Array.from(map.entries()).map(([product, data]) => ({
      product,
      total: data.total,
      count: data.count,
    }));

    result.sort((a, b) => b.total - a.total);
    return result;
  }

  async getMonthlyHistory(affiliateId: string, months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months + 1);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const commissions = await this.prisma.commissions.findMany({
      where: {
        profileId: affiliateId,
        order: { createdAt: { gte: since } },
      },
      select: {
        amount: true,
        status: true,
        order: { select: { createdAt: true } },
      },
    });

    const monthlyMap = new Map<string, { pending: number; paid: number }>();

    for (let i = 0; i < months; i++) {
      const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { pending: 0, paid: 0 });
    }

    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];

    for (const c of commissions) {
      const d = new Date(c.order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        if (c.status === "PENDING") entry.pending += c.amount;
        else if (c.status === "PAID") entry.paid += c.amount;
      }
    }

    const result = Array.from(monthlyMap.entries()).map(([key, data]) => {
      const parts = key.split("-");
      const m = parts[1] ?? "01";
      return {
        month: monthNames[parseInt(m, 10) - 1] ?? m,
        pending: data.pending,
        paid: data.paid,
      };
    });

    return result;
  }
}

export default new CommissionService();
