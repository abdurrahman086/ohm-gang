import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/common/Sidebar';
import { BottomNav } from '@/components/common/BottomNav';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';

// Layout terautentikasi: sidebar sticky di desktop, bottom nav fixed di mobile.
// Guard di sini hanya cek "sudah login atau belum" (bukan per-role), jadi tidak
// memblokir navigasi antar halaman seperti guard role sebelumnya.
export function DashboardLayout() {
  const { user, authReady } = useAuth();

  if (!authReady && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bgCanvas">
        <Loader className="h-40 w-64" />
      </div>
    );
  }

  if (authReady && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-bgCanvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
