import { NavLink, Outlet } from 'react-router';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
];

export function RootLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white">
        <div className="px-6 py-5 text-lg font-semibold">Finance Tracker</div>
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
