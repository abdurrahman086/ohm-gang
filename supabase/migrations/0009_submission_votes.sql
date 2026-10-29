-- 0009_submission_votes.sql — Voting submission challenge (PRD 4.3.D)
-- Asumsi: dijalankan setelah 0008_creativity.sql.
-- Voting terbuka antar anggota; PK (submission_id, user_id) anti vote-ganda.

CREATE TABLE public.submission_votes (
  submission_id UUID REFERENCES public.challenge_submissions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (submission_id, user_id)
);

ALTER TABLE public.submission_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone"
ON public.submission_votes FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Readers can vote once"
ON public.submission_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own vote"
ON public.submission_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);