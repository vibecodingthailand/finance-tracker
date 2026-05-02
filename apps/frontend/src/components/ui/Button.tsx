import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus-visible:ring-emerald-500/50 disabled:bg-emerald-500/40 disabled:text-zinc-900/60',
  secondary:
    'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus-visible:ring-zinc-500/40 disabled:bg-zinc-800/60 disabled:text-zinc-500',
  ghost:
    'bg-transparent text-zinc-300 hover:text-emerald-400 focus-visible:ring-emerald-500/30',
  outline:
    'border border-zinc-700 bg-transparent text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/50 focus-visible:ring-zinc-500/40',
  danger:
    'bg-rose-500 text-zinc-950 hover:bg-rose-400 focus-visible:ring-rose-500/50 disabled:bg-rose-500/40 disabled:text-zinc-900/60',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3.5 text-xs',
  md: 'min-h-[44px] px-5 text-sm',
  lg: 'min-h-[48px] px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
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
      className={`inline-flex items-center justify-center rounded-xl font-semibold tracking-wide transition duration-200 focus:outline-none focus-visible:ring-2 active:scale-95 hover:scale-[1.02] disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {loading ? <span>กำลังดำเนินการ...</span> : children}
    </button>
  );
}
