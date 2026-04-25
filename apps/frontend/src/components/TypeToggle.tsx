import { TransactionType } from '@finance-tracker/shared';

interface TypeToggleProps {
  value: TransactionType;
  onChange: (next: TransactionType) => void;
  disabled?: boolean;
  label?: string;
}

const baseClass =
  'flex-1 min-h-[44px] rounded-xl border text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed';

const activeExpense =
  'border-rose-500/60 bg-rose-500/10 text-rose-300 focus:ring-rose-500/40';
const activeIncome =
  'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 focus:ring-emerald-500/40';
const inactive =
  'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 focus:ring-zinc-500/40 disabled:hover:border-zinc-800 disabled:opacity-60';

export function TypeToggle({ value, onChange, disabled = false, label = 'ประเภท' }: TypeToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(TransactionType.EXPENSE)}
          className={`${baseClass} ${value === TransactionType.EXPENSE ? activeExpense : inactive}`}
        >
          รายจ่าย
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(TransactionType.INCOME)}
          className={`${baseClass} ${value === TransactionType.INCOME ? activeIncome : inactive}`}
        >
          รายรับ
        </button>
      </div>
    </div>
  );
}
