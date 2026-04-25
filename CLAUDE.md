# Finance Tracker

Personal finance tracker — บันทึกรายจ่ายผ่าน LINE + Dashboard + AI Insights.

## Monorepo layout (pnpm workspace)

- `apps/frontend` — Vite + React + Tailwind
- `apps/backend` — NestJS (API prefix: `/api`)
- `packages/database` — Prisma + PostgreSQL
- `packages/shared` — DTOs, response interfaces, enums shared across wire

External integrations: LINE Messaging API, Claude API.

## Architecture

### Backend (NestJS)

- Layering: **Module → Controller → Service → Repo**
- Database access goes through a Repo that wraps the Prisma client.
- **Never call Prisma directly from a Service.** Services depend on Repos.

### Frontend (React + Tailwind)

- Use Tailwind utility classes for styling.
- **No inline `style={{ ... }}`.**

### `packages/shared`

Shared code must be runnable in **both** Node and the browser.

Allowed:
- DTO classes using `class-validator` (frontend reuses them for form validation)
- Response interfaces
- Enums crossing the wire

Not allowed:
- Anything importing from `@nestjs/*` (server-only)
- Frontend-only view models or UI state

## Conventions

- TypeScript `strict` — **no `any`**.
- **No comments unless asked.** Code must explain itself through clear naming.
- `camelCase` variables, `PascalCase` types, `kebab-case` filenames.
- Jest tests live next to the source file (`foo.ts` → `foo.spec.ts`).

## Workflow

- **1 prompt = 1 commit.**
- Verify the build passes before every commit.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, ...).
