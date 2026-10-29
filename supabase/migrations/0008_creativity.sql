-- 0008_creativity.sql — Ruang Kreativitas (PRD 4.3) + portofolio + bucket creativity
-- Asumsi: dijalankan setelah 0002_rls.sql & 0003_storage.sql.
-- Ide desain: konten kreativitas DIBACA publik (center of attention, PRD 4.4),
-- namun tulis/hapus tetap dibatasi (auth) dan data kas tetap privat.

-- ============ Enum ============
CREATE TYPE idea_category AS ENUM ('ide', 'karya', 'proyek');

-- ============ profiles: kolom portofolio (PRD 4.3.C) ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements TEXT;

-- ============ Tables ============
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category idea_category NOT NULL DEFAULT 'ide',
  description TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.idea_upvotes (
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE public.idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES public.ideas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline DATE,
  closed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============ RLS: ideas ============
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ideas are viewable by everyone"
ON public.ideas FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Members post their own ideas"
ON public.ideas FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors update own ideas"
ON public.ideas FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors delete own ideas"
ON public.ideas FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Officers moderate ideas"
ON public.ideas FOR DELETE TO authenticated
USING (public.is_officer());

-- ============ RLS: idea_upvotes ============
ALTER TABLE public.idea_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Upvote counts are viewable by everyone"
ON public.idea_upvotes FOR SELECT TO anon, authenticated
USING (true);

-- Anti vote-ganda: PK (idea_id, user_id) menolak duplikat
CREATE POLICY "Readers can upvote"
ON public.idea_upvotes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own upvote"
ON public.idea_upvotes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============ RLS: idea_comments ============
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
ON public.idea_comments FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Readers can comment"
ON public.idea_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors delete own comments"
ON public.idea_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Officers moderate comments"
ON public.idea_comments FOR DELETE TO authenticated
USING (public.is_officer());

-- ============ RLS: blog_posts ============
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog posts are viewable by everyone"
ON public.blog_posts FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Members write blog posts"
ON public.blog_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own posts"
ON public.blog_posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors delete own posts"
ON public.blog_posts FOR DELETE TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Officers moderate posts"
ON public.blog_posts FOR DELETE TO authenticated
USING (public.is_officer());

-- ============ RLS: challenges ============
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by everyone"
ON public.challenges FOR SELECT TO anon, authenticated
USING (true);

-- Hanya Wali Kelas & Developer yang membuat/menutup challenge (PRD 4.3.D)
CREATE POLICY "Wali & Developer manage challenges"
ON public.challenges FOR ALL TO authenticated
USING (public.has_role('wali_kelas') OR public.has_role('developer'))
WITH CHECK (public.has_role('wali_kelas') OR public.has_role('developer'));

-- ============ RLS: challenge_submissions ============
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submissions are viewable by everyone"
ON public.challenge_submissions FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Members submit own work"
ON public.challenge_submissions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members delete own submissions"
ON public.challenge_submissions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Officers moderate submissions"
ON public.challenge_submissions FOR DELETE TO authenticated
USING (public.is_officer());

-- ============ Bucket: creativity (publik — karya & ide) ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('creativity', 'creativity', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Creativity bucket readable by everyone"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'creativity');

CREATE POLICY "Authenticated users upload to creativity"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'creativity');

CREATE POLICY "Owners delete own creativity files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'creativity' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Officers moderate creativity files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'creativity' AND public.is_officer());