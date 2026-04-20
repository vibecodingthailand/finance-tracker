import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
