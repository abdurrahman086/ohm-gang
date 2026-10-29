import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { PaymentPage } from '@/pages/PaymentPage';
import { Overview } from '@/pages/dashboard/Overview';
import { FinanceManager } from '@/pages/dashboard/FinanceManager';
import { PeriodManager } from '@/pages/dashboard/PeriodManager';
import { FundRequests } from '@/pages/dashboard/FundRequests';
import { QrisSettings } from '@/pages/dashboard/QrisSettings';
import { CreateMemberPage } from '@/pages/dashboard/CreateMemberPage';
import { ManageUsersPage } from '@/pages/dashboard/ManageUsersPage';
import { PasswordResetPage } from '@/pages/PasswordResetPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { InstallPWA } from '@/components/pwa/InstallPWA';
import { ReloadPrompt } from '@/components/pwa/ReloadPrompt';
import { RealtimeCashSync } from '@/components/common/RealtimeCashSync';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>

        <Route path="reset-password" element={<PasswordResetPage />} />

        <Route path="dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="bayar" element={<PaymentPage />} />
          <Route path="keuangan" element={<FinanceManager />} />
          <Route path="periode" element={<PeriodManager />} />
          <Route path="pengajuan" element={<FundRequests />} />
          <Route path="qris" element={<QrisSettings />} />
          <Route path="pengguna-baru" element={<CreateMemberPage />} />
          <Route path="pengguna" element={<ManageUsersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Komponen global PWA */}
      <InstallPWA />
      <ReloadPrompt />
      <RealtimeCashSync />
    </BrowserRouter>
  );
}
