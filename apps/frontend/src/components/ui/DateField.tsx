import { useId, useRef } from 'react';
import { CalendarIcon } from '../icons';

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  name?: string;
  id?: string;
  min?: string;
  max?: string;
  ariaLabel?: string;
}

export function DateField({
  label,
  value,
  onChange,
  error,
  name,
  id,
  min,
  max,
  ariaLabel,
}: DateFieldProps) {
  const reactId = useId();
  const inputId = id ?? `date-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch {
        // fall through to focus
      }
    }
    input.focus();
  };

  const wrapperClass = [
    'relative flex min-h-[44px] items-center rounded-xl border bg-zinc-900 transition',
    error
      ? 'border-rose-500/60'
      : 'border-zinc-800 hover:border-zinc-700 focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/30',
  ].join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      ) : null}
      <div className={wrapperClass}>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={min}
          max={max}
          aria-label={ariaLabel}
          className="w-full bg-transparent px-3.5 pr-11 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={handleIconClick}
          tabIndex={-1}
          aria-label="เปิดปฏิทิน"
          className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-emerald-400"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
}
