const MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (next: { month: number; year: number }) => void;
}

export function MonthPicker({ month, year, onChange }: MonthPickerProps) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="month-picker">
        เดือน
      </label>
      <select
        id="month-picker"
        value={month}
        onChange={(e) => onChange({ month: Number(e.target.value), year })}
        className="min-h-[44px] min-w-[130px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 transition duration-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        {MONTH_NAMES.map((name, idx) => (
          <option key={name} value={idx + 1}>
            {name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="year-picker">
        ปี
      </label>
      <select
        id="year-picker"
        value={year}
        onChange={(e) => onChange({ month, year: Number(e.target.value) })}
        className="min-h-[44px] min-w-[100px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 transition duration-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y + 543}
          </option>
        ))}
      </select>
    </div>
  );
}
