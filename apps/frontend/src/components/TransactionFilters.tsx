import { useMemo, useState } from 'react';
import type { CategoryResponse } from '@finance-tracker/shared';
import { TransactionType } from '@finance-tracker/shared';
import { ChevronDownIcon, SlidersIcon } from './icons';
import { DateField } from './ui/DateField';
import { Select, type SelectOption } from './ui/Select';
import { SegmentedControl, type SegmentedOption } from './ui/SegmentedControl';

export interface TransactionFiltersValue {
  categoryId: string;
  type: '' | TransactionType;
  startDate: string;
  endDate: string;
}

type SegmentedTypeOption = SegmentedOption<TransactionFiltersValue['type']>;

interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  categories: CategoryResponse[];
  onChange: (next: TransactionFiltersValue) => void;
  onReset: () => void;
}

interface DatePreset {
  key: string;
  label: string;
  compute: () => { start: string; end: string };
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function offsetStr(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const datePresets: DatePreset[] = [
  {
    key: 'all',
    label: 'ทั้งหมด',
    compute: () => ({ start: '', end: '' }),
  },
  {
    key: 'thisMonth',
    label: 'เดือนนี้',
    compute: () => ({ start: startOfMonthStr(), end: todayStr() }),
  },
  {
    key: '7d',
    label: '7 วัน',
    compute: () => ({ start: offsetStr(6), end: todayStr() }),
  },
  {
    key: '30d',
    label: '30 วัน',
    compute: () => ({ start: offsetStr(29), end: todayStr() }),
  },
  {
    key: '90d',
    label: '90 วัน',
    compute: () => ({ start: offsetStr(89), end: todayStr() }),
  },
];

function detectActivePreset(value: TransactionFiltersValue): string {
  for (const preset of datePresets) {
    const { start, end } = preset.compute();
    if (preset.key === 'all' && value.startDate === '' && value.endDate === '') return 'all';
    if (preset.key !== 'all' && value.startDate === start && value.endDate === end) return preset.key;
  }
  return 'custom';
}

export function TransactionFilters({
  value,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const [showCustom, setShowCustom] = useState(false);

  const activePreset = useMemo(() => detectActivePreset(value), [value]);

  const hasActive =
    value.categoryId !== '' ||
    value.type !== '' ||
    value.startDate !== '' ||
    value.endDate !== '';

  const categoryOptions: SelectOption[] = [
    { value: '', label: 'ทุกหมวด' },
    ...categories
      .filter((category) => value.type === '' || category.type === value.type)
      .map((category) => ({
        value: category.id,
        label: category.name,
        icon: category.icon,
      })),
  ];

  const typeOptions: SegmentedTypeOption[] = [
    { value: '', label: 'ทั้งหมด', tone: 'neutral' },
    { value: TransactionType.INCOME, label: 'รายรับ', tone: 'income' },
    { value: TransactionType.EXPENSE, label: 'รายจ่าย', tone: 'expense' },
  ];

  const handlePresetClick = (preset: DatePreset) => {
    const { start, end } = preset.compute();
    onChange({ ...value, startDate: start, endDate: end });
    if (preset.key === 'all' || preset.key === 'custom') return;
    setShowCustom(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="flex-1">
          <SegmentedControl
            label="ประเภท"
            value={value.type}
            onChange={(next) =>
              onChange({
                ...value,
                type: next,
                categoryId: '',
              })
            }
            options={typeOptions}
            size="md"
          />
        </div>
        <div className="lg:w-64">
          <Select
            label="หมวดหมู่"
            value={value.categoryId}
            options={categoryOptions}
            onChange={(next) => onChange({ ...value, categoryId: next })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-300">ช่วงเวลา</span>
        <div className="flex flex-wrap items-center gap-2">
          {datePresets.map((preset) => {
            const isActive = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`inline-flex min-h-[36px] items-center rounded-full border px-3.5 text-xs font-medium transition ${
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustom((prev) => !prev)}
            className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3.5 text-xs font-medium transition ${
              activePreset === 'custom' || showCustom
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100'
            }`}
          >
            <SlidersIcon className="h-3.5 w-3.5" />
            กำหนดเอง
            <ChevronDownIcon
              className={`h-3.5 w-3.5 transition-transform ${showCustom ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        {showCustom || activePreset === 'custom' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        ) : null}
      </div>

      {hasActive ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      ) : null}
    </div>
  );
}
