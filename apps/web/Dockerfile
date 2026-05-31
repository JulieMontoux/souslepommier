FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/database/package*.json ./packages/database/
RUN npm ci --workspace=apps/web --workspace=packages/database --include-workspace-root

FROM node:22-alpine AS db-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/database ./packages/database
COPY package*.json ./
RUN cd packages/database && npx prisma generate --config prisma.config.ts && npm run build

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=db-builder /app/packages/database ./packages/database
COPY apps/web ./apps/web
COPY package*.json turbo.json ./
# VITE_API_URL defaults to same origin (proxied by nginx)
RUN cd apps/web && npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
