import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Inisialisasi client Supabase. Env wajib diset (Fase 2).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = supabase !== null;

/** Supabase client bertipe — throw kalau env belum diset. */
export function requireSupabase() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi. Cek .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  return supabase;
}