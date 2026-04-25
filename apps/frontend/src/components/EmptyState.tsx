import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, className = '', children }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center ${className}`}
    >
      <p className="font-heading text-base font-semibold text-zinc-200">{title}</p>
      {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
