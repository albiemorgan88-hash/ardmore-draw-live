import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const club = '31846fb2-b120-4815-bd48-e1120342d52e';
const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const third = '00000000-0000-4000-8000-000000000003';
const primary = '00000000-0000-4000-8000-000000000011';
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA extensions;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
  CREATE TYPE entry_status AS ENUM ('active','expired');
  CREATE TABLE number_selections(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),club_id uuid NOT NULL,profile_id uuid NOT NULL,numbers smallint[] NOT NULL,assigned_names jsonb,status entry_status NOT NULL,stripe_subscription_id text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE draw_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),club_id uuid NOT NULL,user_id uuid NOT NULL,numbers integer[] NOT NULL,assigned_names jsonb,status text,stripe_subscription_id text NOT NULL UNIQUE,stripe_customer_id text NOT NULL DEFAULT 'cus_fixture',amount_pence integer NOT NULL DEFAULT 100,current_period_start timestamptz,current_period_end timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
  CREATE TABLE stripe_events(id text PRIMARY KEY,type text NOT NULL,status text NOT NULL DEFAULT 'processing',error_message text,processed_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
  CREATE TABLE payouts(id uuid,recipient_profile_id uuid); CREATE TABLE payments(id uuid); CREATE TABLE draws(id uuid); CREATE TABLE claim_tokens(id uuid);
  ALTER TABLE number_selections ENABLE ROW LEVEL SECURITY; CREATE POLICY public_read_selections ON number_selections FOR SELECT USING(true);
  ALTER TABLE draw_subscriptions ENABLE ROW LEVEL SECURITY; CREATE POLICY "Service role manages subscriptions" ON draw_subscriptions FOR ALL USING(true); CREATE POLICY public_read_subscriptions ON draw_subscriptions FOR SELECT USING(true);
  ALTER TABLE payouts ENABLE ROW LEVEL SECURITY; CREATE POLICY "Service role manages payouts" ON payouts FOR ALL USING(true); CREATE POLICY "Users can view own payouts" ON payouts FOR SELECT USING(auth.uid()=recipient_profile_id);
  ALTER TABLE claim_tokens ENABLE ROW LEVEL SECURITY; CREATE POLICY "Service role manages claim tokens" ON claim_tokens FOR ALL USING(true);
  ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY; CREATE POLICY "Service role manages stripe events" ON stripe_events FOR ALL USING(true);
  ALTER TABLE draws ENABLE ROW LEVEL SECURITY; CREATE POLICY service_insert_draws ON draws FOR INSERT WITH CHECK(true);
  CREATE FUNCTION execute_draw(uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RAISE EXCEPTION 'Must never execute a draw in this test'; END $$;
  CREATE FUNCTION close_draw_and_snapshot(uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RAISE EXCEPTION 'Must never execute a draw in this test'; END $$;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;
  INSERT INTO number_selections(id,club_id,profile_id,numbers,status,stripe_subscription_id,created_at) VALUES
    ('${primary}','${club}','${owner}',ARRAY[5,97],'active','sub_a','2026-02-02'),
    (gen_random_uuid(),'${club}','${owner}',ARRAY[5],'expired','sub_old','2026-01-01'),
    (gen_random_uuid(),'${club}','${owner}',ARRAY[200],'active','cs_oneoff','2026-01-01'),
    (gen_random_uuid(),'${club}','${other}',ARRAY[97,399],'active','sub_b','2026-02-01');
  INSERT INTO draw_subscriptions(club_id,user_id,numbers,status,stripe_subscription_id) VALUES
    ('${club}','${owner}',ARRAY[5,97],'active','sub_a'),
    ('${club}','${other}',ARRAY[97,399],'active','sub_b');
`);
for (const name of ['20260921194444_ardmore_access_controls.sql','20260921195027_ardmore_renewal_integrity.sql','20260921195410_ardmore_webhook_leases.sql']) {
  await db.exec(await readFile(new URL('../supabase/migrations/'+name, import.meta.url),'utf8'));
}
let assertions = 0;
async function denied(role,sql) {
  await db.exec('SET ROLE '+role);
  try { await assert.rejects(db.query(sql), /permission denied/); assertions++; }
  finally { await db.exec('RESET ROLE'); }
}
for (const role of ['anon','authenticated']) {
  await db.exec('SET ROLE '+role);
  assert.equal((await db.query(`SELECT numbers FROM draw_subscriptions WHERE club_id='${club}' AND status='active'`)).rows.length,2);
  assert.equal((await db.query(`SELECT numbers FROM number_selections WHERE club_id='${club}' AND status='active'`)).rows.length,3);
  await db.exec('RESET ROLE'); assertions+=2;
  for (const table of ['draw_subscriptions','number_selections','claim_tokens','stripe_events']) await denied(role,`SELECT * FROM ${table}`);
  for (const table of ['draw_subscriptions','number_selections','payouts','payments','draws']) await denied(role,`DELETE FROM ${table}`);
  await denied(role,`SELECT execute_draw('${club}')`);
  await denied(role,`SELECT close_draw_and_snapshot('${club}')`);
  await denied(role,`SELECT reconcile_ardmore_number_selections('${club}','${owner}')`);
  await denied(role,`SELECT claim_ardmore_stripe_event('evt_fixture','invoice.paid',gen_random_uuid())`);
}
await db.exec('SET ROLE service_role');
await db.query(`UPDATE draw_subscriptions SET status='active',numbers=numbers,current_period_end=now()+interval '7 days'`);
const first=(await db.query(`SELECT reconcile_ardmore_number_selections('${club}','${owner}') AS result`)).rows[0].result;
assert.deepEqual(first.numbers,[5,97]); assertions++;
await db.query(`SELECT reconcile_ardmore_number_selections('${club}','${other}')`);
// A payment failure followed by payment must also restore the established 97.
await db.query(`UPDATE draw_subscriptions SET status='past_due' WHERE stripe_subscription_id='sub_a'`);
await db.query(`SELECT reconcile_ardmore_number_selections('${club}','${owner}')`);
await db.query(`UPDATE draw_subscriptions SET status='active' WHERE stripe_subscription_id='sub_a'`);
await db.query(`SELECT reconcile_ardmore_number_selections('${club}','${owner}')`);
assert.equal((await db.query(`SELECT status FROM number_selections WHERE id='${primary}'`)).rows[0].status,'active'); assertions++;
const retained=(await db.query(`SELECT id,numbers FROM number_selections WHERE profile_id='${owner}' AND status='active' AND stripe_subscription_id NOT LIKE 'cs_%'`)).rows;
assert.equal(retained.length,1);assert.equal(retained[0].id,primary);assert.deepEqual(retained[0].numbers,[5,97]);assertions+=3;
assert.equal((await db.query(`SELECT count(*)::int n FROM number_selections WHERE stripe_subscription_id='cs_oneoff' AND status='active'`)).rows[0].n,1);assertions++;
await assert.rejects(db.query(`INSERT INTO draw_subscriptions(club_id,user_id,numbers,status,stripe_subscription_id) VALUES('${club}','${third}',ARRAY[97],'active','sub_conflict')`),/number 97 is already reserved/); assertions++;
await assert.rejects(db.query(`INSERT INTO number_selections(club_id,profile_id,numbers,status) VALUES('${club}','${third}',ARRAY[97],'active')`),/number 97 is already active/); assertions++;
await assert.rejects(db.query(`UPDATE number_selections SET profile_id='${third}' WHERE id='${primary}'`),/number 97 is already active/); assertions++;
// Changing unrelated numbers keeps a pre-existing reservation but cannot add 399.
await db.query(`UPDATE number_selections SET numbers=ARRAY[5,97,201] WHERE id='${primary}'`);
await assert.rejects(db.query(`UPDATE number_selections SET numbers=ARRAY[5,97,399] WHERE id='${primary}'`),/number 399 is already active/); assertions++;
await db.query(`SELECT reconcile_ardmore_number_selections('${club}','${owner}')`);
// Atomic rollback: an already-paid source conflicts with a one-off entry; no
// other selection can be expired before the failed merge is rolled back.
await db.query(`INSERT INTO number_selections(club_id,profile_id,numbers,status,stripe_subscription_id) VALUES('${club}','${owner}',ARRAY[202],'active','sub_stale')`);
await db.query(`UPDATE draw_subscriptions SET numbers=ARRAY[5,97,200] WHERE stripe_subscription_id='sub_a'`);
await assert.rejects(db.query(`SELECT reconcile_ardmore_number_selections('${club}','${owner}')`),/number 200 is already active/); assertions++;
assert.equal((await db.query(`SELECT status FROM number_selections WHERE stripe_subscription_id='sub_stale'`)).rows[0].status,'active'); assertions++;
assert.deepEqual((await db.query(`SELECT numbers FROM number_selections WHERE id='${primary}'`)).rows[0].numbers,[5,97]); assertions++;
await db.query(`UPDATE draw_subscriptions SET numbers=ARRAY[5,97] WHERE stripe_subscription_id='sub_a'`);
await db.query(`SELECT reconcile_ardmore_number_selections('${club}','${owner}')`);
const token1='10000000-0000-4000-8000-000000000001',token2='10000000-0000-4000-8000-000000000002';
const claim=async(token)=>(await db.query(`SELECT claim_ardmore_stripe_event('evt_fixture','invoice.paid','${token}') AS result`)).rows[0].result;
assert.equal((await claim(token1)).claimed,true);assert.equal((await claim(token2)).claimed,false);assertions+=2;
await db.query(`UPDATE stripe_events SET lease_expires_at=now()-interval '1 second' WHERE id='evt_fixture'`);
assert.equal((await claim(token2)).claimed,true);assertions++;
const stale=await db.query(`UPDATE stripe_events SET status='processed' WHERE id='evt_fixture' AND lease_token='${token1}' RETURNING id`);
assert.equal(stale.rows.length,0);assertions++;
await db.query(`UPDATE stripe_events SET status='processed' WHERE id='evt_fixture' AND lease_token='${token2}'`);
assert.deepEqual(await claim(token1),{claimed:false,processed:true});assertions++;
await db.exec('RESET ROLE');
console.log(`PASS: ${assertions} database access, shared reservation, atomic rollback and event lease assertions (synthetic data only).`);
await db.close();
