-- 0002_rls.sql — Row Level Security + policies (pola SAD §3.2)
-- Asumsi: dijalankan setelah 0001_init.sql.

-- Helper: cek role pengguna saat ini
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = required_role
  );
$$;

-- Helper: role pengurus (keuangan / wali_kelas / developer)
CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('keuangan', 'wali_kelas', 'developer')
  );
$$;

-- ============ profiles ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated users"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============ cash_periods ============
ALTER TABLE public.cash_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cash periods readable by authenticated users"
ON public.cash_periods FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Officers manage cash periods"
ON public.cash_periods FOR ALL TO authenticated
USING (public.has_role('keuangan') OR public.has_role('developer'))
WITH CHECK (public.has_role('keuangan') OR public.has_role('developer'));

-- ============ cash_transactions ============
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: semua authenticated bisa baca transaksi APPROVED (transparansi, PRD)
CREATE POLICY "Approved transactions are viewable by authenticated users"
ON public.cash_transactions FOR SELECT TO authenticated
USING (status = 'approved');

-- Policy: member melihat transaksi miliknya sendiri (termasuk pending/rejected)
CREATE POLICY "Users can view own transactions"
ON public.cash_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy: member insert pembayaran sendiri (SAD §3.2)
CREATE POLICY "Users can insert their own payments"
ON public.cash_transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: keuangan/wali_kelas/developer verifikasi & kelola transaksi (SAD §3.2)
CREATE POLICY "Finance and Admin can manage transactions"
ON public.cash_transactions FOR UPDATE TO authenticated
USING (public.is_officer())
WITH CHECK (public.is_officer());

-- ============ fund_requests ============
ALTER TABLE public.fund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fund requests readable by authenticated users"
ON public.fund_requests FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Members can submit fund requests"
ON public.fund_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id);

-- Approve hanya dari keuangan / wali_kelas / developer
CREATE POLICY "Officers approve fund requests"
ON public.fund_requests FOR UPDATE TO authenticated
USING (public.is_officer())
WITH CHECK (public.is_officer());

-- ============ class_documentations ============
ALTER TABLE public.class_documentations ENABLE ROW LEVEL SECURITY;

-- Galeri tampil di landing publik (anon) + member
CREATE POLICY "Documentations are viewable by everyone"
ON public.class_documentations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Officers manage documentations"
ON public.class_documentations FOR ALL TO authenticated
USING (public.is_officer())
WITH CHECK (public.is_officer());