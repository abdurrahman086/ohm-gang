import { useQuery } from '@tanstack/react-query';
import { fetchProfiles, type UserProfile } from '@/services/apiUsers';
import { isSupabaseConfigured } from '@/config/supabase';

export function useProfiles() {
  return useQuery<UserProfile[]>({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    enabled: isSupabaseConfigured,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });
}