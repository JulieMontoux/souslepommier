-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT', 'VENTE');

-- AlterTable
ALTER TABLE "variantes_produit" ADD COLUMN     "stockActuel" DECIMAL(10,3) NOT NULL DEFAULT 0,
ADD COLUMN     "stockMin" DECIMAL(10,3);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "quantite" DECIMAL(10,3) NOT NULL,
    "motif" TEXT,
    "venteId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mouvements_stock_varianteId_idx" ON "mouvements_stock"("varianteId");

-- CreateIndex
CREATE INDEX "mouvements_stock_createdAt_idx" ON "mouvements_stock"("createdAt");

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
