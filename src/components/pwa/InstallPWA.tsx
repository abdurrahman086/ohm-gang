import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// Mendeteksi event beforeinstallprompt → tombol install PWA (Fase 8: dipoles).
export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-2xl bg-textPrimary p-2 pr-4 text-white shadow-lg">
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          setDeferredPrompt(null);
        }}
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
      >
        <Download className="h-4 w-4" /> Install Aplikasi
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Tutup"
        className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}