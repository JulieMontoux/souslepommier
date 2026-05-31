-- Normalisation N3 (Merise) — Sous le Pommier
-- 1. Crée unites_poids (référentiel manquant)
-- 2. VarianteProduit : tauxTVA Decimal → tauxTVAId FK → taux_tva
-- 3. VarianteProduit : supprime prixTTC (champ calculé : N3 violation)
-- 4. MouvementStock : FK venteId → ventes
-- 5. LigneAbonnement : contrainte unique (abonnementId, varianteProduitId)
-- 6. Index manquants ajoutés (performance)

-- ─── 1. Référentiel unités de poids ──────────────────────────────────────────

CREATE TABLE "unites_poids" (
    "id"      TEXT    NOT NULL,
    "symbole" TEXT    NOT NULL,
    "libelle" TEXT    NOT NULL,
    "actif"   BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "unites_poids_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "unites_poids_symbole_key" ON "unites_poids"("symbole");

INSERT INTO "unites_poids" ("id", "symbole", "libelle") VALUES
    (gen_random_uuid()::text, 'kg',    'Kilogramme'),
    (gen_random_uuid()::text, 'g',     'Gramme'),
    (gen_random_uuid()::text, 'L',     'Litre'),
    (gen_random_uuid()::text, 'cl',    'Centilitre'),
    (gen_random_uuid()::text, 'pce',   'Pièce'),
    (gen_random_uuid()::text, 'botte', 'Botte'),
    (gen_random_uuid()::text, 'barq',  'Barquette'),
    (gen_random_uuid()::text, 'boite', 'Boîte');

-- ─── 2. unitePoidsId : nettoie les orphelins puis ajoute la FK ───────────────

-- Les anciennes valeurs pointaient vers un modèle inexistant → nettoyage
UPDATE "variantes_produit" SET "unitePoidsId" = NULL
WHERE "unitePoidsId" IS NOT NULL
  AND "unitePoidsId" NOT IN (SELECT "id" FROM "unites_poids");

ALTER TABLE "variantes_produit"
    ADD CONSTRAINT "variantes_produit_unitePoidsId_fkey"
    FOREIGN KEY ("unitePoidsId") REFERENCES "unites_poids"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 3. tauxTVA Decimal → tauxTVAId FK ──────────────────────────────────────

-- 3a. Crée les entrées taux_tva manquantes pour les taux déjà en base
INSERT INTO "taux_tva" ("id", "libelle", "taux", "actif", "defaut", "dateEffet", "createdAt")
SELECT
    gen_random_uuid()::text,
    CONCAT('TVA ', rates."tauxTVA"::text, '%'),
    rates."tauxTVA",
    true,
    false,
    NOW(),
    NOW()
FROM (SELECT DISTINCT "tauxTVA" FROM "variantes_produit" WHERE "tauxTVA" IS NOT NULL) AS rates
WHERE NOT EXISTS (
    SELECT 1 FROM "taux_tva" t WHERE t."taux" = rates."tauxTVA"
);

-- 3b. Ajoute la colonne FK (nullable d'abord pour la migration des données)
ALTER TABLE "variantes_produit" ADD COLUMN "tauxTVAId" TEXT;

-- 3c. Peuple tauxTVAId depuis le taux stocké
UPDATE "variantes_produit" vp
SET "tauxTVAId" = (
    SELECT t."id" FROM "taux_tva" t
    WHERE t."taux" = vp."tauxTVA"
    ORDER BY t."createdAt" DESC
    LIMIT 1
);

-- 3d. Passe NOT NULL (toute variante doit avoir un taux)
ALTER TABLE "variantes_produit" ALTER COLUMN "tauxTVAId" SET NOT NULL;

-- 3e. Ajoute la FK
ALTER TABLE "variantes_produit"
    ADD CONSTRAINT "variantes_produit_tauxTVAId_fkey"
    FOREIGN KEY ("tauxTVAId") REFERENCES "taux_tva"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3f. Supprime les colonnes dénormalisées
ALTER TABLE "variantes_produit" DROP COLUMN "tauxTVA";
ALTER TABLE "variantes_produit" DROP COLUMN "prixTTC";

-- ─── 4. MouvementStock → FK Vente ────────────────────────────────────────────

-- Nettoie les venteId orphelins avant d'ajouter la contrainte
UPDATE "mouvements_stock" SET "venteId" = NULL
WHERE "venteId" IS NOT NULL
  AND "venteId" NOT IN (SELECT "id" FROM "ventes");

ALTER TABLE "mouvements_stock"
    ADD CONSTRAINT "mouvements_stock_venteId_fkey"
    FOREIGN KEY ("venteId") REFERENCES "ventes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 5. LigneAbonnement : unique sur (abonnementId, varianteProduitId) ───────

ALTER TABLE "lignes_abonnement"
    ADD CONSTRAINT "lignes_abonnement_abonnementId_varianteProduitId_key"
    UNIQUE ("abonnementId", "varianteProduitId");

-- ─── 6. Index manquants ───────────────────────────────────────────────────────

-- Critique : toute lecture de lignes d'une vente scannait la table entière
CREATE INDEX IF NOT EXISTS "lignes_vente_venteId_idx"       ON "lignes_vente"("venteId");
CREATE INDEX IF NOT EXISTS "lignes_vente_varianteId_idx"    ON "lignes_vente"("varianteProduitId");

-- Critique : idem pour les paiements
CREATE INDEX IF NOT EXISTS "paiements_venteId_idx"          ON "paiements"("venteId");

-- Filtrages fréquents sur les ventes
CREATE INDEX IF NOT EXISTS "ventes_statut_idx"              ON "ventes"("statut");
CREATE INDEX IF NOT EXISTS "ventes_clientId_idx"            ON "ventes"("clientId");
CREATE INDEX IF NOT EXISTS "ventes_pointDeVenteId_idx"      ON "ventes"("pointDeVenteId");

-- Index compound pour dashboard (ventes du jour finalisées)
CREATE INDEX IF NOT EXISTS "ventes_date_statut_idx"         ON "ventes"("date", "statut");

-- Mouvements stock par variante + date (historique stock)
CREATE INDEX IF NOT EXISTS "mouvements_stock_userId_idx"    ON "mouvements_stock"("userId");
CREATE INDEX IF NOT EXISTS "mouvements_stock_venteId_idx"   ON "mouvements_stock"("venteId");

-- VarianteProduit : index FK
CREATE INDEX IF NOT EXISTS "variantes_produit_produitId_idx"  ON "variantes_produit"("produitId");
CREATE INDEX IF NOT EXISTS "variantes_produit_tauxTVAId_idx"  ON "variantes_produit"("tauxTVAId");
