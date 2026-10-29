-- Phase 2 lanjutan: RPC ringkasan kas memakai periode aktif (is_active), bukan due_date terbaru.
-- Migration: 0015_active_period_summary.sql
-- CATATAN: jangan terapkan ke Supabase produksi tanpa backup + uji di lokal/staging (AGENTS.md).

CREATE OR REPLACE FUNCTION public.get_public_cash_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  income_total numeric := 0;
  expense_total numeric := 0;
  recent_expense numeric := 0;
  monthly_data jsonb;
  member_count bigint := 0;
  paid_count bigint := 0;
  active_period uuid;
  this_month date;
BEGIN
  -- Totals (single scan with FILTER)
  SELECT COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0),
         COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0),
         COALESCE(sum(amount) FILTER (WHERE type = 'expense' AND created_at >= now() - interval '30 days'), 0)
    INTO income_total, expense_total, recent_expense
    FROM public.cash_transactions WHERE status = 'approved';

  -- Periode aktif dipilih manual (migrasi 0014); fallback ke jatuh tempo terbaru.
  SELECT id INTO active_period FROM public.cash_periods
    WHERE is_active ORDER BY due_date DESC LIMIT 1;
  IF active_period IS NULL THEN
    SELECT id INTO active_period FROM public.cash_periods ORDER BY due_date DESC LIMIT 1;
  END IF;

  SELECT count(*) INTO member_count FROM public.profiles WHERE role = 'member';
  IF active_period IS NOT NULL THEN
    SELECT count(DISTINCT user_id) INTO paid_count FROM public.cash_transactions
      WHERE period_id = active_period AND type = 'income' AND status = 'approved';
  END IF;

  -- Monthly data: cache-friendly aggregate (6 months only, no LATERAL)
  this_month := date_trunc('month', now())::date;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'monthIndex', extract(month FROM month_date)::int,
      'income', COALESCE(m_income, 0),
      'expense', COALESCE(m_expense, 0)
    ) ORDER BY month_date
  ), '[]'::jsonb)
  INTO monthly_data
  FROM (
    SELECT
      date_trunc('month', this_month)::date - interval '5 months' * i AS month_date,
      sum(amount) FILTER (WHERE type = 'income' AND status = 'approved') AS m_income,
      sum(amount) FILTER (WHERE type = 'expense' AND status = 'approved') AS m_expense
    FROM generate_subscripts(ARRAY[0,1,2,3,4,5], 1) AS _(i)
    LEFT JOIN public.cash_transactions t ON (
      date_trunc('month', t.created_at) = date_trunc('month', this_month)::date - interval '5 months' * i
    )
    GROUP BY month_date
  ) monthly_aggregate;

  RETURN jsonb_build_object(
    'totalIncome', income_total,
    'totalExpense', expense_total,
    'estimatedMonthlyExpense', CASE WHEN recent_expense > 0 THEN recent_expense ELSE expense_total END,
    'arrearsRatio', CASE WHEN member_count > 0 THEN greatest(0, 1 - paid_count::numeric / member_count) ELSE 0 END,
    'monthly', monthly_data
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_cash_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_cash_summary() TO anon, authenticated;
