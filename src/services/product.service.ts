import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";
import NotificationService from "./notification.service.ts";
import {
  PRODUCT_SELECT,
  PRODUCT_WITH_PRODUCER_SELECT,
  PRODUCT_WITH_PRODUCER_AND_COUNT,
  type CreateProductInput,
  type UpdateProductInput,
} from "../types/product.types.ts";

class ProductService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async create(producerId: string, input: CreateProductInput) {
    this.validateAffiliateConfig(input);

    const createData = {
      producerId,
      title: input.title,
      description: input.description,
      price: input.price,
      thumbnail: input.thumbnail ?? null,
      status: "DRAFT",
      affiliateEnabled: input.affiliateEnabled ?? false,
      affiliateCookieDays: input.affiliateCookieDays ?? 30,
      ...(input.commissionRate != null
        ? { commissionRate: input.commissionRate }
        : {}),
      ...(input.introVideoUrl != null
        ? { introVideoUrl: input.introVideoUrl }
        : {}),
      ...(input.duration != null ? { duration: input.duration } : {}),
      ...(input.rating != null ? { rating: input.rating } : {}),
      ...(input.modules != null ? { modules: input.modules } : {}),
    } as unknown as Prisma.ProductsUncheckedCreateInput;

    return this.prisma.products.create({
      data: createData,
      select: PRODUCT_SELECT,
    });
  }

  async listByProducer(producerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where: { producerId },
        select: PRODUCT_WITH_PRODUCER_SELECT,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.products.count({
        where: { producerId },
      }),
    ]);
    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listPublishedCatalog(page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const where = {
      status: "PUBLISHED" as const,
      producer: { banned: false },
    };
    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where,
        select: PRODUCT_WITH_PRODUCER_SELECT,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.products.count({ where }),
    ]);
    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(productId: string) {
    return this.prisma.products.findUnique({
      where: { id: productId },
      select: PRODUCT_WITH_PRODUCER_AND_COUNT,
    });
  }

  async getByIdForProducer(productId: string, producerId: string) {
    const product = await this.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    if (product.producerId !== producerId) {
      throw new HttpError(403, "No tienes permiso para ver este producto");
    }

    return product;
  }

  async getAccessible(productId: string, requesterId: string, requesterRole?: string) {
    const product = await this.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const isOwner = product.producerId === requesterId;
    const isPublished = product.status === "PUBLISHED";
    const isAdmin = requesterRole === "ADMIN";

    if (isOwner || isPublished || isAdmin) {
      if (!isOwner && !isAdmin) {
        const producer = await this.prisma.profiles.findUnique({
          where: { id: product.producerId },
          select: { banned: true },
        });

        if (producer?.banned) {
          throw new HttpError(404, "Producto no encontrado");
        }
      }

      return product;
    }

    throw new HttpError(403, "Este producto no está disponible");
  }

  async update(
    productId: string,
    producerId: string,
    input: UpdateProductInput,
  ) {
    await this.getByIdForProducer(productId, producerId);
    this.validateAffiliateConfig(input);

    if (input.status !== undefined && input.status !== "DRAFT") {
      throw new HttpError(403, "Solo puedes guardar como borrador. Usa 'Enviar a revisión' para solicitar publicación.");
    }

    const updateData = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail }),
      ...(input.affiliateEnabled !== undefined && {
        affiliateEnabled: input.affiliateEnabled,
      }),
      ...(input.commissionRate !== undefined && {
        commissionRate: input.commissionRate,
      }),
      ...(input.affiliateCookieDays !== undefined && {
        affiliateCookieDays: input.affiliateCookieDays,
      }),
      ...(input.introVideoUrl !== undefined && {
        introVideoUrl: input.introVideoUrl,
      }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.modules !== undefined && { modules: input.modules }),
    } as unknown as Prisma.ProductsUpdateInput;

    if (Object.keys(updateData).length === 0) {
      throw new HttpError(400, "No hay campos para actualizar");
    }

    return this.prisma.products.update({
      where: { id: productId },
      data: updateData,
      select: PRODUCT_SELECT,
    });
  }

  async submitForReview(productId: string, producerId: string) {
    const product = await this.getByIdForProducer(productId, producerId);

    if (product.status !== "DRAFT" && product.status !== "REJECTED") {
      throw new HttpError(400, "Solo puedes enviar a revisión productos en borrador o rechazados");
    }

    return this.prisma.products.update({
      where: { id: productId },
      data: { status: "UNDER_REVIEW" },
      select: PRODUCT_SELECT,
    });
  }

  async review(productId: string, adminId: string, action: "PUBLISHED" | "REJECTED") {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, status: true, producerId: true, title: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");
    if (product.status !== "UNDER_REVIEW") {
      throw new HttpError(400, "El producto no está pendiente de revisión");
    }

    const updated = await this.prisma.products.update({
      where: { id: productId },
      data: { status: action },
      select: PRODUCT_SELECT,
    });

    const isApproved = action === "PUBLISHED";
    await NotificationService.create({
      userId: product.producerId,
      senderId: adminId,
      title: isApproved ? "Producto aprobado" : "Producto rechazado",
      message: isApproved
        ? `Tu producto "${product.title}" ha sido aprobado y publicado.`
        : `Tu producto "${product.title}" ha sido rechazado.`,
    });

    return updated;
  }

  async listPendingReview() {
    return this.prisma.products.findMany({
      where: { status: "UNDER_REVIEW" },
      select: PRODUCT_WITH_PRODUCER_AND_COUNT,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getPreview(productId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      select: PRODUCT_WITH_PRODUCER_AND_COUNT,
    });

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    if (product.status !== "PUBLISHED") {
      throw new HttpError(404, "Producto no encontrado");
    }

    const producer = await this.prisma.profiles.findUnique({
      where: { id: product.producerId },
      select: { banned: true },
    });

    if (producer?.banned) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      recentOrders,
      previousOrders,
      recentEnrollments,
      previousEnrollments,
      totalCommissions,
    ] = await Promise.all([
      this.prisma.orders.count({
        where: { productId, createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.orders.count({
        where: {
          productId,
          createdAt: { gte: sixtyDaysAgo, lt: sevenDaysAgo },
        },
      }),
      this.prisma.enrollments.count({
        where: { productId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.enrollments.count({
        where: {
          productId,
          createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      this.prisma.commissions.aggregate({
        where: {
          order: { productId },
          status: { not: "CANCELED" },
        },
        _sum: { amount: true },
      }),
    ]);

    const salesScore = Math.min(100, (recentOrders / Math.max(previousOrders, 1)) * 50);
    const enrollmentTrend = recentEnrollments - previousEnrollments;
    const enrollmentScore = Math.min(100, Math.max(0, 50 + enrollmentTrend * 5));
    const commissionTotal = totalCommissions._sum.amount ?? 0;
    const commissionScore = Math.min(100, commissionTotal / 10);

    const temperature = Math.round(
      salesScore * 0.4 + enrollmentScore * 0.35 + commissionScore * 0.25
    );

    let temperatureLabel: string;
    if (temperature < 25) temperatureLabel = "Frío";
    else if (temperature < 50) temperatureLabel = "Tibio";
    else if (temperature < 75) temperatureLabel = "Caliente";
    else temperatureLabel = "En llamas";

    return {
      product,
      temperature: Math.min(100, Math.max(0, temperature)),
      temperatureLabel,
      recentSales: recentOrders,
      recentEnrollments,
    };
  }

  async remove(
    productId: string,
    producerId: string,
  ): Promise<{ archived: boolean }> {
    const product = await this.getByIdForProducer(productId, producerId);

    const hasRelations =
      product._count.orders > 0 ||
      product._count.affiliations > 0 ||
      product._count.enrollments > 0;

    if (hasRelations) {
      await this.prisma.products.update({
        where: { id: productId },
        data: { status: "ARCHIVED" },
      });
      return { archived: true };
    }

    await this.prisma.products.delete({ where: { id: productId } });
    return { archived: false };
  }

  private validateAffiliateConfig(
    input: CreateProductInput | UpdateProductInput,
  ): void {
    if (input.affiliateEnabled && input.commissionRate == null) {
      throw new HttpError(
        400,
        "Debes indicar commissionRate cuando activas el programa de afiliados",
      );
    }

    if (
      input.commissionRate != null &&
      (input.commissionRate < 0 || input.commissionRate > 100)
    ) {
      throw new HttpError(400, "La comisión debe estar entre 0 y 100");
    }
  }
}

export default new ProductService();
