import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  }
  return _resend;
}

const FROM = process.env.RESEND_FROM || "Ardmore Cricket Club <onboarding@resend.dev>";

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
  amountPence: number
) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const balls = sorted
    .map(
      (n) =>
        `<span style="display:inline-block;background:#c9a84c;color:#1a365d;font-weight:bold;width:40px;height:40px;line-height:40px;border-radius:50%;text-align:center;margin:4px;font-size:16px;">${n}</span>`
    )
    .join("");

  const html = layout(`
    <h2 style="color:#1a365d;margin:0 0 16px;">You're in this week's draw! 🎉</h2>
    <p style="color:#333;line-height:1.6;">Your numbers have been confirmed for Friday's 7PM draw.</p>
    <div style="text-align:center;margin:24px 0;">${balls}</div>
    <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#333;"><strong>Amount paid:</strong> £${(amountPence / 100).toFixed(2)}</p>
      <p style="margin:8px 0 0;color:#333;"><strong>Numbers:</strong> ${sorted.join(", ")}</p>
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
  drawDate: string
) {
  const winnerMap = new Map<number, { place: string; amount: number }>();
  winnerMap.set(winningNumbers[0], { place: "1st", amount: prizes.first });
  winnerMap.set(winningNumbers[1], { place: "2nd", amount: prizes.second });
  winnerMap.set(winningNumbers[2], { place: "3rd", amount: prizes.third });

  for (const p of participants) {
    const wonNumbers = p.numbers.filter((n) => winnerMap.has(n));
    const isWinner = wonNumbers.length > 0;

    const balls = winningNumbers
      .map(
        (n) =>
          `<span style="display:inline-block;background:${p.numbers.includes(n) ? "#c9a84c" : "#e2e8f0"};color:${p.numbers.includes(n) ? "#1a365d" : "#666"};font-weight:bold;width:48px;height:48px;line-height:48px;border-radius:50%;text-align:center;margin:4px;font-size:18px;">${n}</span>`
      )
      .join("");

    let content: string;
    if (isWinner) {
      const totalWon = wonNumbers.reduce((sum, n) => sum + winnerMap.get(n)!.amount, 0);
      const winDetails = wonNumbers
        .map((n) => `${winnerMap.get(n)!.place} Prize (No. ${n}): £${(winnerMap.get(n)!.amount / 100).toFixed(2)}`)
        .join("<br>");
      content = `
        <h2 style="color:#c9a84c;margin:0 0 16px;text-align:center;">🎉 CONGRATULATIONS! 🎉</h2>
        <p style="color:#333;line-height:1.6;text-align:center;font-size:18px;">You've won <strong style="color:#1a365d;">£${(totalWon / 100).toFixed(2)}</strong>!</p>
        <div style="text-align:center;margin:24px 0;">${balls}</div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#166534;font-weight:bold;">Your Winnings:</p>
          <p style="margin:8px 0 0;color:#166534;">${winDetails}</p>
        </div>
        <p style="color:#666;font-size:14px;">We'll be in touch about collecting your prize. Well played! 🏏</p>
      `;
    } else {
      content = `
        <h2 style="color:#1a365d;margin:0 0 16px;">Draw Results — ${drawDate}</h2>
        <p style="color:#333;line-height:1.6;">This week's winning numbers:</p>
        <div style="text-align:center;margin:24px 0;">${balls}</div>
        <div style="background:#f5f5f0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#333;">1st: No. ${winningNumbers[0]} — £${(prizes.first / 100).toFixed(2)}</p>
          <p style="margin:4px 0;color:#333;">2nd: No. ${winningNumbers[1]} — £${(prizes.second / 100).toFixed(2)}</p>
          <p style="margin:4px 0 0;color:#333;">3rd: No. ${winningNumbers[2]} — £${(prizes.third / 100).toFixed(2)}</p>
        </div>
        <p style="color:#666;font-size:14px;">Better luck next week! Your numbers are still in the game. 🏏</p>
      `;
    }

    const subject = isWinner
      ? `🎉 You've won in the Ardmore CC Draw!`
      : `Draw Results — ${drawDate}`;

    try {
      await getResend().emails.send({ from: FROM, to: p.email, subject, html: layout(content) });
    } catch (err) {
      console.error(`Failed to send draw result to ${p.email}:`, err);
    }
  }
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
