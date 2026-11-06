import { Link, NavLink } from "react-router";

import { useTheme } from "../lib/theme-context";
import type { ThemeMode } from "../lib/theme";
import type { MiniUser } from "../lib/api";

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: "light", label: "Sáng" },
  { key: "dark", label: "Tối" },
  { key: "system", label: "Hệ thống" },
];

export function Header({ user }: { user: MiniUser | null }) {
  const { mode, setMode } = useTheme();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">CS</span>
          <span>ChatSpace</span>
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? "rounded-md px-2.5 py-1.5 font-semibold text-indigo-600 dark:text-indigo-400"
                : "rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            Không gian
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/control"
                className={({ isActive }) =>
                  isActive
                    ? "rounded-md px-2.5 py-1.5 font-semibold text-indigo-600 dark:text-indigo-400"
                    : "rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }
              >
                Tài khoản
              </NavLink>
              {user.role === "admin" ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive
                      ? "rounded-md px-2.5 py-1.5 font-semibold text-amber-600 dark:text-amber-400"
                      : "rounded-md px-2.5 py-1.5 font-semibold text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-slate-800"
                  }
                >
                  Quản trị
                </NavLink>
              ) : null}
            </>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[12px] dark:border-slate-700">
            {THEMES.map((theme) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => setMode(theme.key)}
                className={
                  mode === theme.key
                    ? "bg-indigo-600 px-2.5 py-1 font-semibold text-white"
                    : "px-2.5 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }
              >
                {theme.label}
              </button>
            ))}
          </div>
          {user ? (
            <span className="hidden text-[13px] text-slate-600 sm:inline dark:text-slate-300">
              @{user.username}
            </span>
          ) : (
            <Link
              to="/sign-in"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-500"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
