import { prisma as PrismaInstance } from "../lib/prisma.ts";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
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
      ...(input.affiliateDescription !== undefined
        ? { affiliateDescription: input.affiliateDescription }
        : {}),
      ...(input.affiliateVideoUrl != null
        ? { affiliateVideoUrl: input.affiliateVideoUrl }
        : {}),
      ...(input.commissionRate != null
        ? { commissionRate: input.commissionRate }
        : {}),
      ...(input.introVideoUrl != null
        ? { introVideoUrl: input.introVideoUrl }
        : {}),
      ...(input.category != null
        ? { category: input.category }
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

    const uncategorized = products.filter((p) => !p.category);
    if (uncategorized.length > 0 && page === 1) {
      for (const product of uncategorized) {
        const existingNotification = await this.prisma.notifications.findFirst({
          where: {
            userId: producerId,
            title: `"${product.title}" sin categoría`,
            read: false,
          },
        });
        if (!existingNotification) {
          await NotificationService.create({
            userId: producerId,
            title: `"${product.title}" sin categoría`,
            message: `El producto "${product.title}" no tiene una categoría asignada. Edítalo para añadir una y que pueda aparecer en el mercado.`,
            link: `/user/products/${product.id}/edit?highlight=category`,
          });
        }
      }
    }

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
      category: { not: null },
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

  async getRecommendations(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const baseWhere: Prisma.ProductsWhereInput = {
      status: "PUBLISHED",
      category: { not: null },
      producer: { banned: false },
    };

    // 1. Derive the recommendation profile from the user's enrollments
    const enrolled = await this.prisma.enrollments.findMany({
      where: { userId },
      select: { productId: true, product: { select: { category: true } } },
    });
    const interestCategories = Array.from(
      new Set(
        enrolled
          .map((e) => e.product.category)
          .filter((c): c is string => Boolean(c)),
      ),
    );
    const enrolledProductIds = enrolled.map((e) => e.productId);

    let mode: "interests" | "best_sellers" | "recent" = "recent";
    let where = baseWhere;
    let orderBy:
      | Record<string, unknown>
      | Record<string, unknown>[] = { createdAt: "desc" };

    if (interestCategories.length > 0) {
      mode = "interests";
      where = {
        ...baseWhere,
        category: { in: interestCategories },
        id: { notIn: enrolledProductIds },
      };
      orderBy = [
        { rating: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ];
    } else {
      // 2. Fallback to best sellers if there are any sales in the app
      const topSeller = await this.prisma.products.findFirst({
        where: baseWhere,
        select: { _count: { select: { orders: true } } },
        orderBy: { orders: { _count: "desc" } },
      });
      const hasSales = (topSeller?._count.orders ?? 0) > 0;

      if (hasSales) {
        mode = "best_sellers";
        where = baseWhere;
        orderBy = [{ orders: { _count: "desc" } }, { createdAt: "desc" }];
      } else {
        // 3. No sales yet → most recent published products
        mode = "recent";
        where = baseWhere;
        orderBy = { createdAt: "desc" };
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where,
        select: PRODUCT_WITH_PRODUCER_AND_COUNT,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.products.count({ where }),
    ]);

    return {
      mode,
      products,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
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
    const product = await this.getByIdForProducer(productId, producerId);
    this.validateAffiliateConfig(input);

    if (input.status !== undefined && input.status !== "DRAFT") {
      throw new HttpError(403, "Solo puedes guardar como borrador. Usa 'Enviar a revisión' para solicitar publicación.");
    }

    // If product is PUBLISHED, store changes as draft without affecting live version
    if (product.status === "PUBLISHED") {
      const draftData: Record<string, unknown> = {};
      if (input.title !== undefined) draftData.title = input.title;
      if (input.description !== undefined) draftData.description = input.description;
      if (input.price !== undefined) draftData.price = input.price;
      if (input.thumbnail !== undefined) draftData.thumbnail = input.thumbnail;
      if (input.affiliateEnabled !== undefined) draftData.affiliateEnabled = input.affiliateEnabled;
      if (input.commissionRate !== undefined) draftData.commissionRate = input.commissionRate;
      if (input.affiliateCookieDays !== undefined) draftData.affiliateCookieDays = input.affiliateCookieDays;
      if (input.affiliateDescription !== undefined) draftData.affiliateDescription = input.affiliateDescription;
      if (input.affiliateVideoUrl !== undefined) draftData.affiliateVideoUrl = input.affiliateVideoUrl;
      if (input.introVideoUrl !== undefined) draftData.introVideoUrl = input.introVideoUrl;
      if (input.category !== undefined) draftData.category = input.category;
      if (input.duration !== undefined) draftData.duration = input.duration;
      if (input.rating !== undefined) draftData.rating = input.rating;
      if (input.modules !== undefined) draftData.modules = input.modules;

      if (Object.keys(draftData).length === 0) {
        throw new HttpError(400, "No hay campos para actualizar");
      }

      return this.prisma.products.update({
        where: { id: productId },
        data: { draftChanges: draftData } as Prisma.ProductsUpdateInput,
        select: PRODUCT_SELECT,
      });
    }

    const updateData: Record<string, unknown> = {
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
      ...(input.affiliateDescription !== undefined && {
        affiliateDescription: input.affiliateDescription,
      }),
      ...(input.affiliateVideoUrl !== undefined && {
        affiliateVideoUrl: input.affiliateVideoUrl,
      }),
      ...(input.introVideoUrl !== undefined && {
        introVideoUrl: input.introVideoUrl,
      }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.modules !== undefined && { modules: input.modules }),
    };

    if (Object.keys(updateData).length === 0) {
      throw new HttpError(400, "No hay campos para actualizar");
    }

    return this.prisma.products.update({
      where: { id: productId },
      data: updateData as Prisma.ProductsUpdateInput,
      select: PRODUCT_SELECT,
    });
  }

  async submitForReview(productId: string, producerId: string) {
    const product = await this.getByIdForProducer(productId, producerId);

    const draftCat =
      product.status === "PUBLISHED" && product.draftChanges
        ? (product.draftChanges as Record<string, unknown>).category
        : undefined;

    if (!product.category && !draftCat) {
      throw new HttpError(400, "Debes asignar una categoría al producto antes de enviarlo a revisión.");
    }

    // If product is PUBLISHED with pending draft changes, apply them
    if (product.status === "PUBLISHED" && product.draftChanges) {
      const draft = product.draftChanges as Record<string, unknown>;
      const prev: Record<string, unknown> = {};
      if (draft.title !== undefined) prev.title = product.title;
      if (draft.description !== undefined) prev.description = product.description;
      if (draft.price !== undefined) prev.price = product.price;
      if (draft.thumbnail !== undefined) prev.thumbnail = product.thumbnail;
      if (draft.affiliateEnabled !== undefined) prev.affiliateEnabled = product.affiliateEnabled;
      if (draft.commissionRate !== undefined) prev.commissionRate = product.commissionRate;
      if (draft.affiliateCookieDays !== undefined) prev.affiliateCookieDays = product.affiliateCookieDays;
      if (draft.affiliateDescription !== undefined) prev.affiliateDescription = product.affiliateDescription;
      if (draft.affiliateVideoUrl !== undefined) prev.affiliateVideoUrl = product.affiliateVideoUrl;
      if (draft.introVideoUrl !== undefined) prev.introVideoUrl = product.introVideoUrl;
      if (draft.duration !== undefined) prev.duration = product.duration;
      if (draft.modules !== undefined) prev.modules = product.modules;

      const updatedPub = await this.prisma.products.update({
        where: { id: productId },
        data: {
          ...draft,
          previousValues: Object.keys(prev).length > 0 ? prev : Prisma.JsonNull,
          draftChanges: Prisma.JsonNull,
          status: "UNDER_REVIEW",
        } as Prisma.ProductsUpdateInput,
        select: PRODUCT_SELECT,
      });

      await NotificationService.create({
        userId: producerId,
        title: "Actualización enviada a revisión",
        message: `Los cambios de tu producto "${product.title}" han sido enviados a revisión.`,
        link: "/user/products",
      });

      return updatedPub;
    }

    if (product.status !== "DRAFT" && product.status !== "REJECTED") {
      throw new HttpError(400, "Solo puedes enviar a revisión productos en borrador o rechazados");
    }

    const updated = await this.prisma.products.update({
      where: { id: productId },
      data: { status: "UNDER_REVIEW" },
      select: PRODUCT_SELECT,
    });

    await NotificationService.create({
      userId: producerId,
      title: "Producto enviado a revisión",
      message: `Tu producto "${product.title}" ha sido enviado a revisión correctamente. Recibirás una notificación cuando sea revisado.`,
      link: "/user/products",
    });

    return updated;
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

    const updateData: Record<string, unknown> = { status: action };
    if (action === "PUBLISHED") {
      updateData.previousValues = Prisma.JsonNull;
    }

    const updated = await this.prisma.products.update({
      where: { id: productId },
      data: updateData as Prisma.ProductsUpdateInput,
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
      link: isApproved ? `/user/explore/${productId}` : "/user/products",
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

  async countPendingReview() {
    return this.prisma.products.count({
      where: { status: "UNDER_REVIEW" },
    });
  }

  async getLessonHlsUrl(productId: string, moduleIndex: number, lessonIndex: number) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      select: { modules: true },
    });

    if (!product) throw new HttpError(404, "Producto no encontrado");

    const modules: any[] = (product.modules as any[]) || [];
    const lesson = modules[moduleIndex]?.lessons[lessonIndex];

    if (!lesson?.hlsUrl) {
      throw new HttpError(404, "Video no encontrado en esta lección");
    }

    return { hlsUrl: lesson.hlsUrl };
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

  async getAnalytics(productId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyOrders, dailyEnrollments, product, totalAffiliates] = await Promise.all([
      this.prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
        `SELECT DATE(o."createdAt")::text AS date, COUNT(*)::bigint AS count
         FROM "Orders" o WHERE o."productId" = $1 AND o."createdAt" >= $2
         GROUP BY DATE(o."createdAt") ORDER BY date`,
        productId, thirtyDaysAgo,
      ),
      this.prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
        `SELECT DATE(e."createdAt")::text AS date, COUNT(*)::bigint AS count
         FROM "Enrollments" e WHERE e."productId" = $1 AND e."createdAt" >= $2
         GROUP BY DATE(e."createdAt") ORDER BY date`,
        productId, thirtyDaysAgo,
      ),
      this.prisma.products.findUnique({
        where: { id: productId },
        select: { _count: { select: { orders: true, enrollments: true, affiliations: true } } },
      }),
      this.prisma.affiliations.count({ where: { productId } }),
    ]);

    const ordersMap = new Map(dailyOrders.map((r) => [r.date, Number(r.count)]));
    const enrollmentsMap = new Map(dailyEnrollments.map((r) => [r.date, Number(r.count)]));

    const dailyActivity: { date: string; orders: number; enrollments: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const display = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      dailyActivity.push({
        date: display,
        orders: ordersMap.get(key) ?? 0,
        enrollments: enrollmentsMap.get(key) ?? 0,
      });
    }

    return {
      dailyActivity,
      totalAffiliates,
      totalOrders: product?._count?.orders ?? 0,
      totalEnrollments: product?._count?.enrollments ?? 0,
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
