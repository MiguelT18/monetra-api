import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import ProductService from "../services/product.service.ts";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} from "../schemas/product.schema.ts";

export const createProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);

    const product = await ProductService.create(req.profile!.id, data);

    res.status(201).json(ok("Producto creado correctamente", { product }));
  },
);

export const listMyProducts: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const products = await ProductService.listByProducer(req.profile!.id);

    res.json(ok("Tus productos", { products }));
  },
);

export const listCatalog: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const products = await ProductService.listPublishedCatalog();

    res.json(ok("Catálogo de productos publicados", { products }));
  },
);

export const getProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);

    const product = await ProductService.getAccessible(id, req.profile!.id);

    res.json(ok("Producto obtenido", { product }));
  },
);

export const updateProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);

    const product = await ProductService.update(id, req.profile!.id, data);

    res.json(ok("Producto actualizado", { product }));
  },
);

export const deleteProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);

    const result = await ProductService.remove(id, req.profile!.id);

    const message = result.archived
      ? "Producto archivado (tiene ventas, afiliaciones o matrículas asociadas)"
      : "Producto eliminado";

    res.json(ok(message, result));
  },
);
