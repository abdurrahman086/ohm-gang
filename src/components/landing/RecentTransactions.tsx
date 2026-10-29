import { formatCurrency } from '@/utils/formatCurrency';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RecentTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: string;
  created_at: string;
  note?: string;
}

export function RecentTransactions({ data }: { data: RecentTransaction[] | undefined }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-textSecondary">No transactions</div>;
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6">
      <h3 className="mb-4 font-semibold text-textPrimary">Transaksi Terakhir</h3>
      <div className="space-y-3">
        {data.map(txn => (
          <div key={txn.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${txn.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
                {txn.type === 'income' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-textPrimary capitalize">{txn.type}</p>
                <p className="text-xs text-textSecondary">{txn.method}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
              </p>
              <p className={`text-xs ${txn.status === 'approved' ? 'text-green-600' : txn.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                {txn.status === 'approved' ? 'Disetujui' : txn.status === 'pending' ? 'Menunggu' : 'Ditolak'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
