import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { requireSupabase } from '@/config/supabase';

export function PasswordResetPage() {
  const { user, authReady } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password minimal 8 karakter.');
    if (password !== confirmation) return setError('Konfirmasi password tidak sama.');
    setBusy(true);
    try {
      const { error: updateError } = await requireSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Password gagal diperbarui.');
    } finally { setBusy(false); }
  };

  return <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
    <Card className="w-full">
      <CardHeader className="items-center text-center">
        <LockKeyhole className="h-9 w-9 text-primary-500" />
        <CardTitle>Atur Password Baru</CardTitle>
        <CardDescription>Buat password baru untuk akun Anda.</CardDescription>
      </CardHeader>
      <CardContent>
        {!authReady ? <p className="text-center text-sm text-textSecondary">Memvalidasi tautan…</p> : done ? (
          <div className="space-y-4 text-center"><p role="status" className="text-sm text-emerald-700">Password berhasil diperbarui.</p><Link className="text-sm font-medium text-primary-600 hover:underline" to="/dashboard">Lanjut ke aplikasi</Link></div>
        ) : !user ? (
          <div className="space-y-3 text-center"><p className="text-sm text-textSecondary">Tautan reset tidak valid atau sudah kedaluwarsa. Minta wali kelas mengirim tautan baru.</p><Link className="text-sm font-medium text-primary-600 hover:underline" to="/login">Kembali ke login</Link></div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <label className="block text-sm font-medium text-textSecondary">Password baru
              <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm text-textPrimary" required />
            </label>
            <label className="block text-sm font-medium text-textSecondary">Ulangi password baru
              <input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm text-textPrimary" required />
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Simpan Password Baru</Button>
          </form>
        )}
      </CardContent>
    </Card>
  </div>;
}
