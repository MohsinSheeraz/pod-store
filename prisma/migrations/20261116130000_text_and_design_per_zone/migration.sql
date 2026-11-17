-- A print area can now hold a design and a line of text, so a cart item may have two prints in
-- the same zone. Replace the one-print-per-zone unique index with a plain index.

-- DropIndex
DROP INDEX "CartItemPrint_cartItemId_zoneId_key";

-- CreateIndex
CREATE INDEX "CartItemPrint_cartItemId_zoneId_idx" ON "CartItemPrint"("cartItemId", "zoneId");
