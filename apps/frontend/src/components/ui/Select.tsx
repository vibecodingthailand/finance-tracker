import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className = "", children, ...rest },
  ref,
) {
  const selectId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-zinc-300"
        >
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={`min-h-[44px] rounded-lg border bg-zinc-900 px-3 text-sm text-zinc-100 transition duration-200 focus:outline-none focus:ring-2 ${
          error
            ? "border-rose-500/60 focus:ring-rose-500/50"
            : "border-zinc-800 focus:border-emerald-500/60 focus:ring-emerald-500/50"
        } ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
});
