-- 0014_cash_monthly.sql — RPC untuk agregat keuangan bulanan (landing dashboard)
-- Asumsi: dijalankan setelah 0013 (atau langsung setelah 0011 jika 0012 skip).

-- Agregat income/expense per bulan (6 bulan terakhir) untuk landing public view
CREATE OR REPLACE FUNCTION public.get_cash_monthly_summary()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH monthly_data AS (
    SELECT 
      date_trunc('month', ct.created_at)::date AS month_start,
      EXTRACT(MONTH FROM date_trunc('month', ct.created_at))::int AS month_index,
      EXTRACT(YEAR FROM date_trunc('month', ct.created_at))::int AS year_val,
      COALESCE(SUM(ct.amount) FILTER (WHERE ct.type = 'income' AND ct.status = 'approved'), 0) AS income_total,
      COALESCE(SUM(ct.amount) FILTER (WHERE ct.type = 'expense'), 0) AS expense_total
    FROM public.cash_transactions ct
    WHERE ct.created_at >= NOW() - INTERVAL '6 months'
    GROUP BY date_trunc('month', ct.created_at)
  )
  SELECT json_agg(json_build_object(
    'monthIndex', md.month_index,
    'year', md.year_val,
    'income', md.income_total,
    'expense', md.expense_total,
    'balance', md.income_total - md.expense_total
  ) ORDER BY md.month_start)
  FROM monthly_data md;
$$;

-- Agregat transaksi terakhir (5-10 item publik, tanpa proof_url)
CREATE OR REPLACE FUNCTION public.get_recent_transactions(limit_count int DEFAULT 5)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_agg(json_build_object(
    'id', ct.id,
    'type', ct.type,
    'amount', ct.amount,
    'status', ct.status,
    'method', ct.method,
    'created_at', ct.created_at,
    'note', ct.note
  ) ORDER BY ct.created_at DESC)
  FROM (
    SELECT * FROM public.cash_transactions
    WHERE status IN ('approved', 'pending')
    ORDER BY created_at DESC
    LIMIT limit_count
  ) ct;
$$;