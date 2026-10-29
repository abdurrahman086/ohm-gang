import { useQuery } from '@tanstack/react-query';
import { fetchCashSummary, type CashSummary } from '@/services/apiCash';
import { isSupabaseConfigured } from '@/config/supabase';

// Ringkasan kas + health (Fase 6: realtime subscription menyusul).
export function useCashSummary() {
  return useQuery<CashSummary>({
    queryKey: ['cash-summary'],
    queryFn: fetchCashSummary,
    enabled: isSupabaseConfigured,
    staleTime: 0,
    gcTime: 0,
  });
}