import { Select, type SelectOption } from './ui/Select';
import { THAI_MONTH_NAMES } from '../lib/format';

interface MonthPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

export function MonthPicker({ month, year, onChange }: MonthPickerProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions: SelectOption[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y += 1) {
    yearOptions.push({ value: String(y), label: String(y) });
  }
  const monthOptions: SelectOption[] = THAI_MONTH_NAMES.map((name, idx) => ({
    value: String(idx + 1),
    label: name,
  }));

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
      <div className="min-w-[10rem]">
        <Select
          ariaLabel="เดือน"
          value={String(month)}
          options={monthOptions}
          onChange={(next) => onChange(Number(next), year)}
        />
      </div>
      <div className="min-w-[6.5rem]">
        <Select
          ariaLabel="ปี"
          value={String(year)}
          options={yearOptions}
          onChange={(next) => onChange(month, Number(next))}
        />
      </div>
    </div>
  );
}
