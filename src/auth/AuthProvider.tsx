import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

import { clearStaleRecovery, createRecoveryFlow } from './recovery';

export interface AuthValue {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  /** Resolves to true when the user is signed in right away (email confirmation off). */
  signUp(email: string, password: string, displayName: string): Promise<boolean>;
  signOut(): Promise<void>;
  /** Emails a recovery code. Resolves even for unknown emails (no account enumeration). */
  requestPasswordReset(email: string): Promise<void>;
  /** Verifies the emailed code, sets the new password, and signs the user in. */
  resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<void>;
  /** Drops a half-finished reset (call when leaving the reset screen). */
  cancelPasswordReset(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // While a recovery is unfinished its temporary session is kept from the app, so the
  // route guard doesn't jump to home before the new password is saved (see recovery.ts).
  const recovery = useRef(createRecoveryFlow(supabase.auth, AsyncStorage));

  useEffect(() => {
    let active = true;
    clearStaleRecovery(supabase.auth, AsyncStorage)
      .catch(() => false)
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (recovery.current.isHidingSession()) return;
      setSession(next);
      if (!next) queryClient.clear();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      },
      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        return Boolean(data.session);
      },
      async signOut() {
        await supabase.auth.signOut();
        queryClient.clear();
      },
      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
      },
      async resetPasswordWithCode(email, code, newPassword) {
        const fresh = await recovery.current.reset(email, code, newPassword);
        setSession(fresh as Session | null);
      },
      async cancelPasswordReset() {
        await recovery.current.cancel();
      },
    }),
    [session, loading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
