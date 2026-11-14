import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { SavingWithBalance } from '@/lib/types';

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
