import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, PartyPopper, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { usePeriods } from '@/hooks/usePeriods';
import { useTransactions } from '@/hooks/useTransactions';
import { submitPayment } from '@/services/apiCash';
import { uploadProof, validateProofFile } from '@/services/apiStorage';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { getQrisImagePath, qrisPublicUrl } from '@/services/apiStorage';

// Bayar Kas (PRD §4.2.A): pilih periode + metode, upload bukti, lihat status pribadi.
export function PaymentPage() {
  const { user } = useAuth();
  const { data: periods, isLoading: loadingPeriods } = usePeriods();
  const { data: myTransactions, isLoading: loadingHistory } = useTransactions();
  const { data: qrisPath } = useQuery({ queryKey: ['qris-image'], queryFn: getQrisImagePath });
  const queryClient = useQueryClient();

  const [periodId, setPeriodId] = useState('');
  const method = 'qris' as const;
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedPeriod = periods?.find((p) => p.id === periodId) ?? periods?.[0];

  const history = useMemo(
    () =>
      (myTransactions ?? [])
        .filter((t) => t.type === 'income' && user && t.user_id === user.id)
        .slice(0, 10),
    [myTransactions, user],
  );
  const activePayment = history.find((t) => t.period_id === selectedPeriod?.id && ['pending', 'approved'].includes(t.status));

  const handleFile = (f: File | null) => {
    setFile(f);
    setFileError(null);
    if (!f) return;
    const err = validateProofFile(f);
    if (err === 'type') setFileError('Hanya .jpg, .png, atau .pdf.');
    if (err === 'size') setFileError('Maksimal 3MB.');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !selectedPeriod) return;
    if (activePayment) {
      setError('Pembayaran untuk periode ini sudah dikirim atau disetujui.');
      return;
    }

    if (!file) {
      setFileError('Unggah bukti pembayaran dulu.');
      return;
    }
    if (file && validateProofFile(file)) {
      setFileError('Cek kembali file bukti (jenis/ukuran).');
      return;
    }

    setSubmitting(true);
    try {
      const proofPath = file ? await uploadProof(user.id, file) : undefined;
      await submitPayment({
        userId: user.id,
        periodId: selectedPeriod.id,
        amount: Number(selectedPeriod.amount),
        method,
        proofPath,
      });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pembayaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
  const labelCls = 'mb-1.5 block text-sm font-medium text-textSecondary';

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-bold text-textPrimary">Bayar Kas</h1>
      <p className="mt-1 text-sm text-textSecondary">Unggah bukti pembayaran untuk diverifikasi bendahara.</p>

      <div className="mt-6 space-y-6">
        {success ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <PartyPopper className="h-10 w-10 text-emerald-500" />
              <h2 className="text-lg font-bold text-textPrimary">Bukti Terkirim!</h2>
              <p className="text-sm text-textSecondary">
                Pembayaran menunggu verifikasi bendahara. Status bisa dilihat di bawah.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSuccess(false);
                  setFile(null);
                  setPeriodId('');
                }}
              >
                Bayar Lagi
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Form Pembayaran</CardTitle>
              <CardDescription>Bayar menggunakan QRIS · {selectedPeriod && formatCurrency(Number(selectedPeriod.amount))}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelCls}>Periode</label>
                  <select
                    value={selectedPeriod?.id ?? ''}
                    onChange={(e) => setPeriodId(e.target.value)}
                    className={inputCls}
                    required
                  >
                    {loadingPeriods ? (
                      <option>Memuat periode…</option>
                    ) : (
                      (periods ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} · {formatCurrency(Number(p.amount))}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {qrisPath ? <img src={qrisPublicUrl(qrisPath)} alt="QRIS pembayaran kas kelas" className="mx-auto max-h-72 rounded-xl border border-slate-200 object-contain" /> : <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">QRIS belum diatur pengurus kelas.</p>}
                {activePayment && <p className="rounded-xl bg-slate-50 p-4 text-sm text-textSecondary">Pembayaran periode ini berstatus {activePayment.status === 'approved' ? 'lunas' : 'menunggu verifikasi'}.</p>}

                <div>
                  <label className={labelCls}>Unggah bukti pembayaran QRIS</label>
                  <label
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors',
                      fileError ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-bgCanvas hover:border-primary-300',
                    )}
                  >
                    <UploadCloud className={cn('h-8 w-8', fileError ? 'text-rose-400' : 'text-primary-500')} />
                    {file ? (
                      <p className="text-sm font-medium text-textPrimary">{file.name}</p>
                    ) : (
                      <p className="text-sm text-textSecondary">JPG, PNG, atau PDF — maks 3MB</p>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      className="sr-only"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {fileError && <p className="mt-1 text-xs text-rose-600">{fileError}</p>}
                </div>

                {error && <p className="text-sm text-rose-600">{error}</p>}

                <Button type="submit" className="w-full" size="lg" disabled={submitting || !selectedPeriod || !qrisPath || !!activePayment}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Mengirim…
                    </>
                  ) : (
                    'Kirim Bukti Pembayaran'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Status kas pribadi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Kas Saya</CardTitle>
            <CardDescription>Riwayat pembayaran & verifikasi</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <Loader className="h-24" />
            ) : history.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-textSecondary">Belum ada pembayaran.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-textPrimary">
                        {formatCurrency(Number(t.amount))}
                        <span className="ml-2 text-xs font-normal capitalize text-textSecondary">{t.method}</span>
                      </p>
                      <p className="text-xs text-textSecondary">{new Date(t.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    {t.status === 'approved' && (
                      <Badge variant="healthy">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Disetujui
                      </Badge>
                    )}
                    {t.status === 'pending' && (
                      <Badge variant="warning">
                        <Clock className="mr-1 h-3 w-3" /> Menunggu
                      </Badge>
                    )}
                    {t.status === 'rejected' && (
                      <Badge variant="critical">
                        <XCircle className="mr-1 h-3 w-3" /> Ditolak
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
