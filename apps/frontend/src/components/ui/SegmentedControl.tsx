import type { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  tone?: 'income' | 'expense' | 'neutral';
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  ariaLabel?: string;
}

const sizeClass = {
  sm: 'min-h-[36px] text-xs',
  md: 'min-h-[44px] text-sm',
};

const toneActive = {
  income: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  expense: 'bg-rose-500/15 text-rose-300 ring-rose-500/40',
  neutral: 'bg-zinc-800 text-zinc-100 ring-zinc-700',
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  size = 'md',
  fullWidth = true,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="text-sm font-medium text-zinc-300">{label}</span> : null}
      <div
        role="tablist"
        aria-label={ariaLabel ?? label}
        className={`inline-flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          const tone = option.tone ?? 'neutral';
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                sizeClass[size]
              } ${
                isActive
                  ? `ring-1 ${toneActive[tone]}`
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {option.icon ? <span className="flex shrink-0 items-center">{option.icon}</span> : null}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
