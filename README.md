# Sous le Pommier

Application web de gestion de caisse pour vente directe de fruits et légumes.

## Stack

- **Frontend** : React 19 + Vite + TypeScript
- **UI** : Tailwind CSS v4 + shadcn/ui
- **Backend** : NestJS + Fastify
- **BDD** : PostgreSQL 16 + Prisma ORM
- **Monorepo** : Turborepo
- **Charts** : Recharts
- **Infra** : Docker + nginx

## Prérequis

- Node.js 20+
- Docker + Docker Compose

## Démarrage rapide

```bash
# Variables d'environnement
cp .env.example .env

# Lancer tous les services (DB + API + Web)
docker compose up -d
```

L'app est disponible sur **http://localhost:8080**.

## Développement local

```bash
# Dépendances
npm install

# API uniquement (DB via Docker)
docker compose up -d postgres
cd apps/api && npm run start:dev

# Frontend uniquement
cd apps/web && npm run dev   # → http://localhost:5174
```

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer en développement (Turborepo) |
| `npm run build` | Build production |
| `npm run type-check` | Vérification TypeScript |
| `docker compose up -d` | Lancer tous les conteneurs |
| `docker compose logs -f api` | Logs API en temps réel |

## Comptes utilisateurs

| Identifiant | Mot de passe | Rôle |
|-------------|--------------|------|
| `marie.dupont` | `Gerant2026!` | GERANT |
| `julie.admin` | `Admin2026!` | SUPERADMIN |
| `lucas.martin` | `Vendeur2026!` | VENDEUR |

## Architecture

```
apps/
├── api/          # NestJS — REST API, Prisma, auth JWT
└── web/          # React/Vite — dashboard + POS
packages/
└── database/     # Schéma Prisma partagé, migrations
```

## Conformité légale

- Loi anti-fraude TVA 2018 (chaînage tickets, inviolabilité)
- RGPD (Règlement UE 2016/679)
- Art. L441-9 Code de commerce (mentions factures)
- Art. 289 CGI (facturation B2B)
- Décret 2022-1266 (ticket dématérialisé)
