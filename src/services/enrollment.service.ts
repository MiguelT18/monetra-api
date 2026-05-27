import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../errors/http-error.ts";
import type { EnrollmentEligibility } from "../types/enrollment.types.ts";
import ProductService from "./product.service.ts";

/**
 * Matrículas: acceso de estudiantes a productos publicados.
 * CRUD de enrollments — implementación en fase 2.
 */
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

    const existing = await this.prisma.enrollments.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    const reasons: string[] = [];

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

  /** @todo Crear enrollment tras validar compra o acceso gratuito */
  async enroll(_productId: string, _userId: string): Promise<never> {
    throw new HttpError(
      501,
      "El acceso de estudiantes al producto estará disponible próximamente",
    );
  }

  /** @todo Cursos/productos del estudiante */
  async listByStudent(_userId: string): Promise<never> {
    throw new HttpError(501, "Listado de matrículas — próximamente");
  }
}

export default new EnrollmentService();
