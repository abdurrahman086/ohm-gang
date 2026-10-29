import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, type TransactionFilters, type CashTransactionView } from '@/services/apiCash';
import { isSupabaseConfigured } from '@/config/supabase';

// Transaksi kas untuk dashboard & landing.
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<CashTransactionView[]>({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
    enabled: isSupabaseConfigured,
    staleTime: 0,
    gcTime: 0,
  });
}
