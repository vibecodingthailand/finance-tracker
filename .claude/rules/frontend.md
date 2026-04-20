# Frontend Rules — `apps/frontend/**`

Rules สำหรับงานใน `apps/frontend/` เท่านั้น นอก scope นี้ไม่ใช้

## Core

- **Styling**: Tailwind utility classes เท่านั้น ห้าม CSS Modules, ห้าม inline style (`style={{...}}`), ห้ามเขียน `.css` ใหม่
- **Components**: function components + hooks เท่านั้น ห้าม class components
- **Routing**: React Router
- **State**: React hooks (`useState`, `useReducer`) — ไม่ต้องเอา state library มาใส่ถ้ายังไม่จำเป็น
- **API calls**: ผ่าน fetch wrapper ที่ `src/lib/api.ts` ห้ามเรียก `fetch` หรือ `axios` ตรง ๆ จาก component/page
- **File layout**:
  - Pages → `src/pages/`
  - Components ทั่วไป → `src/components/`
  - UI primitives ที่ reuse ได้ (card, button, input, modal, badge, ...) → `src/components/ui/` ชื่อไฟล์ + export เป็น `PascalCase`
- **DRY UI**: pattern ที่ใช้ซ้ำข้ามหน้า → extract เป็น component ที่ `src/components/ui/` **ห้าม copy-paste โครงเดิมข้ามหน้า**

## Design System — Premium Dark Theme

### Base

- Dark mode only
- Root: `bg-zinc-950`
- Cards: `bg-zinc-900`
- Nested/raised surface: `bg-zinc-800`
- Text default: `text-zinc-100`

### Palette

- Neutral: `zinc` ทั้งสเกล
- Accent: เลือก **สีเดียว** — `emerald` *หรือ* `cyan` — ใช้เฉพาะ CTA และ highlight สำคัญ
- **Semantic colors**:
  - รายรับ (income) → `emerald-500`
  - รายจ่าย (expense) → `rose-500`
  - Balance → accent color

### Typography (Google Fonts)

- Body: **Sarabun**
- Heading: **Kanit** — หนา ตัดคม hierarchy ชัด (`font-bold` / `font-extrabold`)
- ห้ามใช้ font อื่นนอก Google Fonts

### Cards

```
rounded-xl border border-zinc-800 shadow-lg
```

Shadow เบา ๆ เท่านั้น ห้าม drop shadow หนา

### Buttons

- Hover: `hover:scale-[1.02]`
- Active: `active:scale-95`
- Transition: `transition duration-200`

### Inputs

- Focus: `focus:ring-2 focus:ring-{accent}/50`
- `focus:outline-none` ตัด browser default ทิ้ง

### Animations

- Mount: fade-in
- Loading: skeleton (ห้ามใช้ spinner เป็น default)
- Hover/focus: `transition duration-200`

## Localization (แอปคนไทย)

- UI text **ทุกที่เป็นภาษาไทย**: labels, placeholders, buttons, error messages, modal titles, empty states
- **จำนวนเงิน**: prefix `฿` + คั่นหลักพันด้วย `,` — เช่น `฿12,345.00`
- **วันที่**: `Intl.DateTimeFormat('th-TH', ...)` — เช่น `20 เม.ย. 2026`
- คีย์ / variable / code ยัง `en` ตามปกติ แปลเฉพาะสิ่งที่ผู้ใช้เห็น

## Responsive — Mobile-first

**Target**: iPhone SE (375px width) → desktop

- เริ่มออกแบบ layout ที่ **375px ก่อน** แล้วค่อย scale ขึ้นด้วย Tailwind breakpoints (`sm:` `md:` `lg:` `xl:`)
- **Touch target ≥ 44×44px** (iOS HIG) สำหรับปุ่ม/ลิงก์ที่กดได้

### Layout patterns

| Element | Mobile (< md) | Desktop (≥ md) |
|---|---|---|
| Navigation | hamburger หรือ bottom nav | sidebar หรือ top nav |
| Summary cards | 1 col | 3 col |
| Dashboard charts | 1 col | 2–3 col |
| Table data | card list | table |
| Modal | fullscreen | center dialog |

## ห้ามเด็ดขาด

- Gradient แรง ๆ (pastel/neon/rainbow)
- Emoji ใช้เป็นไอคอนตกแต่ง (ใช้ icon library เช่น lucide-react แทน)
- Drop shadow หนา
- สีฉูดฉาด (hot pink, neon green, ฯลฯ)
- Font นอก Google Fonts
- Inline style
- Class components
