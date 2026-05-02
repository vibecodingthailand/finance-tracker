import type { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'muted' | 'subtle';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

const variantClass: Record<CardVariant, string> = {
  default: 'bg-zinc-900 border-zinc-800',
  muted: 'bg-zinc-900/60 border-zinc-800',
  subtle: 'bg-zinc-900/40 border-zinc-800/80',
};

export function Card({
  variant = 'default',
  interactive = false,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-xl border shadow-lg ${variantClass[variant]} ${
        interactive ? 'transition hover:border-zinc-700 hover:bg-zinc-900/80' : ''
      } ${className}`}
      {...rest}
    />
  );
}
