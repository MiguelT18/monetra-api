import { Prisma, type ProductStatus } from "@prisma/client";
import type { z } from "zod";
import type {
  createProductSchema,
  updateProductSchema,
} from "../schemas/product.schema.ts";

export type { ProductStatus };

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export type ModuleData = {
  title: string;
  lessons: { title: string; durationMinutes?: number }[];
}[];

export const productSelectArgs = Prisma.validator<Prisma.ProductsDefaultArgs>()({
  select: {
    id: true,
    title: true,
    description: true,
    price: true,
    thumbnail: true,
    status: true,
    producerId: true,
    affiliateEnabled: true,
    commissionRate: true,
    affiliateCookieDays: true,
    introVideoUrl: true,
    duration: true,
    rating: true,
    modules: true,
    createdAt: true,
    updatedAt: true,
  },
});

export const productWithProducerArgs =
  Prisma.validator<Prisma.ProductsDefaultArgs>()({
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      thumbnail: true,
      status: true,
      producerId: true,
      affiliateEnabled: true,
      commissionRate: true,
      affiliateCookieDays: true,
      introVideoUrl: true,
      duration: true,
      rating: true,
      modules: true,
      createdAt: true,
      updatedAt: true,
      producer: {
        select: {
          id: true,
          fullname: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

export const productWithProducerAndCountArgs =
  Prisma.validator<Prisma.ProductsDefaultArgs>()({
    select: {
      ...productWithProducerArgs.select,
      _count: {
        select: {
          affiliations: true,
          enrollments: true,
          orders: true,
        },
      },
    },
  });

export const PRODUCT_SELECT = productSelectArgs.select;
export const PRODUCT_WITH_PRODUCER_SELECT = productWithProducerArgs.select;
export const PRODUCT_WITH_PRODUCER_AND_COUNT =
  productWithProducerAndCountArgs.select;

export type ProductResponse = Prisma.ProductsGetPayload<typeof productSelectArgs>;
export type ProductWithRelations =
  Prisma.ProductsGetPayload<typeof productWithProducerArgs>;
