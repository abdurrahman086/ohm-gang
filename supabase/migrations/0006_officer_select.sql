-- 0006_officer_select.sql — Pengurus melihat SEMUA transaksi (termasuk pending orang lain)
-- Ditemukan saat E2E Fase 5: bendahara tidak bisa list pending milik siswa.
-- Asumsi: dijalankan setelah 0002_rls.sql.

CREATE POLICY "Officers can view all transactions"
ON public.cash_transactions FOR SELECT TO authenticated
USING (public.is_officer());