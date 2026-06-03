import { HttpError } from "../errors/http-error.ts";
import type { AffiliateEligibility } from "../types/affiliation.types.ts";
import ProductService from "./product.service.ts";

/**
 * Afiliaciones: unir afiliados a productos según reglas del creador.
 * CRUD de afiliaciones — implementación en fase 2.
 */
class AffiliationService {

  async checkEligibility(
    productId: string,
    _affiliateId: string,
  ): Promise<AffiliateEligibility> {
    const product = await ProductService.getById(productId);

    if (!product) {
      throw new HttpError(404, "Producto no encontrado");
    }

    const reasons: string[] = [];

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

  /** @todo Generar código único, crear Affiliations y Commissions */
  async joinProduct(_productId: string, _affiliateId: string): Promise<never> {
    throw new HttpError(
      501,
      "La afiliación a productos estará disponible próximamente",
    );
  }

  /** @todo Listar afiliaciones del afiliado autenticado */
  async listByAffiliate(_affiliateId: string): Promise<never> {
    throw new HttpError(501, "Listado de afiliaciones — próximamente");
  }
}

export default new AffiliationService();
