# Finance Tracker

แอปบันทึกรายรับรายจ่ายส่วนตัวสำหรับคนไทย ใช้งานได้ทั้งผ่าน LINE bot และ Web Dashboard พร้อมระบบจัดหมวดหมู่อัตโนมัติด้วย Claude AI

โปรเจคนี้คือซอร์สโค้ดประกอบหนังสือ **Vibecoding with Claude Code: The Developer's Playbook** เขียนโดย Keerati Limkulphong [vibecodingthailand.com/vibecoding-book](https://vibecodingthailand.com/vibecoding-book)

<p align="center">
  <img src="screenshots/book-cover.png" alt="ปกหนังสือ Vibecoding with Claude Code" width="320" />
</p>

## ตัวอย่างหน้าจอ

### Dashboard

![Dashboard ภาพรวม](screenshots/dashboard-overview.png)

![กราฟแยกหมวดและรายการล่าสุด](screenshots/dashboard-charts.png)

### หน้ารายการ

![หน้ารายการพร้อม filter](screenshots/transactions.png)

### หน้าหมวดหมู่

![หน้าจัดการหมวดหมู่](screenshots/categories.png)

### เพิ่มรายการ

<p align="left">
  <img src="screenshots/add-transaction-modal.png" alt="Modal เพิ่มรายการ" width="380" />
</p>

### Mobile

<p align="left">
  <img src="screenshots/recurring-mobile.png" alt="หน้ารายการประจำ" width="320" />
  <img src="screenshots/budget-mobile.png" alt="หน้างบประมาณ" width="320" />
</p>

### เชื่อมบัญชี LINE

![หน้าตั้งค่ากับ link code](screenshots/settings-line-link.png)

### บันทึกผ่านแชต LINE

<p align="left">
  <img src="screenshots/line-chat.png" alt="ตัวอย่างการบันทึกผ่าน LINE" width="320" />
</p>

## ทำอะไรได้บ้าง

* บันทึกรายรับรายจ่ายผ่านแชต LINE ด้วยภาษาไทยธรรมชาติ เช่น `กาแฟ 65` หรือ `เงินเดือน 45000`
* จัดหมวดหมู่อัตโนมัติด้วย Claude Haiku ผ่าน `@anthropic-ai/sdk`
* Dashboard สรุปรายเดือน, ยอดสะสมรายวัน, สัดส่วนหมวดหมู่ (Recharts)
* ตั้งงบประมาณรายหมวดต่อเดือน พร้อมแถบความคืบหน้า
* รายการประจำ (Recurring) สร้าง transaction อัตโนมัติทุกวันตามวันที่ที่กำหนด ผ่าน cron ของ NestJS
* เชื่อมบัญชี LINE กับบัญชีเว็บผ่านโค้ด 6 หลัก หมดอายุใน 5 นาที

### คำสั่งที่ LINE bot รองรับ

| ข้อความ | ผลลัพธ์ |
| :--- | :--- |
| `กาแฟ 65` | บันทึกรายจ่าย 65 บาท หมวด อาหาร |
| `เงินเดือน 45000` | บันทึกรายรับ 45,000 บาท หมวด เงินเดือน |
| `สรุป` | สรุปยอดวันนี้ |
| `เดือนนี้` | สรุปยอดเดือนนี้ |
| `ยกเลิก` | ลบรายการล่าสุด |
| `เชื่อม 123456` | ผูก LINE กับบัญชีเว็บโดยใช้ code จากหน้า Settings |

ถ้าข้อความไม่ตรงรูปแบบใด bot จะตอบข้อความช่วยเหลือพร้อมตัวอย่างให้

## Tech Stack

| ชั้น | เครื่องมือ |
| :--- | :--- |
| Monorepo | pnpm workspace |
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router 7, Recharts |
| Backend | NestJS 11, JWT + Passport, `@nestjs/schedule` |
| Validation | class-validator, class-transformer (ใช้ DTO ตัวเดียวกันทั้ง backend และ frontend) |
| Database | PostgreSQL 16 + Prisma 7 |
| AI | Anthropic SDK (Claude Haiku สำหรับจัดหมวด) |
| LINE | `@line/bot-sdk` v11 พร้อม signature verification |
| TypeScript | strict mode ทุก package, ห้าม `any` |

## โครงสร้างโปรเจค

```
finance-tracker/
├── apps/
│   ├── backend/        NestJS API (prefix /api)
│   └── frontend/       Vite + React + Tailwind
├── packages/
│   ├── database/       Prisma schema, migrations, seed
│   └── shared/         DTOs, response types, enums (ใช้ทั้ง Node และ Browser)
├── screenshots/
├── .claude/
│   └── rules/          backend.md, frontend.md (กฎที่ Claude อ่านอัตโนมัติ)
├── CLAUDE.md           บันทึกความเข้าใจโปรเจคสำหรับ Claude Code
└── pnpm-workspace.yaml
```

### Backend modules (`apps/backend/src/`)

| โฟลเดอร์ | หน้าที่ |
| :--- | :--- |
| `auth/` | ลงทะเบียน, login, JWT guard, current user decorator |
| `transaction/` | CRUD รายการ + summary รายเดือน + breakdown หมวด + ยอดรายวัน |
| `category/` | หมวดเริ่มต้น (global) และหมวดของผู้ใช้ |
| `budget/` | ตั้งงบรายหมวด + status เทียบกับยอดใช้จริง |
| `recurring/` | รายการประจำ + cron `1 0 * * *` ทำงานทุก 00:01 น. |
| `line/` | webhook + Thai parser + auto categorizer (Claude Haiku) |
| `link/` | สร้างโค้ด 6 หลักสำหรับเชื่อม LINE กับบัญชีเว็บ |
| `prisma/` | PrismaModule ห่อ `PrismaClient` ใช้ทั่วทั้งแอป |
| `common/` | helper เช่น `assertOwnership`, `dateRange` |

### Frontend pages (`apps/frontend/src/pages/`)

`Dashboard`, `Transactions`, `Categories`, `Budget`, `Recurring`, `Settings`, `Login`, `Register`

## Data Model

```
User
├── Transaction (type, amount, source: WEB | LINE | RECURRING)
├── Category    (userId nullable = global default)
├── Recurring   (dayOfMonth, active)
├── Budget      (categoryId × month × year ต้อง unique)
└── LinkCode    (6 หลัก, อายุ 5 นาที, ใช้ครั้งเดียว)
```

หมวดหมู่เริ่มต้นที่ seed ไว้ให้

* รายจ่าย: อาหาร, เดินทาง, ที่อยู่, สุขภาพ, บันเทิง, การศึกษา, อื่นๆ
* รายรับ: เงินเดือน, โบนัส, รายได้อื่นๆ

## เริ่มต้นใช้งาน

### สิ่งที่ต้องมีในเครื่อง

* Node.js 22 ขึ้นไป
* pnpm 10
* PostgreSQL 16

### ติดตั้งและรันครั้งแรก

```bash
git clone https://github.com/vibecodingthailand/finance-tracker.git
cd finance-tracker
cp .env.example .env
# แก้ค่าใน .env ให้ครบ ดูหัวข้อถัดไป
pnpm bootstrap
```

คำสั่ง `pnpm bootstrap` จะรัน `install`, `db:generate`, `build`, `db:migrate`, `db:seed` ให้ในคำสั่งเดียว

### ตัวแปรใน `.env`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/finance_tracker?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET="ใส่ string สุ่มยาว ตัวอย่าง: openssl rand -base64 48"
LINE_CHANNEL_SECRET="ค่าจาก LINE Developers Console"
LINE_CHANNEL_ACCESS_TOKEN="ค่าจาก LINE Developers Console"
ANTHROPIC_API_KEY="API key จาก console.anthropic.com"
```

### รันโหมดพัฒนา

เปิด terminal สองหน้าต่าง

```bash
# terminal 1
pnpm backend:dev      # NestJS รันที่ http://localhost:3000/api

# terminal 2
pnpm frontend:dev     # Vite รันที่ http://localhost:5173
```

### คำสั่งฐานข้อมูล

```bash
pnpm db:generate      # generate Prisma client
pnpm db:migrate       # รัน migration ในโหมด dev
pnpm db:seed          # ใส่หมวดหมู่ default
pnpm db:reset         # drop + migrate + seed (ระวัง ข้อมูลจะหายทั้งหมด)
pnpm db:studio        # เปิด Prisma Studio
```

### Build และ typecheck

```bash
pnpm build            # build ทุก package
pnpm typecheck        # tsc --noEmit ทุก package
```

## API Endpoints

ทุก endpoint อยู่ใต้ prefix `/api` endpoint ที่ต้อง login ให้ส่ง header `Authorization: Bearer <jwt>`

| Method | Path | คำอธิบาย |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | ลงทะเบียน |
| `POST` | `/api/auth/login` | login รับ access token |
| `GET` | `/api/auth/me` | โปรไฟล์ผู้ใช้ปัจจุบัน |
| `GET` | `/api/transactions` | รายการ (filter, pagination) |
| `GET` | `/api/transactions/summary` | สรุปรายเดือน + breakdown |
| `POST` | `/api/transactions` | เพิ่มรายการ |
| `PATCH` | `/api/transactions/:id` | แก้รายการ |
| `DELETE` | `/api/transactions/:id` | ลบรายการ |
| `GET` `POST` `PATCH` `DELETE` | `/api/categories` | จัดการหมวดหมู่ |
| `GET` | `/api/budgets/status` | สถานะงบรายเดือน |
| `POST` `PATCH` `DELETE` | `/api/budgets` | จัดการงบ |
| `GET` `POST` `PATCH` `DELETE` | `/api/recurring` | จัดการรายการประจำ |
| `POST` | `/api/link/code` | สร้าง 6 digit code สำหรับเชื่อม LINE |
| `POST` | `/api/line/webhook` | webhook ของ LINE (ตรวจสอบ signature) |

## สถาปัตยกรรมและกฎของโปรเจค

โปรเจคนี้ออกแบบให้ Claude Code "เข้าใจโครงสร้าง" ผ่านไฟล์สามชั้น

1. `CLAUDE.md` ที่ root อธิบาย layout monorepo และกฎกลาง
2. `.claude/rules/backend.md` กฎเฉพาะ backend (layering, DTO, JWT, testing)
3. `.claude/rules/frontend.md` กฎเฉพาะ frontend (Tailwind, design system, mobile first)

### Backend layering

```
Module → Controller → Service → Repo → Prisma
```

* Controller รับและตรวจสอบ request เท่านั้น
* Service ถือ business logic ทั้งหมด
* **ห้าม Service เรียก Prisma ตรง** ทุกการเข้าถึง DB ต้องผ่าน Repo
* DTO ทุกตัว import จาก `@finance-tracker/shared` ห้ามประกาศซ้ำใน backend
* ป้องกัน route ด้วย `JwtAuthGuard` เป็นค่าเริ่มต้น
* ใช้ exception ของ NestJS (`NotFoundException`, `BadRequestException`) ไม่สร้าง custom error class
* ทุก service มี unit test ชื่อ `*.service.spec.ts` วางคู่ไฟล์ source

### Frontend rules

* ใช้ Tailwind utility class เท่านั้น ห้าม inline `style={{ ... }}` ห้าม CSS module
* Function component กับ hooks เท่านั้น ห้าม class component
* เรียก API ผ่าน `src/lib/api.ts` ไม่เรียก `fetch` จาก component ตรง
* ข้อความ UI ทุกที่เป็นภาษาไทย
* เงิน: prefix `฿` พร้อม separator (ตัวอย่าง `฿1,234.56`)
* วันที่: `Intl.DateTimeFormat('th-TH')` (ตัวอย่าง `20 เม.ย. 2026`)
* Mobile first ตั้งแต่ iPhone SE (375px) ขยายขึ้นด้วย `sm:` `md:` `lg:`
* Touch target ขั้นต่ำ 44 × 44 px

### Design system

* โทนเข้มอย่างเดียว ไม่มี light mode
* พื้น `bg-zinc-950`, การ์ด `bg-zinc-900`, surface ซ้อน `bg-zinc-800`
* accent color เลือกระหว่าง emerald หรือ cyan ใช้กับ CTA และ highlight
* Income ใช้ `emerald-500` Expense ใช้ `rose-500`
* Heading: Kanit, Body: Sarabun (Google Fonts)
* ห้าม gradient แรง, ห้าม emoji ใช้เป็น icon ตกแต่ง, ห้าม drop shadow หนัก, ห้ามสีจัดจ้าน

### Package shared

* รันได้ทั้ง Node และ Browser ห้าม import จาก `@nestjs/*`
* เก็บแค่ DTO, response interface, enum ที่ข้าม wire เท่านั้น

## Workflow ตามแบบในหนังสือ

* **1 prompt = 1 commit** ทุก commit ต้อง build ผ่านก่อน
* ใช้ Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, ...)
* Feature ใหม่ออกแบบ DTO ใน `packages/shared` ก่อน แล้วค่อยเขียน controller, service, repo
* ก่อน commit งานฝั่ง backend ให้รัน `pnpm --filter backend build` และรันเฉพาะ spec ที่เกี่ยวกับไฟล์ที่แก้

## เรียนต่อจากในหนังสือ

หนังสือ Vibecoding with Claude Code แบ่งเป็น 5 phase รวม 10 บท

| Phase | บท | หัวข้อหลัก |
| :--- | :--- | :--- |
| 1. Foundations | บท 1, 2 | mindset และ 6-layer architecture |
| 2. Getting Started | บท 3, 4 | ติดตั้ง Claude Code + scaffold monorepo + `CLAUDE.md` memory |
| 3. Advanced Prompting | บท 5, 6 | 5 prompt patterns พร้อมเขียน auth, CRUD, dashboard |
| 4. Integration & AI Teams | บท 7, 8 | MCP, LINE webhook, subagent (code review, test) |
| 5. Production | บท 9, 10 | Docker, Cloudflare Tunnel, Skills, Hooks, Plugins |

ซอร์สโค้ดในแต่ละบทถูก commit แยกตามลำดับ เปิดดู `git log` ย้อนหลังเพื่อเทียบความแตกต่างได้เลย

ดูรายละเอียดและสั่งซื้อหนังสือที่ [vibecodingthailand.com/vibecoding-book](https://vibecodingthailand.com/vibecoding-book)

## License

โปรเจคนี้ใช้สำหรับการศึกษาประกอบหนังสือ Vibecoding with Claude Code

© Keerati Limkulphong / vibecodingthailand.com
