import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Ardmore Cricket Club",
  description: "Terms and conditions for the Ardmore Cricket Club weekly draw.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-heading text-4xl font-bold text-navy mb-2">Terms &amp; Conditions</h1>
        <p className="text-navy/50 text-sm mb-10">Last updated: 1 March 2025</p>

        <div className="space-y-8 text-navy/80 leading-relaxed">
          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">1. About the Draw</h2>
            <p>
              The Ardmore Cricket Club Weekly Draw is a small society lottery operated by
              {" "}<strong>Ardmore Cricket Club</strong>, 12 Green Road, Ardmore, BT47 3RG, Co. Derry.
              The draw is registered with Derry City &amp; Strabane District Council under the
              Gambling Act 2005 (small society lottery provisions).
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">2. How It Works</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>There are <strong>500 numbers</strong> available each week, priced at <strong>£1 per number</strong>.</li>
              <li>Each number gives you one entry per week.</li>
              <li>The draw takes place every <strong>Friday at 7:00 PM</strong>.</li>
              <li>Three winning numbers are drawn each week.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">3. Prize Structure</h2>
            <p className="mb-3">Each week&rsquo;s pot is split as follows:</p>
            <div className="bg-white rounded-lg p-5 border border-navy/10">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>🥇 1st Prize</div><div className="font-semibold">25% of pot</div>
                <div>🥈 2nd Prize</div><div className="font-semibold">15% of pot</div>
                <div>🥉 3rd Prize</div><div className="font-semibold">10% of pot</div>
                <div className="border-t border-navy/10 pt-2">🏏 Club Fund</div><div className="border-t border-navy/10 pt-2 font-semibold">40%</div>
                <div>💻 Platform Fee</div><div className="font-semibold">7.5%</div>
                <div>💳 Payment Processing</div><div className="font-semibold">2.5%</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">4. Eligibility</h2>
            <p>You must be <strong>18 years of age or older</strong> to enter the weekly draw. By purchasing a number, you confirm that you meet this requirement.</p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">5. Subscriptions &amp; Payments</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Subscriptions are recurring and <strong>auto-renew weekly</strong>.</li>
              <li>You can <strong>cancel at any time</strong> from your account dashboard.</li>
              <li>Your chosen numbers are reserved for as long as your subscription is active.</li>
              <li>If a payment fails, there is a <strong>3-day grace period</strong>. If payment is not resolved within this period, your numbers will be released back into the pool.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">6. Provably Fair Draw</h2>
            <p>
              Each draw uses a <strong>cryptographic random seed</strong> to select winners. The seed is
              published after each draw so that results can be independently verified. This ensures
              complete transparency and fairness.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">7. Claiming Prizes</h2>
            <p>
              Winners are notified by email after each draw. Prizes must be <strong>claimed within 30 days</strong> of
              the draw date. Unclaimed prizes after this period will be returned to the club fund.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">8. Changes &amp; Cancellation</h2>
            <p>
              Ardmore Cricket Club reserves the right to cancel, suspend, or modify the weekly draw
              with reasonable notice to participants. In the event of cancellation, any active
              subscriptions will be refunded on a pro-rata basis.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">9. Contact</h2>
            <p>
              For any questions about these terms or the weekly draw, contact us at{" "}
              <a href="mailto:Ardmorecc1879@hotmail.com" className="text-gold font-semibold hover:underline">
                Ardmorecc1879@hotmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
