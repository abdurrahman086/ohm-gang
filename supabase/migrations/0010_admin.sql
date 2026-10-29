-- 0010_admin.sql — Aturan kelas (PRD 4.1.6) + policy developer kelola profil (Fase 8)
-- Asumsi: dijalankan setelah 0009_submission_votes.sql.

-- ============ Tabel: rules (Peraturan Kelas & Aturan Kas) ============
CREATE TABLE public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  position INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Baca publik (landing, PRD 4.1.6)
CREATE POLICY "Rules are viewable by everyone"
ON public.rules FOR SELECT TO anon, authenticated
USING (true);

-- Kelola: hanya developer
CREATE POLICY "Developer manages rules"
ON public.rules FOR ALL TO authenticated
USING (public.has_role('developer'))
WITH CHECK (public.has_role('developer'));

-- Seed: aturan default (konten dari Rules.tsx lama)
INSERT INTO public.rules (title, body, position) VALUES
  ('Iuran Kas Wajib', 'Kas mingguan dibayar sesuai periode yang ditetapkan bendahara. Keterlambatan dikenakan denda sesuai kesepakatan kelas.', 1),
  ('Mekanisme Pembayaran', 'Transfer bank, e-wallet, atau QRIS — wajib unggah bukti. Tunai dicatat langsung oleh bendahara.', 2),
  ('Pengajuan Dana', 'Dana kegiatan ≤ Rp100.000 cukup persetujuan Bagian Keuangan. Di atas itu wajib persetujuan Wali Kelas.', 3);

-- ============ Policy: developer kelola profil (role, nama, NIS) ============
CREATE POLICY "Developer can manage any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role('developer'))
WITH CHECK (public.has_role('developer'));