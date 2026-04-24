import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import productService from "../services/product.service.ts";
import { HttpError } from "../errors/http-error.ts";

export const createProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const userId = req.user?.id;

    const { title, description, price } = req.body;

    const data = await productService.addProduct(userId, {
      title,
      description,
      price,
    });

    res.status(201).json(ok("Product created successfully", data));
  },
);
