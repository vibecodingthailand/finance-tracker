# Backend Rules — `apps/backend/**`

Rules สำหรับงานใน `apps/backend/` เท่านั้น นอก scope นี้ไม่ใช้

## Module structure

- ทุก feature เป็น **NestJS module แยก** 1 feature = 1 module
- Layering ภายใน module: **Controller → Service → Repository**
  - **Controller** — รับ request, validate input, format response ห้ามมี business logic
  - **Service** — business logic ทั้งหมด ห้ามเรียก Prisma client ตรง ๆ
  - **Repository** — wrap Prisma client เป็น method เฉพาะของ feature นั้น Service คุยกับ DB ผ่านทางนี้เท่านั้น

## DTO และ Response contract

- **Input validation**: `import` DTO class จาก `packages/shared` มาใช้โดยตรง
  - **ห้ามสร้าง DTO ซ้ำใน backend** ที่มี shape เหมือน shared DTO
  - ถ้า DTO ยังไม่มีใน shared → เพิ่มใน `packages/shared` ก่อน แล้วค่อย import มาใช้
- **Response**: ค่า return ของ controller ต้อง match response interface/type ใน `packages/shared`
  - ถ้า frontend ต้องใช้ shape นี้ → type อยู่ใน `packages/shared`
  - Internal-only DTO (เช่น repo-to-service mapping) เท่านั้นที่อยู่ใน backend ได้

## Auth

- ใช้ **JWT Guard** ป้องกัน route ที่ต้อง auth
- Endpoint ที่ไม่ต้อง auth (เช่น LINE webhook, health check) ต้อง mark ชัดเจน

## Error handling

- ใช้ **NestJS built-in exceptions** เท่านั้น — `BadRequestException`, `NotFoundException`, `UnauthorizedException`, `ForbiddenException`, `ConflictException`, `InternalServerErrorException`
- ห้าม `throw new Error(...)` ดิบใน controller/service
- ห้ามสร้าง custom exception class ถ้า built-in ใช้ได้

## Database

- DB access ผ่าน **Repository ที่ wrap Prisma client** เท่านั้น
- **ห้าม inject `PrismaService` เข้า Service โดยตรง** Service ต้อง inject Repository แทน
- Prisma schema เป็น single source of truth ที่ `packages/database`

## Testing

- **ทุก Service ต้องมี unit test** วางไฟล์ `*.service.spec.ts` ข้าง ๆ `*.service.ts`
- Mock Repository ใน service test (เพราะ Service ไม่ควรพึ่ง DB จริง)
- Controller test optional Repository test optional (focus ที่ service logic ก่อน)

## Pre-commit workflow (เฉพาะ commit ที่แก้ `apps/backend/**`)

ก่อน commit ต้อง:

1. **Build ผ่าน** — `pnpm --filter backend build`
2. **รัน test เฉพาะ `.service.spec.ts` ที่เกี่ยวข้อง** (ที่เพิ่ง edit หรือที่ test code ที่เพิ่ง edit) **ไม่ต้องรันทุกไฟล์**
   - ตัวอย่าง: `pnpm --filter backend test -- transaction.service.spec.ts`
3. ถ้า fail → **fix ก่อน** แล้วค่อย commit ห้าม commit ทั้งที่รู้ว่าพัง
