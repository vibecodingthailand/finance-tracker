FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

ENV DATABASE_URL=postgresql://placeholder:placeholder@placeholder:5432/placeholder

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/database/prisma packages/database/prisma

RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/backend apps/backend

RUN pnpm --filter @finance-tracker/shared build \
 && pnpm --filter @finance-tracker/database build \
 && pnpm --filter backend build


FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl tini
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nestjs -G nodejs

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok

COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules

COPY --from=builder --chown=nestjs:nodejs /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/node_modules ./packages/database/node_modules

COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/node_modules ./apps/backend/node_modules

USER nestjs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/backend/dist/main.js"]
