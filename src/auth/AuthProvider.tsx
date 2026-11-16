import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

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
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // While a recovery is in progress the temporary session is kept from the app, so the
  // route guard doesn't jump to home before the new password is saved.
  const recovering = useRef(false);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (recovering.current) return;
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
        recovering.current = true;
        try {
          const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
          if (error) throw error;
          const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
          if (updateError) {
            await supabase.auth.signOut();
            throw updateError;
          }
          setSession(data.session);
        } finally {
          recovering.current = false;
        }
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
