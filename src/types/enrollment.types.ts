import type { Prisma } from "@prisma/client";

/** Criterios para que un estudiante acceda a un producto (fase 2). */
export interface EnrollmentEligibility {
  eligible: boolean;
  reasons: string[];
  productId: string;
  productStatus: string;
  alreadyEnrolled: boolean;
}

export const ENROLLMENT_SELECT = {
  id: true,
  productId: true,
  userId: true,
  progress: true,
} satisfies Prisma.EnrollmentsSelect;

export type EnrollmentResponse = Prisma.EnrollmentsGetPayload<{
  select: typeof ENROLLMENT_SELECT;
}>;
