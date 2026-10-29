-- 0003_storage.sql — Storage buckets + policy akses bukti transfer & galeri
-- Asumsi: dijalankan setelah 0002_rls.sql.

-- ============ Buckets ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-payments', 'proof-payments', false)   -- bukti bayar: PRIVAT
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)                  -- galeri kelas: publik (landing)
ON CONFLICT (id) DO NOTHING;

-- ============ proof-payments (privat) ============
-- Upload: hanya pemilik (folder <uid>/...)
CREATE POLICY "Users upload own payment proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proof-payments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Baca: pemilik + pengurus (keuangan/wali_kelas/developer)
CREATE POLICY "Owner and officers read payment proof"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proof-payments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_officer()
  )
);

-- Hapus: pemilik
CREATE POLICY "Owner deletes own payment proof"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proof-payments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============ gallery (publik) ============
-- Baca: siapa saja (bucket public, policy opsional tapi eksplisit)
CREATE POLICY "Gallery readable by everyone"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'gallery');

-- Upload/hapus: pengurus
CREATE POLICY "Officers manage gallery"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'gallery' AND public.is_officer());

CREATE POLICY "Officers delete gallery items"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery' AND public.is_officer());