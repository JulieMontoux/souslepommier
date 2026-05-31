-- CreateTable
CREATE TABLE "paliers_remise" (
    "id" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "qteMin" DECIMAL(10,3) NOT NULL,
    "remisePct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "paliers_remise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paliers_remise_varianteId_idx" ON "paliers_remise"("varianteId");

-- AddForeignKey
ALTER TABLE "paliers_remise" ADD CONSTRAINT "paliers_remise_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes_produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
