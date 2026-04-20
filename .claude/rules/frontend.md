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

- Dark mode only — `color-scheme: dark` บน `<html>` (index.css) เพื่อให้ native form controls render dark
- Root background: **body** มี mesh gradient อยู่แล้ว (ดู Mesh background ด้านล่าง) — Container หลัก (AppLayout outer, auth page `<main>`) **ห้าม set `bg-zinc-950`** เพื่อให้ mesh โชว์ผ่าน
- Cards (solid): `bg-zinc-900`
- Cards บน mesh (sidebar, auth card): `bg-zinc-900/70 backdrop-blur-xl` — glass morphism
- Nested/raised surface: `bg-zinc-800`
- Text default: `text-zinc-100`

### Palette

- Neutral: `zinc` ทั้งสเกล
- Primary accent: `emerald` — ใช้ที่ CTA, highlight สำคัญ, active nav, ring focus (เดี่ยวได้)
- Secondary accent: `cyan` — ใช้ **เฉพาะใน gradient คู่กับ emerald** เท่านั้น (logo, heading text, mesh bg, active nav) **ห้ามใช้เดี่ยว**
- **Semantic colors**:
  - รายรับ (income) → `emerald-500`
  - รายจ่าย (expense) → `rose-500`
  - Balance → accent color

### Typography (Google Fonts)

- Body: **Sarabun**
- Heading: **Kanit** — หนา ตัดคม hierarchy ชัด (`font-bold` / `font-extrabold`)
- ห้ามใช้ font อื่นนอก Google Fonts

### Logo & brand

- Component: `src/components/ui/Logo.tsx` — SVG mark (3 ascending bars, diagonal gradient) + wordmark "Finance Tracker" (horizontal gradient)
- Gradient: `emerald-400 → cyan-400` เสมอ
- ใช้ที่ sidebar (AppLayout) และ auth pages (Login/Register) — **ห้าม hardcode ข้อความ "Finance Tracker"** เอง ใช้ `<Logo />` เท่านั้น
- Size: `sm` (mobile header), `md` (sidebar default), `lg` (auth hero)

### Mesh background

- `body` มี **fixed radial gradient mesh** ผสม emerald/cyan ที่ opacity 4-12% บนพื้น zinc-950 (index.css)
- Fixed attachment → ไม่ scroll ตาม content ไม่ animate (perf)
- Mesh คือ single source — อย่า re-apply mesh ใน container ย่อย

### Gradient heading

- Page `<h2>` ทุกหน้า ใช้:
  ```
  bg-gradient-to-r from-zinc-50 via-emerald-200 to-cyan-300 bg-clip-text text-transparent
  font-heading text-2xl font-extrabold
  ```
- Sub-heading, card title, body ยังเป็น `text-zinc-100` / `text-zinc-400` solid ตามปกติ ห้าม gradient ซ้อน gradient

### Cards

```
rounded-xl border border-zinc-800 shadow-lg
```

Glass card บน mesh: `rounded-xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl shadow-lg`

Black/gray drop shadow หนาห้าม — colored glow shadow (emerald/cyan ≤ 50% opacity) บน CTA ใช้ได้

### Buttons

- Hover: `hover:scale-[1.02]`
- Active: `active:scale-95`
- Transition: `transition duration-200`
- **Primary CTA glow**: `shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/50` — intensify on hover คู่กับ scale transform

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

- **Gradient ข้าม palette** (pastel/neon/rainbow) — gradient **ภายใน palette** (zinc + emerald + cyan) ใช้ได้ใน logo/heading/mesh/active nav
- **Black/gray drop shadow หนา** — colored glow (emerald/cyan ≤ 50% opacity) บน primary CTA ใช้ได้
- **Emoji ใช้เป็น UI icon** (ใช้ icon library เช่น lucide-react แทน) — ยกเว้น category icon ที่ user เป็นคนเลือกเอง
- สีฉูดฉาดนอก palette (hot pink, neon green, ฯลฯ)
- Font นอก Google Fonts
- Inline style
- Class components
- Hardcode ข้อความ "Finance Tracker" เอง (ใช้ `<Logo />`)
