import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Ardmore Cricket Club",
  description: "How Ardmore Cricket Club collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-heading text-4xl font-bold text-navy mb-2">Privacy Policy</h1>
        <p className="text-navy/50 text-sm mb-10">Last updated: 1 March 2025</p>

        <div className="space-y-8 text-navy/80 leading-relaxed">
          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">1. Data Controller</h2>
            <p>
              <strong>Ardmore Cricket Club</strong>, 12 Green Road, Ardmore, BT47 3RG, Co. Derry is the
              data controller for personal information collected through this website and the weekly draw service.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">2. What We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Name</strong> &mdash; to identify your account</li>
              <li><strong>Email address</strong> &mdash; for account access and draw notifications</li>
              <li><strong>Payment information</strong> &mdash; processed securely by Stripe. We do not store your card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">3. Why We Collect It</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To operate the weekly draw and manage your entries</li>
              <li>To send you draw results and winner notifications</li>
              <li>To communicate important updates about the club</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">4. Legal Basis</h2>
            <p>
              We process your data under <strong>legitimate interest</strong> (operating the draw you have entered)
              and <strong>consent</strong> (which you provide when creating an account). You can withdraw consent
              at any time by deleting your account.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">5. Third Parties</h2>
            <p className="mb-3">We share data only with services essential to running the draw:</p>
            <div className="bg-white rounded-lg p-5 border border-navy/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><strong>Stripe</strong> &mdash; payment processing</div>
                <div><strong>Supabase</strong> &mdash; secure database</div>
                <div><strong>Resend</strong> &mdash; email delivery</div>
                <div><strong>Vercel</strong> &mdash; website hosting</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">6. Data Retention</h2>
            <p>
              We keep your account data for as long as your account is active. If you request deletion,
              we will remove your personal data within 30 days. Anonymised draw records may be retained
              for audit purposes.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">7. Your Rights (GDPR)</h2>
            <p className="mb-3">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Access</strong> &mdash; request a copy of your personal data</li>
              <li><strong>Rectification</strong> &mdash; correct any inaccurate data</li>
              <li><strong>Erasure</strong> &mdash; request deletion of your data</li>
              <li><strong>Portability</strong> &mdash; receive your data in a portable format</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href="mailto:Ardmorecc1879@hotmail.com" className="text-gold font-semibold hover:underline">
                Ardmorecc1879@hotmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">8. Cookies</h2>
            <p>
              We use <strong>minimal cookies</strong> &mdash; only what is needed for authentication sessions.
              We do not use tracking cookies, analytics cookies, or any third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-semibold text-navy mb-3">9. Contact</h2>
            <p>
              For any privacy-related queries, contact us at{" "}
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
