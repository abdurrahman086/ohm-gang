import { Banknote, TrendingUp, TrendingDown, HeartPulse } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionTable } from '@/components/dashboard/TransactionTable';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/common/Loader';
import { useCashSummary } from '@/hooks/useCashSummary';
import { useTransactions } from '@/hooks/useTransactions';
import { useProfiles } from '@/hooks/useProfiles';
import { formatCurrency } from '@/utils/formatCurrency';

// Dashboard Ringkasan — data real Supabase (Fase 5).
export function Overview() {
  const { data: summary } = useCashSummary();
  const { data: txs, isLoading: loadingTx } = useTransactions();
  const { data: profiles } = useProfiles();

  const getName = (id: string) => profiles?.find((p) => p.id === id)?.full_name ?? '—';

  const healthVariant = summary?.healthStatus === 'healthy' ? 'healthy' : summary?.healthStatus === 'warning' ? 'warning' : 'critical';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary">Ringkasan Kas</h1>
          <p className="mt-1 text-sm text-textSecondary">Pantau kesehatan keuangan kelas</p>
        </div>
        {summary && <Badge variant={healthVariant}>
          <HeartPulse className="mr-1 h-3.5 w-3.5" />
          Kas: {summary.healthStatus}
        </Badge>}
      </div>

      {!summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Loader className="h-28" />
          <Loader className="h-28" />
          <Loader className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Total Saldo" value={formatCurrency(summary.balance)} icon={Banknote} />
          <StatCard title="Pemasukan" value={formatCurrency(summary.totalIncome)} icon={TrendingUp} tone="income" />
          <StatCard title="Pengeluaran" value={formatCurrency(summary.totalExpense)} icon={TrendingDown} tone="expense" />
        </div>
      )}

      <TransactionTable transactions={txs} getName={getName} isLoading={loadingTx} />
    </div>
  );
}