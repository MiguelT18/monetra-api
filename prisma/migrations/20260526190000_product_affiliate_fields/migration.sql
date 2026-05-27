-- Campos de afiliación y auditoría en productos
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "affiliateEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "affiliateCookieDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Products_producerId_idx" ON "Products"("producerId");
CREATE INDEX IF NOT EXISTS "Products_status_idx" ON "Products"("status");
