-- AlterTable
ALTER TABLE "clotures_caisse" ADD COLUMN     "nbVentes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recapProduits" JSONB,
ADD COLUMN     "recapTVA" JSONB,
ADD COLUMN     "recapVendeurs" JSONB,
ADD COLUMN     "ventesAnnulees" JSONB;

-- CreateIndex
CREATE INDEX "clotures_caisse_date_idx" ON "clotures_caisse"("date");
