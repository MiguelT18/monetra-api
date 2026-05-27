import type { Prisma } from "@prisma/client";

/** Criterios para que un afiliado pueda unirse a un producto (fase 2). */
export interface AffiliateEligibility {
  eligible: boolean;
  reasons: string[];
  productId: string;
  affiliateEnabled: boolean;
  commissionRate: number | null;
  cookieDays: number;
  productStatus: string;
}

export const AFFILIATION_SELECT = {
  id: true,
  productId: true,
  affiliateId: true,
  code: true,
  commissionId: true,
} satisfies Prisma.AffiliationsSelect;

export type AffiliationResponse = Prisma.AffiliationsGetPayload<{
  select: typeof AFFILIATION_SELECT;
}>;
