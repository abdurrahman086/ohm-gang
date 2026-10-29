import { requireSupabase } from '@/config/supabase';
import type { Database } from '@/types/database.types';
import type { Role } from '@/config/permissions';

export type FundRequest = Database['public']['Tables']['fund_requests']['Row'];

/** Threshold PRD §4.2.D: > Rp100.000 butuh Wali Kelas + Bagian Keuangan. */
export const FUND_LARGE_THRESHOLD = 100_000;

/** Semua pengajuan dana (RLS: authenticated bisa baca semua — transparansi). */
export async function fetchFundRequests(): Promise<FundRequest[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('fund_requests').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Ajukan dana/reimbursement (requester = auth.uid(), dipaksa RLS). */
export async function createFundRequest(input: {
  requesterId: string;
  title: string;
  description: string;
  amount: number;
}): Promise<FundRequest> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('fund_requests')
    .insert({
      requester_id: input.requesterId,
      title: input.title,
      description: input.description,
      amount: input.amount,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Approval 2 tingkat (PRD §4.2.D):
 * - <= Rp100.000 → cukup Bagian Keuangan (approved_by_keuangan).
 * - > Rp100.000  → Wali Kelas DAN Bagian Keuangan.
 * Status jadi 'approved' hanya saat semua approver wajib terisi.
 */
export async function approveFundRequest(input: { id: string; role: Role }): Promise<void> {
  const sb = requireSupabase();
  if (!['keuangan', 'wali_kelas', 'developer'].includes(input.role)) {
    throw new Error('Role tidak berhak menyetujui.');
  }
  const { error } = await sb.rpc('approve_fund_request', { p_request_id: input.id });
  if (error) throw error;
}

/** Tolak pengajuan (officer mana pun). */
export async function rejectFundRequest(id: string, reason: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('reject_fund_request', { p_request_id: id, p_reason: reason });
  if (error) throw error;
}
