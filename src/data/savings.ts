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
      const id = data as string;
      if (input.fund_id) {
        // Best effort: the saving already exists, so a failure here must not make the user
        // retry (that would create a duplicate). They can link again from the edit screen.
        await supabase
          .from('savings')
          .update({
            fund_id: input.fund_id,
            fund_name: input.fund_name,
            fund_synced_through: input.fund_synced_through,
          })
          .eq('id', id);
      }
      return id;
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
          ...(input.fund_id !== undefined
            ? { fund_id: input.fund_id, fund_name: input.fund_name, fund_synced_through: input.fund_synced_through }
            : {}),
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

export interface ApplyFundYieldInput {
  savingId: string;
  /** YYYYMM of the latest month being applied. */
  through: number;
  kind: 'gain' | 'loss' | null;
  amountAgorot: number;
  note: string | null;
}

/** Records an official fund return (or just marks it as handled) atomically on the server. */
export function useApplyFundYield() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: ApplyFundYieldInput): Promise<void> => {
      const { error } = await supabase.rpc('apply_fund_yield', {
        p_saving_id: i.savingId,
        p_through: i.through,
        p_kind: i.kind,
        p_amount: i.kind ? i.amountAgorot : 0,
        p_note: i.note,
      });
      if (error) throw error;
    },
    onSettled: (_r, _e, i) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.saving(i.savingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions(i.savingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savings });
    },
  });
}
