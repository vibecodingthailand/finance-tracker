import type { CategoryResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { Select } from "../ui/Select";

export interface TransactionFilterState {
  type: "ALL" | TransactionType;
  categoryId: string;
  startDate: string;
  endDate: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilterState;
  categories: CategoryResponse[];
  onChange: (next: TransactionFilterState) => void;
  onReset: () => void;
}

export function TransactionFilters({
  filters,
  categories,
  onChange,
  onReset,
}: TransactionFiltersProps) {
  const visibleCategories =
    filters.type === "ALL"
      ? categories
      : categories.filter((c) => c.type === filters.type);

  const hasActive =
    filters.type !== "ALL" ||
    filters.categoryId !== "" ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-lg">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="ประเภท"
          name="type"
          value={filters.type}
          onChange={(e) =>
            onChange({
              ...filters,
              type: e.target.value as TransactionFilterState["type"],
              categoryId: "",
            })
          }
        >
          <option value="ALL">ทั้งหมด</option>
          <option value={TransactionType.INCOME}>รายรับ</option>
          <option value={TransactionType.EXPENSE}>รายจ่าย</option>
        </Select>

        <Select
          label="หมวด"
          name="categoryId"
          value={filters.categoryId}
          onChange={(e) =>
            onChange({ ...filters, categoryId: e.target.value })
          }
        >
          <option value="">ทั้งหมด</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>

        <DateInput
          label="ตั้งแต่วันที่"
          name="startDate"
          value={filters.startDate}
          onChange={(value) => onChange({ ...filters, startDate: value })}
          max={filters.endDate || undefined}
        />

        <DateInput
          label="ถึงวันที่"
          name="endDate"
          value={filters.endDate}
          onChange={(value) => onChange({ ...filters, endDate: value })}
          min={filters.startDate || undefined}
        />
      </div>

      {hasActive ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            ล้างตัวกรอง
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface DateInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

function DateInput({ label, name, value, onChange, min, max }: DateInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 transition duration-200 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}
