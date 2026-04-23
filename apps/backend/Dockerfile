# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /repo

ENV CI=true
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy?schema=public

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/backend apps/backend

RUN pnpm --filter @finance-tracker/shared build
RUN pnpm --filter @finance-tracker/database exec prisma generate
RUN pnpm --filter @finance-tracker/database build
RUN pnpm --filter @finance-tracker/backend exec nest build

# ---------- runtime ----------
FROM node:22-alpine AS runtime

RUN apk add --no-cache tini \
 && addgroup -S app \
 && adduser -S app -G app

WORKDIR /app

# Copy entire workspace so pnpm's symlink-based node_modules (including the
# Prisma client generated into .pnpm store) remains intact. We don't prune
# dev deps because pnpm 10 can't re-link the workspace consistently after
# --prod install, and re-running `prisma generate` requires the CLI anyway.
# Skip apps/frontend — not used by backend at runtime.
COPY --from=builder --chown=app:app /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/.npmrc /repo/tsconfig.json ./
COPY --from=builder --chown=app:app /repo/apps/backend ./apps/backend
COPY --from=builder --chown=app:app /repo/packages ./packages
COPY --from=builder --chown=app:app /repo/node_modules ./node_modules

USER app

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Bangkok

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
