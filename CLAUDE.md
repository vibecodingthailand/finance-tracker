# Finance Tracker

Personal finance tracker: บันทึกรายจ่ายผ่าน LINE bot, ดู dashboard บน web, ได้ AI insights จาก Claude API.

## Monorepo layout

pnpm workspace:

- `apps/frontend` — Vite + React + Tailwind
- `apps/backend` — NestJS (API prefix: `/api`)
- `packages/database` — Prisma schema + PostgreSQL client
- `packages/shared` — DTO, response interfaces, enum ที่ข้าม wire ระหว่าง frontend/backend

External services: LINE Messaging API, Claude API (Anthropic SDK).

## Architecture rules

### Backend (`apps/backend`)

Layering: **Module → Controller → Service → Repository**.

- Service ห้ามเรียก Prisma client ตรง ๆ ต้องผ่าน Repository ที่ wrap Prisma ไว้เสมอ
- Controller รับ request + validate ผ่าน DTO จาก `packages/shared`
- Business logic อยู่ใน Service ห้ามหลุดไป Controller หรือ Repository

### Frontend (`apps/frontend`)

- ใช้ Tailwind utility classes เท่านั้น **ห้าม inline style** (`style={{...}}`) และห้ามเขียน CSS file ใหม่ถ้าไม่จำเป็น
- Reuse DTO class จาก `packages/shared` มา validate form ได้เลย (class-validator รันใน browser ได้)

### `packages/shared` — shared contract

ใส่ได้:
- DTO class ที่ใช้ `class-validator` decorators
- Response interfaces
- Enum ที่ส่งข้าม wire

**ห้ามใส่**:
- Class ที่ import จาก `@nestjs/*` (server-only — จะทำให้ frontend bundle พัง)
- Frontend-only view model / UI state
- Backend-only domain logic

กฎลัด: ถ้า type/class นี้ต้องใช้ทั้งสองฝั่งและ serialize ข้าม HTTP ได้ → shared. ถ้าเฉพาะฝั่งเดียว → อยู่ใน app/package นั้น

### `packages/database`

- Prisma schema เป็น single source of truth สำหรับ data model
- Expose Prisma client ให้ backend ใช้ผ่าน Repository เท่านั้น

## Code conventions

- **TypeScript strict mode** ห้ามใช้ `any` ถ้าไม่มี type จริง ๆ ให้ใช้ `unknown` แล้ว narrow
- **ห้ามเขียน comments** ถ้าไม่ได้ขอ ให้โค้ดอธิบายตัวเองด้วยชื่อตัวแปร/ฟังก์ชันที่ชัดเจน comment เขียนได้เฉพาะเหตุผล *why* ที่ไม่เห็นจากโค้ด
- Naming: `camelCase` สำหรับ variables/functions, `PascalCase` สำหรับ types/classes, `kebab-case` สำหรับ filenames
- Jest tests วางข้าง ๆ source file: `foo.service.ts` ↔ `foo.service.spec.ts`

## Workflow: 1 prompt = 1 commit

ทุก prompt ที่เปลี่ยนโค้ด:

1. ทำงานให้เสร็จ
2. **Verify build ผ่านก่อน commit** — รัน build/test ของ package ที่แก้ (เช่น `pnpm --filter backend build`, `pnpm --filter frontend build`)
3. Commit ด้วย [Conventional Commits](https://www.conventionalcommits.org/) — scope ตาม package: `feat(backend):`, `fix(frontend):`, `chore(database):`, `refactor(shared):`

ถ้า build ไม่ผ่าน → fix ก่อน ห้าม commit แล้วค่อยตามแก้
