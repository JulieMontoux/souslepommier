ALTER TABLE "lignes_facture" ADD COLUMN "varianteProduitId" TEXT;

CREATE INDEX "lignes_facture_varianteProduitId_idx" ON "lignes_facture"("varianteProduitId");

ALTER TABLE "lignes_facture"
  ADD CONSTRAINT "lignes_facture_varianteProduitId_fkey"
  FOREIGN KEY ("varianteProduitId") REFERENCES "variantes_produit"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
