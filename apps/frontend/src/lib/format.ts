const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('th-TH', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  calendar: 'gregory',
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return `฿${compactCurrencyFormatter.format(amount)}`;
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

const dayFormatter = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  calendar: 'gregory',
});

export function formatRelativeDay(value: string | Date): string {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} วันก่อน`;
  return dayFormatter.format(date);
}

export function dayKey(value: string | Date): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function nextRecurringRun(dayOfMonth: number, now: Date = new Date()): Date {
  const today = now.getDate();
  if (dayOfMonth >= today) {
    return new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
}

export function formatNextRun(dayOfMonth: number, now: Date = new Date()): string {
  const next = nextRecurringRun(dayOfMonth, now);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfNext = new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime();
  const diffDays = Math.round((startOfNext - startOfToday) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'พรุ่งนี้';
  if (diffDays > 0 && diffDays < 7) return `อีก ${diffDays} วัน`;
  return dayFormatter.format(next);
}

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;
