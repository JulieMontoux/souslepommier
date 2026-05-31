-- CreateEnum
CREATE TYPE "FrequenceAbonnement" AS ENUM ('HEBDO', 'BIMENSUEL', 'MENSUEL');

-- CreateEnum
CREATE TYPE "StatutLivraison" AS ENUM ('PLANIFIEE', 'LIVREE', 'ANNULEE');

-- CreateTable
CREATE TABLE "abonnements" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "frequence" "FrequenceAbonnement" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_abonnement" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "varianteProduitId" TEXT NOT NULL,
    "qte" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "lignes_abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraisons" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "statut" "StatutLivraison" NOT NULL DEFAULT 'PLANIFIEE',
    "venteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livraisons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "abonnements_clientId_idx" ON "abonnements"("clientId");

-- CreateIndex
CREATE INDEX "lignes_abonnement_abonnementId_idx" ON "lignes_abonnement"("abonnementId");

-- CreateIndex
CREATE UNIQUE INDEX "livraisons_venteId_key" ON "livraisons"("venteId");

-- CreateIndex
CREATE INDEX "livraisons_abonnementId_idx" ON "livraisons"("abonnementId");

-- CreateIndex
CREATE INDEX "livraisons_date_idx" ON "livraisons"("date");

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_abonnement" ADD CONSTRAINT "lignes_abonnement_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_abonnement" ADD CONSTRAINT "lignes_abonnement_varianteProduitId_fkey" FOREIGN KEY ("varianteProduitId") REFERENCES "variantes_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraisons" ADD CONSTRAINT "livraisons_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
