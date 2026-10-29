import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { getQrisImagePath, qrisPublicUrl, setQrisImage } from '@/services/apiStorage';

export function QrisSettings() {
  const { user } = useAuth();
  const client = useQueryClient();
  const { data: path } = useQuery({ 
    queryKey: ['qris-image'], 
    queryFn: getQrisImagePath,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    setError('');
    try {
      await setQrisImage(file, user.id);
      setFile(null);
      await client.invalidateQueries({ queryKey: ['qris-image'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'QRIS gagal disimpan.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-xl space-y-6">
    <div><h1 className="text-2xl font-bold text-textPrimary">Kelola QRIS</h1><p className="mt-1 text-sm text-textSecondary">QRIS ini akan ditampilkan pada menu pembayaran siswa.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />QRIS aktif</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {!path ? <p className="text-sm text-textSecondary">Memuat…</p> : path ? <img src={qrisPublicUrl(path)} alt="QRIS aktif" className="mx-auto max-h-80 rounded-xl border border-slate-200 object-contain" /> : <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Belum ada gambar QRIS.</p>}
        <form onSubmit={(event) => void save(event)} className="space-y-3">
          <label className="block text-sm font-medium text-textSecondary">Unggah QRIS baru (JPG/PNG, maks. 3MB)
            <input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={!file || busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Simpan QRIS</Button>
        </form>
      </CardContent>
    </Card>
  </div>;
}
