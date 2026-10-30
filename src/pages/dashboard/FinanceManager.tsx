import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Eye,
  PlusCircle,
  Loader2,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog, type ConfirmTone } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { ProofModal } from '@/components/dashboard/ProofModal';
import { PaymentRosterTable } from '@/components/dashboard/PaymentRosterTable';
import { useAuth } from '@/hooks/useAuth';
import { can } from '@/config/permissions';
import { useProfiles } from '@/hooks/useProfiles';
import { useTransactions } from '@/hooks/useTransactions';
import { usePeriods } from '@/hooks/usePeriods';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { usePaidUserIds } from '@/hooks/usePaidUserIds';
import { createExpense, getTransactionProofPath, recordCashPayment, verifyTransaction } from '@/services/apiCash';
import { formatCurrency } from '@/utils/formatCurrency';
import type { CashTransactionView } from '@/services/apiCash';
import type { PaymentMethod } from '@/types/aliases';
import { cn } from '@/lib/utils';

// Manajemen Kas (PRD §4.2): verifikasi PENDING, catat pengeluaran, tunggakan, buku kas.
export function FinanceManager() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [cashUserId, setCashUserId] = useState('');
  const [cashPeriodId, setCashPeriodId] = useState('');
  const { data: profiles } = useProfiles();
  const { data: periods } = usePeriods();
  const { data: currentPeriod } = useCurrentPeriod();
  const selectedPeriodId = cashPeriodId || currentPeriod?.id || '';
  const { data: paidIds } = usePaidUserIds(selectedPeriodId);
  const { data: pending, isLoading: loadingPending } = useTransactions({ status: 'pending' });

  const [proofPath, setProofPath] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CashTransactionView | null>(null);
  const [notice, setNotice] = useState<{ title: string; description: string; tone: ConfirmTone } | null>(null);

  const [amount, setAmount] = useState('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [expBusy, setExpBusy] = useState(false);
  const [cashBusy, setCashBusy] = useState(false);

  // Pemasukan lainnya
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeMethod, setIncomeMethod] = useState<PaymentMethod>('cash');
  const [incomeNote, setIncomeNote] = useState('');
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [incomeBusy, setIncomeBusy] = useState(false);

  const getName = (id: string) => profiles?.find((p) => p.id === id)?.full_name ?? '—';
  const getPeriod = (id: string | null) => periods?.find((p) => p.id === id)?.title;

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['paid-users'] });
  };

  const handleVerify = async (t: CashTransactionView, status: 'approved' | 'rejected', reason?: string) => {
    if (!user) return;
    setBusyId(t.id);
    try {
      await verifyTransaction({ id: t.id, status, verifiedBy: user.id, reason });
      setRejectTarget(null);
      invalidateAll();
    } catch (e) {
      setRejectTarget(null);
      setNotice({
        title: 'Gagal memverifikasi',
        description: e instanceof Error ? e.message : 'Gagal memverifikasi pembayaran.',
        tone: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleExpense = async (e: FormEvent) => {
    e.preventDefault();
    setExpError(null);
    if (!user) return;
    const val = Number(amount);
    if (!val || val <= 0) {
      setExpError('Nominal tidak valid.');
      return;
    }
    setExpBusy(true);
    try {
      await createExpense({ userId: user.id, amount: val, method: expMethod, note: note || undefined });
      setAmount('');
      setNote('');
      invalidateAll();
    } catch (err) {
      setExpError(err instanceof Error ? err.message : 'Gagal mencatat pengeluaran.');
    } finally {
      setExpBusy(false);
    }
  };

  const handleIncome = async (e: FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    if (!user) return;
    const val = Number(incomeAmount);
    if (!val || val <= 0) {
      setIncomeError('Nominal tidak valid.');
      return;
    }
    setIncomeBusy(true);
    try {
      const { createIncome } = await import('@/services/apiCash');
      await createIncome({ userId: user.id, amount: val, method: incomeMethod, note: incomeNote || undefined });
      setIncomeAmount('');
      setIncomeNote('');
      invalidateAll();
    } catch (err) {
      setIncomeError(err instanceof Error ? err.message : 'Gagal mencatat pemasukan.');
    } finally {
      setIncomeBusy(false);
    }
  };

  const handleCashPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const period = periods?.find((item) => item.id === cashPeriodId) ?? currentPeriod;
    if (!cashUserId || !period) return;
    if (paidIds?.has(cashUserId)) {
      setNotice({
        title: 'Sudah lunas',
        description: 'Siswa ini sudah tercatat lunas pada periode tersebut.',
        tone: 'warning',
      });
      return;
    }
    if (pending?.some((tx) => tx.user_id === cashUserId && tx.period_id === period.id && tx.type === 'income')) {
      setNotice({
        title: 'Masih ada pembayaran menunggu',
        description: 'Selesaikan verifikasi QRIS yang masih menunggu sebelum mencatat pembayaran tunai.',
        tone: 'warning',
      });
      return;
    }
    setCashBusy(true);
    try {
      await recordCashPayment({ userId: cashUserId, periodId: period.id, amount: Number(period.amount), recordedBy: user.id });
      setCashUserId('');
      invalidateAll();
    } catch (error) {
      setNotice({
        title: 'Gagal mencatat pembayaran tunai',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mencatat pembayaran.',
        tone: 'danger',
      });
    } finally {
      setCashBusy(false);
    }
  };

  // Tunggakan periode aktif
  const tunggakan = (profiles ?? []).filter(
    (p) => p.role === 'member' && currentPeriod && !paidIds?.has(p.id),
  );

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
  const labelCls = 'mb-1.5 block text-sm font-medium text-textSecondary';
  const methodLabel: Record<string, string> = { qris: 'QRIS', cash: 'Tunai' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Manajemen Kas</h1>
        <p className="mt-1 text-sm text-textSecondary">Verifikasi pembayaran, catat pengeluaran, pantau tunggakan.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Main content kiri: Verifikasi + Buku Kas */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          {/* Verifikasi */}
          <Card>
            <CardHeader>
              <CardTitle>Verifikasi Pembayaran</CardTitle>
              <CardDescription>Transaksi menunggu konfirmasi ({pending?.length ?? 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <Loader className="h-40" />
              ) : !pending || pending.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
                  Tidak ada pembayaran menunggu verifikasi. 🎉
                </div>
              ) : (
                <ul className="space-y-3">
                  {pending.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-textPrimary">{getName(t.user_id)}</p>
                        <p className="text-xs text-textSecondary">{getPeriod(t.period_id) ?? 'Tanpa periode'}</p>
                        <p className="mt-1 text-sm">
                          <span className="tabular-nums font-semibold text-primary-600">{formatCurrency(Number(t.amount))}</span>
                          <span className="ml-2 text-xs capitalize text-textSecondary">{methodLabel[t.method]}</span>
                          {t.note && <span className="ml-2 text-xs text-textSecondary">· {t.note}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={async () => {
                          try {
                            const path = await getTransactionProofPath(t.id);
                            if (path) setProofPath(path);
                          } catch (err) {
                            setNotice({
                              title: 'Bukti tidak dapat dimuat',
                              description: err instanceof Error ? err.message : 'Bukti pembayaran tidak dapat diakses.',
                              tone: 'danger',
                            });
                          }
                        }}>
                          <Eye className="h-4 w-4" /> Bukti
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectTarget(t)} disabled={busyId === t.id} className="border-rose-200 text-rose-600 hover:bg-rose-50">
                          {busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Tolak
                        </Button>
                        <Button size="sm" onClick={() => void handleVerify(t, 'approved')} disabled={busyId === t.id}>
                          {busyId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Setujui
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Daftar pembayaran per periode (buku kas ada di Ringkasan) */}
          <PaymentRosterTable
            periodId={selectedPeriodId}
            periods={periods ?? []}
            profiles={profiles ?? []}
            onPeriodChange={setCashPeriodId}
            getName={getName}
            canRequestWaiver={can(role, 'requestWaiver')}
          />
        </div>

        {/* Sidebar kanan: Form aksi */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader><CardTitle className="text-base">Periode Aktif</CardTitle><CardDescription>Iuran yang sedang ditagihkan.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {currentPeriod ? (
                <div>
                  <p className="font-semibold text-textPrimary">{currentPeriod.title}</p>
                  <p className="mt-1 text-xs text-textSecondary">
                    Jatuh tempo{' '}
                    {new Date(`${currentPeriod.due_date}T00:00:00`).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-primary-600">
                    {formatCurrency(Number(currentPeriod.amount))}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-textSecondary">Belum ada periode aktif.</p>
              )}
              <Button asChild variant="secondary" className="w-full">
                <Link to="/dashboard/periode"><CalendarDays className="h-4 w-4" /> Kelola Periode</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Catat Pembayaran Tunai</CardTitle><CardDescription>Dicatat dan langsung disetujui oleh bendahara.</CardDescription></CardHeader>
            <CardContent><form onSubmit={(e) => void handleCashPayment(e)} className="space-y-3">
              <select value={cashUserId} onChange={(e) => setCashUserId(e.target.value)} className={inputCls} required>
                <option value="">Pilih siswa</option>{(profiles ?? []).filter((p) => p.role === 'member' && !paidIds?.has(p.id) && !pending?.some((tx) => tx.user_id === p.id && tx.period_id === (cashPeriodId || currentPeriod?.id) && tx.type === 'income')).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <select value={cashPeriodId || currentPeriod?.id || ''} onChange={(e) => setCashPeriodId(e.target.value)} className={inputCls} required>
                <option value="">Pilih periode</option>{(periods ?? []).map((p) => <option key={p.id} value={p.id}>{p.title} · {formatCurrency(Number(p.amount))}</option>)}
              </select>
              <Button type="submit" className="w-full" disabled={cashBusy || !periods?.length}>{cashBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Catat Lunas</Button>
            </form></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Tunggakan {currentPeriod ? '· ' + currentPeriod.title.split(' ').slice(-3).join(' ') : ''}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {!currentPeriod ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-textSecondary">Belum ada periode aktif.</p>
              ) : tunggakan.length === 0 ? (
                <p className="rounded-xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700">
                  Semua lunas. 🎉
                </p>
              ) : (
                <ul className="space-y-2">
                  {tunggakan.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-textPrimary">{p.full_name}</span>
                      <Badge variant="critical">Tunggak</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catat Pengeluaran</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExpense} className="space-y-3">
                <div>
                  <label className={labelCls}>Nominal (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50000"
                    className={cn(inputCls, 'tabular-nums')}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Metode</label>
                  <select value={expMethod} onChange={(e) => setExpMethod(e.target.value as PaymentMethod)} className={inputCls}>
                    <option value="cash">Tunai</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Keterangan</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: fotokopi modul" className={inputCls} />
                </div>
                {expError && <p className="text-sm text-rose-600">{expError}</p>}
                <Button type="submit" className="w-full" variant="secondary" disabled={expBusy}>
                  {expBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Catat Pengeluaran
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Catat Pemasukan Lainnya</CardTitle><CardDescription>Pendapatan selain pembayaran kas.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={handleIncome} className="space-y-3">
                <div>
                  <label className={labelCls}>Nominal (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="100000"
                    className={cn(inputCls, 'tabular-nums')}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Metode</label>
                  <select value={incomeMethod} onChange={(e) => setIncomeMethod(e.target.value as PaymentMethod)} className={inputCls}>
                    <option value="cash">Tunai</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Keterangan</label>
                  <input value={incomeNote} onChange={(e) => setIncomeNote(e.target.value)} placeholder="Contoh: donasi alumni" className={inputCls} />
                </div>
                {incomeError && <p className="text-sm text-rose-600">{incomeError}</p>}
                <Button type="submit" className="w-full" variant="secondary" disabled={incomeBusy}>
                  {incomeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Catat Pemasukan
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {proofPath && <ProofModal path={proofPath} onClose={() => setProofPath(null)} />}

      <ConfirmDialog
        open={rejectTarget !== null}
        tone="danger"
        title="Tolak pembayaran ini?"
        description={
          rejectTarget ? (
            <>
              Pembayaran <span className="font-semibold text-textPrimary">{getName(rejectTarget.user_id)}</span> sebesar{' '}
              <span className="font-semibold text-textPrimary">{formatCurrency(Number(rejectTarget.amount))}</span> akan
              ditolak. Beri alasan agar siswa tahu apa yang perlu diperbaiki.
            </>
          ) : null
        }
        inputLabel="Alasan penolakan"
        inputPlaceholder="Contoh: bukti transfer tidak terbaca / nominal tidak sesuai"
        inputRequired
        confirmLabel="Tolak pembayaran"
        busy={busyId !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) void handleVerify(rejectTarget, 'rejected', reason.trim());
        }}
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
    </div>
  );
}
