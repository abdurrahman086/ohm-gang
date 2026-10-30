-- 0020_payment_waivers.sql
-- Bypass lunas untuk data lama: menandai siswa lunas tanpa menambah saldo kas.
-- Additive: tidak mengubah data transaksi/periode yang sudah ada.

CREATE TABLE IF NOT EXISTS public.cash_payment_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.cash_periods(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  rejection_reason text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_cash_payment_waivers_period_status
  ON public.cash_payment_waivers (period_id, status);

ALTER TABLE public.cash_payment_waivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own or officer read payment waivers" ON public.cash_payment_waivers;
CREATE POLICY "Own or officer read payment waivers"
ON public.cash_payment_waivers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_officer());

REVOKE INSERT, UPDATE, DELETE ON public.cash_payment_waivers FROM authenticated;
GRANT SELECT ON public.cash_payment_waivers TO authenticated;

-- Bendahara mengajukan bypass. Tidak mengubah cash_transactions.
CREATE OR REPLACE FUNCTION public.request_payment_waiver(
  p_user_id uuid,
  p_period_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role public.user_role;
  target_role public.user_role;
  waiver_id uuid;
BEGIN
  SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
  IF actor_role IS NULL OR actor_role NOT IN ('keuangan', 'developer') THEN
    RAISE EXCEPTION 'Hanya bendahara yang dapat mengajukan bypass';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = p_user_id;
  IF target_role IS NULL OR target_role <> 'member' THEN
    RAISE EXCEPTION 'Bypass hanya untuk siswa';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Alasan bypass wajib diisi';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.cash_periods WHERE id = p_period_id) THEN
    RAISE EXCEPTION 'Periode tidak ditemukan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cash_transactions
    WHERE user_id = p_user_id
      AND period_id = p_period_id
      AND type = 'income'
      AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'Siswa sudah punya pembayaran aktif untuk periode ini';
  END IF;

  INSERT INTO public.cash_payment_waivers (user_id, period_id, requested_by, reason)
  VALUES (p_user_id, p_period_id, auth.uid(), trim(p_reason))
  ON CONFLICT (user_id, period_id) DO UPDATE
  SET requested_by = excluded.requested_by,
      reason = excluded.reason,
      status = 'pending',
      approved_by = NULL,
      rejection_reason = NULL,
      updated_at = now()
  WHERE public.cash_payment_waivers.status <> 'approved'
  RETURNING id INTO waiver_id;

  IF waiver_id IS NULL THEN
    RAISE EXCEPTION 'Bypass sudah disetujui untuk siswa ini';
  END IF;

  RETURN waiver_id;
END;
$$;

-- Verifikasi hanya oleh wali kelas. Approve = lunas tanpa pemasukan.
CREATE OR REPLACE FUNCTION public.verify_payment_waiver(
  p_waiver_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role public.user_role;
  waiver_row public.cash_payment_waivers%ROWTYPE;
BEGIN
  SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
  IF actor_role IS NULL OR actor_role <> 'wali_kelas' THEN
    RAISE EXCEPTION 'Hanya wali kelas yang dapat memverifikasi bypass';
  END IF;

  SELECT * INTO waiver_row
  FROM public.cash_payment_waivers
  WHERE id = p_waiver_id
  FOR UPDATE;

  IF NOT FOUND OR waiver_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Bypass tidak ditemukan atau sudah diproses';
  END IF;

  IF p_approve THEN
    IF EXISTS (
      SELECT 1 FROM public.cash_transactions
      WHERE user_id = waiver_row.user_id
        AND period_id = waiver_row.period_id
        AND type = 'income'
        AND status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Siswa sudah punya pembayaran disetujui';
    END IF;

    UPDATE public.cash_payment_waivers
    SET status = 'approved',
        approved_by = auth.uid(),
        rejection_reason = NULL,
        updated_at = now()
    WHERE id = p_waiver_id;
  ELSE
    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
      RAISE EXCEPTION 'Alasan penolakan wajib diisi';
    END IF;

    UPDATE public.cash_payment_waivers
    SET status = 'rejected',
        approved_by = NULL,
        rejection_reason = trim(p_reason),
        updated_at = now()
    WHERE id = p_waiver_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_payment_waiver(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_payment_waiver(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payment_waiver(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_waiver(uuid, boolean, text) TO authenticated;

-- Ringkasan: waiver approved ikut dihitung lunas untuk rasio tunggakan,
-- tetapi tidak menambah income/expense/saldo.
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
  SELECT COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0),
         COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0),
         COALESCE(sum(amount) FILTER (WHERE type = 'expense' AND created_at >= now() - interval '30 days'), 0)
    INTO income_total, expense_total, recent_expense
    FROM public.cash_transactions WHERE status = 'approved';

  SELECT id INTO active_period FROM public.cash_periods
    WHERE is_active ORDER BY due_date DESC LIMIT 1;
  IF active_period IS NULL THEN
    SELECT id INTO active_period FROM public.cash_periods ORDER BY due_date DESC LIMIT 1;
  END IF;

  SELECT count(*) INTO member_count FROM public.profiles WHERE role = 'member';
  IF active_period IS NOT NULL THEN
    SELECT count(DISTINCT user_id) INTO paid_count FROM (
      SELECT user_id FROM public.cash_transactions
        WHERE period_id = active_period AND type = 'income' AND status = 'approved'
      UNION
      SELECT user_id FROM public.cash_payment_waivers
        WHERE period_id = active_period AND status = 'approved'
    ) paid;
  END IF;

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
