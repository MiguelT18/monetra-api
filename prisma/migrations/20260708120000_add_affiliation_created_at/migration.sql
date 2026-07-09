-- Fecha de creación de la afiliación
ALTER TABLE "Affiliations" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
