-- Payments, order totals, email verification and one-time tokens.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "stripeSessionId" TEXT,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "AuthToken"("userId", "type");

-- CreateIndex
CREATE INDEX "Order_stripeSessionId_idx" ON "Order"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing accounts were created before verification existed: treat them as verified.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;

-- Existing orders: the old total was the whole amount; stamp the paid date on orders already paid.
UPDATE "Order" SET "subtotal" = "total" WHERE "subtotal" = 0;
UPDATE "Order" SET "paidAt" = "createdAt"
  WHERE "paidAt" IS NULL AND "status" IN ('PAID', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED');
