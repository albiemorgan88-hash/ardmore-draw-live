import Link from "next/link";
import Image from "next/image";

export default function MembershipSuccessPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center">
        <Image src="/images/ground-2.jpg" alt="The Bleach Green" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-navy-dark/60" />
        <div className="relative text-center text-white px-4">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">Welcome to Ardmore CC!</h1>
          <p className="text-gold text-lg">Your membership payment has been successful</p>
        </div>
      </section>

      {/* Success Message */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 mb-8">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <h2 className="font-heading text-3xl font-bold text-navy mb-4">Payment Successful!</h2>
            <p className="text-navy/70 text-lg">
              Thank you for joining Ardmore Cricket Club. Your membership has been activated
              and you should receive a confirmation email shortly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-cream rounded-lg p-6">
              <h3 className="font-heading text-xl font-bold text-navy mb-3">What Happens Next?</h3>
              <ul className="text-left text-navy/80 space-y-2">
                <li>• You&apos;ll receive a confirmation email</li>
                <li>• A committee member will contact you within 48 hours</li>
                <li>• Your membership card will be posted to you</li>
                <li>• You can start using club facilities immediately</li>
              </ul>
            </div>

            <div className="bg-cream rounded-lg p-6">
              <h3 className="font-heading text-xl font-bold text-navy mb-3">Get Started</h3>
              <ul className="text-left text-navy/80 space-y-2">
                <li>• Check our <a href="/fixtures" className="text-gold hover:underline">fixtures</a> for upcoming matches</li>
                <li>• Join us for training (see <a href="/about" className="text-gold hover:underline">training times</a>)</li>
                <li>• Follow us on social media</li>
                <li>• Support the club through our <a href="/draw" className="text-gold hover:underline">weekly draw</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12">
            <p className="text-navy/60 mb-6">
              If you have any questions about your membership, please contact us:
            </p>
            <div className="space-y-2 text-navy">
              <div><strong>Email:</strong> <a href="mailto:Ardmorecc1879@hotmail.com" className="text-gold hover:underline">Ardmorecc1879@hotmail.com</a></div>
              <div><strong>Secretary & Treasurer:</strong> Kevin Brolly</div>
            </div>
          </div>

          <div className="mt-12">
            <Link
              href="/"
              className="bg-navy text-white px-8 py-3 rounded-lg font-semibold hover:bg-navy-light transition-colors inline-block"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
