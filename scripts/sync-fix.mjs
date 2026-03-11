#!/usr/bin/env node
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CHANGES_LOG = [];
function log(msg) { console.log(msg); CHANGES_LOG.push(`${new Date().toISOString()} | ${msg}`); }

async function main() {
  // ========== STEP 0: BACKUP ==========
  log('STEP 0: Backing up current data...');
  
  const { data: allSubs } = await supabase.from('draw_subscriptions').select('*');
  const { data: allSels } = await supabase.from('number_selections').select('*');
  
  const backup = {
    timestamp: new Date().toISOString(),
    draw_subscriptions: allSubs,
    number_selections: allSels,
  };
  writeFileSync('/Users/philsagent/Projects/ardmore-cricket/scripts/backup-2026-03-10.json', JSON.stringify(backup, null, 2));
  log(`Backed up ${allSubs.length} draw_subscriptions and ${allSels.length} number_selections`);

  // ========== STEP 1: INSERT MISSING SUB ==========
  log('\nSTEP 1: Inserting missing subscription sub_1T6z6qASm3u8i3nlE06BswzR...');
  
  // Get the Stripe sub details for period dates
  const stripeSub = await stripe.subscriptions.retrieve('sub_1T6z6qASm3u8i3nlE06BswzR');
  const item = stripeSub.items?.data?.[0];
  const periodStart = stripeSub.current_period_start || item?.current_period_start || stripeSub.start_date;
  const periodEnd = stripeSub.current_period_end || item?.current_period_end;

  const insertData = {
    club_id: '31846fb2-b120-4815-bd48-e1120342d52e',
    user_id: '7cd09880-6a33-49a8-8502-caca3365bb0a',
    stripe_subscription_id: 'sub_1T6z6qASm3u8i3nlE06BswzR',
    stripe_customer_id: 'cus_U59P0yPNqm3c5n',
    numbers: [8, 42, 12, 312, 472],
    assigned_names: {
      "8": "Denis Patterson ",
      "12": "Yvonne Patterson",
      "42": "Stacey Morgan ",
      "312": "Phil ",
      "472": "Ian Patterson "
    },
    amount_pence: 500,
    status: 'active',
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : new Date('2026-03-03T19:59:32Z').toISOString(),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('draw_subscriptions')
    .insert(insertData)
    .select()
    .single();

  if (insertErr) {
    log(`ERROR inserting draw_subscription: ${JSON.stringify(insertErr)}`);
    process.exit(1);
  }
  log(`Inserted draw_subscription: ${inserted.id}`);

  // ========== STEP 2: INSERT NUMBER_SELECTIONS ==========
  log('\nSTEP 2: Inserting number_selections for the missing sub...');

  const { data: selInserted, error: selErr } = await supabase
    .from('number_selections')
    .insert({
      club_id: '31846fb2-b120-4815-bd48-e1120342d52e',
      profile_id: '7cd09880-6a33-49a8-8502-caca3365bb0a',
      numbers: [8, 42, 12, 312, 472],
      assigned_names: {
        "8": "Denis Patterson ",
        "12": "Yvonne Patterson",
        "42": "Stacey Morgan ",
        "312": "Phil ",
        "472": "Ian Patterson "
      },
      status: 'active',
      stripe_subscription_id: 'sub_1T6z6qASm3u8i3nlE06BswzR',
    })
    .select()
    .single();

  if (selErr) {
    log(`ERROR inserting number_selection: ${JSON.stringify(selErr)}`);
  } else {
    log(`Inserted number_selection: ${selInserted.id}`);
  }

  // ========== STEP 3: VERIFY SYNC (should be 179) ==========
  log('\nSTEP 3: Verifying sync...');
  
  const { data: activeSubs } = await supabase
    .from('draw_subscriptions')
    .select('numbers, amount_pence')
    .eq('status', 'active');

  const totalNumbers = activeSubs.reduce((sum, s) => sum + (s.numbers?.length || 0), 0);
  const totalPence = activeSubs.reduce((sum, s) => sum + (s.amount_pence || 0), 0);
  
  log(`Active subscriptions: ${activeSubs.length}`);
  log(`Total numbers: ${totalNumbers} (expected: 179)`);
  log(`Total pot: £${(totalPence / 100).toFixed(2)} (expected: £179.00)`);
  log(`SYNC STATUS: ${totalNumbers === 179 ? '✅ MATCH' : '❌ MISMATCH'}`);

  // ========== STEP 4: CANCEL OLD PHIL DUPLICATE IN STRIPE ==========
  log('\nSTEP 4: Cancelling old Phil Patterson duplicate sub_1T6z6qASm3u8i3nlE06BswzR in Stripe...');
  
  const cancelled = await stripe.subscriptions.cancel('sub_1T6z6qASm3u8i3nlE06BswzR');
  log(`Stripe cancel status: ${cancelled.status}`);

  // ========== STEP 5: UPDATE DB TO CANCELLED ==========
  log('\nSTEP 5: Marking subscription as cancelled in DB...');
  
  const { error: updateErr } = await supabase
    .from('draw_subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', 'sub_1T6z6qASm3u8i3nlE06BswzR');

  if (updateErr) {
    log(`ERROR updating status: ${JSON.stringify(updateErr)}`);
  } else {
    log('Marked as cancelled in draw_subscriptions');
  }

  // ========== STEP 6: FINAL VERIFICATION ==========
  log('\nSTEP 6: Final verification...');
  
  const { data: finalSubs } = await supabase
    .from('draw_subscriptions')
    .select('numbers, amount_pence')
    .eq('status', 'active');

  const finalNumbers = finalSubs.reduce((sum, s) => sum + (s.numbers?.length || 0), 0);
  const finalPence = finalSubs.reduce((sum, s) => sum + (s.amount_pence || 0), 0);
  
  log(`Final active subscriptions: ${finalSubs.length}`);
  log(`Final total numbers: ${finalNumbers}`);
  log(`Final pot: £${(finalPence / 100).toFixed(2)}`);

  // Verify Stripe active count
  let stripeActiveCount = 0;
  let stripeActiveNumbers = 0;
  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
    stripeActiveCount++;
    const nums = sub.metadata?.numbers ? JSON.parse(sub.metadata.numbers) : [];
    stripeActiveNumbers += nums.length;
  }
  log(`Stripe active subs: ${stripeActiveCount}`);
  log(`Stripe active numbers: ${stripeActiveNumbers}`);
  log(`FINAL STATUS: DB=${finalNumbers} Stripe=${stripeActiveNumbers} ${finalNumbers === stripeActiveNumbers ? '✅ IN SYNC' : '❌ OUT OF SYNC'}`);

  // Save change log
  writeFileSync('/Users/philsagent/Projects/ardmore-cricket/scripts/changes-log-2026-03-10.txt', CHANGES_LOG.join('\n'));
  log('\nChange log saved.');
}

main().catch(console.error);
