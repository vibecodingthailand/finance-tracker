import type { CategoryResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { Select } from './ui/Select';

export interface TransactionFiltersValue {
  categoryId: string;
  type: '' | TransactionType;
  startDate: string;
  endDate: string;
}

interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  categories: CategoryResponse[];
  onChange: (next: TransactionFiltersValue) => void;
  onReset: () => void;
}

const dateInputClass =
  'min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:ring-2 focus:ring-emerald-500/50 hover:border-zinc-700';

export function TransactionFilters({
  value,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const hasActive =
    value.categoryId !== '' ||
    value.type !== '' ||
    value.startDate !== '' ||
    value.endDate !== '';

  const categoryOptions = categories
    .filter((category) => value.type === '' || category.type === value.type)
    .map((category) => ({
      value: category.id,
      label: `${category.icon} ${category.name}`,
    }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label="ประเภท"
        value={value.type}
        onChange={(event) =>
          onChange({
            ...value,
            type: event.target.value as TransactionFiltersValue['type'],
            categoryId: '',
          })
        }
        options={[
          { value: '', label: 'ทั้งหมด' },
          { value: TransactionType.INCOME, label: 'รายรับ' },
          { value: TransactionType.EXPENSE, label: 'รายจ่าย' },
        ]}
      />

      <Select
        label="หมวดหมู่"
        value={value.categoryId}
        onChange={(event) => onChange({ ...value, categoryId: event.target.value })}
        options={[{ value: '', label: 'ทั้งหมด' }, ...categoryOptions]}
      />

      <DateField
        label="วันที่เริ่มต้น"
        value={value.startDate}
        onChange={(next) => onChange({ ...value, startDate: next })}
      />

      <div className="flex flex-col gap-1.5">
        <DateField
          label="วันที่สิ้นสุด"
          value={value.endDate}
          onChange={(next) => onChange({ ...value, endDate: next })}
        />
      </div>

      {hasActive ? (
        <button
          type="button"
          onClick={onReset}
          className="self-start text-sm font-medium text-emerald-400 transition hover:text-emerald-300 lg:col-span-4 lg:justify-self-end"
        >
          ล้างตัวกรอง
        </button>
      ) : null}
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
}

function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={dateInputClass}
      />
    </div>
  );
}
