import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";
import GamificationService from "./gamification.service.ts";
import NotificationService from "./notification.service.ts";

const ORDER_WITH_PRODUCT = {
  id: true,
  productId: true,
  buyerId: true,
  total: true,
  createdAt: true,
  product: {
    select: {
      id: true,
      title: true,
      thumbnail: true,
    },
  },
} as const;

class OrderService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async purchase(productId: string, buyerId: string, affiliateCode?: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      include: { producer: { select: { banned: true } } },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.status !== "PUBLISHED") {
      throw new HttpError(400, "El producto no está publicado");
    }
    if (product.producer.banned) {
      throw new HttpError(400, "El creador del producto está suspendido");
    }
    if (product.producerId === buyerId) {
      throw new HttpError(400, "No puedes comprar tu propio producto");
    }

    const existing = await this.prisma.enrollments.findUnique({
      where: { userId_productId: { userId: buyerId, productId } },
    });
    if (existing) {
      throw new HttpError(400, "Ya estás inscrito en este producto");
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.orders.create({
        data: {
          productId,
          buyerId,
          total: product.price,
        },
        select: ORDER_WITH_PRODUCT,
      });

      await tx.enrollments.create({
        data: {
          productId,
          userId: buyerId,
          progress: 0,
        },
      });

      return newOrder;
    });

    if (affiliateCode) {
      const affiliation = await this.prisma.affiliations.findUnique({
        where: { code: affiliateCode },
        include: { product: true },
      });

      if (affiliation && affiliation.productId === productId) {
        const commissionAmount = product.commissionRate != null
          ? (product.price * product.commissionRate) / 100
          : 0;

        await this.prisma.commissions.create({
          data: {
            profileId: affiliation.affiliateId,
            orderId: order.id,
            affiliationId: affiliation.id,
            amount: commissionAmount,
            status: "PENDING",
          },
        });
      }
    }

    try {
      await GamificationService.addXP(buyerId, 10);
    } catch {
      // gamification profile might not exist yet — that's ok
    }

    try {
      await NotificationService.create({
        userId: product.producerId,
        title: "¡Nueva venta!",
        message: `Tu producto "${product.title}" ha sido vendido.`,
        link: "/user/earnings",
      });
    } catch {
      // notification failure shouldn't break the purchase
    }

    return order;
  }

  async listByBuyer(buyerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.orders.findMany({
        where: { buyerId },
        select: ORDER_WITH_PRODUCT,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.orders.count({ where: { buyerId } }),
    ]);
    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(orderId: string, userId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        buyer: { select: { id: true, username: true, fullname: true } },
      },
    });

    if (!order) throw new HttpError(404, "Orden no encontrada");
    if (order.buyerId !== userId) {
      throw new HttpError(403, "No tienes permiso para ver esta orden");
    }

    return order;
  }
}

export default new OrderService();
