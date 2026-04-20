import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = "", ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-zinc-300"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={`min-h-[44px] rounded-lg border bg-zinc-900 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 transition duration-200 focus:outline-none focus:ring-2 ${
          error
            ? "border-rose-500/60 focus:ring-rose-500/50"
            : "border-zinc-800 focus:border-emerald-500/60 focus:ring-emerald-500/50"
        } ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : null}
    </div>
  );
});
