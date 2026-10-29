-- Performance optimization: indexes, caching, debounce
-- Migration: 0013_performance_optimization.sql

-- Index untuk cash_transactions queries (most critical)
CREATE INDEX IF NOT EXISTS idx_cash_transactions_status_type 
  ON public.cash_transactions(status, type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_period_user 
  ON public.cash_transactions(period_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_user_period 
  ON public.cash_transactions(user_id, period_id, type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_created 
  ON public.cash_transactions(created_at DESC);

-- Index untuk profiles (frequent lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

-- Index untuk fund_requests
CREATE INDEX IF NOT EXISTS idx_fund_requests_status 
  ON public.fund_requests(status);
CREATE INDEX IF NOT EXISTS idx_fund_requests_requester 
  ON public.fund_requests(requester_id);

-- Index untuk cash_periods (usually small, but help sorts)
CREATE INDEX IF NOT EXISTS idx_cash_periods_due_date 
  ON public.cash_periods(due_date DESC);

-- Drop existing function before recreate (avoid return type conflict)
DROP FUNCTION IF EXISTS public.get_public_cash_summary();

-- Optimize RPC: reduce generate_series calls by computing only 6 months
CREATE FUNCTION public.get_public_cash_summary()
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

  -- Active period and member counts
  SELECT id INTO active_period FROM public.cash_periods ORDER BY due_date DESC LIMIT 1;
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

-- Ensure RPC permissions remain
REVOKE ALL ON FUNCTION public.get_public_cash_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_cash_summary() TO anon, authenticated;
