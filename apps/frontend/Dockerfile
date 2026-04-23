# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /repo

ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend

RUN pnpm --filter @finance-tracker/shared build
RUN pnpm --filter @finance-tracker/frontend build

# ---------- runtime ----------
FROM nginx:alpine AS runtime

COPY --from=builder /repo/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
