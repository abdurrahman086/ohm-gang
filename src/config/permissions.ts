import type { Database } from '@/types/database.types';

export type Role = Database['public']['Enums']['user_role'];

// Matriks hak akses (PRD §3) — SATU sumber kebenaran untuk RBAC.
// Tambah action baru di sini, guard & sidebar otomatis ikut.
export type PermissionAction =
  | 'viewLanding' // semua
  | 'uploadPayment' // upload bukti bayar
  | 'viewOwnPaymentStatus' // lihat status kas pribadi
  | 'verifyPayments' // verifikasi/tolak pembayaran
  | 'requestWaiver' // ajukan bypass lunas (data lama)
  | 'verifyWaivers' // verifikasi bypass lunas
  | 'manageQris' // kelola QRIS
  | 'recordExpense' // catat pengeluaran
  | 'manageHealthIndicator' // kelola indikator kesehatan
  | 'approveFundSmall' // approve dana <= Rp100.000 (keuangan)
  | 'approveFundLarge' // approve dana > Rp100.000 (keuangan + wali kelas)
  | 'viewFundRequests' // lihat halaman pengajuan dana
  | 'manageUsers' // wali kelas membuat akun siswa
  | 'managePeriods' // kelola periode kas (tambah/ubah/hapus/aktif)
  | 'viewDashboard'; // masuk dashboard (semua pengurus)

const ROLE_ACTIONS: Record<PermissionAction, Role[]> = {
  viewLanding: ['member', 'keuangan', 'wali_kelas', 'developer'],
  uploadPayment: ['member'],
  viewOwnPaymentStatus: ['member'],
  verifyPayments: ['keuangan', 'wali_kelas', 'developer'],
  requestWaiver: ['keuangan', 'wali_kelas', 'developer'],
  verifyWaivers: ['wali_kelas', 'developer'],
  manageQris: ['keuangan', 'wali_kelas'],
  recordExpense: ['keuangan'],
  manageHealthIndicator: ['keuangan'],
  approveFundSmall: ['keuangan'],
  approveFundLarge: ['wali_kelas'],
  viewFundRequests: ['member', 'keuangan', 'wali_kelas'],
  manageUsers: ['wali_kelas'],
  managePeriods: ['keuangan', 'wali_kelas'],
  viewDashboard: ['member', 'keuangan', 'wali_kelas', 'developer'],
};

/** Cek apakah role bisa melakukan action (PRD §3 matriks RBAC). */
export function can(role: Role | null | undefined, action: PermissionAction): boolean {
  if (!role) return false;
  return ROLE_ACTIONS[action].includes(role);
}

/** Daftar action yang bisa dipakai role — untuk filter menu sidebar. */
export function actionsFor(role: Role | null | undefined): PermissionAction[] {
  if (!role) return [];
  return (Object.keys(ROLE_ACTIONS) as PermissionAction[]).filter((a) => ROLE_ACTIONS[a].includes(role));
}
