import { forwardRef, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, placeholder, id, className = '', ...rest },
  ref,
) {
  const selectId = id ?? rest.name;
  const borderClass = error
    ? 'border-rose-500/60'
    : 'border-zinc-800 hover:border-zinc-700 focus:border-emerald-500/60';

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={`min-h-[44px] rounded-xl border bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition focus:ring-2 focus:ring-emerald-500/50 ${borderClass} ${className}`}
        {...rest}
      >
        {placeholder ? (
          <option value="" className="bg-zinc-900 text-zinc-100">
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="bg-zinc-900 text-zinc-100"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
});
