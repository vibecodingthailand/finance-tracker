import type { ReactNode } from 'react';
import { Card } from './ui/Card';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md animate-[fadeIn_300ms_ease-out]">
        <Card className="px-6 py-8 sm:px-8">
          <header className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
          </header>
          {children}
          <footer className="mt-6 text-center text-sm text-zinc-400">{footer}</footer>
        </Card>
      </div>
    </div>
  );
}
