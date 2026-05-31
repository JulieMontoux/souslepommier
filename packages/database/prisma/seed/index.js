"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../../.env') });
const client_1 = require("../../src/generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('Seeding database...');
    // Config entreprise
    await prisma.configEntreprise.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            raisonSociale: 'Sous le Pommier',
            formeJuridique: 'EI',
            siret: '00000000000000',
            adresse: '1 Route des Vergers',
            codePostal: '75001',
            ville: 'Paris',
            email: 'contact@souslepommier.fr',
            telephone: '0100000000',
            regimeTVA: 'NORMAL',
        },
    });
    // Taux TVA
    await prisma.tauxTVA.createMany({
        skipDuplicates: true,
        data: [
            { id: 'tva-0', libelle: 'Exonéré', taux: 0, actif: true },
            {
                id: 'tva-55',
                libelle: 'Réduit 5.5% (fruits & légumes frais)',
                taux: 5.5,
                actif: true,
                defaut: true,
            },
            { id: 'tva-10', libelle: 'Intermédiaire 10%', taux: 10, actif: true },
            { id: 'tva-20', libelle: 'Normal 20%', taux: 20, actif: true },
        ],
    });
    // Catégories
    const categories = await Promise.all([
        prisma.categorie.upsert({ where: { nom: 'Pommes' }, update: {}, create: { nom: 'Pommes' } }),
        prisma.categorie.upsert({ where: { nom: 'Poires' }, update: {}, create: { nom: 'Poires' } }),
        prisma.categorie.upsert({
            where: { nom: 'Fruits rouges' },
            update: {},
            create: { nom: 'Fruits rouges' },
        }),
    ]);
    // Produit exemple
    const pomme = await prisma.produit.upsert({
        where: { id: 'prod-pomme-demo' },
        update: {},
        create: {
            id: 'prod-pomme-demo',
            nom: 'Pomme Golden',
            categorieId: categories[0].id,
            description: 'Pomme Golden du verger local',
            actif: true,
        },
    });
    await prisma.varianteProduit.createMany({
        skipDuplicates: true,
        data: [
            {
                id: 'var-pomme-1kg',
                produitId: pomme.id,
                poids: 1,
                emballage: 'VRAC',
                prixHT: 1.14,
                tauxTVA: 5.5,
                prixTTC: 1.2,
                sku: 'POMME-1KG-VRAC',
            },
            {
                id: 'var-pomme-5kg',
                produitId: pomme.id,
                poids: 5,
                emballage: 'FILET',
                prixHT: 5.21,
                tauxTVA: 5.5,
                prixTTC: 5.5,
                sku: 'POMME-5KG-FILET',
            },
        ],
    });
    // Utilisateurs
    const gerantHash = await bcryptjs_1.default.hash('Admin1234!', 12);
    const vendeurHash = await bcryptjs_1.default.hash('Vendeur123!', 12);
    await prisma.user.upsert({
        where: { email: 'gerant@souslepommier.fr' },
        update: {},
        create: {
            email: 'gerant@souslepommier.fr',
            nom: 'Dupont',
            prenom: 'Marie',
            role: 'GERANT',
            passwordHash: gerantHash,
            actif: true,
            rgpdConsent: true,
            rgpdConsentDate: new Date(),
        },
    });
    await prisma.user.upsert({
        where: { email: 'vendeur@souslepommier.fr' },
        update: {},
        create: {
            email: 'vendeur@souslepommier.fr',
            nom: 'Martin',
            prenom: 'Pierre',
            role: 'VENDEUR',
            passwordHash: vendeurHash,
            actif: true,
            rgpdConsent: true,
            rgpdConsentDate: new Date(),
        },
    });
    console.log('Seed terminé.');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
