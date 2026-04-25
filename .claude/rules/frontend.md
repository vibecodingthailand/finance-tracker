---
description: Rules สำหรับ frontend code
paths: apps/frontend/**
---

# Frontend Rules

## Core

- **Tailwind utility classes only.** No CSS modules, no inline `style={{ ... }}`.
- **Function components + hooks only.** No class components.
- Routing: **React Router**.
- State: React hooks (`useState`, `useReducer`).
- API calls: use the fetch wrapper at `src/lib/api.ts`. Don't call `fetch` directly from components.
- Layout:
  - Pages → `src/pages/`
  - Components → `src/components/`
  - Reusable UI primitives → `src/components/ui/` (PascalCase filenames)
- **No copy-paste.** Repeated UI patterns (card, button, input, modal) must be extracted into a reusable component in `src/components/ui/`.

## Design System — Premium Dark Theme

### Base

- **Dark-only.** No light mode.
- Root: `bg-zinc-950`
- Cards: `bg-zinc-900`
- Nested surfaces: `bg-zinc-800`
- Default text: `text-zinc-100`

### Palette

- Neutral: **zinc** scale.
- Accent: **single accent color** — `emerald` *or* `cyan` — used only for CTAs and highlights.
- Semantic colors:
  - Income (รายรับ) → `emerald-500`
  - Expense (รายจ่าย) → `rose-500`
  - Balance → accent

### Typography (Google Fonts)

- Body: **Sarabun**
- Heading: **Kanit** — bold, sharp, clear hierarchy
- No other fonts.

### Components

- **Cards:** `rounded-xl border border-zinc-800 shadow-lg` (subtle shadow)
- **Buttons:** `transition hover:scale-[1.02] active:scale-95`
- **Inputs:** `focus:ring-2 focus:ring-accent/50`. Suppress the default browser outline.

### Animations

- Fade-in on mount.
- Skeleton loaders during loading.
- Hover transitions `duration-200`.

### Forbidden

- ❌ Strong gradients
- ❌ Emoji as decorative icons
- ❌ Heavy drop shadows
- ❌ Loud / saturated colors
- ❌ Fonts outside Google Fonts

## Localization (แอปคนไทย)

- **All UI text in Thai** — labels, buttons, errors, modals, empty states.
- Currency: `฿` prefix with thousands separator `,` (e.g. `฿1,234.56`).
- Dates: use `Intl.DateTimeFormat('th-TH')` — e.g. `20 เม.ย. 2026`.

## Responsive — Mobile-first

- **Target:** iPhone SE (375px) → desktop.
- Start layout at 375px, then scale up using Tailwind breakpoints (`sm:`, `md:`, `lg:`).
- **Touch targets:** minimum **44×44px** (iOS HIG).

### Layout per breakpoint

| Element         | Mobile                  | Desktop                |
| --------------- | ----------------------- | ---------------------- |
| Navigation      | Hamburger / bottom nav  | Sidebar / top nav      |
| Summary cards   | 1 column                | 3 columns              |
| Dashboard charts| 1 column                | 2–3 columns            |
| Table           | Card list               | Table                  |
| Modal           | Fullscreen              | Centered dialog        |
