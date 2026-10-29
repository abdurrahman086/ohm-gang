-- 0001_init.sql — Skema dasar: enum + tabel (SAD §3.1)
-- Jalankan di Supabase → SQL Editor, atau via Supabase CLI `supabase db push`.

-- ============ Enums ============
CREATE TYPE user_role AS ENUM ('member', 'keuangan', 'wali_kelas', 'developer');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_method AS ENUM ('transfer', 'qris', 'cash', 'e_wallet');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

-- ============ Tables ============
-- Table: profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  student_id_number TEXT UNIQUE, -- NIS / NISN
  avatar_url TEXT,
  role user_role DEFAULT 'member'::user_role NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: cash_periods (Periode Pembayaran Kas Minggu/Bulan)
CREATE TABLE public.cash_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, -- Contoh: "Kas Minggu Ke-1 September"
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL, -- Contoh: 5000.00
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: cash_transactions (Transaksi Kas)
CREATE TABLE public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES public.cash_periods(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  proof_url TEXT, -- URL Gambar Bukti Bayar
  note TEXT,
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: fund_requests (Pengajuan Dana / Reimbursement)
CREATE TABLE public.fund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  approved_by_keuangan UUID REFERENCES public.profiles(id),
  approved_by_wali_kelas UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table: class_documentations (Galeri & Kegiatan)
CREATE TABLE public.class_documentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  event_date DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============ Trigger: buat profil saat user auth baru daftar ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Siswa'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();