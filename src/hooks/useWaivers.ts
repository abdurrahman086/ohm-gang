import { useQuery } from '@tanstack/react-query';
import { fetchWaivers, type PaymentWaiver } from '@/services/apiWaivers';
import { isSupabaseConfigured } from '@/config/supabase';

// Bypass lunas untuk periode tertentu; tanpa periodId = semua periode.
export function useWaivers(periodId?: string, enabled = true) {
  return useQuery<PaymentWaiver[]>({
    queryKey: ['waivers', periodId ?? 'all'],
    queryFn: () => fetchWaivers(periodId),
    enabled: isSupabaseConfigured && enabled,
    staleTime: 0,
    gcTime: 0,
  });
}
