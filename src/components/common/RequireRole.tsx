import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { can, type PermissionAction } from '@/config/permissions';
import { Loader } from '@/components/common/Loader';

interface RequireRoleProps {
  action: PermissionAction;
  children: ReactNode;
}

/**
 * Guard rute per role (PRD §3). "from" disimpan agar login bisa redirect balik.
 * Belum login  → /login. Login tapi tidak punya akses → halaman "tidak berhak".
 */
export function RequireRole({ action, children }: RequireRoleProps) {
  const { user, role, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex justify-center py-24">
        <Loader className="h-40 w-64" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!can(role, action)) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-5xl">🙅</p>
        <h1 className="mt-4 text-xl font-bold text-textPrimary">Tidak Berhak</h1>
        <p className="mt-2 text-sm text-textSecondary">
          Role <span className="font-semibold">{role}</span> tidak punya akses ke halaman ini.
        </p>
      </div>
    );
  }

  return children;
}