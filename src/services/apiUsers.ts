import { requireSupabase } from '@/config/supabase';
import type { Database } from '@/types/database.types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type ManagedUser = Pick<UserProfile, 'id' | 'full_name' | 'role'> & {
  email: string;
  phone_number: string | null;
};

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await requireSupabase().functions.invoke('manage-member-accounts', { body: { action: 'list' } });
  if (error) throw error;
  return (data.users ?? []) as ManagedUser[];
}

export async function updateManagedUser(userId: string, updates: Pick<ManagedUser, 'email' | 'full_name' | 'phone_number'>): Promise<void> {
  const { error } = await requireSupabase().functions.invoke('manage-member-accounts', {
    body: {
      action: 'update_profile',
      userId,
      email: updates.email,
      fullName: updates.full_name,
      phoneNumber: updates.phone_number,
    },
  });
  if (error) {
    const context = 'context' in error ? error.context : null;
    if (context instanceof Response) {
      let message = '';
      try {
        const body = await context.clone().json() as { error?: unknown };
        if (typeof body.error === 'string') message = body.error;
      } catch { /* Fall back to Supabase's function error. */ }
      if (message) throw new Error(message);
    }
    throw error;
  }
}

export async function sendPasswordRecovery(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function fetchProfiles(): Promise<UserProfile[]> {
  const { data, error } = await requireSupabase().from('profiles')
    .select('id,full_name,avatar_url,role,created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((profile) => ({ ...profile, bio: null, interests: null, achievements: null, student_id_number: null, phone_number: null })) as UserProfile[];
}

/** Siswa lunas: pembayaran approved + bypass approved. */
export async function fetchPaidUserIds(periodId: string): Promise<Set<string>> {
  if (!periodId) return new Set();
  const sb = requireSupabase();
  const [payments, waivers] = await Promise.all([
    sb.from('cash_transactions')
      .select('user_id').eq('period_id', periodId).eq('type', 'income').eq('status', 'approved'),
    sb.from('cash_payment_waivers')
      .select('user_id').eq('period_id', periodId).eq('status', 'approved'),
  ]);
  if (payments.error) throw payments.error;
  if (waivers.error) throw waivers.error;
  return new Set([
    ...(payments.data ?? []).map(({ user_id }) => user_id),
    ...(waivers.data ?? []).map(({ user_id }) => user_id),
  ]);
}
