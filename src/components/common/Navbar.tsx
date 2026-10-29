import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { can } from '@/config/permissions';

export function Navbar() {
  const { user, signOut } = useAuth();
  const showDashboard = can(user?.role, 'viewDashboard');

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-bgCanvas/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-textPrimary">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
            <Zap className="h-5 w-5" />
          </span>
          OHM-Gang
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-textSecondary md:flex">
          <span className="transition-colors">Keuangan Kelas</span>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            showDashboard && (
              <Link
                to="/dashboard"
                className="hidden items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-primary-600 sm:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" />
                {user.full_name.split(' ')[0]}
              </Link>
            )
          ) : (
            <Link
              to="/login"
              className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-primary-600 active:scale-[0.98]"
            >
              Masuk
            </Link>
          )}
        </div>

        {user && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 sm:px-3 sm:text-sm"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        )}
      </nav>
    </header>
  );
}
