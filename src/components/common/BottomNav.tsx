import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Landmark, FileText, QrCode, Users, CreditCard, CalendarDays, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { can, type PermissionAction } from '@/config/permissions';

const menu: Array<{ to: string; label: string; icon: typeof LayoutDashboard; action: PermissionAction; end?: boolean }> = [
  { to: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard, action: 'viewDashboard', end: true },
  { to: '/dashboard/bayar', label: 'Bayar', icon: CreditCard, action: 'uploadPayment' },
  { to: '/dashboard/keuangan', label: 'Kas', icon: Landmark, action: 'verifyPayments' },
  { to: '/dashboard/periode', label: 'Periode', icon: CalendarDays, action: 'managePeriods' },
  { to: '/dashboard/pengguna', label: 'Akun', icon: Users, action: 'manageUsers' },
  { to: '/dashboard/pengajuan', label: 'Dana', icon: FileText, action: 'viewFundRequests' },
  { to: '/dashboard/bypass', label: 'Bypass', icon: ShieldCheck, action: 'verifyWaivers' },
  { to: '/dashboard/qris', label: 'QRIS', icon: QrCode, action: 'manageQris' },
];

export function BottomNav() {
  const { role } = useAuth();
  const visible = menu.filter((m) => can(role, m.action));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-20 overflow-x-auto border-t border-slate-100 bg-cardBg px-2 pb-safe lg:hidden">
      <div className="flex h-full min-w-max items-center gap-1">
        {visible.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) =>
              cn(
                'flex min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors',
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
