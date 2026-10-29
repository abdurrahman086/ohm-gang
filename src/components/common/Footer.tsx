import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-cardBg">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-textPrimary">
          <Zap className="h-5 w-5 text-primary-500" />
          OHM-Gang
        </div>
        <p className="text-sm text-textSecondary">
          © {new Date().getFullYear()} Kelas TITL · Transparansi keuangan kelas.
        </p>
        <Link to="/login" className="text-sm font-medium text-primary-600 hover:underline">
          Masuk Pengurus
        </Link>
      </div>
    </footer>
  );
}
