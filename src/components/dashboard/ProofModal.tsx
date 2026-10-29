import { useEffect, useState } from 'react';
import { X, FileText, ImageIcon, Loader2 } from 'lucide-react';
import { getProofUrl } from '@/services/apiStorage';

// Modal preview bukti transfer (PRD §4.2.A). Bucket privat → signed URL 60 detik.
export function ProofModal({ path, onClose }: { path: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void getProofUrl(path).then((u) => {
      if (!mounted) return;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isPdf = path.toLowerCase().endsWith('.pdf');
  const fileName = path.split('/').pop() ?? path;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-overlay-in items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Preview bukti pembayaran"
    >
      <div
        className="relative w-full max-w-lg animate-dialog-in overflow-hidden rounded-3xl border border-slate-100 bg-cardBg shadow-[0_24px_60px_-15px_rgba(15,23,42,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex max-h-[70vh] flex-col">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            {isPdf ? <FileText className="h-5 w-5 text-rose-500" /> : <ImageIcon className="h-5 w-5 text-primary-500" />}
            <p className="truncate text-sm font-medium text-textPrimary">{fileName}</p>
          </div>

          <div className="flex min-h-52 flex-1 items-center justify-center overflow-auto bg-slate-950 p-4">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white/70" />
            ) : url ? (
              isPdf ? (
                <iframe src={url} title={fileName} className="h-96 w-full rounded-xl bg-white" />
              ) : (
                <img src={url} alt={fileName} className="max-h-96 rounded-xl object-contain" />
              )
            ) : (
              <p className="text-sm text-white/70">Bukti tidak dapat dimuat (akses terbatas).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}