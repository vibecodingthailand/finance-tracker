import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet } from 'react-router';
import {
  ChartBarIcon,
  HomeIcon,
  ListIcon,
  LogOutIcon,
  PlusIcon,
  RepeatIcon,
  SettingsIcon,
  TagIcon,
  WalletIcon,
} from '../components/icons';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useQuickAdd } from '../contexts/QuickAddContext';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'ภาพรวม', icon: HomeIcon },
  { to: '/transactions', label: 'รายการ', icon: ListIcon },
  { to: '/categories', label: 'หมวดหมู่', icon: TagIcon },
  { to: '/recurring', label: 'รายการประจำ', icon: RepeatIcon },
  { to: '/budget', label: 'งบประมาณ', icon: ChartBarIcon },
  { to: '/settings', label: 'ตั้งค่า', icon: SettingsIcon },
];

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-emerald-500/10 text-emerald-300'
      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
  ].join(' ');

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'group relative flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors',
    isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-200',
  ].join(' ');

export function RootLayout() {
  const { user, logout } = useAuth();
  const { open: openQuickAdd } = useQuickAdd();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 sm:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-300/40">
            <WalletIcon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-base font-bold tracking-tight text-zinc-100">
              Finance Tracker
            </p>
            <p className="truncate text-[11px] text-zinc-500">บันทึกง่าย เห็นภาพรวม</p>
          </div>
        </div>

        <div className="px-3">
          <Button onClick={openQuickAdd} className="w-full justify-center gap-2">
            <PlusIcon className="h-4 w-4" />
            บันทึกรายการ
          </Button>
        </div>

        <nav className="mt-5 flex-1 space-y-0.5 px-3">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={sidebarLinkClass}>
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all ${
                      isActive ? 'bg-emerald-400 opacity-100' : 'opacity-0'
                    }`}
                  />
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {user ? (
          <div className="m-3 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="ออกจากระบบ"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-400"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 backdrop-blur sm:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-300/40">
              <WalletIcon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="font-heading text-base font-bold tracking-tight">Finance Tracker</span>
          </div>
          {user ? (
            <button
              type="button"
              onClick={logout}
              aria-label="ออกจากระบบ"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-rose-400"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          ) : null}
        </header>

        <main className="flex-1 p-5 pb-28 sm:p-8 sm:pb-8">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        onClick={openQuickAdd}
        aria-label="บันทึกรายการ"
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-300/40 transition active:scale-95 hover:scale-105 sm:hidden"
      >
        <PlusIcon className="h-6 w-6" strokeWidth={2.4} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-800 bg-zinc-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={mobileLinkClass}>
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-emerald-400 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <item.icon className="h-5 w-5" />
                <span className="leading-none">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
