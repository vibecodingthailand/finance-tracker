import { NavLink, Outlet } from "react-router";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/transactions", label: "Transactions", end: false },
];

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="px-6 py-5 border-b border-slate-200">
          <h1 className="text-lg font-semibold">Finance Tracker</h1>
        </div>
        <nav className="flex flex-col p-3 gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
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
