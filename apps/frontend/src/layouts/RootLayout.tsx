import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet } from 'react-router';
import { HomeIcon, ListIcon, LogOutIcon, RepeatIcon, TagIcon, WalletIcon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

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
];

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
  ].join(' ');

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors',
    isActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-100',
  ].join(' ');

export function RootLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 sm:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <WalletIcon className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">Finance Tracker</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={sidebarLinkClass}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
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
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
              <WalletIcon className="h-4 w-4" />
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

        <main className="flex-1 p-5 pb-24 sm:p-8 sm:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-800 bg-zinc-900/95 backdrop-blur sm:hidden">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={mobileLinkClass}>
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
