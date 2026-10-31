import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Landmark, FileText, LogOut, QrCode, Users, CalendarDays, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { can, type PermissionAction } from '@/config/permissions';

const menu: Array<{ to: string; label: string; icon: typeof LayoutDashboard; action: PermissionAction; end?: boolean }> = [
  { to: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard, action: 'viewDashboard', end: true },
  { to: '/dashboard/bayar', label: 'Bayar Kas', icon: Landmark, action: 'uploadPayment' },
  { to: '/dashboard/keuangan', label: 'Manajemen Kas', icon: Landmark, action: 'verifyPayments' },
  { to: '/dashboard/periode', label: 'Periode Kas', icon: CalendarDays, action: 'managePeriods' },
  { to: '/dashboard/pengajuan', label: 'Pengajuan Dana', icon: FileText, action: 'viewFundRequests' },
  { to: '/dashboard/bypass', label: 'Verifikasi Bypass', icon: ShieldCheck, action: 'verifyWaivers' },
  { to: '/dashboard/qris', label: 'Kelola QRIS', icon: QrCode, action: 'manageQris' },
  { to: '/dashboard/pengguna', label: 'Kelola Akun', icon: Users, action: 'manageUsers' },
];

export function Sidebar() {
  const { signOut, user, role, authReady } = useAuth();

  if (!authReady) {
    return (
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-100 bg-cardBg lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Loader className="h-6 w-32 rounded-lg" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          <Loader className="h-9 w-full rounded-xl" />
          <Loader className="h-9 w-full rounded-xl" />
          <Loader className="h-9 w-full rounded-xl" />
        </div>
      </aside>
    );
  }

  const visible = menu.filter((m) => can(role, m.action));

  return (
    <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-100 bg-cardBg lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-5 font-bold text-textPrimary">
          <LayoutDashboard className="h-5 w-5 text-primary-500" />
          Dashboard
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-textSecondary hover:bg-slate-50 hover:text-primary-600',
                  isActive && 'bg-primary-50 text-primary-600',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="mb-1 px-3 text-sm font-semibold text-textPrimary">{user?.full_name ?? 'Pengguna'}</div>
        <div className="mb-2 px-3 text-xs capitalize text-textSecondary">{role}</div>
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>

      <div className="shrink-0 px-5 pb-4">
        <Link to="/" className="text-xs text-textSecondary hover:text-primary-600">
          ← Kembali ke Beranda
        </Link>
      </div>
    </aside>
  );
}
