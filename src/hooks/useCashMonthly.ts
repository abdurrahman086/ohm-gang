import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

interface MonthlyData {
  monthIndex: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

interface RecentTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: string;
  created_at: string;
  note?: string;
}

export function useCashMonthly() {
  const monthly = useQuery({
    queryKey: ['cashMonthly'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc('get_cash_monthly_summary' as any);
      if (error) throw error;
      return (data || []) as MonthlyData[];
    },
    staleTime: 30_000,
    enabled: !!supabase,
  });

  const recent = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc('get_recent_transactions' as any, { limit_count: 5 });
      if (error) throw error;
      return (data || []) as RecentTransaction[];
    },
    staleTime: 30_000,
    enabled: !!supabase,
  });

  return { monthly, recent };
}
