import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { todayLocalISO } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { SavingInput, SavingWithBalance } from '@/lib/types';

import { queryKeys } from './queryKeys';

export function useSavings() {
  return useQuery({
    queryKey: queryKeys.savings,
    queryFn: async (): Promise<SavingWithBalance[]> => {
      const { data, error } = await supabase
        .from('savings_with_balance')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SavingWithBalance[];
    },
  });
}

export function useSaving(id: string) {
  return useQuery({
    queryKey: queryKeys.saving(id),
    queryFn: async (): Promise<SavingWithBalance | null> => {
      const { data, error } = await supabase.from('savings_with_balance').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return (data as SavingWithBalance | null) ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavingInput & { openingAgorot: number }): Promise<string> => {
      const { data, error } = await supabase.rpc('create_saving', {
        p_purpose: input.purpose,
        p_location_type: input.location_type,
        p_institution: input.institution,
        p_notes: input.notes,
        p_opening_agorot: input.openingAgorot,
        p_goal_agorot: input.goal_agorot,
        p_goal_date: input.goal_date,
        p_opened_on: todayLocalISO(),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savings }),
  });
}

export function useUpdateSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & SavingInput): Promise<void> => {
      const { data, error } = await supabase
        .from('savings')
        .update({
          purpose: input.purpose,
          location_type: input.location_type,
          institution: input.institution,
          notes: input.notes,
          goal_agorot: input.goal_agorot,
          goal_date: input.goal_date,
        })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('NOT_FOUND');
    },
    onSuccess: (_void, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savings });
      queryClient.invalidateQueries({ queryKey: queryKeys.saving(id) });
    },
  });
}

export function useDeleteSaving() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('savings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_void, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.saving(id) });
      queryClient.removeQueries({ queryKey: queryKeys.transactions(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savings });
    },
  });
}
