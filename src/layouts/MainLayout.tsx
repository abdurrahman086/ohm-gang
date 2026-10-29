import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

// Layout publik (landing, login, payment).
export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bgCanvas">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}