const BAHT_FORMATTER = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BAHT_COMPACT_FORMATTER = new Intl.NumberFormat("th-TH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const THAI_DATE_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const THAI_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  year: "numeric",
  month: "long",
});

export function formatBaht(amount: number): string {
  return `฿${BAHT_FORMATTER.format(amount)}`;
}

export function formatBahtCompact(amount: number): string {
  return `฿${BAHT_COMPACT_FORMATTER.format(amount)}`;
}

export function formatThaiDate(isoString: string): string {
  return THAI_DATE_FORMATTER.format(new Date(isoString));
}

export function formatMonthYearThai(year: number, month: number): string {
  return THAI_MONTH_YEAR_FORMATTER.format(new Date(year, month - 1, 1));
}

export function dayOfMonthFromIsoDate(dateKey: string): string {
  const parts = dateKey.split("-");
  return parts[2] ?? dateKey;
}
