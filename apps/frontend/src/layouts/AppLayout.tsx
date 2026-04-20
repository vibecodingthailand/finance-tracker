import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";

const navItems = [
  { to: "/dashboard", label: "แดชบอร์ด", end: true },
  { to: "/transactions", label: "รายการ", end: false },
  { to: "/categories", label: "หมวดหมู่", end: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 md:flex-row">
      <aside className="border-b border-zinc-800 bg-zinc-900 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-zinc-800 px-6 py-5 md:border-b">
          <h1 className="font-heading text-lg font-extrabold text-zinc-100">
            Finance Tracker
          </h1>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `min-h-[44px] whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition duration-200 ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block md:border-t md:border-zinc-800 md:p-4">
          <p className="mb-3 text-xs text-zinc-500">เข้าสู่ระบบในชื่อ</p>
          <p className="mb-4 truncate text-sm font-medium text-zinc-200">
            {user?.name}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleLogout}
          >
            ออกจากระบบ
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
