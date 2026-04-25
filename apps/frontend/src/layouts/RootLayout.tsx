import { NavLink, Outlet } from 'react-router';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/categories', label: 'Categories' },
];

export function RootLayout() {
  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-900 sm:block">
        <div className="px-6 py-5 font-heading text-lg font-semibold text-zinc-100">
          Finance Tracker
        </div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 pb-24 sm:p-8 sm:pb-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-800 bg-zinc-900/95 backdrop-blur sm:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-100'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
