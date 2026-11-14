import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Household } from '@/lib/types';

import { queryKeys } from './queryKeys';

async function fetchMyHousehold(): Promise<Household | null> {
  const { data: householdId, error } = await supabase.rpc('my_household_id');
  if (error) throw error;
  if (!householdId) return null;
  const { data, error: hError } = await supabase.from('households').select('*').eq('id', householdId).maybeSingle();
  if (hError) throw hError;
  return (data as Household | null) ?? null;
}

export function useMyHousehold() {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.household,
    queryFn: fetchMyHousehold,
    enabled: Boolean(session),
  });
}
