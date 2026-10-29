import { requireSupabase } from '@/config/supabase';
import type { Database } from '@/types/database.types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type ManagedUser = Pick<UserProfile, 'id' | 'full_name' | 'role'> & { email: string };

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await requireSupabase().functions.invoke('manage-member-accounts', { body: { action: 'list' } });
  if (error) throw error;
  return (data.users ?? []) as ManagedUser[];
}

export async function updateManagedUserEmail(userId: string, email: string): Promise<void> {
  const { error } = await requireSupabase().functions.invoke('manage-member-accounts', {
    body: { action: 'update_email', userId, email },
  });
  if (error) throw error;
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

/** Siswa yang pembayarannya sudah disetujui pada periode tersebut. */
export async function fetchPaidUserIds(periodId: string): Promise<Set<string>> {
  if (!periodId) return new Set();
  const { data, error } = await requireSupabase().from('cash_transactions')
    .select('user_id').eq('period_id', periodId).eq('type', 'income').eq('status', 'approved');
  if (error) throw error;
  return new Set((data ?? []).map(({ user_id }) => user_id));
}
