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
        
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400 font-normal">
          {/* Ikon Pembuka </> */}
          <span className="text-slate-500 font-mono font-bold">&lt;&gt;</span>
          
          <span>
            Developed by{" "}
            <a
              href="https://abdurrahmanbantaniy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 font-medium hover:text-blue-400 transition-colors duration-200 hover:underline"
            >
              Abdurrahman
            </a>
          </span>

          {/* Ikon Penutup </> */}
          <span className="text-slate-500 font-mono font-bold">&lt;/&gt;</span>
        </div>



      </div>
    </footer>
  );
}
