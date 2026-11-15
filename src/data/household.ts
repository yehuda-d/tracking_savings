import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Household, Member } from '@/lib/types';

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

export function useMembers() {
  const household = useMyHousehold();
  const householdId = household.data?.id;
  return useQuery({
    queryKey: queryKeys.members,
    enabled: Boolean(householdId),
    queryFn: async (): Promise<Member[]> => {
      const { data: rows, error } = await supabase
        .from('household_members')
        .select('user_id, role, joined_at')
        .eq('household_id', householdId!)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id as string);
      const { data: profiles, error: pError } = ids.length
        ? await supabase.from('profiles').select('id, display_name').in('id', ids)
        : { data: [], error: null };
      if (pError) throw pError;
      const names = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string]));
      return (rows ?? []).map((r) => ({
        user_id: r.user_id as string,
        role: r.role as Member['role'],
        joined_at: r.joined_at as string,
        display_name: names.get(r.user_id as string) ?? '',
      }));
    },
  });
}

export function useRenameHousehold() {
  const queryClient = useQueryClient();
  const household = useMyHousehold();
  return useMutation({
    mutationFn: async (name: string): Promise<void> => {
      const { data, error } = await supabase
        .from('households')
        .update({ name: name.trim() })
        .eq('id', household.data!.id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('NOT_OWNER');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.household }),
  });
}

export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('regenerate_invite_code');
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.household }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const { error } = await supabase.rpc('remove_member', { p_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members }),
  });
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    /** confirmDelete must be true to leave as the last member (deletes the household). */
    mutationFn: async (confirmDelete: boolean): Promise<void> => {
      const { error } = await supabase.rpc('leave_household', { p_confirm_delete: confirmDelete });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.savings });
      queryClient.removeQueries({ queryKey: queryKeys.members });
      queryClient.setQueryData(queryKeys.household, null);
    },
  });
}
