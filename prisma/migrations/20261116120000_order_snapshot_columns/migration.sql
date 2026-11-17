-- Columns the schema already defines but earlier migrations never created.
-- Additive only; every new column has a default, so existing rows are untouched.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "colorHex" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN     "shape" TEXT NOT NULL DEFAULT 'tee';

-- AlterTable
ALTER TABLE "OrderItemPrint" ADD COLUMN     "view" TEXT NOT NULL DEFAULT 'front',
ADD COLUMN     "zoneH" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "zoneW" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "zoneX" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "zoneY" DOUBLE PRECISION NOT NULL DEFAULT 0;
