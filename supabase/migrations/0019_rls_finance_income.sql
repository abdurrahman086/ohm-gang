-- 0019_rls_finance_income.sql — allow bendahara catat pemasukan lainnya

DROP POLICY IF EXISTS "Finance records other income" ON public.cash_transactions;

CREATE POLICY "Finance records other income"
ON public.cash_transactions FOR INSERT TO authenticated
WITH CHECK (
  public.has_role('keuangan') OR public.has_role('wali_kelas') OR public.has_role('developer')
);
