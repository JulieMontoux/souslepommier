-- CreateEnum
CREATE TYPE "TypeDroitRGPD" AS ENUM ('ACCES', 'RECTIFICATION', 'EFFACEMENT', 'PORTABILITE', 'OPPOSITION');

-- CreateEnum
CREATE TYPE "StatutDemandeRGPD" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'TRAITEE', 'REFUSEE');

-- CreateTable
CREATE TABLE "demandes_rgpd" (
    "id" TEXT NOT NULL,
    "type" "TypeDroitRGPD" NOT NULL,
    "statut" "StatutDemandeRGPD" NOT NULL DEFAULT 'EN_ATTENTE',
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "reponse" TEXT,
    "traitePar" TEXT,
    "traiteAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_rgpd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demandes_rgpd_statut_idx" ON "demandes_rgpd"("statut");
