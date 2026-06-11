-- AlterTable
ALTER TABLE "Products" ADD COLUMN "introVideoUrl" TEXT,
ADD COLUMN "duration" INTEGER,
ADD COLUMN "rating" DOUBLE PRECISION,
ADD COLUMN "modules" JSONB;
