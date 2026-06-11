import type { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { ok } from "../utils/helpers.ts";
import ProductService from "../services/product.service.ts";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} from "../schemas/product.schema.ts";
import { uploadBase64Image } from "../utils/upload.ts";

export const createProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);

    if (data.thumbnail) {
      data.thumbnail = await uploadBase64Image(data.thumbnail, "products");
    }

    const product = await ProductService.create(req.profile!.id, data);

    res.status(201).json(ok("Producto creado correctamente", { product }));
  },
);

export const listMyProducts: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const result = await ProductService.listByProducer(req.profile!.id, page, limit);

    res.json(ok("Tus productos", result));
  },
);

export const listCatalog: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));

    const result = await ProductService.listPublishedCatalog(page, limit);

    res.json(ok("Catálogo de productos publicados", result));
  },
);

export const getProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);

    const product = await ProductService.getAccessible(id, req.profile!.id, req.profile!.role);

    res.json(ok("Producto obtenido", { product }));
  },
);

export const updateProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);

    if (data.thumbnail) {
      data.thumbnail = await uploadBase64Image(data.thumbnail, "products");
    }

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

export const submitForReview: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);

    const product = await ProductService.submitForReview(id, req.profile!.id);

    res.json(ok("Producto enviado a revisión correctamente", { product }));
  },
);

export const reviewProduct: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);
    const { action } = req.body as { action: "PUBLISHED" | "REJECTED" };

    if (!["PUBLISHED", "REJECTED"].includes(action)) {
      res.status(400).json({ message: "Acción inválida. Usa PUBLISHED o REJECTED" });
      return;
    }

    const product = await ProductService.review(id, req.profile!.id, action);

    const message = action === "PUBLISHED"
      ? "Producto aprobado y publicado"
      : "Producto rechazado";

    res.json(ok(message, { product }));
  },
);

export const listPendingReviews: RequestHandler = asyncHandler(
  async (_req: Request, res: Response) => {
    const products = await ProductService.listPendingReview();

    res.json(ok("Productos pendientes de revisión", { products }));
  },
);

export const getProductPreview: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = productIdParamSchema.parse(req.params);

    const result = await ProductService.getPreview(id);

    res.json(ok("Vista previa del producto", result));
  },
);
