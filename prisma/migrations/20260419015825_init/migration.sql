/*
  Warnings:

  - You are about to drop the `Affiliation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Commission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Enrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Gamification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Affiliation" DROP CONSTRAINT "Affiliation_affiliateId_fkey";

-- DropForeignKey
ALTER TABLE "Affiliation" DROP CONSTRAINT "Affiliation_productId_fkey";

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_affiliationId_fkey";

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Commission" DROP CONSTRAINT "Commission_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_productId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Gamification" DROP CONSTRAINT "Gamification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_producerId_fkey";

-- DropTable
DROP TABLE "Affiliation";

-- DropTable
DROP TABLE "Commission";

-- DropTable
DROP TABLE "Enrollment";

-- DropTable
DROP TABLE "Gamification";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "profiles";

-- CreateTable
CREATE TABLE "Profiles" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "producerId" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commissions" (
    "id" TEXT NOT NULL,
    "profileId" TEXT,
    "orderId" TEXT NOT NULL,
    "affiliationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL,

    CONSTRAINT "Commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gamifications" (
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gamifications_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Enrollments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,

    CONSTRAINT "Enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profiles_username_key" ON "Profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliations_code_key" ON "Affiliations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollments_userId_productId_key" ON "Enrollments"("userId", "productId");

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliations" ADD CONSTRAINT "Affiliations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliations" ADD CONSTRAINT "Affiliations_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commissions" ADD CONSTRAINT "Commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commissions" ADD CONSTRAINT "Commissions_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "Affiliations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commissions" ADD CONSTRAINT "Commissions_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gamifications" ADD CONSTRAINT "Gamifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollments" ADD CONSTRAINT "Enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollments" ADD CONSTRAINT "Enrollments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
