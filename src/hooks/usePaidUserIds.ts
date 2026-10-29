import { useQuery } from '@tanstack/react-query';
import { fetchPaidUserIds } from '@/services/apiUsers';
import { isSupabaseConfigured } from '@/config/supabase';

// Set user id yang LUNAS untuk periode tertentu.
export function usePaidUserIds(periodId: string) {
  return useQuery<Set<string>>({
    queryKey: ['paid-users', periodId],
    queryFn: () => fetchPaidUserIds(periodId),
    enabled: isSupabaseConfigured && periodId.length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    select: (data) => new Set(data),
  });
}