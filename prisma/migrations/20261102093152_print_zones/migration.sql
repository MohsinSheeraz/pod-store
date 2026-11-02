/*
  Warnings:

  - You are about to drop the column `designId` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `placement` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `designId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `designImageUrl` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `placement` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `printArea` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ZoneKind" AS ENUM ('IMAGE', 'TEXT');

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_designId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_designId_fkey";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "designId",
DROP COLUMN "placement";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "designId",
DROP COLUMN "designImageUrl",
DROP COLUMN "placement";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "printArea";

-- CreateTable
CREATE TABLE "PrintZone" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "view" TEXT NOT NULL DEFAULT 'front',
    "kind" "ZoneKind" NOT NULL DEFAULT 'IMAGE',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "widthIn" DOUBLE PRECISION NOT NULL,
    "heightIn" DOUBLE PRECISION NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrintZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItemPrint" (
    "id" TEXT NOT NULL,
    "cartItemId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "designId" TEXT,
    "text" TEXT,
    "font" TEXT,
    "color" TEXT,
    "placement" JSONB NOT NULL,

    CONSTRAINT "CartItemPrint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemPrint" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "zoneLabel" TEXT NOT NULL,
    "kind" "ZoneKind" NOT NULL,
    "designId" TEXT,
    "designImageUrl" TEXT,
    "text" TEXT,
    "font" TEXT,
    "color" TEXT,
    "placement" JSONB NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "OrderItemPrint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintZone_productId_key_key" ON "PrintZone"("productId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CartItemPrint_cartItemId_zoneId_key" ON "CartItemPrint"("cartItemId", "zoneId");

-- AddForeignKey
ALTER TABLE "PrintZone" ADD CONSTRAINT "PrintZone_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemPrint" ADD CONSTRAINT "CartItemPrint_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemPrint" ADD CONSTRAINT "CartItemPrint_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "PrintZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemPrint" ADD CONSTRAINT "CartItemPrint_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPrint" ADD CONSTRAINT "OrderItemPrint_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemPrint" ADD CONSTRAINT "OrderItemPrint_designId_fkey" FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE SET NULL ON UPDATE CASCADE;
