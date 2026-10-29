import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <SearchX className="h-12 w-12 text-primary-300" />
      <h1 className="mt-4 text-3xl font-bold text-textPrimary">404</h1>
      <p className="mt-2 text-sm text-textSecondary">Halaman tidak ditemukan</p>
      <Button asChild className="mt-6">
        <Link to="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}