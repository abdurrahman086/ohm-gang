import { useQuery } from '@tanstack/react-query';
import { fetchCurrentPeriod, type CashPeriod } from '@/services/apiCash';
import { isSupabaseConfigured } from '@/config/supabase';

export function useCurrentPeriod() {
  return useQuery<CashPeriod | null>({
    queryKey: ['current-period'],
    queryFn: fetchCurrentPeriod,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}