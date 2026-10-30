import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, History, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog, type ConfirmTone } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { useProfiles } from '@/hooks/useProfiles';
import { usePeriods } from '@/hooks/usePeriods';
import { useWaivers } from '@/hooks/useWaivers';
import { verifyPaymentWaiver, type PaymentWaiver } from '@/services/apiWaivers';

// Verifikasi bypass lunas data lama. Hanya wali kelas (RPC juga menolak role lain).
export function WaiverApprovals() {
  const queryClient = useQueryClient();
  const { data: waivers = [], isLoading } = useWaivers();
  const { data: profiles = [] } = useProfiles();
  const { data: periods = [] } = usePeriods();

  const [target, setTarget] = useState<{ waiver: PaymentWaiver; approve: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ title: string; description: string; tone: ConfirmTone } | null>(null);

  const getName = (id: string | null) => (id ? (profiles.find((p) => p.id === id)?.full_name ?? '—') : '—');
  const getPeriod = (id: string) => periods.find((p) => p.id === id)?.title ?? 'Periode';

  const pending = waivers.filter((waiver) => waiver.status === 'pending');
  const history = waivers.filter((waiver) => waiver.status !== 'pending');

  const handleVerify = async (reason: string) => {
    if (!target) return;
    setBusy(true);
    try {
      await verifyPaymentWaiver({
        id: target.waiver.id,
        approve: target.approve,
        reason: target.approve ? undefined : reason.trim(),
      });
      setTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['waivers'] });
      void queryClient.invalidateQueries({ queryKey: ['paid-users'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
    } catch (error) {
      setTarget(null);
      setNotice({
        title: 'Gagal memproses bypass',
        description: error instanceof Error ? error.message : 'Bypass tidak dapat diproses.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Verifikasi Bypass</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Setujui siswa yang sudah lunas di rilis sebelumnya. Bypass tidak menambah saldo kas.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Menunggu Verifikasi</CardTitle>
            <CardDescription>{pending.length} pengajuan bypass</CardDescription>
          </div>
          <Clock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader className="h-40" />
          ) : pending.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
              Tidak ada pengajuan bypass.
            </div>
          ) : (
            <ul className="space-y-3">
              {pending.map((waiver) => (
                <li key={waiver.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-textPrimary">{getName(waiver.user_id)}</p>
                    <p className="text-xs text-textSecondary">
                      {getPeriod(waiver.period_id)} · diajukan {getName(waiver.requested_by)} ·{' '}
                      {new Date(waiver.created_at).toLocaleDateString('id-ID')}
                    </p>
                    <p className="mt-1 text-sm text-textSecondary">{waiver.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => setTarget({ waiver, approve: false })}
                      disabled={busy}
                    >
                      <XCircle className="h-4 w-4" /> Tolak
                    </Button>
                    <Button size="sm" onClick={() => setTarget({ waiver, approve: true })} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Setujui
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Riwayat</CardTitle>
            <CardDescription>{history.length} bypass sudah diproses</CardDescription>
          </div>
          <History className="h-4 w-4 text-textSecondary" />
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex h-28 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
              Belum ada riwayat bypass.
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((waiver) => (
                <li key={waiver.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-textPrimary">
                      {getName(waiver.user_id)} · <span className="font-normal text-textSecondary">{getPeriod(waiver.period_id)}</span>
                    </p>
                    <p className="text-xs text-textSecondary">
                      {waiver.status === 'approved'
                        ? `Disetujui ${getName(waiver.approved_by)}`
                        : `Ditolak: ${waiver.rejection_reason ?? '—'}`}{' '}
                      · {new Date(waiver.updated_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <Badge variant={waiver.status === 'approved' ? 'healthy' : 'critical'}>
                    {waiver.status === 'approved' ? <ShieldCheck className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                    {waiver.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={target !== null}
        tone={target?.approve ? 'primary' : 'danger'}
        title={target?.approve ? 'Setujui bypass ini?' : 'Tolak pengajuan bypass?'}
        description={
          target ? (
            <>
              <span className="font-semibold text-textPrimary">{getName(target.waiver.user_id)}</span> akan ditandai{' '}
              <span className="font-semibold text-textPrimary">{target.approve ? 'lunas (bypass)' : 'tetap belum bayar'}</span>{' '}
              untuk {getPeriod(target.waiver.period_id)}. Bypass tidak mengubah saldo kas.
            </>
          ) : null
        }
        inputLabel={target?.approve ? undefined : 'Alasan penolakan'}
        inputPlaceholder="Contoh: data pembayaran belum ditemukan"
        inputRequired={target ? !target.approve : false}
        confirmLabel={target?.approve ? 'Setujui bypass' : 'Tolak bypass'}
        busy={busy}
        onClose={() => setTarget(null)}
        onConfirm={(reason) => void handleVerify(reason)}
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
