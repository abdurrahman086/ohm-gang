-- 0016_fund_request_approval.sql
-- Perbaikan: isi migrasi 0011 yang tercatat "applied" tetapi tidak ada di database.
-- Yang dipulihkan HANYA bagian persetujuan pengajuan dana + akses bukti bayar.
-- Bagian kas (policy cash_transactions, get_public_cash_summary) TIDAK diulang
-- karena sudah digantikan migrasi 0012/0013/0015.

-- ============ fund_requests ============
ALTER TABLE public.fund_requests ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Persetujuan/penolakan hanya lewat RPC (tidak boleh UPDATE langsung dari client).
DROP POLICY IF EXISTS "Officers approve fund requests" ON public.fund_requests;
REVOKE UPDATE ON public.fund_requests FROM authenticated;

-- Ganti policy insert lama yang tidak memaksa status pending.
DROP POLICY IF EXISTS "Members can submit fund requests" ON public.fund_requests;
DROP POLICY IF EXISTS "Users submit valid pending fund requests" ON public.fund_requests;
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

-- ============ RPC: approve_fund_request ============
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

-- ============ RPC: reject_fund_request ============
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

-- ============ Akses bukti bayar (tombol "Bukti" di Manajemen Kas) ============
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
