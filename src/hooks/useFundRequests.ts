import { useQuery } from '@tanstack/react-query';
import { fetchFundRequests, type FundRequest } from '@/services/apiFunds';
import { isSupabaseConfigured } from '@/config/supabase';

export function useFundRequests() {
  return useQuery<FundRequest[]>({
    queryKey: ['fund-requests'],
    queryFn: fetchFundRequests,
    enabled: isSupabaseConfigured,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
}