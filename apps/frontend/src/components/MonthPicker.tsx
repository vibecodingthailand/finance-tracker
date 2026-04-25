import { THAI_MONTH_NAMES } from '../lib/format';

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

const selectClass =
  'min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:ring-2 focus:ring-emerald-500/50 hover:border-zinc-700';

export function MonthPicker({ month, year, onChange }: MonthPickerProps) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y += 1) {
    years.push(y);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="เดือน"
        className={selectClass}
        value={month}
        onChange={(event) => onChange(Number(event.target.value), year)}
      >
        {THAI_MONTH_NAMES.map((name, idx) => (
          <option key={name} value={idx + 1} className="bg-zinc-900 text-zinc-100">
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="ปี"
        className={selectClass}
        value={year}
        onChange={(event) => onChange(month, Number(event.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y} className="bg-zinc-900 text-zinc-100">
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
