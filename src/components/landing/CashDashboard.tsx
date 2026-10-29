import { useCashSummary } from '@/hooks/useCashSummary';
import { useCashMonthly } from '@/hooks/useCashMonthly';
import { StatCard } from '@/components/dashboard/StatCard';
import { IncomeExpenseChart } from './IncomeExpenseChart';
import { SaldoTrendChart } from './SaldoTrendChart';
import { RecentTransactions } from './RecentTransactions';
import { Banknote, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function CashDashboard() {
  const { data: summary } = useCashSummary();
  const { monthly, recent } = useCashMonthly();
  const { user } = useAuth();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-textPrimary">Dashboard Keuangan Kelas</h2>
        <p className="mt-1 text-textSecondary">Pantau transparansi kas real-time</p>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Saldo Kas" value={formatCurrency(summary.balance)} icon={Banknote} />
          <StatCard title="Pemasukan" value={formatCurrency(summary.totalIncome)} icon={TrendingUp} tone="income" />
          <StatCard title="Pengeluaran" value={formatCurrency(summary.totalExpense)} icon={TrendingDown} tone="expense" />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <IncomeExpenseChart data={monthly.data} />
        <SaldoTrendChart data={monthly.data} />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions data={recent.data} />

      {/* CTA */}
      {user && (
        <div className="flex justify-center">
          <Link
            to="/dashboard"
            className="inline-flex rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Lihat Detail di Dashboard →
          </Link>
        </div>
      )}
    </section>
  );
}
