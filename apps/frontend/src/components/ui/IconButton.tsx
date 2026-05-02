import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type IconButtonTone = 'neutral' | 'danger' | 'accent';
type IconButtonSize = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: IconButtonTone;
  size?: IconButtonSize;
  label: string;
  children: ReactNode;
}

const sizeClass: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
};

const toneClass: Record<IconButtonTone, string> = {
  neutral: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
  danger: 'text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400',
  accent: 'text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { tone = 'neutral', size = 'md', label, className = '', children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass[size]} ${toneClass[tone]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
