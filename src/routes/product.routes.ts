import * as ProductController from "../controllers/product.controller.ts";
import * as AffiliationController from "../controllers/affiliation.controller.ts";
import * as EnrollmentController from "../controllers/enrollment.controller.ts";
import { Router, type IRouter } from "express";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";
import { productWriteLimiter } from "../middleware/rate-limit.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);

// Catálogo público (autenticado): estudiantes y afiliados exploran productos publicados
router.get("/catalog", ProductController.listCatalog);

// Creador: CRUD de sus productos
router.get("/mine", requireRole("CREATOR"), ProductController.listMyProducts);
router.post("/", requireRole("CREATOR"), productWriteLimiter, ProductController.createProduct);

// Afiliado: elegibilidad y alta (alta = fase 2)
router.get(
  "/:id/affiliate-eligibility",
  requireRole("AFFILIATE"),
  AffiliationController.checkAffiliateEligibility,
);
router.post(
  "/:id/affiliate",
  requireRole("AFFILIATE"),
  AffiliationController.joinProductAsAffiliate,
);

// Estudiante: elegibilidad y matrícula (matrícula = fase 2)
router.get(
  "/:id/enrollment-eligibility",
  requireRole("STUDENT"),
  EnrollmentController.checkEnrollmentEligibility,
);
router.post(
  "/:id/enroll",
  requireRole("STUDENT"),
  EnrollmentController.enrollInProduct,
);

// Enviar a revisión (creador)
router.post("/:id/submit-review", requireRole("CREATOR"), ProductController.submitForReview);

// Admin: revisar productos y listar pendientes
router.get("/admin/pending-reviews", requireRole("ADMIN"), ProductController.listPendingReviews);
router.post("/:id/review", requireRole("ADMIN"), ProductController.reviewProduct);

// Detalle, actualización y borrado por id (rutas con :id al final)
router.get("/:id/preview", ProductController.getProductPreview);
router.get("/:id", ProductController.getProduct);
router.put("/:id", requireRole("CREATOR"), productWriteLimiter, ProductController.updateProduct);
router.delete("/:id", requireRole("CREATOR"), ProductController.deleteProduct);

export default router;
