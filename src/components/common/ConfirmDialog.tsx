import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConfirmTone = 'primary' | 'danger' | 'warning' | 'info';

const TONE: Record<
  ConfirmTone,
  { icon: typeof AlertTriangle; bubble: string; button: 'default' | 'destructive' }
> = {
  primary: { icon: ShieldCheck, bubble: 'bg-primary-50 text-primary-600', button: 'default' },
  danger: { icon: AlertTriangle, bubble: 'bg-rose-50 text-rose-600', button: 'destructive' },
  warning: { icon: AlertTriangle, bubble: 'bg-amber-50 text-amber-600', button: 'default' },
  info: { icon: Info, bubble: 'bg-primary-50 text-primary-600', button: 'default' },
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  tone?: ConfirmTone;
  confirmLabel?: string;
  /** null = dialog informasi (tombol batal tidak ditampilkan) */
  cancelLabel?: string | null;
  busy?: boolean;
  /** Tampilkan textarea alasan (mis. penolakan). Nilainya dikirim ke onConfirm. */
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

// Dialog konfirmasi bertema (pengganti window.confirm / window.prompt).
export function ConfirmDialog({
  open,
  title,
  description,
  tone = 'primary',
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  busy = false,
  inputLabel,
  inputPlaceholder,
  inputRequired = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [value, setValue] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const showInput = typeof inputLabel === 'string';
  const disabled = busy || (showInput && inputRequired && !value.trim());

  useEffect(() => {
    if (!open) return;
    setValue('');
    const timer = window.setTimeout(() => confirmRef.current?.focus(), 40);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const { icon: Icon, bubble, button } = TONE[tone];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-overlay-in sm:items-center"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-md animate-dialog-in overflow-hidden rounded-3xl border border-slate-100 bg-cardBg shadow-[0_24px_60px_-15px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 pb-4">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', bubble)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-textPrimary">
              {title}
            </h2>
            {description && (
              <div className="mt-1 text-sm leading-relaxed text-textSecondary">{description}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup"
            className="-mr-1 -mt-1 rounded-full p-1.5 text-textSecondary transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showInput && (
          <div className="px-5 pb-2">
            <label htmlFor="confirm-dialog-input" className="mb-1.5 block text-sm font-medium text-textSecondary">
              {inputLabel}
            </label>
            <textarea
              id="confirm-dialog-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={inputPlaceholder}
              className="h-24 w-full resize-none rounded-2xl border border-slate-200 bg-bgCanvas px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              maxLength={300}
            />
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:justify-end">
          {cancelLabel !== null && (
            <Button variant="outline" onClick={onClose} disabled={busy} className="sm:w-auto">
              {cancelLabel}
            </Button>
          )}
          <Button
            ref={confirmRef}
            variant={button}
            onClick={() => onConfirm(value)}
            disabled={disabled}
            className="sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
