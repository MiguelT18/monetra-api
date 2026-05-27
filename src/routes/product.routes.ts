import * as ProductController from "../controllers/product.controller.ts";
import * as AffiliationController from "../controllers/affiliation.controller.ts";
import * as EnrollmentController from "../controllers/enrollment.controller.ts";
import { Router, type IRouter } from "express";
import { authMiddleware } from "../middleware/auth.middleware.ts";
import { loadProfile, requireRole } from "../middleware/profile.middleware.ts";

const router: IRouter = Router();

router.use(authMiddleware, loadProfile);

// Catálogo público (autenticado): estudiantes y afiliados exploran productos publicados
router.get("/catalog", ProductController.listCatalog);

// Productor: CRUD de sus productos
router.get("/mine", requireRole("PRODUCER"), ProductController.listMyProducts);
router.post("/", requireRole("PRODUCER"), ProductController.createProduct);

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

// Detalle, actualización y borrado por id (rutas con :id al final)
router.get("/:id", ProductController.getProduct);
router.put("/:id", requireRole("PRODUCER"), ProductController.updateProduct);
router.delete("/:id", requireRole("PRODUCER"), ProductController.deleteProduct);

export default router;
