import { requireSupabase } from '@/config/supabase';
import type { Database } from '@/types/database.types';

export type PaymentWaiver = Database['public']['Tables']['cash_payment_waivers']['Row'];

export async function fetchWaivers(periodId?: string): Promise<PaymentWaiver[]> {
  let query = requireSupabase()
    .from('cash_payment_waivers')
    .select('*')
    .order('created_at', { ascending: false });

  if (periodId) query = query.eq('period_id', periodId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function requestPaymentWaiver(input: {
  userId: string;
  periodId: string;
  reason: string;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('request_payment_waiver', {
    p_user_id: input.userId,
    p_period_id: input.periodId,
    p_reason: input.reason,
  });
  if (error) throw error;
}

export async function verifyPaymentWaiver(input: {
  id: string;
  approve: boolean;
  reason?: string;
}): Promise<void> {
  const { error } = await requireSupabase().rpc('verify_payment_waiver', {
    p_waiver_id: input.id,
    p_approve: input.approve,
    p_reason: input.reason,
  });
  if (error) throw error;
}
