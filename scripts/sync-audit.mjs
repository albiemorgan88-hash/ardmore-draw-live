#!/usr/bin/env node
// Audit: Compare Stripe active subscriptions vs Supabase draw_subscriptions
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_KEY?.startsWith('sk_live_')) {
  console.error('ERROR: Need live Stripe key, got:', STRIPE_KEY?.substring(0, 15));
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Get ALL active Stripe subscriptions
  console.log('=== STRIPE ACTIVE SUBSCRIPTIONS ===');
  const allSubs = [];
  for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
    allSubs.push(sub);
  }
  console.log(`Total active Stripe subscriptions: ${allSubs.length}`);

  let stripeTotal = 0;
  const stripeMap = new Map(); // sub_id -> { numbers, quantity, customer, metadata }
  
  for (const sub of allSubs) {
    const numbers = sub.metadata?.numbers ? JSON.parse(sub.metadata.numbers) : [];
    const quantity = sub.items?.data?.[0]?.quantity || numbers.length;
    const customerName = sub.metadata?.customer_name || sub.metadata?.name || '';
    stripeTotal += numbers.length;
    stripeMap.set(sub.id, { 
      numbers, 
      quantity, 
      customer: sub.customer, 
      customerName,
      metadata: sub.metadata,
      created: new Date(sub.created * 1000).toISOString()
    });
    console.log(`  ${sub.id} | ${customerName.padEnd(25)} | numbers: [${numbers.join(',')}] (${numbers.length}) | qty: ${quantity} | cust: ${sub.customer} | created: ${new Date(sub.created * 1000).toISOString().split('T')[0]}`);
  }
  console.log(`\nStripe total numbers: ${stripeTotal}`);

  // 2. Get ALL active DB subscriptions
  console.log('\n=== SUPABASE DRAW_SUBSCRIPTIONS (active) ===');
  const { data: dbSubs, error } = await supabase
    .from('draw_subscriptions')
    .select('*')
    .eq('status', 'active');
  
  if (error) { console.error('DB error:', error); process.exit(1); }
  
  let dbTotal = 0;
  const dbMap = new Map(); // stripe_sub_id -> row
  for (const row of dbSubs) {
    dbTotal += row.numbers?.length || 0;
    dbMap.set(row.stripe_subscription_id, row);
  }
  console.log(`Total active DB subscriptions: ${dbSubs.length}`);
  console.log(`DB total numbers: ${dbTotal}`);

  // 3. Find discrepancies
  console.log('\n=== DISCREPANCIES ===');
  
  // Stripe subs missing from DB
  let missingCount = 0;
  for (const [subId, stripeData] of stripeMap) {
    const dbRow = dbMap.get(subId);
    if (!dbRow) {
      console.log(`MISSING IN DB: ${subId} | ${stripeData.customerName} | numbers: [${stripeData.numbers.join(',')}] (${stripeData.numbers.length})`);
      missingCount += stripeData.numbers.length;
    } else if (JSON.stringify(dbRow.numbers?.sort()) !== JSON.stringify(stripeData.numbers?.sort())) {
      console.log(`NUMBERS MISMATCH: ${subId} | ${stripeData.customerName}`);
      console.log(`  Stripe: [${stripeData.numbers.join(',')}] (${stripeData.numbers.length})`);
      console.log(`  DB:     [${dbRow.numbers.join(',')}] (${dbRow.numbers.length})`);
      missingCount += stripeData.numbers.length - dbRow.numbers.length;
    }
  }
  
  // DB subs not in Stripe (should be cancelled)
  for (const [subId, dbRow] of dbMap) {
    if (!stripeMap.has(subId)) {
      console.log(`IN DB BUT NOT ACTIVE IN STRIPE: ${subId} | numbers: [${dbRow.numbers?.join(',')}]`);
    }
  }

  console.log(`\nGap: ${stripeTotal} (Stripe) - ${dbTotal} (DB) = ${stripeTotal - dbTotal} numbers`);
  console.log(`Missing numbers identified: ${missingCount}`);

  // 4. Find Phil Patterson duplicates
  console.log('\n=== PHIL PATTERSON DUPLICATES ===');
  for (const [subId, data] of stripeMap) {
    if (data.customerName?.toLowerCase().includes('patterson') || data.metadata?.customer_name?.toLowerCase().includes('patterson')) {
      console.log(`Phil sub: ${subId} | numbers: [${data.numbers.join(',')}] | created: ${data.created} | customer: ${data.customer}`);
    }
  }
}

main().catch(console.error);
