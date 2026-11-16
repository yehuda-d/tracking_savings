import { clearStaleRecovery, createRecoveryFlow, RECOVERY_FLAG, type RecoveryClient, type RecoveryStorage } from '../recovery';

function fakes(opts: { verifyError?: unknown; updateErrors?: unknown[] } = {}) {
  const store = new Map<string, string>();
  const storage: RecoveryStorage = {
    getItem: jest.fn(async (k) => store.get(k) ?? null),
    setItem: jest.fn(async (k, v) => void store.set(k, v)),
    removeItem: jest.fn(async (k) => void store.delete(k)),
  };
  const updateErrors = [...(opts.updateErrors ?? [])];
  const client: RecoveryClient = {
    verifyOtp: jest.fn(async () => ({ data: { session: { id: 'temp' } }, error: opts.verifyError ?? null })),
    updateUser: jest.fn(async () => ({ error: updateErrors.shift() ?? null })),
    signOut: jest.fn(async () => ({ error: null })),
    getSession: jest.fn(async () => ({ data: { session: { id: 'fresh' } } })),
  };
  return { store, storage, client };
}

describe('recovery flow', () => {
  it('verifies, updates the password, clears the flag and returns the fresh session', async () => {
    const { store, storage, client } = fakes();
    const flow = createRecoveryFlow(client, storage);
    const session = await flow.reset('a@b.co', '123456', 'newpass');
    expect(session).toEqual({ id: 'fresh' });
    expect(client.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.co', token: '123456', type: 'recovery' });
    expect(store.has(RECOVERY_FLAG)).toBe(false);
    expect(flow.isHidingSession()).toBe(false);
  });

  it('after a failed password update, a retry only updates the password (code is single-use)', async () => {
    const { store, storage, client } = fakes({ updateErrors: [{ message: 'same password' }] });
    const flow = createRecoveryFlow(client, storage);
    await expect(flow.reset('a@b.co', '123456', 'oldpass')).rejects.toEqual({ message: 'same password' });
    expect(flow.isHidingSession()).toBe(true);
    expect(store.get(RECOVERY_FLAG)).toBe('1');
    expect(client.signOut).not.toHaveBeenCalled();

    await expect(flow.reset('a@b.co', '123456', 'newpass')).resolves.toEqual({ id: 'fresh' });
    expect(client.verifyOtp).toHaveBeenCalledTimes(1);
    expect(client.updateUser).toHaveBeenCalledTimes(2);
    expect(store.has(RECOVERY_FLAG)).toBe(false);
  });

  it('cancelling a half-finished reset signs out locally and clears the flag', async () => {
    const { store, storage, client } = fakes({ updateErrors: [new TypeError('Network request failed')] });
    const flow = createRecoveryFlow(client, storage);
    await expect(flow.reset('a@b.co', '123456', 'newpass')).rejects.toBeInstanceOf(TypeError);
    await flow.cancel();
    expect(client.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(store.has(RECOVERY_FLAG)).toBe(false);
    expect(flow.isHidingSession()).toBe(false);
  });

  it('cancel after success does nothing', async () => {
    const { storage, client } = fakes();
    const flow = createRecoveryFlow(client, storage);
    await flow.reset('a@b.co', '123456', 'newpass');
    await flow.cancel();
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('a wrong code leaves no flag and no hidden session', async () => {
    const { store, storage, client } = fakes({ verifyError: { message: 'Token has expired or is invalid' } });
    const flow = createRecoveryFlow(client, storage);
    await expect(flow.reset('a@b.co', '000000', 'newpass')).rejects.toEqual({
      message: 'Token has expired or is invalid',
    });
    expect(store.has(RECOVERY_FLAG)).toBe(false);
    expect(flow.isHidingSession()).toBe(false);
    expect(client.updateUser).not.toHaveBeenCalled();
  });
});

describe('clearStaleRecovery', () => {
  it('signs out locally when the app died mid-reset', async () => {
    const { store, storage, client } = fakes();
    store.set(RECOVERY_FLAG, '1');
    await expect(clearStaleRecovery(client, storage)).resolves.toBe(true);
    expect(client.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(store.has(RECOVERY_FLAG)).toBe(false);
  });

  it('does nothing normally', async () => {
    const { storage, client } = fakes();
    await expect(clearStaleRecovery(client, storage)).resolves.toBe(false);
    expect(client.signOut).not.toHaveBeenCalled();
  });
});
