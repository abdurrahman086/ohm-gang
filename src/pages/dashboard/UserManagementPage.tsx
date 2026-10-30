import { CreateMemberPage } from '@/pages/dashboard/CreateMemberPage';
import { ManageUsersPage } from '@/pages/dashboard/ManageUsersPage';

export function UserManagementPage() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Buat akun siswa */}
      <CreateMemberPage />

      {/* Kelola akun yang sudah ada */}
      <ManageUsersPage />
    </div>
  );
}
