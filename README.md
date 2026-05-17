# Sous le Pommier

Application web de gestion de caisse pour vente directe de fruits.

## Stack

- **Framework** : Next.js 15 (App Router) + TypeScript
- **UI** : Tailwind CSS v4 + shadcn/ui
- **BDD** : PostgreSQL + Prisma ORM
- **Auth** : NextAuth.js v5
- **PDF** : @react-pdf/renderer
- **Charts** : Recharts

## Prérequis

- Node.js 20+
- PostgreSQL 16+
- npm 10+

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 2. Démarrer PostgreSQL (Docker)
docker compose up -d postgres

# 3. Dépendances
npm install

# 4. Base de données
npm run db:migrate
npm run db:seed

# 5. Démarrer
npm run dev
```

L'app est disponible sur http://localhost:3000.

## Commandes utiles

| Commande             | Description               |
| -------------------- | ------------------------- |
| `npm run dev`        | Démarrer en développement |
| `npm run build`      | Build production          |
| `npm run type-check` | Vérification TypeScript   |
| `npm run format`     | Formatter le code         |
| `npm run db:studio`  | Prisma Studio (BDD UI)    |
| `npm run db:migrate` | Appliquer les migrations  |
| `npm run db:seed`    | Peupler la BDD de test    |

## Comptes de test (après seed)

| Email                    | Mot de passe | Rôle    |
| ------------------------ | ------------ | ------- |
| gerant@souslepommier.fr  | Admin1234!   | GERANT  |
| vendeur@souslepommier.fr | Vendeur123!  | VENDEUR |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Pages login
│   ├── (dashboard)/        # Pages gérant
│   ├── pos/                # Interface caisse vendeur
│   └── api/                # Routes API
├── components/             # Composants React
│   ├── ui/                 # shadcn/ui (auto-généré)
│   ├── layout/             # Layout partagé
│   ├── pos/                # Composants POS
│   ├── produits/           # Composants catalogue
│   ├── factures/           # Composants facturation
│   ├── stats/              # Composants graphiques
│   └── users/              # Composants utilisateurs
├── lib/
│   ├── auth/               # Config NextAuth
│   ├── pdf/                # Templates PDF
│   └── prisma.ts           # Client Prisma
├── types/                  # Types TypeScript
└── middleware.ts            # Auth middleware
prisma/
├── schema.prisma           # Schéma BDD
├── migrations/             # Migrations SQL
└── seed/                   # Données de test
```

## Conformité légale

- Loi anti-fraude TVA 2018 (chaînage des tickets, inviolabilité)
- RGPD (Règlement UE 2016/679)
- Art. L441-9 Code de commerce (mentions factures)
- Art. 289 CGI (facturation B2B)
- Décret 2022-1266 (ticket dématérialisé)
