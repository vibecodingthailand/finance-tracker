import type { ReactNode } from 'react';
import { WalletIcon } from './icons';
import { Card } from './ui/Card';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-200px] right-[-100px] h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-[fadeIn_300ms_ease-out]">
          <header className="mb-6 flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-300/40">
              <WalletIcon className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <p className="mt-4 font-heading text-base font-bold tracking-tight text-zinc-200">
              Finance Tracker
            </p>
            <p className="text-xs text-zinc-500">บันทึกง่าย เห็นภาพรวม</p>
          </header>

          <Card className="px-6 py-8 sm:px-8">
            <div className="mb-6 text-center">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
            </div>
            {children}
            <footer className="mt-6 text-center text-sm text-zinc-400">{footer}</footer>
          </Card>
        </div>
      </div>
    </div>
  );
}
