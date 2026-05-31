FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# Install deps
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/database/package*.json ./packages/database/
RUN npm ci --workspace=apps/api --workspace=packages/database --include-workspace-root

# Build database package
FROM base AS db-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/database ./packages/database
COPY package*.json ./
RUN cd packages/database && npx prisma generate --config prisma.config.ts && npm run build

# Build API
FROM base AS api-builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=db-builder /app/packages/database ./packages/database
COPY apps/api ./apps/api
COPY package*.json turbo.json ./
RUN cd apps/api && npm run build

# Final image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

COPY --from=api-builder /app/apps/api/dist ./dist
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=db-builder /app/packages/database/dist ./packages/database/dist
COPY --from=db-builder /app/packages/database/src/generated ./packages/database/src/generated
COPY packages/database/prisma ./prisma

RUN mkdir -p /app/uploads && chown appuser:nodejs /app/uploads
VOLUME ["/app/uploads"]

USER appuser
EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/index.js"]
