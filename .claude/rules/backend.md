---
description: Rules สำหรับ backend code
paths: apps/backend/**
---

# Backend Rules

## Structure

- Every feature is its own **NestJS module**.
- Layering: **Controller → Service → Repo** — no skipping layers.
  - Controller: request validation only.
  - Service: business logic only.
  - Repo: all database access (wraps Prisma client).
- **Never call Prisma directly from a Service.** All DB access goes through a Repo.

## DTOs & Response Types

- Import DTO classes from `packages/shared` directly. **Never duplicate a DTO inside `apps/backend`.**
- Response shapes sent to the frontend must match the response interfaces defined in `packages/shared`.

## Auth

- Protect routes with **JWT Guard**.

## Error Handling

- Use **NestJS built-in exceptions** (`NotFoundException`, `BadRequestException`, etc.). No custom error classes unless they extend the built-ins.

## Testing

- Every service must have a unit test (`*.service.spec.ts` next to the source file).

## Pre-commit Checklist (apps/backend changes)

1. Build must pass: `pnpm --filter backend build`
2. Run the relevant service spec(s) only — not the full test suite: `pnpm --filter backend test <changed>.service.spec.ts`
3. Fix any failures before committing.
