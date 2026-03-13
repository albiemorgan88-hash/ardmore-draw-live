import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { readFileSync as readFile } from 'fs';
// Load .env.local manually
const envContent = readFile('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Ardmore Cricket Club <draws@ardmorecricket.com>";
const CLUB_ID = "31846fb2-b120-4815-bd48-e1120342d52e";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Draw #2 results
const winningNumbers = [46, 80, 70];
const winners = [
  { number: 46, name: "Emma Chambers", place: "1st", prize: 5675 },
  { number: 80, name: "George Brolly", place: "2nd", prize: 3405 },
  { number: 70, name: "George Chambers", place: "3rd", prize: 2270 },
];
const drawDate = "2026-03-13";

// Get all active selections
const { data: selections } = await supabase
  .from('number_selections')
  .select('profile_id, numbers, assigned_names')
  .eq('club_id', CLUB_ID)
  .eq('status', 'active');

// Get all profiles
const profileIds = [...new Set(selections.map(s => s.profile_id))];
const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', profileIds);

// Also check auth users for emails
let emailMap = new Map();
if (profiles) {
  for (const p of profiles) {
    if (p.email) emailMap.set(p.id, { email: p.email, name: p.full_name || '' });
  }
}
// Backfill from auth
const { data: authData } = await supabase.auth.admin.listUsers();
if (authData?.users) {
  for (const u of authData.users) {
    if (profileIds.includes(u.id) && !emailMap.has(u.id)) {
      emailMap.set(u.id, { email: u.email || '', name: u.user_metadata?.full_name || '' });
    }
    // Also fill in missing emails
    if (profileIds.includes(u.id) && emailMap.has(u.id) && !emailMap.get(u.id).email) {
      emailMap.get(u.id).email = u.email;
    }
  }
}

// Build participant numbers
const profileNumbers = new Map();
for (const sel of selections) {
  const existing = profileNumbers.get(sel.profile_id) || [];
  profileNumbers.set(sel.profile_id, [...existing, ...sel.numbers]);
}

// Build the results table
const resultsTable = `
  <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0;color:#333;font-weight:bold;">🏆 1st Prize: No. ${winningNumbers[0]} — ${winners[0].name} — £${(winners[0].prize / 100).toFixed(2)}</p>
    <p style="margin:8px 0;color:#333;font-weight:bold;">🥈 2nd Prize: No. ${winningNumbers[1]} — ${winners[1].name} — £${(winners[1].prize / 100).toFixed(2)}</p>
    <p style="margin:8px 0 0;color:#333;font-weight:bold;">🥉 3rd Prize: No. ${winningNumbers[2]} — ${winners[2].name} — £${(winners[2].prize / 100).toFixed(2)}</p>
  </div>
`;

const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;`;

function layout(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;">
<div style="${baseStyle}">
  <div style="background:#1a365d;padding:24px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:24px;">🏏 Ardmore Cricket Club</h1>
    <p style="color:#87CEEB;margin:4px 0 0;font-size:13px;">Weekly Draw</p>
  </div>
  <div style="background:#ffffff;padding:32px 24px;">${content}</div>
  <div style="background:#1a365d;padding:16px;text-align:center;">
    <p style="color:#87CEEB;margin:0;font-size:12px;">Ardmore Cricket Club · The Bleach Green, Derry</p>
  </div>
</div></body></html>`;
}

const winnerMap = new Map();
for (const w of winners) {
  winnerMap.set(w.number, w);
}

let sent = 0;
let errors = 0;

for (const [profileId, numbers] of profileNumbers) {
  const info = emailMap.get(profileId);
  if (!info?.email) { console.log(`Skipping ${profileId} — no email`); continue; }

  const wonNumbers = numbers.filter(n => winnerMap.has(n));
  const isWinner = wonNumbers.length > 0;

  const balls = winningNumbers.map(n => {
    const w = winnerMap.get(n);
    return `<div style="display:inline-block;text-align:center;margin:6px;">
      <span style="display:block;background:${numbers.includes(n) ? '#c9a84c' : '#e2e8f0'};color:${numbers.includes(n) ? '#1a365d' : '#666'};font-weight:bold;width:48px;height:48px;line-height:48px;border-radius:50%;font-size:18px;">${n}</span>
      <span style="display:block;font-size:11px;color:#666;margin-top:4px;">${w.name}</span>
    </div>`;
  }).join('');

  let content;
  if (isWinner) {
    const totalWon = wonNumbers.reduce((sum, n) => sum + winnerMap.get(n).prize, 0);
    content = `
      <h2 style="color:#c9a84c;margin:0 0 16px;text-align:center;">🎉 CONGRATULATIONS! 🎉</h2>
      <p style="color:#333;line-height:1.6;text-align:center;font-size:18px;">You've won <strong style="color:#1a365d;">£${(totalWon / 100).toFixed(2)}</strong>!</p>
      <div style="text-align:center;margin:24px 0;">${balls}</div>
      ${resultsTable}
      <p style="color:#666;font-size:14px;">We'll be in touch about collecting your prize. Well played! 🏏</p>
    `;
  } else {
    content = `
      <h2 style="color:#1a365d;margin:0 0 16px;">Draw Results — ${drawDate}</h2>
      <p style="color:#333;line-height:1.6;">This week's winning numbers:</p>
      <div style="text-align:center;margin:24px 0;">${balls}</div>
      ${resultsTable}
      <p style="color:#666;font-size:14px;">Better luck next week! Your numbers are still in the game. 🏏</p>
    `;
  }

  const subject = isWinner ? `🎉 You've won in the Ardmore CC Draw!` : `Ardmore CC Draw Results — ${drawDate}`;

  try {
    await resend.emails.send({ from: FROM, to: info.email, subject, html: layout(content) });
    sent++;
    console.log(`✅ ${info.email} (${isWinner ? 'WINNER' : 'participant'})`);
  } catch (err) {
    errors++;
    console.error(`❌ ${info.email}: ${err.message}`);
  }

  // Small delay to avoid rate limits
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\nDone: ${sent} sent, ${errors} errors`);
