import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { fetchManagedUsers, sendPasswordRecovery, updateManagedUserEmail, type ManagedUser } from '@/services/apiUsers';

const ROLE_LABEL: Record<ManagedUser['role'], string> = {
  member: 'Member', keuangan: 'Bendahara', wali_kelas: 'Wali Kelas', developer: 'Developer',
};

export function ManageUsersPage() {
  const client = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery({ 
    queryKey: ['managed-users'], 
    queryFn: fetchManagedUsers,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [confirmUser, setConfirmUser] = useState<ManagedUser | null>(null);

  const updateEmail = async (user: ManagedUser) => {
    const nextEmail = email.trim();
    setBusyId(user.id); setFailure(''); setMessage('');
    try {
      await updateManagedUserEmail(user.id, nextEmail);
      setEditingId(null);
      await client.invalidateQueries({ queryKey: ['managed-users'] });
      try {
        await sendPasswordRecovery(nextEmail);
        setMessage(`Email diperbarui. Tautan reset password dikirim ke ${nextEmail}.`);
      } catch {
        setFailure(`Email sudah diperbarui ke ${nextEmail}, tetapi tautan reset gagal dikirim. Coba tombol Kirim Reset.`);
      }
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Email gagal diperbarui.');
    } finally { setBusyId(null); setConfirmUser(null); }
  };

  const resetPassword = async (user: ManagedUser) => {
    setBusyId(user.id); setFailure(''); setMessage('');
    try {
      await sendPasswordRecovery(user.email);
      setMessage(`Tautan reset password dikirim ke ${user.email}.`);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : 'Email reset gagal dikirim.');
    } finally { setBusyId(null); }
  };

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-textPrimary">Kelola Pengguna</h1>
      <p className="mt-1 text-sm text-textSecondary">Wali kelas dapat mengganti email dan mengirim tautan reset. Password lama tidak dapat dilihat.</p>
    </div>
    <Card>
      <CardHeader><CardTitle>Akun Terdaftar</CardTitle><CardDescription>Perubahan email berlaku pada akun yang sama dan tidak mengubah UID atau riwayatnya.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {failure && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{failure}</p>}
        {error && <p role="alert" className="text-sm text-rose-600">Gagal memuat daftar pengguna.</p>}
        {isLoading ? <Loader className="h-32" /> : (users ?? []).map((user) => (
          <div key={user.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-textPrimary">{user.full_name}</p>
              <p className="text-sm text-textSecondary">{user.email}</p>
              <p className="text-xs text-textSecondary">{ROLE_LABEL[user.role]}</p>
            </div>
            {editingId === user.id && ['member', 'keuangan'].includes(user.role) ? (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" aria-label={`Email baru untuk ${user.full_name}`} className="h-10 min-w-56 flex-1 rounded-xl border border-slate-200 px-3 text-sm" />
                <Button size="sm" onClick={() => setConfirmUser(user)} disabled={busyId === user.id || !email.includes('@')}>
                  {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
                </Button>
                <Button size="sm" variant="ghost" aria-label="Batal ubah email" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              ['member', 'keuangan'].includes(user.role) ? <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingId(user.id); setEmail(user.email); }}>
                  <Pencil className="h-4 w-4" /> Ubah Email
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void resetPassword(user)} disabled={busyId === user.id}>
                  {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Kirim Reset
                </Button>
              </div> : null
            )}
          </div>
        ))}
        {!isLoading && !error && users?.length === 0 && <p className="text-sm text-textSecondary">Belum ada akun pengguna.</p>}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={confirmUser !== null}
      tone="warning"
      title="Ganti email akun?"
      description={
        confirmUser ? (
          <>
            Email <span className="font-semibold text-textPrimary">{confirmUser.email}</span> diganti menjadi{' '}
            <span className="font-semibold text-primary-600">{email.trim()}</span>. Akun, UID, dan riwayat kas tetap sama,
            lalu tautan reset password dikirim ke email baru.
          </>
        ) : null
      }
      confirmLabel="Ganti email"
      busy={busyId !== null}
      onClose={() => setConfirmUser(null)}
      onConfirm={() => {
        if (confirmUser) void updateEmail(confirmUser);
      }}
    />
  </div>;
}
