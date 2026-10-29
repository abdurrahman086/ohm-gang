-- 0011_security_hardening.sql — server-side authorization for money and uploads.

-- Only developers may change identity/role fields on profiles.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile identity is immutable';
  END IF;
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.full_name IS DISTINCT FROM OLD.full_name
      OR NEW.student_id_number IS DISTINCT FROM OLD.student_id_number
      OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
      OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     AND NOT public.has_role('developer'::public.user_role) THEN
    RAISE EXCEPTION 'Only developers may change identity or role fields';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, role, bio, interests, achievements, created_at)
ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_profiles()
RETURNS TABLE (id uuid, full_name text, student_id_number text, role public.user_role, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('developer'::public.user_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.student_id_number, p.role, p.created_at
    FROM public.profiles p ORDER BY p.created_at;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_profiles() TO authenticated;

-- Payments may only be submitted as the signed-in user's pending income for
-- the exact period amount. Expenses may only be entered by finance/developers.
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.cash_transactions;
CREATE POLICY "Valid payment or officer expense insert"
ON public.cash_transactions FOR INSERT TO authenticated
WITH CHECK (
  amount > 0
  AND user_id = auth.uid()
  AND verified_by IS NULL
  AND (
    (
      type = 'income'
      AND status = 'pending'
      AND period_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.cash_periods p
        WHERE p.id = period_id AND p.amount = cash_transactions.amount
      )
      AND (proof_url IS NULL OR (storage.foldername(proof_url))[1] = auth.uid()::text)
    )
    OR
    (
      type = 'expense'
      AND status = 'approved'
      AND period_id IS NULL
      AND proof_url IS NULL
      AND (public.has_role('keuangan'::public.user_role) OR public.has_role('developer'::public.user_role))
    )
  )
);

DROP POLICY IF EXISTS "Finance and Admin can manage transactions" ON public.cash_transactions;
CREATE POLICY "Finance can verify pending income"
ON public.cash_transactions FOR UPDATE TO authenticated
USING (
  type = 'income' AND status = 'pending'
  AND (public.has_role('keuangan'::public.user_role) OR public.has_role('developer'::public.user_role))
)
WITH CHECK (
  type = 'income' AND status IN ('approved', 'rejected')
  AND (public.has_role('keuangan'::public.user_role) OR public.has_role('developer'::public.user_role))
);

CREATE OR REPLACE FUNCTION public.protect_transaction_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.period_id IS DISTINCT FROM OLD.period_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.proof_url IS DISTINCT FROM OLD.proof_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Transaction identity and payment details are immutable';
  END IF;
  IF OLD.status <> 'pending'
     OR NEW.status NOT IN ('approved', 'rejected')
     OR NEW.verified_by IS DISTINCT FROM auth.uid()
     OR NEW.verified_by = OLD.user_id THEN
    RAISE EXCEPTION 'Invalid payment status transition';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_transaction_updates
BEFORE UPDATE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.protect_transaction_updates();

-- Keep the private storage path out of ordinary transaction queries.
REVOKE SELECT ON public.cash_transactions FROM anon, authenticated;
GRANT SELECT (id, user_id, period_id, type, amount, method, status, note,
  verified_by, created_at, updated_at)
ON public.cash_transactions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_payment_proof_path(p_transaction_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.proof_url
  FROM public.cash_transactions t
  WHERE t.id = p_transaction_id
    AND t.proof_url IS NOT NULL
    AND (
      t.user_id = auth.uid()
      OR public.is_officer()
    );
$$;
REVOKE ALL ON FUNCTION public.get_payment_proof_path(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payment_proof_path(uuid) TO authenticated;

-- Public financial data is aggregate-only; never expose transaction rows anonymously.
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
BEGIN
  SELECT COALESCE(sum(amount) FILTER (WHERE type = 'income'), 0),
         COALESCE(sum(amount) FILTER (WHERE type = 'expense'), 0),
         COALESCE(sum(amount) FILTER (WHERE type = 'expense' AND created_at >= now() - interval '30 days'), 0)
    INTO income_total, expense_total, recent_expense
    FROM public.cash_transactions WHERE status = 'approved';

  SELECT id INTO active_period FROM public.cash_periods ORDER BY due_date DESC LIMIT 1;
  SELECT count(*) INTO member_count FROM public.profiles WHERE role = 'member';
  IF active_period IS NOT NULL THEN
    SELECT count(DISTINCT user_id) INTO paid_count FROM public.cash_transactions
      WHERE period_id = active_period AND type = 'income' AND status = 'approved';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'monthIndex', extract(month FROM m.month_start)::int,
    'income', COALESCE(x.income, 0),
    'expense', COALESCE(x.expense, 0)
  ) ORDER BY m.month_start), '[]'::jsonb)
  INTO monthly_data
  FROM generate_series(
    date_trunc('month', now()) - interval '5 months',
    date_trunc('month', now()), interval '1 month'
  ) AS m(month_start)
  LEFT JOIN LATERAL (
    SELECT sum(amount) FILTER (WHERE type = 'income') AS income,
           sum(amount) FILTER (WHERE type = 'expense') AS expense
    FROM public.cash_transactions t
    WHERE t.status = 'approved'
      AND t.created_at >= m.month_start
      AND t.created_at < m.month_start + interval '1 month'
  ) x ON true;

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

-- Approval and rejection are atomic and cannot be forged by direct table UPDATE.
ALTER TABLE public.fund_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
DROP POLICY IF EXISTS "Officers approve fund requests" ON public.fund_requests;
REVOKE UPDATE ON public.fund_requests FROM authenticated;
DROP POLICY IF EXISTS "Members can submit fund requests" ON public.fund_requests;
CREATE POLICY "Users submit valid pending fund requests"
ON public.fund_requests FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
  AND amount > 0
  AND status = 'pending'
  AND rejection_reason IS NULL
  AND approved_by_keuangan IS NULL
  AND approved_by_wali_kelas IS NULL
);

CREATE OR REPLACE FUNCTION public.approve_fund_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_row public.fund_requests%ROWTYPE;
  actor_role public.user_role;
  complete boolean;
BEGIN
  SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();
  IF actor_role IS NULL OR actor_role NOT IN ('keuangan', 'wali_kelas', 'developer') THEN
    RAISE EXCEPTION 'Not authorized to approve fund requests';
  END IF;

  SELECT * INTO request_row FROM public.fund_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Fund request is missing or no longer pending';
  END IF;

  IF request_row.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid fund request amount';
  END IF;

  IF actor_role = 'keuangan' THEN
    IF request_row.approved_by_keuangan IS NOT NULL THEN
      RAISE EXCEPTION 'Finance approval already recorded';
    END IF;
    IF request_row.approved_by_wali_kelas = auth.uid() THEN
      RAISE EXCEPTION 'Two approvals must come from different users';
    END IF;
    UPDATE public.fund_requests SET approved_by_keuangan = auth.uid() WHERE id = p_request_id;
  ELSIF actor_role = 'wali_kelas' THEN
    IF request_row.amount <= 100000 OR request_row.approved_by_wali_kelas IS NOT NULL THEN
      RAISE EXCEPTION 'Wali approval is not required or already recorded';
    END IF;
    IF request_row.approved_by_keuangan = auth.uid() THEN
      RAISE EXCEPTION 'Two approvals must come from different users';
    END IF;
    UPDATE public.fund_requests SET approved_by_wali_kelas = auth.uid() WHERE id = p_request_id;
  ELSE
    IF request_row.approved_by_keuangan IS NULL THEN
      IF request_row.approved_by_wali_kelas = auth.uid() THEN
        RAISE EXCEPTION 'Two approvals must come from different users';
      END IF;
      UPDATE public.fund_requests SET approved_by_keuangan = auth.uid() WHERE id = p_request_id;
    ELSIF request_row.amount > 100000 AND request_row.approved_by_wali_kelas IS NULL THEN
      IF request_row.approved_by_keuangan = auth.uid() THEN
        RAISE EXCEPTION 'Two approvals must come from different users';
      END IF;
      UPDATE public.fund_requests SET approved_by_wali_kelas = auth.uid() WHERE id = p_request_id;
    ELSE
      RAISE EXCEPTION 'All required approvals are already recorded';
    END IF;
  END IF;

  SELECT * INTO request_row FROM public.fund_requests
  WHERE id = p_request_id FOR UPDATE;
  complete := request_row.approved_by_keuangan IS NOT NULL
    AND (request_row.amount <= 100000 OR request_row.approved_by_wali_kelas IS NOT NULL);

  IF complete THEN
    UPDATE public.fund_requests SET status = 'approved' WHERE id = p_request_id;
    INSERT INTO public.cash_transactions (user_id, type, amount, method, status, note, verified_by)
    VALUES (request_row.requester_id, 'expense', request_row.amount, 'cash', 'approved',
      'Pengajuan dana: ' || request_row.title, auth.uid());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_fund_request(p_request_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_officer() THEN
    RAISE EXCEPTION 'Not authorized to reject fund requests';
  END IF;
  UPDATE public.fund_requests
  SET status = 'rejected', rejection_reason = NULLIF(trim(p_reason), '')
  WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund request is missing or no longer pending';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_fund_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_fund_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_fund_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_fund_request(uuid, text) TO authenticated;

-- Server-side upload limits and owner-folder enforcement.
UPDATE storage.buckets
SET file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']
WHERE id IN ('proof-payments', 'creativity');

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id = 'gallery';

DROP POLICY IF EXISTS "Authenticated users upload to creativity" ON storage.objects;
CREATE POLICY "Users upload own creativity files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'creativity'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
