import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold min-h-[44px] px-5 text-sm transition duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus:ring-emerald-400/50 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/50",
  secondary:
    "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus:ring-zinc-500/50",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-zinc-800 focus:ring-zinc-500/50",
};

export function Button({
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
