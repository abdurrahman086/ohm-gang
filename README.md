# OHM-Gang — Website Kelas TITL

**"Rangkaikan ide, nyalakan karya."** PWA kelas jurusan TITL yang memadukan
**transparansi kas real-time** dengan **ruang kreativitas** — papan ide & karya,
blog/jurnal, portofolio siswa, dan challenge ber-leaderboard. Dibangun dari
spesifikasi di `product_requirement_document.md` (PRD), `system_architecture_document.md` (SAD),
dan `ui_ux_design_guidelines.md`.

Fitur kas (bayar, verifikasi, buku kas, kesehatan kas, pengajuan dana) tetap utuh.
Konten kreativitas bisa dilihat publik via link undangan (center of attention), tetapi
bukti transfer & data privasi siswa tetap tertutup (PRD §4.4).

## Stack

React 18 + TypeScript + Vite · Tailwind CSS · Shadcn UI · Framer Motion · Zustand ·
TanStack Query v5 · vite-plugin-pwa · Supabase (Auth / Postgres+RLS / Storage / Realtime).

## Setup

```bash
npm install
cp .env.example .env.local   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY (Fase 2)
npm run dev                  # http://localhost:5173
```

## Scripts

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server + HMR |
| `npm run build` | Tipe-check (`tsc -b`) + production build ke `dist/` |
| `npm run preview` | Preview hasil build |
| `npm run lint` | Oxlint |

## Struktur

Struktur `src/` mengikuti `system_architecture_document.md` §4:
`components/{ui,common,landing,dashboard,pwa}`, `hooks`, `layouts`, `pages/dashboard`,
`services`, `store`, `types`, `utils`, `config/supabase.ts`.

Tahap pengembangan: lihat `DEVELOPMENT_PLAN.md` — **Fase 1–7 selesai + re-brand OHM-Gang & Ruang Kreativitas selesai + Fase 8 selesai** (audit Lighthouse & Web Push = backlog).

## Supabase (Fase 2 ✅)

- Project ref: `yvqhglgtzerutluljxct`. Migrasi 0001–0010 membentuk skema, RLS, storage, kreativitas, dan admin. Migrasi `0011_security_hardening.sql` menutup celah akses utama; **belum diterapkan ke Supabase** dan wajib diuji/di-backup sebelum deployment.
- Ganti skema → regenerate types: `npx supabase gen types typescript --project-id yvqhglgtzerutluljxct --schema public > src/types/database.types.ts`
- Apply migrasi baru: `npx supabase link` (sekali) lalu `npx supabase db push`.
- Kredensial client ada di `.env.local` (jangan di-commit; sudah di-`.gitignore`).

## Deploy Vercel

- Framework preset **Vite** (auto-detect).
- `vercel.json` sudah berisi SPA rewrite untuk routing client-side.
- Set env `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di dashboard Vercel
  (prefix `VITE_` wajib karena dibundle saat build).
# ohm-gang
