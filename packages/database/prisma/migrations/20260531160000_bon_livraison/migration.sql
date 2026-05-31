-- Drop old facture tables
DROP TABLE IF EXISTS "lignes_facture";
DROP TABLE IF EXISTS "factures";
DROP TYPE IF EXISTS "StatutFacture";

-- New enum
CREATE TYPE "StatutBL" AS ENUM ('BROUILLON', 'EMIS', 'LIVRE', 'ANNULE');

-- BonLivraison
CREATE TABLE "bons_livraison" (
  "id"                TEXT        NOT NULL,
  "numero"            TEXT        NOT NULL,
  "clientId"          TEXT        NOT NULL,
  "venteId"           TEXT,
  "dateEmission"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateLivraison"     TIMESTAMP(3),
  "statut"            "StatutBL"  NOT NULL DEFAULT 'BROUILLON',
  "remiseCommerciale" DECIMAL(5,2),
  "totalHT"           DECIMAL(10,4) NOT NULL,
  "notes"             TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bons_livraison_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bons_livraison_numero_key" ON "bons_livraison"("numero");
CREATE INDEX "bons_livraison_clientId_idx" ON "bons_livraison"("clientId");
CREATE INDEX "bons_livraison_statut_idx" ON "bons_livraison"("statut");

ALTER TABLE "bons_livraison"
  ADD CONSTRAINT "bons_livraison_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bons_livraison"
  ADD CONSTRAINT "bons_livraison_venteId_fkey"
  FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LigneBonLivraison
CREATE TABLE "lignes_bon_livraison" (
  "id"                TEXT         NOT NULL,
  "bonLivraisonId"    TEXT         NOT NULL,
  "varianteProduitId" TEXT,
  "designation"       TEXT         NOT NULL,
  "qte"               DECIMAL(10,3) NOT NULL,
  "unite"             TEXT,
  "prixUnitaireHT"    DECIMAL(10,4) NOT NULL,
  "remise"            DECIMAL(5,2)  NOT NULL DEFAULT 0,
  "montantHT"         DECIMAL(10,4) NOT NULL,
  CONSTRAINT "lignes_bon_livraison_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "lignes_bon_livraison_bonLivraisonId_idx" ON "lignes_bon_livraison"("bonLivraisonId");
CREATE INDEX "lignes_bon_livraison_varianteProduitId_idx" ON "lignes_bon_livraison"("varianteProduitId");

ALTER TABLE "lignes_bon_livraison"
  ADD CONSTRAINT "lignes_bon_livraison_bonLivraisonId_fkey"
  FOREIGN KEY ("bonLivraisonId") REFERENCES "bons_livraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lignes_bon_livraison"
  ADD CONSTRAINT "lignes_bon_livraison_varianteProduitId_fkey"
  FOREIGN KEY ("varianteProduitId") REFERENCES "variantes_produit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
