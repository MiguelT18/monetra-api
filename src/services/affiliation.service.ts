import { HttpError } from "../errors/http-error.ts";
import type { AffiliateEligibility } from "../types/affiliation.types.ts";
import ProductService from "./product.service.ts";
import { prisma as PrismaInstance } from "../lib/prisma.ts";
import { randomUUID } from "node:crypto";

const AFFILIATION_WITH_PRODUCT = {
  id: true,
  productId: true,
  affiliateId: true,
  code: true,
  commissionId: true,
  product: {
    select: {
      id: true,
      title: true,
      thumbnail: true,
      commissionRate: true,
      affiliateCookieDays: true,
    },
  },
} as const;

class AffiliationService {
  private prisma = PrismaInstance;

  async checkEligibility(
    productId: string,
    _affiliateId: string,
  ): Promise<AffiliateEligibility> {
    const product = await ProductService.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const producer = await this.prisma.profiles.findUnique({
      where: { id: product.producerId },
      select: { banned: true },
    });

    const reasons: string[] = [];

    if (producer?.banned) {
      reasons.push("El creador del producto está suspendido");
    }

    if (product.status !== "PUBLISHED") {
      reasons.push("El producto no está publicado");
    }

    if (!product.affiliateEnabled) {
      reasons.push("El creador no tiene activo el programa de afiliados");
    }

    if (product.commissionRate == null) {
      reasons.push("No hay tasa de comisión configurada");
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      productId: product.id,
      affiliateEnabled: product.affiliateEnabled,
      commissionRate: product.commissionRate,
      cookieDays: product.affiliateCookieDays,
      productStatus: product.status,
    };
  }

  async joinProduct(productId: string, affiliateId: string) {
    const eligibility = await this.checkEligibility(productId, affiliateId);
    if (!eligibility.eligible) {
      throw new HttpError(400, eligibility.reasons.join(". "));
    }

    const existing = await this.prisma.affiliations.findFirst({
      where: { productId, affiliateId },
    });
    if (existing) {
      throw new HttpError(400, "Ya estás afiliado a este producto");
    }

    const code = this.generateCode();
    const commissionId = randomUUID();

    return this.prisma.affiliations.create({
      data: {
        productId,
        affiliateId,
        code,
        commissionId,
      },
      select: AFFILIATION_WITH_PRODUCT,
    });
  }

  async listByAffiliate(affiliateId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [affiliations, total] = await Promise.all([
      this.prisma.affiliations.findMany({
        where: { affiliateId },
        select: AFFILIATION_WITH_PRODUCT,
        orderBy: { id: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.affiliations.count({ where: { affiliateId } }),
    ]);
    return {
      affiliations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private generateCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export default new AffiliationService();
