import { useMemo, useState } from 'react';
import { FileDown, FileText, RotateCcw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/common/Loader';
import { formatCurrency } from '@/utils/formatCurrency';
import { exportCSV, exportPDF, mapRow } from '@/utils/exportReport';
import type { CashTransactionView } from '@/services/apiCash';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'healthy' | 'warning' | 'critical' | 'outline' | 'secondary'> = {
  approved: 'healthy',
  pending: 'warning',
  rejected: 'critical',
};

const METHOD_LABEL: Record<string, string> = {
  transfer: 'Transfer',
  qris: 'QRIS',
  cash: 'Tunai',
  e_wallet: 'E-Wallet',
};

interface Props {
  transactions: CashTransactionView[] | undefined;
  getName: (userId: string) => string;
  isLoading?: boolean;
}

// Buku kas digital (PRD §4.2.B): filter tanggal/status/tipe + ekspor PDF & Excel/CSV.
export function TransactionTable({ transactions, getName, isLoading }: Props) {
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const list = transactions ?? [];
    const fromT = from ? new Date(from).getTime() : null;
    const toT = to ? new Date(to).getTime() + 86_400_000 : null;
    const q = query.trim().toLowerCase();

    return list.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (type !== 'all' && t.type !== type) return false;
      const ts = new Date(t.created_at).getTime();
      if (fromT && ts < fromT) return false;
      if (toT && ts > toT) return false;
      if (q) {
        const nama = getName(t.user_id).toLowerCase();
        const note = (t.note ?? '').toLowerCase();
        if (!nama.includes(q) && !note.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, status, type, from, to, query, getName]);

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const hasFilter = status !== 'all' || type !== 'all' || from || to || query;

  const handleExport = (pdf: boolean) => {
    const rowsForExport = rows.map((r) => mapRow(r, getName(r.user_id)));
    if (pdf) exportPDF(rowsForExport, 'Laporan Kas Kelas', `laporan-kas-${new Date().toISOString().slice(0, 10)}.pdf`);
    else exportCSV(rowsForExport, `laporan-kas-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const selectCls =
    'h-9 rounded-xl border border-slate-200 bg-bgCanvas px-3 text-sm outline-none focus:border-primary-500';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Buku Kas Digital</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleExport(false)} disabled={rows.length === 0}>
            <FileDown className="h-4 w-4" /> Excel/CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleExport(true)} disabled={rows.length === 0}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama / keterangan…"
              className="h-9 w-48 rounded-xl border border-slate-200 bg-bgCanvas pl-9 pr-3 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
            <option value="all">Semua status</option>
            <option value="approved">Disetujui</option>
            <option value="pending">Menunggu</option>
            <option value="rejected">Ditolak</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
            <option value="all">Semua tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} aria-label="Dari tanggal" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} aria-label="Sampai tanggal" />
          {hasFilter && (
            <Button size="sm" variant="outline" onClick={() => { setStatus('all'); setType('all'); setFrom(''); setTo(''); setQuery(''); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        {/* Tabel */}
        {isLoading ? (
          <Loader className="h-48" />
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
            Tidak ada transaksi.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase text-textSecondary">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Nominal</th>
                  <th className="px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-textSecondary">
                      {new Date(t.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 font-medium text-textPrimary">{getName(t.user_id)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('font-medium', t.type === 'income' ? 'text-emerald-600' : 'text-amber-600')}>
                        {t.type === 'income' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-textSecondary">{METHOD_LABEL[t.method] ?? t.method}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[t.status] ?? 'outline'} className="capitalize">{t.status}</Badge>
                    </td>
                    <td className="tabular-nums whitespace-nowrap px-4 py-3 text-right font-semibold text-textPrimary">
                      {formatCurrency(Number(t.amount))}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-textSecondary">{t.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-textSecondary">{rows.length} transaksi</span>
          <span className="font-semibold text-textPrimary">
            Total: <span className="tabular-nums text-primary-600">{formatCurrency(total)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
