-- AlterTable
ALTER TABLE "clotures_caisse" ADD COLUMN     "pointDeVenteId" TEXT;

-- AlterTable
ALTER TABLE "ventes" ADD COLUMN     "pointDeVenteId" TEXT;

-- CreateTable
CREATE TABLE "points_de_vente" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_de_vente_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_pointDeVenteId_fkey" FOREIGN KEY ("pointDeVenteId") REFERENCES "points_de_vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clotures_caisse" ADD CONSTRAINT "clotures_caisse_pointDeVenteId_fkey" FOREIGN KEY ("pointDeVenteId") REFERENCES "points_de_vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
