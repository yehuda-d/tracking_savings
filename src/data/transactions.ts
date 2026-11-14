import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Transaction } from '@/lib/types';

import { queryKeys } from './queryKeys';

export function useTransactions(savingId: string) {
  return useQuery({
    queryKey: queryKeys.transactions(savingId),
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions_with_author')
        .select('*')
        .eq('saving_id', savingId)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: Boolean(savingId),
  });
}

export interface AddTransactionInput {
  savingId: string;
  kind: 'deposit' | 'withdrawal';
  amountAgorot: number;
  occurredOn: string;
  note: string | null;
}

function useInvalidateSaving() {
  const queryClient = useQueryClient();
  return (savingId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(savingId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.saving(savingId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.savings });
  };
}

export function useAddTransaction() {
  const invalidate = useInvalidateSaving();
  return useMutation({
    mutationFn: async (input: AddTransactionInput): Promise<void> => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('transactions').insert({
        saving_id: input.savingId,
        kind: input.kind,
        amount_agorot: input.amountAgorot,
        occurred_on: input.occurredOn,
        note: input.note,
        created_by: auth.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_void, input) => invalidate(input.savingId),
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateSaving();
  return useMutation({
    mutationFn: async ({ id }: { id: string; savingId: string }): Promise<void> => {
      const { data, error } = await supabase.from('transactions').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('NOT_FOUND');
    },
    onSuccess: (_void, { savingId }) => invalidate(savingId),
  });
}
