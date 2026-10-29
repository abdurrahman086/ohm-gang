import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSupabase } from '@/config/supabase';

export function CreateMemberPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setCreatedEmail('');
    setBusy(true);
    try {
      const sb = requireSupabase();
      const { error: invokeError, data } = await sb.functions.invoke('create-member-account', {
        body: { fullName: fullName.trim(), email: email.trim(), password },
      });
      if (invokeError) {
        if (invokeError.message?.includes('404') || invokeError.message?.includes('not deployed')) {
          throw new Error('Fungsi belum di-deploy ke Supabase. Hubungi admin: supabase functions deploy create-member-account');
        }
        throw new Error('Akun gagal dibuat. Periksa data atau hubungi admin sistem.');
      }
      if (!data?.id) throw new Error('Respons server tidak valid.');
      setCreatedEmail(email.trim());
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Akun gagal dibuat.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-xl space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-textPrimary">Buat Akun Siswa</h1>
      <p className="mt-1 text-sm text-textSecondary">Hanya wali kelas yang dapat membuat akun. Akun baru otomatis mendapat akses Member.</p>
    </div>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Data akun baru</CardTitle><CardDescription>Berikan email dan kata sandi awal kepada siswa secara pribadi.</CardDescription></CardHeader>
      <CardContent>
        {createdEmail && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Akun {createdEmail} berhasil dibuat sebagai Member.</p>}
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <label className="block text-sm font-medium text-textSecondary">Nama lengkap
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" maxLength={100} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm text-textPrimary" required />
          </label>
          <label className="block text-sm font-medium text-textSecondary">Email siswa
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm text-textPrimary" required />
          </label>
          <label className="block text-sm font-medium text-textSecondary">Kata sandi awal (minimal 8 karakter)
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-bgCanvas px-4 text-sm text-textPrimary" required />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Buat Akun Member
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>;
}
