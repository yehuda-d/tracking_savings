import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Household> => {
      const { data, error } = await supabase.rpc('create_household', { p_name: name });
      if (error) throw error;
      return data as Household;
    },
    onSuccess: (household) => queryClient.setQueryData(queryKeys.household, household),
  });
}

export function useJoinHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<Household> => {
      const { data, error } = await supabase.rpc('join_household', { p_code: code });
      if (error) throw error;
      return data as Household;
    },
    onSuccess: (household) => queryClient.setQueryData(queryKeys.household, household),
  });
}
