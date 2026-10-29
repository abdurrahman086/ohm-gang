import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Landmark, FileText, QrCode, UserPlus, Users, CreditCard, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { can, type PermissionAction } from '@/config/permissions';

const menu: Array<{ to: string; label: string; icon: typeof LayoutDashboard; action: PermissionAction; end?: boolean }> = [
  { to: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard, action: 'viewDashboard', end: true },
  { to: '/dashboard/bayar', label: 'Bayar', icon: CreditCard, action: 'uploadPayment' },
  { to: '/dashboard/keuangan', label: 'Kas', icon: Landmark, action: 'verifyPayments' },
  { to: '/dashboard/periode', label: 'Periode', icon: CalendarDays, action: 'managePeriods' },
  { to: '/dashboard/pengajuan', label: 'Dana', icon: FileText, action: 'viewFundRequests' },
  { to: '/dashboard/qris', label: 'QRIS', icon: QrCode, action: 'manageQris' },
  { to: '/dashboard/pengguna-baru', label: 'Akun', icon: UserPlus, action: 'manageUsers' },
  { to: '/dashboard/pengguna', label: 'Kelola', icon: Users, action: 'manageUsers' },
];

export function BottomNav() {
  const { role } = useAuth();
  const visible = menu.filter((m) => can(role, m.action));

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex h-20 items-center justify-between border-t border-slate-100 bg-cardBg px-2 pb-safe lg:hidden">
      <div className="flex flex-1 justify-between gap-1">
        {visible.slice(0, 6).map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 px-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-textSecondary hover:bg-slate-50'
              )
            }
          >
            <m.icon className="h-5 w-5" />
            <span className="line-clamp-1">{m.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
