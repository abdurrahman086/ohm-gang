import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatCurrency';

interface MonthlyData {
  monthIndex: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function SaldoTrendChart({ data }: { data: MonthlyData[] | undefined }) {
  if (!data || data.length === 0) {
    return <div className="flex h-80 items-center justify-center text-textSecondary">No data</div>;
  }

  const chartData = data.map(m => ({
    month: `${MONTH_NAMES[m.monthIndex]} ${m.year}`,
    Saldo: m.balance,
  }));

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6">
      <h3 className="mb-4 font-semibold text-textPrimary">Tren Saldo</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
          <Tooltip
            formatter={(value) => formatCurrency(value as number)}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
          />
          <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
