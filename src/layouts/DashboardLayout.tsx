import { Outlet, Link } from 'react-router-dom';
import { LogOut, Zap } from 'lucide-react';
import { Sidebar } from '@/components/common/Sidebar';
import { BottomNav } from '@/components/common/BottomNav';
import { useAuth } from '@/hooks/useAuth';

// Layout terautentikasi untuk role pengurus (Fase 3: guard per role).
export function DashboardLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-bgCanvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar khusus mobile: sidebar disembunyikan di bawah lg */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-100 bg-cardBg px-4 lg:hidden">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-textPrimary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white">
              <Zap className="h-4 w-4" />
            </span>
            OHM-Gang
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
