import type { CategoryResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { DateField } from './ui/DateField';
import { Select, type SelectOption } from './ui/Select';

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

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'ทั้งหมด' },
    ...categories
      .filter((category) => value.type === '' || category.type === value.type)
      .map((category) => ({
        value: category.id,
        label: category.name,
        icon: category.icon,
      })),
  ];

  const typeOptions: SelectOption[] = [
    { value: '', label: 'ทั้งหมด' },
    { value: TransactionType.INCOME, label: 'รายรับ', icon: <TypeDot tone="income" /> },
    { value: TransactionType.EXPENSE, label: 'รายจ่าย', icon: <TypeDot tone="expense" /> },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label="ประเภท"
        value={value.type}
        options={typeOptions}
        onChange={(next) =>
          onChange({
            ...value,
            type: next as TransactionFiltersValue['type'],
            categoryId: '',
          })
        }
      />

      <Select
        label="หมวดหมู่"
        value={value.categoryId}
        options={categoryOptions}
        onChange={(next) => onChange({ ...value, categoryId: next })}
      />

      <DateField
        label="วันที่เริ่มต้น"
        value={value.startDate}
        onChange={(next) => onChange({ ...value, startDate: next })}
      />

      <DateField
        label="วันที่สิ้นสุด"
        value={value.endDate}
        onChange={(next) => onChange({ ...value, endDate: next })}
      />

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

function TypeDot({ tone }: { tone: 'income' | 'expense' }) {
  const className =
    tone === 'income' ? 'h-2.5 w-2.5 rounded-full bg-emerald-500' : 'h-2.5 w-2.5 rounded-full bg-rose-500';
  return <span className={className} />;
}
