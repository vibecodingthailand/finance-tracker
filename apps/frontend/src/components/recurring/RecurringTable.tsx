import { Pencil, Trash2 } from "lucide-react";
import type { RecurringResponse } from "@finance-tracker/shared";
import { TransactionType } from "@finance-tracker/shared";
import { formatBaht } from "../../lib/format";

interface RecurringTableProps {
  recurrings: RecurringResponse[];
  togglingId: string | null;
  onEdit: (r: RecurringResponse) => void;
  onDelete: (r: RecurringResponse) => void;
  onToggleActive: (r: RecurringResponse, next: boolean) => void;
}

export function RecurringTable({
  recurrings,
  togglingId,
  onEdit,
  onDelete,
  onToggleActive,
}: RecurringTableProps) {
  if (recurrings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/60 px-6 py-16 text-center text-sm text-zinc-500">
        ยังไม่มีรายการซ้ำ
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg">
      <ul className="divide-y divide-zinc-800 md:hidden">
        {recurrings.map((r) => (
          <RecurringCard
            key={r.id}
            recurring={r}
            isToggling={togglingId === r.id}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
          />
        ))}
      </ul>

      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-zinc-800 bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">รายการ</th>
            <th className="px-4 py-3 font-medium">หมวด</th>
            <th className="px-4 py-3 font-medium">วันที่</th>
            <th className="px-4 py-3 font-medium">ประเภท</th>
            <th className="px-4 py-3 text-right font-medium">จำนวน</th>
            <th className="px-4 py-3 text-center font-medium">สถานะ</th>
            <th className="px-4 py-3 text-right font-medium">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {recurrings.map((r) => (
            <RecurringRow
              key={r.id}
              recurring={r}
              isToggling={togglingId === r.id}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RowProps {
  recurring: RecurringResponse;
  isToggling: boolean;
  onEdit: (r: RecurringResponse) => void;
  onDelete: (r: RecurringResponse) => void;
  onToggleActive: (r: RecurringResponse, next: boolean) => void;
}

function RecurringRow({
  recurring,
  isToggling,
  onEdit,
  onDelete,
  onToggleActive,
}: RowProps) {
  const isIncome = recurring.type === TransactionType.INCOME;
  const amountClass = isIncome ? "text-emerald-400" : "text-rose-400";
  const sign = isIncome ? "+" : "-";
  const dimClass = recurring.active ? "" : "opacity-60";

  return (
    <tr
      className={`text-zinc-200 transition duration-200 hover:bg-zinc-800/40 ${dimClass}`}
    >
      <td className="px-4 py-3">
        <p className="truncate font-medium">
          {recurring.description || recurring.category.name}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-2 py-1 text-xs">
          <span aria-hidden>{recurring.category.icon}</span>
          <span>{recurring.category.name}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-400">ทุกวันที่ {recurring.dayOfMonth}</td>
      <td className="px-4 py-3">
        <TypeBadge type={recurring.type} />
      </td>
      <td className={`px-4 py-3 text-right font-heading font-bold ${amountClass}`}>
        {sign}
        {formatBaht(recurring.amount)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center">
          <ToggleSwitch
            active={recurring.active}
            disabled={isToggling}
            onChange={(next) => onToggleActive(recurring, next)}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <RowActions
          onEdit={() => onEdit(recurring)}
          onDelete={() => onDelete(recurring)}
        />
      </td>
    </tr>
  );
}

function RecurringCard({
  recurring,
  isToggling,
  onEdit,
  onDelete,
  onToggleActive,
}: RowProps) {
  const isIncome = recurring.type === TransactionType.INCOME;
  const amountClass = isIncome ? "text-emerald-400" : "text-rose-400";
  const sign = isIncome ? "+" : "-";
  const dimClass = recurring.active ? "" : "opacity-60";

  return (
    <li className={`flex flex-col gap-2 px-4 py-3 ${dimClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg"
            aria-hidden
          >
            {recurring.category.icon}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">
              {recurring.description || recurring.category.name}
            </p>
            <p className="text-xs text-zinc-500">
              {recurring.category.name} · ทุกวันที่ {recurring.dayOfMonth}
            </p>
          </div>
        </div>
        <p className={`font-heading text-sm font-bold ${amountClass}`}>
          {sign}
          {formatBaht(recurring.amount)}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TypeBadge type={recurring.type} />
          <ToggleSwitch
            active={recurring.active}
            disabled={isToggling}
            onChange={(next) => onToggleActive(recurring, next)}
          />
        </div>
        <RowActions
          onEdit={() => onEdit(recurring)}
          onDelete={() => onDelete(recurring)}
        />
      </div>
    </li>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  const isIncome = type === TransactionType.INCOME;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isIncome
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {isIncome ? "รายรับ" : "รายจ่าย"}
    </span>
  );
}

interface ToggleSwitchProps {
  active: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}

function ToggleSwitch({ active, disabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      disabled={disabled}
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "bg-emerald-500 focus:ring-emerald-500/50"
          : "bg-zinc-700 focus:ring-zinc-500/50"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-zinc-50 shadow transition duration-200 ${
          active ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label="แก้ไข"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="ลบ"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition duration-200 hover:bg-zinc-800 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
