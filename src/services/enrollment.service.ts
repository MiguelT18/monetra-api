import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";
import type { EnrollmentEligibility } from "../types/enrollment.types.ts";
import ProductService from "./product.service.ts";

const ENROLLMENT_WITH_PRODUCT = {
  id: true,
  productId: true,
  userId: true,
  progress: true,
  product: {
    select: {
      id: true,
      title: true,
      description: true,
      thumbnail: true,
      price: true,
    },
  },
} as const;

class EnrollmentService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async checkEligibility(
    productId: string,
    userId: string,
  ): Promise<EnrollmentEligibility> {
    const product = await ProductService.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const producer = await this.prisma.profiles.findUnique({
      where: { id: product.producerId },
      select: { banned: true },
    });

    const existing = await this.prisma.enrollments.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    const reasons: string[] = [];

    if (producer?.banned) {
      reasons.push("El creador del producto está suspendido");
    }

    if (product.status !== "PUBLISHED") {
      reasons.push("El producto no está publicado");
    }

    if (existing) {
      reasons.push("Ya estás inscrito en este producto");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      productId: product.id,
      productStatus: product.status,
      alreadyEnrolled: Boolean(existing),
    };
  }

  async enroll(productId: string, userId: string) {
    const eligibility = await this.checkEligibility(productId, userId);
    if (!eligibility.eligible) {
      throw new HttpError(400, eligibility.reasons.join(". "));
    }

    return this.prisma.enrollments.create({
      data: { productId, userId, progress: 0 },
      select: ENROLLMENT_WITH_PRODUCT,
    });
  }

  async listByStudent(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [enrollments, total] = await Promise.all([
      this.prisma.enrollments.findMany({
        where: { userId },
        select: ENROLLMENT_WITH_PRODUCT,
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.enrollments.count({ where: { userId } }),
    ]);
    return {
      enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default new EnrollmentService();
