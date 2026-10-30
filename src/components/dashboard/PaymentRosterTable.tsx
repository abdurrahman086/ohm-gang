import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileDown, FileText, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog, type ConfirmTone } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { useTransactions } from '@/hooks/useTransactions';
import { useWaivers } from '@/hooks/useWaivers';
import { requestPaymentWaiver, type PaymentWaiver } from '@/services/apiWaivers';
import type { CashPeriod, CashTransactionView } from '@/services/apiCash';
import type { UserProfile } from '@/services/apiUsers';
import { exportPaymentCSV, exportPaymentPDF, type PaymentReportRow } from '@/utils/exportReport';
import { formatCurrency } from '@/utils/formatCurrency';

type RosterStatus = 'paid' | 'bypass' | 'pending' | 'unpaid';

interface RosterRow {
  profile: UserProfile;
  status: RosterStatus;
  tx?: CashTransactionView;
  waiver?: PaymentWaiver;
  pendingLabel?: string;
}

interface Props {
  periodId: string;
  periods: CashPeriod[];
  profiles: UserProfile[];
  onPeriodChange: (periodId: string) => void;
  getName: (userId: string) => string;
  canRequestWaiver: boolean;
}

const METHOD_LABEL: Record<string, string> = {
  transfer: 'Transfer',
  qris: 'QRIS',
  cash: 'Tunai',
  e_wallet: 'E-Wallet',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID');
}

function statusLabel(row: RosterRow) {
  if (row.status === 'paid') return 'Lunas';
  if (row.status === 'bypass') return 'Lunas (Bypass)';
  if (row.status === 'pending') return row.pendingLabel ?? 'Menunggu';
  return 'Belum';
}

function ticketNote(row: RosterRow, getName: (userId: string) => string) {
  if (row.status === 'bypass' && row.waiver) {
    return `Bypass · ${row.waiver.approved_by ? getName(row.waiver.approved_by) : '—'}: ${row.waiver.reason}`;
  }
  if (row.status === 'pending' && row.waiver) {
    return `Diajukan ${getName(row.waiver.requested_by)}: ${row.waiver.reason}`;
  }
  if (row.tx?.note) return row.tx.note;
  if (row.waiver?.rejection_reason) return `Bypass ditolak: ${row.waiver.rejection_reason}`;
  return '—';
}

// Daftar pembayaran per periode (pengganti buku kas di menu Manajemen Kas).
export function PaymentRosterTable({ periodId, periods, profiles, onPeriodChange, getName, canRequestWaiver }: Props) {
  const queryClient = useQueryClient();
  const { data: transactions, isLoading: loadingTx } = useTransactions(periodId ? { periodId } : {}, Boolean(periodId));
  const { data: waivers, isLoading: loadingWaivers } = useWaivers(periodId || undefined, Boolean(periodId));

  const [status, setStatus] = useState<'all' | 'paid' | 'pending' | 'unpaid'>('all');
  const [query, setQuery] = useState('');
  const [requestTarget, setRequestTarget] = useState<UserProfile | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; description: string; tone: ConfirmTone } | null>(null);

  const period = periods.find((item) => item.id === periodId);

  const rows = useMemo<RosterRow[]>(() => {
    const list = profiles.filter((profile) => profile.role === 'member');
    const txList = transactions ?? [];
    const waiverList = waivers ?? [];

    return list.map((profile) => {
      const ownTx = txList.filter((tx) => tx.user_id === profile.id && tx.type === 'income');
      const ownWaivers = waiverList.filter((waiver) => waiver.user_id === profile.id);

      const approvedTx = ownTx.find((tx) => tx.status === 'approved');
      if (approvedTx) return { profile, status: 'paid', tx: approvedTx };

      const approvedWaiver = ownWaivers.find((waiver) => waiver.status === 'approved');
      if (approvedWaiver) return { profile, status: 'bypass', waiver: approvedWaiver };

      const pendingTx = ownTx.find((tx) => tx.status === 'pending');
      if (pendingTx) return { profile, status: 'pending', tx: pendingTx, pendingLabel: 'Menunggu Verifikasi' };

      const pendingWaiver = ownWaivers.find((waiver) => waiver.status === 'pending');
      if (pendingWaiver) return { profile, status: 'pending', waiver: pendingWaiver, pendingLabel: 'Menunggu Wali Kelas' };

      return {
        profile,
        status: 'unpaid',
        tx: ownTx.find((tx) => tx.status === 'rejected'),
        waiver: ownWaivers.find((waiver) => waiver.status === 'rejected'),
      };
    });
  }, [profiles, transactions, waivers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === 'paid' && row.status !== 'paid' && row.status !== 'bypass') return false;
      if (status === 'pending' && row.status !== 'pending') return false;
      if (status === 'unpaid' && row.status !== 'unpaid') return false;
      if (q && !row.profile.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, status, query]);

  const paidRows = rows.filter((row) => row.status === 'paid' || row.status === 'bypass');
  const collected = rows.reduce((sum, row) => sum + (row.status === 'paid' && row.tx ? Number(row.tx.amount) : 0), 0);

  const handleExport = (pdf: boolean) => {
    const periodTitle = period?.title ?? 'Periode';
    const reportRows: PaymentReportRow[] = filtered.map((row) => ({
      nama: row.profile.full_name,
      periode: periodTitle,
      status: statusLabel(row),
      tagihan: Number(period?.amount ?? 0),
      nominal: row.status === 'paid' && row.tx ? Number(row.tx.amount) : 0,
      metode: row.tx ? (METHOD_LABEL[row.tx.method] ?? row.tx.method) : '—',
      tanggal: row.tx ? formatDate(row.tx.created_at) : row.waiver ? formatDate(row.waiver.updated_at) : '—',
      keterangan: ticketNote(row, getName),
    }));
    const date = new Date().toISOString().slice(0, 10);
    if (pdf) exportPaymentPDF(reportRows, `Daftar Pembayaran · ${periodTitle}`, `pembayaran-kas-${date}.pdf`);
    else exportPaymentCSV(reportRows, `pembayaran-kas-${date}.csv`);
  };

  const handleRequest = async (reason: string) => {
    if (!requestTarget || !periodId) return;
    setRequestBusy(true);
    try {
      await requestPaymentWaiver({ userId: requestTarget.id, periodId, reason: reason.trim() });
      setRequestTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['waivers'] });
      void queryClient.invalidateQueries({ queryKey: ['paid-users'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
    } catch (error) {
      setRequestTarget(null);
      setNotice({
        title: 'Gagal mengajukan bypass',
        description: error instanceof Error ? error.message : 'Bypass tidak dapat diajukan.',
        tone: 'danger',
      });
    } finally {
      setRequestBusy(false);
    }
  };

  const selectCls =
    'h-9 rounded-xl border border-slate-200 bg-bgCanvas px-3 text-sm outline-none focus:border-primary-500';
  const hasFilter = status !== 'all' || query;

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Daftar Pembayaran</CardTitle>
          <CardDescription>
            {period ? `${period.title} · ` : ''}
            {paidRows.length}/{rows.length} lunas · {formatCurrency(collected)} terkumpul
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={periodId} onChange={(e) => onPeriodChange(e.target.value)} className={selectCls} aria-label="Pilih periode">
            {periods.length === 0 && <option value="">Belum ada periode</option>}
            {periods.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => handleExport(false)} disabled={filtered.length === 0}>
            <FileDown className="h-4 w-4" /> Excel/CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleExport(true)} disabled={filtered.length === 0}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama siswa…"
              className="h-9 w-48 rounded-xl border border-slate-200 bg-bgCanvas pl-9 pr-3 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectCls}>
            <option value="all">Semua status</option>
            <option value="paid">Lunas</option>
            <option value="pending">Menunggu</option>
            <option value="unpaid">Belum bayar</option>
          </select>
          {hasFilter && (
            <Button size="sm" variant="outline" onClick={() => { setStatus('all'); setQuery(''); }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        {!periodId ? (
          <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
            Pilih periode untuk melihat daftar pembayaran.
          </div>
        ) : loadingTx || loadingWaivers ? (
          <Loader className="h-48" />
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
            Tidak ada siswa yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase text-textSecondary">
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3 text-right">Dibayar</th>
                  <th className="px-4 py-3">Keterangan</th>
                  {canRequestWaiver && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.profile.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[180px] truncate px-4 py-3 font-medium text-textPrimary">{row.profile.full_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === 'paid' || row.status === 'bypass' ? 'healthy' : row.status === 'pending' ? 'warning' : 'outline'}>
                        {statusLabel(row)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-textSecondary">
                      {row.tx ? (METHOD_LABEL[row.tx.method] ?? row.tx.method) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-textSecondary">
                      {row.tx ? formatDate(row.tx.created_at) : row.waiver ? formatDate(row.waiver.updated_at) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-textPrimary">
                      {row.status === 'paid' && row.tx ? formatCurrency(Number(row.tx.amount)) : '—'}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-textSecondary">{ticketNote(row, getName)}</td>
                    {canRequestWaiver && (
                      <td className="px-4 py-3 text-right">
                        {row.status === 'unpaid' && periodId ? (
                          <Button size="sm" variant="outline" onClick={() => setRequestTarget(row.profile)}>
                            <ShieldCheck className="h-4 w-4" /> Ajukan Bypass
                          </Button>
                        ) : (
                          <span className="text-xs text-textSecondary">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-textSecondary">{filtered.length} siswa</span>
          <span className="font-semibold text-textPrimary">
            Terkumpul: <span className="tabular-nums text-primary-600">{formatCurrency(collected)}</span>
          </span>
        </div>
      </CardContent>

      <ConfirmDialog
        open={requestTarget !== null}
        tone="primary"
        title="Ajukan bypass lunas?"
        description={
          requestTarget ? (
            <>
              <span className="font-semibold text-textPrimary">{requestTarget.full_name}</span> akan ditandai lunas
              untuk <span className="font-semibold text-textPrimary">{period?.title ?? 'periode ini'}</span> tanpa
              menambah saldo kas. Bypass harus disetujui wali kelas.
            </>
          ) : null
        }
        inputLabel="Alasan bypass"
        inputPlaceholder="Contoh: pembayaran sudah tercatat di rilis sebelumnya"
        inputRequired
        confirmLabel="Ajukan ke Wali Kelas"
        busy={requestBusy}
        onClose={() => setRequestTarget(null)}
        onConfirm={(reason) => void handleRequest(reason)}
      />

      <ConfirmDialog
        open={notice !== null}
        tone={notice?.tone ?? 'danger'}
        title={notice?.title ?? ''}
        description={notice?.description}
        cancelLabel={null}
        confirmLabel="Mengerti"
        onClose={() => setNotice(null)}
        onConfirm={() => setNotice(null)}
      />
    </Card>
  );
}
