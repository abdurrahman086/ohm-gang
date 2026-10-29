import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  CalendarDays,
  Loader2,
  Pencil,
  PlusCircle,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { usePeriods } from '@/hooks/usePeriods';
import { useCurrentPeriod } from '@/hooks/useCurrentPeriod';
import { createPeriod, deletePeriod, setActivePeriod, updatePeriod, type CashPeriod } from '@/services/apiCash';
import { formatCurrency } from '@/utils/formatCurrency';

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
const labelCls = 'mb-1.5 block text-sm font-medium text-textSecondary';

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Periode Kas (Phase 2): kelola periode pembayaran + tentukan periode aktif.
export function PeriodManager() {
  const client = useQueryClient();
  const { data: periods = [], isLoading } = usePeriods();
  const { data: activePeriod } = useCurrentPeriod();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CashPeriod | null>(null);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['periods'] });
    void client.invalidateQueries({ queryKey: ['current-period'] });
    void client.invalidateQueries({ queryKey: ['paid-users'] });
    void client.invalidateQueries({ queryKey: ['transactions'] });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDueDate('');
    setAmount('');
  };

  const startEdit = (period: CashPeriod) => {
    setEditingId(period.id);
    setTitle(period.title);
    setDueDate(period.due_date);
    setAmount(String(period.amount));
    setMessage('');
    setFailure('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setFailure('');

    const value = Number(amount);
    if (!title.trim() || !dueDate || !value || value <= 0) {
      setFailure('Nama periode, jatuh tempo, dan nominal (> 0) wajib diisi.');
      return;
    }

    setBusy('form');
    try {
      if (editingId) {
        await updatePeriod({ id: editingId, title: title.trim(), dueDate, amount: value });
        setMessage(`Periode "${title.trim()}" berhasil diperbarui.`);
      } else {
        await createPeriod({ title: title.trim(), dueDate, amount: value });
        setMessage(`Periode "${title.trim()}" berhasil ditambahkan.`);
      }
      resetForm();
      refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Gagal menyimpan periode.');
    } finally {
      setBusy(null);
    }
  };

  const handleActivate = async (period: CashPeriod) => {
    setMessage('');
    setFailure('');
    setBusy(period.id);
    try {
      await setActivePeriod(period.id);
      setMessage(`"${period.title}" sekarang jadi periode aktif.`);
      refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Gagal mengubah periode aktif.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (period: CashPeriod) => {
    setMessage('');
    setFailure('');
    setBusy(period.id);
    try {
      await deletePeriod(period.id);
      if (editingId === period.id) resetForm();
      setMessage(`Periode "${period.title}" dihapus.`);
      refresh();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Gagal menghapus periode.');
    } finally {
      setBusy(null);
      setDeleteTarget(null);
    }
  };

  const isEditing = Boolean(editingId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Periode Kas</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Atur periode iuran, nominal, jatuh tempo, dan tentukan periode mana yang sedang aktif ditagihkan.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Daftar periode */}
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Periode</CardTitle>
              <CardDescription>
                {periods.length} periode tersimpan · urut jatuh tempo terbaru
                {periods.length > 5 ? ' · scroll daftar untuk lihat sisanya' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader className="h-40" />
              ) : periods.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-textSecondary">
                  Belum ada periode. Tambahkan periode pertama di form sebelah.
                </div>
              ) : (
                <ul className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
                  {periods.map((period) => {
                    const isActive = period.id === activePeriod?.id;
                    const overdue = !isActive && period.due_date < today();

                    return (
                      <li
                        key={period.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
                          isActive ? 'border-primary-200 bg-primary-50/40' : 'border-slate-100'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-textPrimary">{period.title}</p>
                            {isActive && <Badge variant="healthy">Aktif</Badge>}
                            {overdue && <Badge variant="outline">Lewat</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-textSecondary">
                            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                            Jatuh tempo {formatDate(period.due_date)}
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-primary-600">
                            {formatCurrency(Number(period.amount))}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleActivate(period)}
                            disabled={isActive || busy === period.id}
                          >
                            {busy === period.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CalendarCheck className="h-4 w-4" />
                            )}
                            {isActive ? 'Sedang Aktif' : 'Jadikan Aktif'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(period)}
                            disabled={busy === period.id}
                            aria-label={`Ubah ${period.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(period)}
                            disabled={busy === period.id}
                            aria-label={`Hapus ${period.title}`}
                            className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form + info periode aktif */}
        <div className="space-y-6 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Periode Aktif</CardTitle>
              <CardDescription>Dipakai untuk tagihan, tunggakan, dan catat pembayaran tunai.</CardDescription>
            </CardHeader>
            <CardContent>
              {activePeriod ? (
                <div className="space-y-1">
                  <p className="font-semibold text-textPrimary">{activePeriod.title}</p>
                  <p className="text-sm text-textSecondary">
                    Jatuh tempo {formatDate(activePeriod.due_date)}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-primary-600">
                    {formatCurrency(Number(activePeriod.amount))}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-textSecondary">
                  Belum ada periode aktif.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{isEditing ? 'Ubah Periode' : 'Tambah Periode'}</CardTitle>
                <CardDescription>
                  {isEditing ? 'Perubahan berlaku untuk tagihan berikutnya.' : 'Contoh: Kas Minggu Ke-1 November'}
                </CardDescription>
              </div>
              {isEditing && (
                <Button size="sm" variant="ghost" onClick={resetForm} aria-label="Batal ubah">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className={labelCls} htmlFor="period-title">Nama periode</label>
                  <input
                    id="period-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Kas Minggu Ke-1 November"
                    className={inputCls}
                    maxLength={80}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="period-due">Jatuh tempo</label>
                  <input
                    id="period-due"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="period-amount">Nominal iuran (Rp)</label>
                  <input
                    id="period-amount"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="5000"
                    className={`${inputCls} tabular-nums`}
                    required
                  />
                </div>

                {failure && (
                  <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                    {failure}
                  </p>
                )}
                {message && (
                  <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    {message}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={busy === 'form'}>
                  {busy === 'form' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditing ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                  {isEditing ? 'Simpan Perubahan' : 'Tambah Periode'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        tone="danger"
        title="Hapus periode ini?"
        description={
          deleteTarget ? (
            <>
              <span className="font-semibold text-textPrimary">“{deleteTarget.title}”</span> akan dihapus permanen.
              {' '}Transaksi lama tidak ikut terhapus, hanya kehilangan kaitan ke periode ini.
              {deleteTarget.id === activePeriod?.id && (
                <span className="mt-2 block rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                  Ini periode yang sedang aktif — setelah dihapus tidak ada periode aktif sampai kamu memilih yang lain.
                </span>
              )}
            </>
          ) : null
        }
        confirmLabel="Hapus periode"
        busy={busy === deleteTarget?.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
