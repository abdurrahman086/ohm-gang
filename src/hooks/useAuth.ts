import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore, type UserProfile } from '@/store/useAuthStore';
import { requireSupabase } from '@/config/supabase';

async function fetchProfile(userId: string): Promise<UserProfile> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('profiles')
    .select('id,full_name,avatar_url,role,bio,interests,achievements,created_at')
    .eq('id', userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Profil akun tidak ditemukan. Hubungi wali kelas untuk memeriksa akun.');
  return { ...data, student_id_number: null, phone_number: null } as UserProfile;
}

/**
 * Auth lifecycle: session loading, onAuthStateChange, login/logout.
 * Profil (termasuk role) disimpan di useAuthStore.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    const sb = requireSupabase();

    let mounted = true;
    let request = 0;

    const syncSession = async (session: Session | null) => {
      const currentRequest = ++request;
      if (!session) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      setAuthReady(false);
      try {
        const profile = await fetchProfile(session.user.id);
        if (mounted && currentRequest === request) setUser(profile);
      } catch (error) {
        if (mounted && currentRequest === request) {
          console.error('fetchProfile:', error);
          setUser(null);
        }
      } finally {
        if (mounted && currentRequest === request) setAuthReady(true);
      }
    };

    void sb.auth.getSession()
      .then(({ data }) => syncSession(data.session))
      .catch((error: unknown) => {
        if (!mounted) return;
        console.error('getSession:', error);
        setUser(null);
        setAuthReady(true);
      });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setAuthReady, setUser]);

  const signIn = async (email: string, password: string) => {
    const sb = requireSupabase();
    setAuthReady(false);
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await fetchProfile(data.user.id);
      setUser(profile);
    } catch (error) {
      setUser(null);
      await sb.auth.signOut();
      throw error;
    } finally {
      setAuthReady(true);
    }
  };

  const signOut = async () => {
    try {
      // scope 'local': hapus sesi di browser tanpa menunggu request ke server,
      // supaya tombol Keluar tidak menggantung saat jaringan lambat.
      await requireSupabase().auth.signOut({ scope: 'local' });
    } catch {
      // Diabaikan: sesi lokal sudah dibersihkan oleh supabase-js.
    } finally {
      // Full reload: bersihkan cache React Query + state, lalu mendarat di halaman utama.
      window.location.replace('/');
    }
  };

  return {
    user,
    role: user?.role ?? null,
    authReady,
    signIn,
    signOut,
  };
}
