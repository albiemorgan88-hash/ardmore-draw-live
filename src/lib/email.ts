import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  }
  return _resend;
}

const FROM = process.env.RESEND_FROM || "Ardmore Cricket Club <onboarding@resend.dev>";

const ADMIN_EMAILS = [
  "contact@bluecanvas.ai",
  "Ardmorecc1879@hotmail.com",
];

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px; margin: 0 auto; padding: 0;
`;

function layout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;">
<div style="${baseStyle}">
  <div style="background:#1a365d;padding:24px;text-align:center;">
    <h1 style="color:#c9a84c;margin:0;font-size:24px;">🏏 Ardmore Cricket Club</h1>
    <p style="color:#87CEEB;margin:4px 0 0;font-size:13px;">Weekly Draw</p>
  </div>
  <div style="background:#ffffff;padding:32px 24px;">
    ${content}
  </div>
  <div style="background:#1a365d;padding:16px;text-align:center;">
    <p style="color:#87CEEB;margin:0;font-size:12px;">Ardmore Cricket Club · The Bleach Green, Derry</p>
  </div>
</div></body></html>`;
}

export async function sendPurchaseConfirmation(
  email: string,
  numbers: number[],
  amountPence: number,
  names?: Record<string, string>
) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const balls = sorted
    .map(
      (n) => {
        const name = names?.[String(n)];
        return `<div style="display:inline-block;text-align:center;margin:6px;">
          <span style="display:block;background:#c9a84c;color:#1a365d;font-weight:bold;width:40px;height:40px;line-height:40px;border-radius:50%;margin:0 auto;font-size:16px;">${n}</span>
          ${name ? `<span style="display:block;font-size:11px;color:#666;margin-top:4px;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>` : ""}
        </div>`;
      }
    )
    .join("");

  const numberList = sorted.map(n => {
    const name = names?.[String(n)];
    return name ? `${n} (${name})` : `${n}`;
  }).join(", ");

  const html = layout(`
    <h2 style="color:#1a365d;margin:0 0 16px;">You're in this week's draw! 🎉</h2>
    <p style="color:#333;line-height:1.6;">Your numbers have been confirmed for Friday's 7PM draw.</p>
    <div style="text-align:center;margin:24px 0;">${balls}</div>
    <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#333;"><strong>Amount paid:</strong> £${(amountPence / 100).toFixed(2)}</p>
      <p style="margin:8px 0 0;color:#333;"><strong>Numbers:</strong> ${numberList}</p>
    </div>
    <p style="color:#666;font-size:14px;">Good luck! Results will be emailed after the draw.</p>
  `);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Draw Confirmed — Numbers ${sorted.join(", ")}`,
    html,
  });
}

export async function sendDrawResults(
  participants: { email: string; numbers: number[]; name?: string }[],
  winningNumbers: number[],
  prizes: { first: number; second: number; third: number },
  drawDate: string,
  winnerNames?: string[]
) {
  const winnerMap = new Map<number, { place: string; amount: number; winnerName: string }>();
  winnerMap.set(winningNumbers[0], { place: "1st", amount: prizes.first, winnerName: winnerNames?.[0] || "Unknown" });
  winnerMap.set(winningNumbers[1], { place: "2nd", amount: prizes.second, winnerName: winnerNames?.[1] || "Unknown" });
  winnerMap.set(winningNumbers[2], { place: "3rd", amount: prizes.third, winnerName: winnerNames?.[2] || "Unknown" });

  // Build the results table showing winners — same for EVERYONE
  const resultsTable = `
    <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#333;font-weight:bold;">🏆 1st Prize: No. ${winningNumbers[0]} — ${winnerNames?.[0] || "Unknown"} — £${(prizes.first / 100).toFixed(2)}</p>
      <p style="margin:8px 0;color:#333;font-weight:bold;">🥈 2nd Prize: No. ${winningNumbers[1]} — ${winnerNames?.[1] || "Unknown"} — £${(prizes.second / 100).toFixed(2)}</p>
      <p style="margin:8px 0 0;color:#333;font-weight:bold;">🥉 3rd Prize: No. ${winningNumbers[2]} — ${winnerNames?.[2] || "Unknown"} — £${(prizes.third / 100).toFixed(2)}</p>
    </div>
  `;

  for (const p of participants) {
    const wonNumbers = p.numbers.filter((n) => winnerMap.has(n));
    const isWinner = wonNumbers.length > 0;

    // Show winning numbers as balls — highlight if this person holds that number
    const balls = winningNumbers
      .map(
        (n) =>
          `<div style="display:inline-block;text-align:center;margin:6px;">
            <span style="display:block;background:${p.numbers.includes(n) ? "#c9a84c" : "#e2e8f0"};color:${p.numbers.includes(n) ? "#1a365d" : "#666"};font-weight:bold;width:48px;height:48px;line-height:48px;border-radius:50%;font-size:18px;">${n}</span>
            <span style="display:block;font-size:11px;color:#666;margin-top:4px;">${winnerMap.get(n)!.winnerName}</span>
          </div>`
      )
      .join("");

    let content: string;
    if (isWinner) {
      const totalWon = wonNumbers.reduce((sum, n) => sum + winnerMap.get(n)!.amount, 0);
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

    const subject = isWinner
      ? `🎉 You've won in the Ardmore CC Draw!`
      : `Ardmore CC Draw Results — ${drawDate}`;

    try {
      await getResend().emails.send({ from: FROM, to: p.email, subject, html: layout(content) });
    } catch (err) {
      console.error(`Failed to send draw result to ${p.email}:`, err);
    }
  }
}

export async function sendAdminNewEntryNotification(
  memberEmail: string,
  memberName: string | undefined,
  numbers: number[],
  amountPence: number,
  names?: Record<string, string>,
  isSubscription?: boolean
) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const numberList = sorted.map(n => {
    const name = names?.[String(n)];
    return name ? `${n} (${name})` : `${n}`;
  }).join(", ");

  const html = layout(`
    <h2 style="color:#1a365d;margin:0 0 16px;">🔔 New Draw Entry</h2>
    <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#333;"><strong>Member:</strong> ${memberName || "Unknown"} (${memberEmail})</p>
      <p style="margin:8px 0 0;color:#333;"><strong>Numbers:</strong> ${numberList}</p>
      <p style="margin:8px 0 0;color:#333;"><strong>Amount:</strong> £${(amountPence / 100).toFixed(2)}${isSubscription ? "/week (subscription)" : " (one-off)"}</p>
      <p style="margin:8px 0 0;color:#333;"><strong>Time:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
    </div>
  `);

  for (const adminEmail of ADMIN_EMAILS) {
    try {
      await getResend().emails.send({
        from: FROM,
        to: adminEmail,
        subject: `New Draw Entry — ${memberName || memberEmail} picked ${sorted.length} numbers`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send admin notification to ${adminEmail}:`, err);
    }
  }
}

export async function sendWinnerClaimEmail(
  email: string,
  name: string | undefined,
  place: string,
  amountPence: number,
  winningNumber: number,
  claimToken: string
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ardmorecricket.com";
  const claimUrl = `${siteUrl}/claim?token=${claimToken}`;

  const html = layout(`
    <h2 style="color:#c9a84c;margin:0 0 16px;text-align:center;">🎉 You've Won ${place} Prize!</h2>
    <p style="color:#333;line-height:1.6;text-align:center;font-size:18px;">
      ${name ? `Congratulations ${name}!` : "Congratulations!"} Your number <strong style="color:#1a365d;">${winningNumber}</strong> came up in the draw.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;color:#166534;font-size:24px;font-weight:bold;">£${(amountPence / 100).toFixed(2)}</p>
      <p style="margin:4px 0 0;color:#166534;font-size:14px;">${place} Prize</p>
    </div>
    <p style="color:#333;line-height:1.6;">To receive your winnings directly to your bank account, connect your details securely via Stripe:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${claimUrl}" style="display:inline-block;background:#c9a84c;color:#1a365d;font-weight:bold;padding:16px 40px;border-radius:8px;text-decoration:none;font-size:16px;">Claim Your Prize →</a>
    </div>
    <p style="color:#666;font-size:13px;">This link expires in 14 days. Stripe handles your bank details securely — we never see them. Once connected, future winnings are paid automatically.</p>
  `);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `🎉 You've won £${(amountPence / 100).toFixed(2)} in the Ardmore CC Draw!`,
    html,
  });
}

export async function sendPayoutConfirmationEmail(
  email: string,
  name: string | undefined,
  amountPence: number,
  place: string,
  winningNumber: number
) {
  const html = layout(`
    <h2 style="color:#1a365d;margin:0 0 16px;">💰 Prize Sent!</h2>
    <p style="color:#333;line-height:1.6;">${name ? `Hi ${name}, your` : "Your"} ${place} prize winnings have been transferred to your bank account.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0;color:#166534;font-weight:bold;font-size:20px;">£${(amountPence / 100).toFixed(2)}</p>
      <p style="margin:4px 0 0;color:#166534;font-size:13px;">Number ${winningNumber} — ${place} Prize</p>
    </div>
    <p style="color:#666;font-size:14px;">Funds typically arrive within 1-2 business days. Keep playing — your numbers are still in the draw! 🏏</p>
  `);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `💰 £${(amountPence / 100).toFixed(2)} prize sent to your account`,
    html,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const html = layout(`
    <h2 style="color:#1a365d;margin:0 0 16px;">Welcome to Ardmore CC${name ? `, ${name}` : ""}! 🏏</h2>
    <p style="color:#333;line-height:1.6;">Thanks for signing up. You can now enter our weekly draw — pick your lucky numbers for just £1 each.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://ardmorecricket.com/draw" style="display:inline-block;background:#c9a84c;color:#1a365d;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;">Pick Your Numbers →</a>
    </div>
    <p style="color:#666;font-size:14px;">Every Friday at 7PM, 3 numbers are drawn. 50% of the pot goes to winners, 40% goes straight to the club.</p>
  `);

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to Ardmore Cricket Club 🏏",
    html,
  });
}
