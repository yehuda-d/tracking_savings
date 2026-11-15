import { focusManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { queryKeys } from './queryKeys';

const TABLES = ['savings', 'transactions', 'household_members', 'households'] as const;

/**
 * One channel per household. Any change the user is allowed to see (RLS applies)
 * invalidates the cached lists so both phones stay in sync.
 * No row filters: Supabase does not filter DELETE events, and RLS already scopes the rest.
 */
export function useHouseholdRealtime(householdId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!householdId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savings });
      queryClient.invalidateQueries({ queryKey: ['saving'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.household });
    };
    let channel = supabase.channel(`household:${householdId}`);
    for (const table of TABLES) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, invalidate);
    }
    // Resync on every (re)join: events missed while the socket was down are not replayed.
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') invalidate();
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, queryClient]);
}

/** Refetch stale data when the app returns to the foreground. */
export function useAppFocusRefetch() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);
}
