import type { ReactNode } from "react";

interface FormAlertProps {
  children: ReactNode;
}

export function FormAlert({ children }: FormAlertProps) {
  return (
    <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {children}
    </div>
  );
}
