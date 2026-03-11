#!/usr/bin/env node
/**
 * Ardmore Cricket Club — Draw Table Sync Script
 * 
 * Syncs `draw_subscriptions` and `number_selections` tables.
 * Strategy: subscriptions are the source of truth (backed by Stripe payments).
 * For each user, their total selection numbers should equal the union of all
 * their active subscription numbers.
 * 
 * Usage: node scripts/sync-tables.js [--dry-run] [--backup-only]
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load env manually
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = process.argv.includes("--dry-run");
const BACKUP_ONLY = process.argv.includes("--backup-only");
const LOG = [];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  LOG.push(line);
}

async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
  return data;
}

async function backup(subscriptions, selections) {
  const backupDir = path.resolve(__dirname, "../backups");
  fs.mkdirSync(backupDir, { recursive: true });
  
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const subFile = path.join(backupDir, `draw_subscriptions_${ts}.json`);
  const selFile = path.join(backupDir, `number_selections_${ts}.json`);
  
  fs.writeFileSync(subFile, JSON.stringify(subscriptions, null, 2));
  fs.writeFileSync(selFile, JSON.stringify(selections, null, 2));
  
  log(`BACKUP: ${subscriptions.length} subscriptions → ${subFile}`);
  log(`BACKUP: ${selections.length} selections → ${selFile}`);
}

async function main() {
  log(`=== ARDMORE DRAW TABLE SYNC ===`);
  log(`Mode: ${DRY_RUN ? "DRY RUN" : BACKUP_ONLY ? "BACKUP ONLY" : "LIVE"}`);
  
  // 1. Fetch both tables
  log("\n--- FETCHING DATA ---");
  const subscriptions = await fetchAll("draw_subscriptions");
  const selections = await fetchAll("number_selections");
  
  log(`draw_subscriptions: ${subscriptions.length} rows`);
  log(`number_selections: ${selections.length} rows`);
  
  // 2. Backup
  log("\n--- BACKING UP ---");
  await backup(subscriptions, selections);
  
  if (BACKUP_ONLY) {
    log("Backup complete. Exiting (--backup-only).");
    return;
  }
  
  // 3. Analyze by USER
  log("\n--- ANALYSIS ---");
  
  const activeSubs = subscriptions.filter(s => s.status === "active");
  const activeSelections = selections.filter(s => s.status === "active");
  log(`Active subscriptions: ${activeSubs.length}`);
  log(`Active selections: ${activeSelections.length}`);
  
  // Aggregate subscription numbers per user
  const subNumbersByUser = new Map(); // user_id -> Set of numbers
  const subNamesByUser = new Map();   // user_id -> merged assigned_names
  const clubByUser = new Map();       // user_id -> club_id
  const subIdsByUser = new Map();     // user_id -> [stripe_subscription_ids]
  
  for (const sub of activeSubs) {
    if (!subNumbersByUser.has(sub.user_id)) {
      subNumbersByUser.set(sub.user_id, new Set());
      subNamesByUser.set(sub.user_id, {});
      subIdsByUser.set(sub.user_id, []);
    }
    for (const n of sub.numbers) subNumbersByUser.get(sub.user_id).add(n);
    Object.assign(subNamesByUser.get(sub.user_id), sub.assigned_names || {});
    clubByUser.set(sub.user_id, sub.club_id);
    subIdsByUser.get(sub.user_id).push(sub.stripe_subscription_id);
  }
  
  // Aggregate selection numbers per user
  const selByUser = new Map(); // profile_id -> [selection rows]
  for (const sel of activeSelections) {
    if (!selByUser.has(sel.profile_id)) selByUser.set(sel.profile_id, []);
    selByUser.get(sel.profile_id).push(sel);
  }
  
  // All unique users across both
  const allUsers = new Set([...subNumbersByUser.keys(), ...selByUser.keys()]);
  
  log(`\nUnique users with subscriptions: ${subNumbersByUser.size}`);
  log(`Unique users with selections: ${selByUser.size}`);
  log(`Total unique users: ${allUsers.size}`);
  
  // Categorize users
  const usersNeedingSelection = []; // have subs, no selection
  const usersOrphaned = [];         // have selection, no subs
  const usersMismatched = [];       // have both, but numbers differ
  const usersOk = [];               // have both, numbers match
  
  for (const userId of allUsers) {
    const subNums = subNumbersByUser.get(userId);
    const userSels = selByUser.get(userId);
    
    if (subNums && subNums.size > 0 && (!userSels || userSels.length === 0)) {
      usersNeedingSelection.push(userId);
    } else if ((!subNums || subNums.size === 0) && userSels && userSels.length > 0) {
      usersOrphaned.push(userId);
    } else if (subNums && userSels) {
      // Compare: aggregate all selection numbers for this user
      const selNums = new Set();
      for (const sel of userSels) {
        for (const n of sel.numbers) selNums.add(n);
      }
      
      const subArr = [...subNums].sort((a,b) => a-b);
      const selArr = [...selNums].sort((a,b) => a-b);
      
      if (JSON.stringify(subArr) !== JSON.stringify(selArr)) {
        usersMismatched.push(userId);
      } else {
        usersOk.push(userId);
      }
    }
  }
  
  log(`\n--- USERS OK: ${usersOk.length} ---`);
  
  // Detail the issues
  log(`\n--- USERS NEEDING SELECTION (${usersNeedingSelection.length}) ---`);
  for (const uid of usersNeedingSelection) {
    const nums = [...subNumbersByUser.get(uid)].sort((a,b) => a-b);
    log(`  User ${uid}: needs selection for numbers [${nums.join(",")}]`);
  }
  
  log(`\n--- ORPHANED USERS (${usersOrphaned.length}) ---`);
  for (const uid of usersOrphaned) {
    const sels = selByUser.get(uid);
    const allNums = [];
    for (const sel of sels) allNums.push(...sel.numbers);
    log(`  User ${uid}: has selections [${allNums.join(",")}] but NO active subscription`);
    for (const sel of sels) {
      log(`    sel ${sel.id} stripe_ref: ${sel.stripe_subscription_id || "none"}`);
    }
  }
  
  log(`\n--- MISMATCHED USERS (${usersMismatched.length}) ---`);
  for (const uid of usersMismatched) {
    const subNums = [...subNumbersByUser.get(uid)].sort((a,b) => a-b);
    const sels = selByUser.get(uid);
    const selNums = new Set();
    for (const sel of sels) for (const n of sel.numbers) selNums.add(n);
    const selArr = [...selNums].sort((a,b) => a-b);
    
    const inSubNotSel = subNums.filter(n => !selNums.has(n));
    const inSelNotSub = selArr.filter(n => !subNumbersByUser.get(uid).has(n));
    
    log(`  User ${uid}:`);
    log(`    Sub numbers (${subNums.length}): [${subNums.join(",")}]`);
    log(`    Sel numbers (${selArr.length}): [${selArr.join(",")}]`);
    if (inSubNotSel.length) log(`    In sub, missing from sel: [${inSubNotSel.join(",")}]`);
    if (inSelNotSub.length) log(`    In sel, not in sub: [${inSelNotSub.join(",")}]`);
  }
  
  // 4. FIX: Create selections for users who have subs but no selections
  log("\n--- FIX: CREATE MISSING SELECTIONS ---");
  let createdCount = 0;
  for (const uid of usersNeedingSelection) {
    const nums = [...subNumbersByUser.get(uid)].sort((a,b) => a-b);
    const names = subNamesByUser.get(uid) || {};
    const clubId = clubByUser.get(uid);
    const stripeIds = subIdsByUser.get(uid);
    
    const record = {
      club_id: clubId,
      profile_id: uid,
      numbers: nums,
      assigned_names: names,
      status: "active",
      stripe_subscription_id: stripeIds[0], // Use first subscription ID
    };
    
    if (DRY_RUN) {
      log(`  [DRY RUN] Would create selection for user ${uid} with numbers [${nums.join(",")}]`);
    } else {
      const { error } = await supabase.from("number_selections").insert(record);
      if (error) {
        log(`  ERROR: ${error.message}`);
      } else {
        log(`  CREATED: user ${uid} → numbers [${nums.join(",")}]`);
        createdCount++;
      }
    }
  }
  
  // 5. FIX: Deactivate orphaned selections
  log("\n--- FIX: DEACTIVATE ORPHANED SELECTIONS ---");
  let deactivatedCount = 0;
  for (const uid of usersOrphaned) {
    const sels = selByUser.get(uid);
    for (const sel of sels) {
      if (DRY_RUN) {
        log(`  [DRY RUN] Would deactivate sel ${sel.id} (user ${uid}) numbers [${sel.numbers.join(",")}]`);
      } else {
        const { error } = await supabase
          .from("number_selections")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", sel.id);
        if (error) {
          log(`  ERROR: ${error.message}`);
        } else {
          log(`  CANCELLED: sel ${sel.id} (user ${uid}) numbers [${sel.numbers.join(",")}]`);
          deactivatedCount++;
        }
      }
    }
  }
  
  // 6. FIX: Update mismatched selections to match subscription numbers
  log("\n--- FIX: UPDATE MISMATCHED SELECTIONS ---");
  let fixedCount = 0;
  for (const uid of usersMismatched) {
    const correctNums = [...subNumbersByUser.get(uid)].sort((a,b) => a-b);
    const names = subNamesByUser.get(uid) || {};
    const sels = selByUser.get(uid);
    
    // Strategy: update the first active selection with all the correct numbers,
    // deactivate any additional selections for this user
    const primarySel = sels[0];
    const extraSels = sels.slice(1);
    
    if (DRY_RUN) {
      log(`  [DRY RUN] Would update sel ${primarySel.id} (user ${uid}) numbers [${primarySel.numbers.join(",")}] → [${correctNums.join(",")}]`);
      for (const extra of extraSels) {
        log(`  [DRY RUN] Would deactivate extra sel ${extra.id} (user ${uid})`);
      }
    } else {
      // Update primary selection
      const { error } = await supabase
        .from("number_selections")
        .update({
          numbers: correctNums,
          assigned_names: { ...(primarySel.assigned_names || {}), ...names },
          updated_at: new Date().toISOString(),
        })
        .eq("id", primarySel.id);
      if (error) {
        log(`  ERROR updating sel ${primarySel.id}: ${error.message}`);
      } else {
        log(`  FIXED: sel ${primarySel.id} (user ${uid}) → numbers [${correctNums.join(",")}]`);
        fixedCount++;
      }
      
      // Deactivate extras
      for (const extra of extraSels) {
        const { error: exErr } = await supabase
          .from("number_selections")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", extra.id);
        if (exErr) {
          log(`  ERROR deactivating extra sel ${extra.id}: ${exErr.message}`);
        } else {
          log(`  DEACTIVATED extra: sel ${extra.id} (user ${uid})`);
          deactivatedCount++;
        }
      }
    }
  }
  
  // 7. Verification
  log("\n--- POST-SYNC VERIFICATION ---");
  const postSubs = await fetchAll("draw_subscriptions");
  const postSels = await fetchAll("number_selections");
  
  const postActiveSubs = postSubs.filter(s => s.status === "active");
  const postActiveSels = postSels.filter(s => s.status === "active");
  
  const postSubNumbers = postActiveSubs.reduce((sum, s) => sum + (s.numbers?.length || 0), 0);
  const postSelNumbers = postActiveSels.reduce((sum, s) => sum + (s.numbers?.length || 0), 0);
  
  // Re-aggregate to verify
  const postSubByUser = new Map();
  for (const sub of postActiveSubs) {
    if (!postSubByUser.has(sub.user_id)) postSubByUser.set(sub.user_id, new Set());
    for (const n of sub.numbers) postSubByUser.get(sub.user_id).add(n);
  }
  const postSelByUser = new Map();
  for (const sel of postActiveSels) {
    if (!postSelByUser.has(sel.profile_id)) postSelByUser.set(sel.profile_id, new Set());
    for (const n of sel.numbers) postSelByUser.get(sel.profile_id).add(n);
  }
  
  let stillMissing = 0;
  let stillOrphaned = 0;
  let stillMismatched = 0;
  
  for (const uid of postSubByUser.keys()) {
    const selNums = postSelByUser.get(uid);
    if (!selNums) { stillMissing++; log(`  STILL MISSING: user ${uid}`); }
    else {
      const subArr = [...postSubByUser.get(uid)].sort((a,b) => a-b);
      const selArr = [...selNums].sort((a,b) => a-b);
      if (JSON.stringify(subArr) !== JSON.stringify(selArr)) {
        stillMismatched++;
        log(`  STILL MISMATCHED: user ${uid} sub=[${subArr}] sel=[${selArr}]`);
      }
    }
  }
  for (const uid of postSelByUser.keys()) {
    if (!postSubByUser.has(uid)) { stillOrphaned++; log(`  STILL ORPHANED: user ${uid}`); }
  }
  
  const potTotal = postActiveSubs.reduce((sum, s) => sum + (s.amount_pence || 0), 0);
  
  log("\n=== SUMMARY ===");
  log(`Selections created: ${createdCount}`);
  log(`Selections deactivated: ${deactivatedCount}`);
  log(`Mismatches fixed: ${fixedCount}`);
  log(`Post-sync: ${postActiveSubs.length} active subs (${postSubNumbers} numbers)`);
  log(`Post-sync: ${postActiveSels.length} active sels (${postSelNumbers} numbers)`);
  log(`Still missing: ${stillMissing}`);
  log(`Still orphaned: ${stillOrphaned}`);
  log(`Still mismatched: ${stillMismatched}`);
  log(`Pot: £${(potTotal / 100).toFixed(2)} from ${postSubNumbers} numbers`);
  log(`Numbers match: ${postSubNumbers === postSelNumbers ? "✅ YES" : `❌ NO (sub=${postSubNumbers} sel=${postSelNumbers})`}`);
  
  // Save log
  const logDir = path.resolve(__dirname, "../backups");
  const logFile = path.join(logDir, `sync-log-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`);
  fs.writeFileSync(logFile, LOG.join("\n"));
  log(`\nLog saved: ${logFile}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
