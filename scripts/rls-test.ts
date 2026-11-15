/**
 * End-to-end security test against the real Supabase project.
 * Creates temporary users, checks household isolation and balance rules,
 * then deletes everything it created (even when a check fails).
 *
 * Run: npm run test:rls   (needs .env and .env.local, see docs/supabase-setup.md)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (.env) or SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  process.exit(2);
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, noSession);

const runId = Math.random().toString(36).slice(2, 8);
const password = `Rls-${runId}-${Math.random().toString(36).slice(2)}!`;
const createdUsers: string[] = [];
const createdHouseholds = new Set<string>();

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`✓ ${name}`);
  else {
    failures++;
    console.log(`✗ ${name}`, detail ?? '');
  }
}

async function makeUser(label: string): Promise<{ id: string; client: SupabaseClient }> {
  const email = `rls-test-${runId}-${label}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `בדיקה ${label}` },
  });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
  createdUsers.push(data.user.id);
  const client = createClient(url!, anonKey!, noSession);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn ${label}: ${signInError.message}`);
  return { id: data.user.id, client };
}

function utcDatePlus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const errMsg = (e: { message?: string } | null) => e?.message ?? '';

async function main() {
  const A = await makeUser('a');
  const B = await makeUser('b');
  const C = await makeUser('c');

  // 1. A creates household + saving with opening 500 ₪
  const { data: hA, error: hAErr } = await A.client.rpc('create_household', { p_name: 'A' });
  if (hAErr || !hA) throw new Error(`create_household A: ${hAErr?.message}`);
  createdHouseholds.add(hA.id);
  const { data: savingId, error: sErr } = await A.client.rpc('create_saving', {
    p_purpose: 'דירה',
    p_location_type: 'bank_account',
    p_institution: 'לאומי',
    p_notes: null,
    p_opening_agorot: 50000,
  });
  if (sErr || !savingId) throw new Error(`create_saving: ${sErr?.message}`);
  const { data: aRows } = await A.client.from('savings_with_balance').select('*');
  check('1. owner sees own saving with opening balance', aRows?.length === 1 && aRows[0].balance_agorot === 50000, aRows);

  // 2. B in another household sees nothing of A
  const { data: hB, error: hBErr } = await B.client.rpc('create_household', { p_name: 'B' });
  if (hBErr || !hB) throw new Error(`create_household B: ${hBErr?.message}`);
  createdHouseholds.add(hB.id);
  const { data: bAll } = await B.client.from('savings_with_balance').select('*');
  const { data: bById } = await B.client.from('savings').select('*').eq('id', savingId);
  const { data: bTx } = await B.client.from('transactions').select('*').eq('saving_id', savingId);
  check('2. other household cannot read savings or transactions', bAll?.length === 0 && bById?.length === 0 && bTx?.length === 0, { bAll, bById, bTx });

  // 3. B cannot write to A's saving
  const { error: bInsErr } = await B.client
    .from('transactions')
    .insert({ saving_id: savingId, kind: 'deposit', amount_agorot: 100, created_by: B.id });
  const { data: bUpd } = await B.client.from('savings').update({ purpose: 'פרוץ' }).eq('id', savingId).select();
  const { data: bDel } = await B.client.from('savings').delete().eq('id', savingId).select();
  const { data: aAfter } = await A.client.from('savings').select('purpose').eq('id', savingId).single();
  check(
    '3. other household cannot insert/update/delete',
    !!bInsErr && (bUpd?.length ?? 0) === 0 && (bDel?.length ?? 0) === 0 && aAfter?.purpose === 'דירה',
    { bInsErr, bUpd, bDel, aAfter },
  );

  // 4. No direct membership inserts
  const { error: memErr } = await B.client
    .from('household_members')
    .insert({ household_id: hA.id, user_id: B.id, role: 'member' });
  check('4. cannot insert into household_members directly', !!memErr, memErr);

  // 5. Join with code
  const { error: wrongErr } = await C.client.rpc('join_household', { p_code: 'WRONG123' });
  const { error: joinErr } = await C.client.rpc('join_household', { p_code: ` ${hA.invite_code.toLowerCase()} ` });
  const { data: cRows } = await C.client.from('savings_with_balance').select('id');
  check(
    '5. wrong code rejected, right code (any case) joins',
    errMsg(wrongErr).includes('INVALID_INVITE_CODE') && !joinErr && cRows?.length === 1,
    { wrongErr, joinErr, cRows },
  );

  // 6. Already in a household
  const { error: againErr } = await B.client.rpc('join_household', { p_code: hA.invite_code });
  check('6. member of a household cannot join another', errMsg(againErr).includes('ALREADY_IN_HOUSEHOLD'), againErr);

  // 7. Balance never negative
  const tx = (amount: number, kind: 'deposit' | 'withdrawal', occurred_on?: string) =>
    A.client
      .from('transactions')
      .insert({ saving_id: savingId, kind, amount_agorot: amount, created_by: A.id, ...(occurred_on ? { occurred_on } : {}) });
  const { error: overErr } = await tx(60000, 'withdrawal');
  const { error: exactErr } = await tx(50000, 'withdrawal');
  const { data: opening } = await A.client
    .from('transactions')
    .select('id')
    .eq('saving_id', savingId)
    .eq('kind', 'opening')
    .single();
  const { error: delOpenErr } = await A.client.from('transactions').delete().eq('id', opening?.id);
  const { data: bal7 } = await A.client.from('savings_with_balance').select('balance_agorot').eq('id', savingId).single();
  check(
    '7. over-withdrawal and negative-making delete are rejected',
    errMsg(overErr).includes('INSUFFICIENT_BALANCE') &&
      !exactErr &&
      errMsg(delOpenErr).includes('INSUFFICIENT_BALANCE') &&
      bal7?.balance_agorot === 0,
    { overErr, exactErr, delOpenErr, bal7 },
  );

  // 7b. Two phones withdrawing at once: exactly one succeeds
  await tx(10000, 'deposit');
  const [w1, w2] = await Promise.all([tx(6000, 'withdrawal'), tx(6000, 'withdrawal')]);
  const { data: bal7b } = await A.client.from('savings_with_balance').select('balance_agorot').eq('id', savingId).single();
  check(
    '7b. concurrent withdrawals cannot overdraw',
    [w1.error, w2.error].filter(Boolean).length === 1 && bal7b?.balance_agorot === 4000,
    { w1: w1.error, w2: w2.error, bal7b },
  );

  // 8. Date limit: up to UTC today + 1
  const { error: plus1Err } = await tx(100, 'deposit', utcDatePlus(1));
  const { error: plus2Err } = await tx(100, 'deposit', utcDatePlus(2));
  check('8. date today+1 accepted, today+2 rejected', !plus1Err && !!plus2Err, { plus1Err, plus2Err });

  // 9. Deleting a saving with withdrawals cascades cleanly
  const { data: s2 } = await A.client.rpc('create_saving', {
    p_purpose: 'חופשה',
    p_location_type: 'other',
    p_institution: 'בית',
    p_notes: null,
    p_opening_agorot: 0,
  });
  await A.client.from('transactions').insert({ saving_id: s2, kind: 'deposit', amount_agorot: 10000, created_by: A.id });
  await A.client.from('transactions').insert({ saving_id: s2, kind: 'withdrawal', amount_agorot: 10000, created_by: A.id });
  const { error: delSavingErr } = await A.client.from('savings').delete().eq('id', s2);
  const { data: s2Tx } = await admin.from('transactions').select('id').eq('saving_id', s2);
  check('9. deleting a saving with withdrawals succeeds and removes history', !delSavingErr && s2Tx?.length === 0, {
    delSavingErr,
    s2Tx,
  });

  // 9b. Revaluation: gain/loss move the balance and gains; losses can't overdraw
  const { data: s3 } = await A.client.rpc('create_saving', {
    p_purpose: 'קרן',
    p_location_type: 'money_market_fund',
    p_institution: 'מגדל',
    p_notes: null,
    p_opening_agorot: 50000,
    p_goal_agorot: 100000,
    p_goal_date: utcDatePlus(365),
  });
  const ins = (kind: string, amount: number) =>
    A.client.from('transactions').insert({ saving_id: s3, kind, amount_agorot: amount, created_by: A.id }).select('id').single();
  const { data: g1, error: gErr } = await ins('gain', 10000);
  const { error: lErr } = await ins('loss', 4000);
  const { data: v9b } = await A.client
    .from('savings_with_balance')
    .select('balance_agorot, gains_agorot, goal_agorot, goal_date')
    .eq('id', s3)
    .single();
  const { error: bigLossErr } = await ins('loss', 1000000);
  check(
    '9b. gain/loss update balance and gains; oversized loss rejected; goal saved',
    !gErr && !lErr && v9b?.balance_agorot === 56000 && v9b?.gains_agorot === 6000 &&
      v9b?.goal_agorot === 100000 && v9b?.goal_date === utcDatePlus(365) &&
      errMsg(bigLossErr).includes('INSUFFICIENT_BALANCE'),
    { gErr, lErr, v9b, bigLossErr },
  );

  // 9c. Deleting a gain that would go negative is rejected
  await ins('loss', 56000); // balance now 0
  const { error: delGainErr } = await A.client.from('transactions').delete().eq('id', g1?.id);
  check('9c. deleting a gain that would overdraw is rejected', errMsg(delGainErr).includes('INSUFFICIENT_BALANCE'), delGainErr);

  // 9d. Goal date without amount is rejected
  const { error: goalDateErr } = await A.client.from('savings').update({ goal_agorot: null, goal_date: utcDatePlus(30) }).eq('id', s3);
  check('9d. goal date without goal amount is rejected', !!goalDateErr, goalDateErr);

  // 10. Non-owner cannot manage
  const { error: regenErr } = await C.client.rpc('regenerate_invite_code');
  const { error: rmErr } = await C.client.rpc('remove_member', { p_user_id: A.id });
  check(
    '10. member cannot regenerate code or remove others',
    errMsg(regenErr).includes('NOT_OWNER') && errMsg(rmErr).includes('NOT_OWNER'),
    { regenErr, rmErr },
  );

  // 11. Removed member loses access
  const { error: removeErr } = await A.client.rpc('remove_member', { p_user_id: C.id });
  const { data: cAfter } = await C.client.from('savings_with_balance').select('id');
  const { data: cHid } = await C.client.rpc('my_household_id');
  check('11. removed member sees nothing', !removeErr && cAfter?.length === 0 && cHid === null, { removeErr, cAfter, cHid });

  // 11b. Removed member cannot probe the balance through error messages
  const { error: probeSmall } = await C.client
    .from('transactions')
    .insert({ saving_id: savingId, kind: 'withdrawal', amount_agorot: 1, created_by: C.id });
  const { error: probeHuge } = await C.client
    .from('transactions')
    .insert({ saving_id: savingId, kind: 'withdrawal', amount_agorot: 99999999999, created_by: C.id });
  check(
    '11b. outsider withdrawals fail identically (no balance oracle)',
    !!probeSmall && !!probeHuge && errMsg(probeSmall) === errMsg(probeHuge) && !errMsg(probeHuge).includes('INSUFFICIENT_BALANCE'),
    { probeSmall, probeHuge },
  );

  // 12. Profiles visible only within household
  const { data: cSeesA } = await C.client.from('profiles').select('id').eq('id', A.id);
  const { data: aSeesSelf } = await A.client.from('profiles').select('display_name').eq('id', A.id).single();
  check('12. profiles hidden outside household', cSeesA?.length === 0 && aSeesSelf?.display_name === 'בדיקה a', {
    cSeesA,
    aSeesSelf,
  });

  // 13. Last member must confirm; then leaving deletes the household
  const { error: unconfirmedErr } = await A.client.rpc('leave_household');
  const { data: hAStill } = await admin.from('households').select('id').eq('id', hA.id);
  const { error: leaveErr } = await A.client.rpc('leave_household', { p_confirm_delete: true });
  const { data: hAGone } = await admin.from('households').select('id').eq('id', hA.id);
  check(
    '13. last member needs confirmation, then household is deleted',
    errMsg(unconfirmedErr).includes('LAST_MEMBER') && hAStill?.length === 1 && !leaveErr && hAGone?.length === 0,
    { unconfirmedErr, hAStill, leaveErr, hAGone },
  );
}

async function cleanup() {
  for (const id of createdHouseholds) await admin.from('households').delete().eq('id', id);
  for (const id of createdUsers) await admin.auth.admin.deleteUser(id);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const leftovers = data?.users.filter((u) => u.email?.startsWith(`rls-test-${runId}`)) ?? [];
  console.log(leftovers.length === 0 ? '🧹 cleanup done' : `⚠ ${leftovers.length} test users left`);
}

main()
  .catch((e) => {
    failures++;
    console.error('✗ aborted:', e instanceof Error ? e.message : e);
  })
  .finally(async () => {
    await cleanup();
    console.log(failures === 0 ? '\nAll RLS checks passed' : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
