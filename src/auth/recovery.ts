/**
 * Password-recovery state machine, kept free of React so it can be unit-tested.
 *
 * verifyOtp creates (and persists) a session before the new password is saved, and the
 * code is single-use. So:
 *  - while a reset is unfinished, the app must not see that session (isHidingSession);
 *  - a retry after a failed password update must skip verifyOtp;
 *  - leaving the screen, or the app dying mid-reset, must drop the half-finished session
 *    (local sign-out, which works offline) — a persisted flag covers the crash case.
 */

export const RECOVERY_FLAG = 'savings.recovery-pending';

export interface RecoveryStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The subset of supabase.auth this flow uses. */
export interface RecoveryClient {
  verifyOtp(p: {
    email: string;
    token: string;
    type: 'recovery';
  }): Promise<{ data: { session: unknown }; error: unknown }>;
  updateUser(p: { password: string }): Promise<{ error: unknown }>;
  signOut(p: { scope: 'local' }): Promise<{ error: unknown }>;
  getSession(): Promise<{ data: { session: unknown } }>;
}

export interface RecoveryFlow {
  /** Verifies the code (once) and saves the new password. Resolves with the fresh session. */
  reset(email: string, code: string, newPassword: string): Promise<unknown>;
  /** Drops a half-finished reset (no-op if none). */
  cancel(): Promise<void>;
  /** True while a recovery session exists that the app must not use yet. */
  isHidingSession(): boolean;
}

export function createRecoveryFlow(client: RecoveryClient, storage: RecoveryStorage): RecoveryFlow {
  let inProgress = false;
  let verified = false;

  const finish = async () => {
    verified = false;
    inProgress = false;
    await storage.removeItem(RECOVERY_FLAG);
  };

  return {
    async reset(email, code, newPassword) {
      inProgress = true;
      try {
        if (!verified) {
          await storage.setItem(RECOVERY_FLAG, '1');
          const { error } = await client.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
          if (error) {
            await finish();
            throw error;
          }
          verified = true;
        }
        const { error: updateError } = await client.updateUser({ password: newPassword });
        if (updateError) throw updateError; // keep the verified session hidden for a retry
        const { data } = await client.getSession();
        await finish();
        return data.session;
      } catch (e) {
        if (!verified) inProgress = false;
        throw e;
      }
    },
    async cancel() {
      if (!verified && !inProgress) return;
      await client.signOut({ scope: 'local' }).catch(() => undefined);
      await finish();
    },
    isHidingSession: () => inProgress || verified,
  };
}

/** On startup: if the app died mid-reset, drop that session before anyone uses it. */
export async function clearStaleRecovery(client: RecoveryClient, storage: RecoveryStorage): Promise<boolean> {
  if ((await storage.getItem(RECOVERY_FLAG)) !== '1') return false;
  await client.signOut({ scope: 'local' }).catch(() => undefined);
  await storage.removeItem(RECOVERY_FLAG);
  return true;
}
