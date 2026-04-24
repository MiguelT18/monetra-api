import { prisma as PrismaInstance } from "../lib/prisma.ts";
import type { PrismaClient } from "@prisma/client";
import type { ProductData } from "../types/product.types.ts";

class ProductService {
  constructor(private prisma: PrismaClient = PrismaInstance) {}

  async addProduct(userId: string, data: ProductData) {
    const { status = "DRAFT", ...rest } = data;

    return this.prisma.products.create({
      data: {
        producerId: userId,
        status,
        ...rest,
      },
    });
  }
}

export default new ProductService();
