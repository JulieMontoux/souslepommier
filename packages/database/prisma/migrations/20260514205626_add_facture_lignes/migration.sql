-- AlterTable
ALTER TABLE "factures" ADD COLUMN     "dateLivraison" TIMESTAMP(3),
ADD COLUMN     "datePaiement" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "lignes_facture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "qte" DECIMAL(10,3) NOT NULL,
    "prixUnitaireHT" DECIMAL(10,4) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "montantHT" DECIMAL(10,4) NOT NULL,
    "montantTVA" DECIMAL(10,4) NOT NULL,
    "montantTTC" DECIMAL(10,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "lignes_facture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factures_clientId_idx" ON "factures"("clientId");

-- CreateIndex
CREATE INDEX "factures_statut_idx" ON "factures"("statut");

-- AddForeignKey
ALTER TABLE "lignes_facture" ADD CONSTRAINT "lignes_facture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
