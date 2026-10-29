import { cn } from '@/lib/utils';

// Skeleton Loader (UI Guidelines §6): slate pastel + animate-pulse, bukan spinner.
export function Loader({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Memuat..."
      className={cn('animate-pulse rounded-2xl bg-slate-200', className)}
    />
  );
}