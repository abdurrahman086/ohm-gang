import { useQuery } from '@tanstack/react-query';
import { fetchPeriods, type CashPeriod } from '@/services/apiCash';
import { isSupabaseConfigured } from '@/config/supabase';

export function usePeriods() {
  return useQuery<CashPeriod[]>({
    queryKey: ['periods'],
    queryFn: fetchPeriods,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  });
}