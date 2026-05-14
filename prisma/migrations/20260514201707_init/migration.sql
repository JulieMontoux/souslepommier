-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GERANT', 'VENDEUR');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('OUVERTE', 'FINALISEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "ModeReglement" AS ENUM ('ESPECES', 'CB', 'CHEQUE', 'VIREMENT', 'TICKET_RESTO');

-- CreateEnum
CREATE TYPE "TypeEmballage" AS ENUM ('VRAC', 'BARQUETTE', 'FILET', 'SAC', 'CAISSE', 'PLATEAU');

-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('BROUILLON', 'EMISE', 'PAYEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VENDEUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "rgpdConsent" BOOLEAN NOT NULL DEFAULT false,
    "rgpdConsentDate" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorieId" TEXT,
    "image" TEXT,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes_produit" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "poids" DECIMAL(10,3),
    "unitePoidsId" TEXT,
    "emballage" "TypeEmballage" NOT NULL DEFAULT 'VRAC',
    "prixHT" DECIMAL(10,4) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "prixTTC" DECIMAL(10,4) NOT NULL,
    "sku" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variantes_produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" TEXT NOT NULL,
    "numeroTicket" TEXT NOT NULL,
    "vendeurId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalHT" DECIMAL(10,4) NOT NULL,
    "totalTTC" DECIMAL(10,4) NOT NULL,
    "totalTVA" DECIMAL(10,4) NOT NULL,
    "statut" "StatutVente" NOT NULL DEFAULT 'OUVERTE',
    "hash" TEXT NOT NULL,
    "hashPrecedent" TEXT,
    "motifAnnulation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_vente" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "varianteProduitId" TEXT NOT NULL,
    "qte" DECIMAL(10,3) NOT NULL,
    "prixUnitaireHT" DECIMAL(10,4) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "montantHT" DECIMAL(10,4) NOT NULL,
    "montantTVA" DECIMAL(10,4) NOT NULL,
    "montantTTC" DECIMAL(10,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "lignes_vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "mode" "ModeReglement" NOT NULL,
    "montant" DECIMAL(10,4) NOT NULL,
    "renduMonnaie" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clotures_caisse" (
    "id" TEXT NOT NULL,
    "numeroCloture" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "gerantId" TEXT NOT NULL,
    "totalEspeces" DECIMAL(10,4) NOT NULL,
    "totalCB" DECIMAL(10,4) NOT NULL,
    "totalCheque" DECIMAL(10,4) NOT NULL,
    "totalVirement" DECIMAL(10,4) NOT NULL,
    "totalTR" DECIMAL(10,4) NOT NULL,
    "totalVentes" DECIMAL(10,4) NOT NULL,
    "totalHT" DECIMAL(10,4) NOT NULL,
    "totalTVA" DECIMAL(10,4) NOT NULL,
    "totalTTC" DECIMAL(10,4) NOT NULL,
    "hashCumulatif" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clotures_caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "tvaIntracommunautaire" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'FR',
    "email" TEXT,
    "telephone" TEXT,
    "conditionsPaiement" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "venteId" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3),
    "statut" "StatutFacture" NOT NULL DEFAULT 'BROUILLON',
    "totalHT" DECIMAL(10,4) NOT NULL,
    "totalTVA" DECIMAL(10,4) NOT NULL,
    "totalTTC" DECIMAL(10,4) NOT NULL,
    "pdfUrl" TEXT,
    "notes" TEXT,
    "factureOriginaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_audit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "ancienneValeur" JSONB,
    "nouvelleValeur" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_entreprise" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "formeJuridique" TEXT,
    "capitalSocial" DECIMAL(15,2),
    "siret" TEXT,
    "tvaIntracommunautaire" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "pays" TEXT NOT NULL DEFAULT 'FR',
    "telephone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "iban" TEXT,
    "rcs" TEXT,
    "villeRCS" TEXT,
    "codeAPE" TEXT,
    "regimeTVA" TEXT NOT NULL DEFAULT 'NORMAL',
    "responsableRGPD" TEXT,
    "emailRGPD" TEXT,

    CONSTRAINT "config_entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taux_tva" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "taux" DECIMAL(5,2) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "defaut" BOOLEAN NOT NULL DEFAULT false,
    "dateEffet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taux_tva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_nom_key" ON "categories"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_produit_sku_key" ON "variantes_produit"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ventes_numeroTicket_key" ON "ventes"("numeroTicket");

-- CreateIndex
CREATE INDEX "ventes_date_idx" ON "ventes"("date");

-- CreateIndex
CREATE INDEX "ventes_vendeurId_idx" ON "ventes"("vendeurId");

-- CreateIndex
CREATE UNIQUE INDEX "clotures_caisse_numeroCloture_key" ON "clotures_caisse"("numeroCloture");

-- CreateIndex
CREATE UNIQUE INDEX "clients_siret_key" ON "clients"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "factures_numero_key" ON "factures"("numero");

-- CreateIndex
CREATE INDEX "journal_audit_timestamp_idx" ON "journal_audit"("timestamp");

-- CreateIndex
CREATE INDEX "journal_audit_userId_idx" ON "journal_audit"("userId");

-- CreateIndex
CREATE INDEX "journal_audit_entite_entiteId_idx" ON "journal_audit"("entite", "entiteId");

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_produit" ADD CONSTRAINT "variantes_produit_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_vendeurId_fkey" FOREIGN KEY ("vendeurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_vente" ADD CONSTRAINT "lignes_vente_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_vente" ADD CONSTRAINT "lignes_vente_varianteProduitId_fkey" FOREIGN KEY ("varianteProduitId") REFERENCES "variantes_produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clotures_caisse" ADD CONSTRAINT "clotures_caisse_gerantId_fkey" FOREIGN KEY ("gerantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "ventes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_factureOriginaleId_fkey" FOREIGN KEY ("factureOriginaleId") REFERENCES "factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
