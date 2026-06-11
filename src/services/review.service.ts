import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";

class ReviewService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async listByProduct(productId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.reviews.findMany({
        where: { productId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullname: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.reviews.count({ where: { productId } }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(productId: string, userId: string, rating: number, comment?: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, status: true, producerId: true },
    });

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    if (product.status !== "PUBLISHED") {
      throw new HttpError(404, "Producto no encontrado");
    }

    if (product.producerId === userId) {
      throw new HttpError(400, "No puedes comentar tu propio producto");
    }

    const existing = await this.prisma.reviews.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      throw new HttpError(400, "Ya has comentado este producto");
    }

    const review = await this.prisma.reviews.create({
      data: {
        productId,
        userId,
        rating,
        comment: comment ?? null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    await this.updateProductRating(productId);

    return review;
  }

  private async updateProductRating(productId: string) {
    const result = await this.prisma.reviews.aggregate({
      where: { productId },
      _avg: { rating: true },
    });

    const avgRating = result._avg.rating;

    await this.prisma.products.update({
      where: { id: productId },
      data: { rating: avgRating ? Math.round(avgRating * 10) / 10 : null },
    });
  }
}

export default new ReviewService();
