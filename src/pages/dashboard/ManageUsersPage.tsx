import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { fetchManagedUsers, sendPasswordRecovery, updateManagedUser, type ManagedUser } from '@/services/apiUsers';

const ROLE_LABEL: Record<ManagedUser['role'], string> = {
  member: 'Member', keuangan: 'Bendahara', wali_kelas: 'Wali Kelas', developer: 'Developer',
};

export function ManageUsersPage() {
  const client = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['managed-users'], queryFn: fetchManagedUsers, staleTime: 0, gcTime: 0, retry: 1,
  });
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');

  const closeEditor = () => {
    setEditUser(null);
    setEditName('');
    setEditEmail('');
    setEditPhone('');
  };

  const updateEmail = async () => {
    if (!editUser) return;
    const user = editUser;
    const nextEmail = editEmail.trim();
    setBusyId(user.id);
    setFailure('');
    setMessage('');
    try {
      await updateManagedUser(user.id, {
        email: nextEmail,
        full_name: editName.trim(),
        phone_number: editPhone.trim() || null,
      });
      await client.invalidateQueries({ queryKey: ['managed-users'] });
      await client.invalidateQueries({ queryKey: ['profiles'] });
      closeEditor();
      setConfirmEdit(false);
      if (nextEmail !== user.email) {
        try {
          await sendPasswordRecovery(nextEmail);
          setMessage(`Profil diperbarui. Tautan reset password dikirim ke ${nextEmail}.`);
        } catch {
          setFailure('Profil diperbarui, tetapi tautan reset gagal dikirim. Coba tombol Kirim Reset.');
        }
      } else {
        setMessage('Profil pengguna berhasil diperbarui.');
      }
    } catch (cause) {
      setConfirmEdit(false);
      setFailure(cause instanceof Error ? cause.message : 'Email gagal diperbarui.');
    } finally {
      setBusyId(null);
    }
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
      <p className="mt-1 text-sm text-textSecondary">Edit nama, nomor telepon, dan email, atau kirim tautan reset password.</p>
    </div>
    <Card>
      <CardHeader><CardTitle>Akun Terdaftar</CardTitle><CardDescription>Perubahan mempertahankan UID dan riwayat akun.</CardDescription></CardHeader>
      <CardContent className="space-y-3">
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {failure && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{failure}</p>}
        {error && <p role="alert" className="text-sm text-rose-600">Gagal memuat daftar pengguna.</p>}
        {isLoading ? <Loader className="h-32" /> : users.map((user) => (
          <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold text-textPrimary">{user.full_name}</p>
              <p className="break-all text-sm text-textSecondary">{user.email}</p>
              {user.phone_number && <p className="text-sm text-textSecondary">{user.phone_number}</p>}
              <p className="text-xs text-textSecondary">{ROLE_LABEL[user.role]}</p>
            </div>
            {['member', 'keuangan'].includes(user.role) && <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
              <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => {
                setEditUser(user);
                setEditName(user.full_name);
                setEditEmail(user.email);
                setEditPhone(user.phone_number ?? '');
              }}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button className="w-full sm:w-auto" size="sm" variant="secondary" onClick={() => void resetPassword(user)} disabled={busyId === user.id}>
                {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Kirim Reset
              </Button>
            </div>}
          </div>
        ))}
        {!isLoading && !error && users.length === 0 && <p className="text-sm text-textSecondary">Belum ada akun pengguna.</p>}
      </CardContent>
    </Card>

    {editUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-user-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><h2 id="edit-user-title" className="text-lg font-semibold text-textPrimary">Edit pengguna</h2><p className="mt-1 text-sm text-textSecondary">{editUser.full_name}</p></div>
          <Button variant="ghost" size="sm" aria-label="Tutup" onClick={closeEditor}><X className="h-4 w-4" /></Button>
        </div>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto">
          <label className="block text-sm font-medium text-textSecondary">Nama lengkap
            <input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={100} autoComplete="name" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-textPrimary outline-none focus:border-primary-500" />
          </label>
          <label className="block text-sm font-medium text-textSecondary">Email
            <input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-textPrimary outline-none focus:border-primary-500" />
          </label>
          <label className="block text-sm font-medium text-textSecondary">Nomor telepon
            <input type="tel" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} maxLength={32} autoComplete="tel" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-textPrimary outline-none focus:border-primary-500" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={closeEditor}>Batal</Button>
          <Button onClick={() => setConfirmEdit(true)} disabled={!editName.trim() || !editEmail.includes('@')}>
            <Save className="h-4 w-4" /> Simpan
          </Button>
        </div>
      </section>
    </div>}

    <ConfirmDialog
      open={confirmEdit}
      tone="warning"
      title="Simpan perubahan email?"
      description={editUser ? <>Simpan nama, nomor telepon, dan email baru untuk <strong>{editUser.full_name}</strong>? Jika email berubah, tautan reset password akan dikirim.</> : null}
      confirmLabel="Ya, simpan"
      busy={busyId !== null}
      onClose={() => setConfirmEdit(false)}
      onConfirm={() => void updateEmail()}
    />
  </div>;
}
