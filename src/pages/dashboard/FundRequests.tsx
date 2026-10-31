import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  ShieldCheck,
  UserCheck,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog, type ConfirmTone } from '@/components/common/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfiles } from '@/hooks/useProfiles';
import { useFundRequests } from '@/hooks/useFundRequests';
import { approveFundRequest, createFundRequest, rejectFundRequest, FUND_LARGE_THRESHOLD, type FundRequest } from '@/services/apiFunds';
import { can } from '@/config/permissions';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';

// Pengajuan Dana (PRD §4.2.D): threshold Rp100.000 — kecil cukup Keuangan, besar butuh Wali + Keuangan.
export function FundRequests() {
  const { user, role } = useAuth();
  const { data: requests = [] } = useFundRequests();
  const { data: profiles = [] } = useProfiles();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FundRequest | null>(null);
  const [notice, setNotice] = useState<{ title: string; description: string; tone: ConfirmTone } | null>(null);

  const getName = (id: string | null) => (id ? (profiles?.find((p) => p.id === id)?.full_name ?? '—') : '—');

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['fund-requests'] });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!user) return;
    const val = Number(amount);
    if (!title.trim() || !description.trim() || !val || val <= 0) {
      setFormError('Lengkapi judul, keterangan, dan nominal valid.');
      return;
    }
    setFormBusy(true);
    try {
      await createFundRequest({ requesterId: user.id, title: title.trim(), description: description.trim(), amount: val });
      setTitle('');
      setDescription('');
      setAmount('');
      invalidate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengajukan dana.');
    } finally {
      setFormBusy(false);
    }
  };

  const handleApprove = async (r: FundRequest) => {
    if (!role) return;
    setBusyId(r.id);
    try {
      await approveFundRequest({ id: r.id, role });
      invalidate();
    } catch (err) {
      setNotice({
        title: 'Gagal menyetujui',
        description: err instanceof Error ? err.message : 'Gagal menyetujui pengajuan.',
        tone: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (r: FundRequest, reason: string) => {
    setBusyId(r.id);
    try {
      await rejectFundRequest(r.id, reason);
      setRejectTarget(null);
      invalidate();
    } catch (err) {
      setRejectTarget(null);
      setNotice({
        title: 'Gagal menolak',
        description: err instanceof Error ? err.message : 'Gagal menolak pengajuan.',
        tone: 'danger',
      });
    } finally {
      setBusyId(null);
    }
  };

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
  const labelCls = 'mb-1.5 block text-sm font-medium text-textSecondary';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Pengajuan Dana</h1>
        <p className="mt-1 text-sm text-textSecondary">
          ≤ {formatCurrency(FUND_LARGE_THRESHOLD)} cukup disetujui Bagian Keuangan · lebih dari itu butuh Wali Kelas{' '}
          <span className="font-semibold">dan</span> Bagian Keuangan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form pengajuan */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Ajukan Dana</CardTitle>
            <CardDescription>Reimbursement atau kebutuhan kelas</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>Judul</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Fotokopi modul Bahasa" className={inputCls} maxLength={120} required />
              </div>
              <div>
                <label className={labelCls}>Keterangan</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rincian kebutuhan / bukti pendukung…"
                  className={cn(inputCls, 'h-24 resize-none py-3')}
                  maxLength={500}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Nominal (Rp)</label>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" className={cn(inputCls, 'tabular-nums')} required />
              </div>
              {formError && <p className="text-sm text-rose-600">{formError}</p>}
              <Button type="submit" className="w-full" disabled={formBusy}>
                {formBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim Pengajuan
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Daftar pengajuan */}
        <div className="space-y-4 lg:col-span-2">
          {requests.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-50 text-sm text-textSecondary">
              Belum ada pengajuan dana.
            </div>
          ) : (
            requests.map((r) => {
              const needsWali = Number(r.amount) > FUND_LARGE_THRESHOLD;
              const keuanganOk = !!r.approved_by_keuangan;
              const waliOk = !!r.approved_by_wali_kelas;
              const approved = r.status === 'approved';
              const rejected = r.status === 'rejected';
              const pending = !approved && !rejected;
              const waitingWali = pending && keuanganOk && needsWali && !waliOk;

              const canKeuangan = can(role, 'approveFundSmall') && pending && !keuanganOk;
              const canWali = can(role, 'approveFundLarge') && pending && needsWali && !waliOk;
              const canReject = pending && (can(role, 'approveFundSmall') || can(role, 'approveFundLarge'));

              return (
                <Card key={r.id}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-textPrimary">{r.title}</h3>
                        <p className="text-xs text-textSecondary">
                          {getName(r.requester_id)} · {new Date(r.created_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {approved && (
                          <Badge variant="healthy">
                            <BadgeCheck className="mr-1 h-3 w-3" /> Disetujui
                          </Badge>
                        )}
                        {rejected && (
                          <Badge variant="critical">
                            <XCircle className="mr-1 h-3 w-3" /> Ditolak
                          </Badge>
                        )}
                        {pending && (
                          <Badge variant={waitingWali ? 'warning' : 'secondary'}>
                            <Clock className="mr-1 h-3 w-3" /> {waitingWali ? 'Menunggu Wali Kelas' : 'Menunggu Persetujuan'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-textSecondary">{r.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                      <span className="tabular-nums text-lg font-bold text-primary-600">{formatCurrency(Number(r.amount))}</span>
                      <span className="text-xs text-textSecondary">{needsWali ? 'Butuh 2 persetujuan (Wali + Keuangan)' : 'Cukup persetujuan Bagian Keuangan'}</span>
                    </div>

                    {/* Progress approval */}
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {keuanganOk ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-textSecondary" />
                        )}
                        <ShieldCheck className="h-4 w-4 text-textSecondary" />
                        <span className={cn(keuanganOk ? 'font-medium text-emerald-700' : 'text-textSecondary')}>Bagian Keuangan</span>
                        {keuanganOk && <span className="text-xs text-textSecondary">({getName(r.approved_by_keuangan)})</span>}
                      </div>
                      {needsWali && (
                        <div className="flex items-center gap-2">
                          {waliOk ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-textSecondary" />
                          )}
                          <UserCheck className="h-4 w-4 text-textSecondary" />
                          <span className={cn(waliOk ? 'font-medium text-emerald-700' : 'text-textSecondary')}>Wali Kelas</span>
                          {waliOk && <span className="text-xs text-textSecondary">({getName(r.approved_by_wali_kelas)})</span>}
                        </div>
                      )}
                    </div>

                    {(canKeuangan || canWali || canReject) && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                        {canKeuangan && (
                          <Button size="sm" onClick={() => void handleApprove(r)} disabled={busyId === r.id}>
                            {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Setujui (Keuangan)
                          </Button>
                        )}
                        {canWali && (
                          <Button size="sm" variant="secondary" onClick={() => void handleApprove(r)} disabled={busyId === r.id}>
                            {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Setujui (Wali Kelas)
                          </Button>
                        )}
                        {canReject && (
                          <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setRejectTarget(r)} disabled={busyId === r.id}>
                            <XCircle className="h-4 w-4" /> Tolak
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={rejectTarget !== null}
        tone="danger"
        title="Tolak pengajuan dana?"
        description={
          rejectTarget ? (
            <>
              Pengajuan <span className="font-semibold text-textPrimary">“{rejectTarget.title}”</span> sebesar{' '}
              <span className="font-semibold text-textPrimary">{formatCurrency(Number(rejectTarget.amount))}</span> akan
              ditolak. Tuliskan alasannya agar pengaju tahu perbaikannya.
            </>
          ) : null
        }
        inputLabel="Alasan penolakan"
        inputPlaceholder="Contoh: nominal melebihi saldo kas / bukti belum lengkap"
        inputRequired
        confirmLabel="Tolak pengajuan"
        busy={busyId !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (rejectTarget) void handleReject(rejectTarget, reason.trim());
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
