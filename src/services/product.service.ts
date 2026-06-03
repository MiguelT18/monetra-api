import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";
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
      status: input.status ?? "DRAFT",
      affiliateEnabled: input.affiliateEnabled ?? false,
      affiliateCookieDays: input.affiliateCookieDays ?? 30,
      ...(input.commissionRate != null
        ? { commissionRate: input.commissionRate }
        : {}),
    } as unknown as Prisma.ProductsUncheckedCreateInput;

    return this.prisma.products.create({
      data: createData,
      select: PRODUCT_SELECT,
    });
  }

  async listByProducer(producerId: string) {
    return this.prisma.products.findMany({
      where: { producerId },
      select: PRODUCT_WITH_PRODUCER_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async listPublishedCatalog(page = 1, limit = 12) {
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where: { status: "PUBLISHED" },
        select: PRODUCT_WITH_PRODUCER_SELECT,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.products.count({
        where: { status: "PUBLISHED" },
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

  async getAccessible(productId: string, requesterId: string) {
    const product = await this.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const isOwner = product.producerId === requesterId;
    const isPublished = product.status === "PUBLISHED";

    if (isOwner || isPublished) {
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

    const updateData = {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.affiliateEnabled !== undefined && {
        affiliateEnabled: input.affiliateEnabled,
      }),
      ...(input.commissionRate !== undefined && {
        commissionRate: input.commissionRate,
      }),
      ...(input.affiliateCookieDays !== undefined && {
        affiliateCookieDays: input.affiliateCookieDays,
      }),
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
