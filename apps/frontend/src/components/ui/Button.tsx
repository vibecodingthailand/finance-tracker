import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus:ring-emerald-500/50 disabled:bg-emerald-500/40 disabled:text-zinc-900/60',
  ghost:
    'bg-transparent text-zinc-300 hover:text-emerald-400 focus:ring-emerald-500/30',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 text-sm font-semibold tracking-wide transition duration-200 focus:outline-none focus:ring-2 active:scale-95 hover:scale-[1.02] disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading ? <span className="text-sm">กำลังดำเนินการ...</span> : children}
    </button>
  );
}
