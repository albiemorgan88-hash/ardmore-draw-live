#!/usr/bin/env node
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Get details on both Phil Patterson subs
  const oldSub = await stripe.subscriptions.retrieve('sub_1T6z6qASm3u8i3nlE06BswzR', { expand: ['customer'] });
  const newSub = await stripe.subscriptions.retrieve('sub_1T7Ez4ASm3u8i3nlXOaR38XH', { expand: ['customer'] });
  
  console.log('=== OLD SUB (Mar 3, missing from DB) ===');
  console.log('ID:', oldSub.id);
  console.log('Customer:', oldSub.customer?.id, oldSub.customer?.email, oldSub.customer?.name);
  console.log('Numbers:', oldSub.metadata?.numbers);
  console.log('Names:', oldSub.metadata?.names);
  console.log('Status:', oldSub.status);
  console.log('Created:', new Date(oldSub.created * 1000).toISOString());
  console.log('Metadata:', JSON.stringify(oldSub.metadata, null, 2));
  
  console.log('\n=== NEW SUB (Mar 4) ===');
  console.log('ID:', newSub.id);
  console.log('Customer:', newSub.customer?.id, newSub.customer?.email, newSub.customer?.name);
  console.log('Numbers:', newSub.metadata?.numbers);
  console.log('Names:', newSub.metadata?.names);
  console.log('Status:', newSub.status);
  console.log('Created:', new Date(newSub.created * 1000).toISOString());
  console.log('Metadata:', JSON.stringify(newSub.metadata, null, 2));

  // Check the DB for the new sub
  const { data: dbRow } = await supabase
    .from('draw_subscriptions')
    .select('*')
    .eq('stripe_subscription_id', 'sub_1T7Ez4ASm3u8i3nlXOaR38XH')
    .single();
  
  console.log('\n=== DB ROW FOR NEW SUB ===');
  console.log(JSON.stringify(dbRow, null, 2));

  // Check number_selections for both
  const { data: selections } = await supabase
    .from('number_selections')
    .select('*')
    .or('stripe_subscription_id.eq.sub_1T6z6qASm3u8i3nlE06BswzR,stripe_subscription_id.eq.sub_1T7Ez4ASm3u8i3nlXOaR38XH');
  
  console.log('\n=== NUMBER_SELECTIONS FOR BOTH ===');
  for (const sel of selections || []) {
    console.log(`  sub: ${sel.stripe_subscription_id} | numbers: [${sel.numbers}] | profile: ${sel.profile_id}`);
  }

  // Get club_id from existing subs
  const { data: anySub } = await supabase
    .from('draw_subscriptions')
    .select('club_id')
    .limit(1)
    .single();
  console.log('\n=== CLUB ID ===');
  console.log(anySub?.club_id);

  // Check if old sub customer has a user_id in metadata
  console.log('\n=== OLD SUB CHECKOUT METADATA ===');
  console.log('user_id:', oldSub.metadata?.user_id);
  console.log('club_id:', oldSub.metadata?.club_id);
}

main().catch(console.error);
