'use client';

import Image from "next/image";
import { useState } from "react";

export default function MembershipPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');

  const membershipTiers = [
    {
      id: 'adult',
      name: 'Adult Member',
      price: '£70',
      description: 'Full playing membership for adults (18+)',
      features: [
        'Full playing rights for all senior teams',
        'Training sessions included',
        'Club facilities access',
        'Annual presentation dinner',
        'Voting rights at AGM',
      ],
    },
    {
      id: 'social',
      name: 'Social Member',
      price: '£25',
      description: 'Non-playing social membership',
      features: [
        'Club facilities access',
        'Social events and functions',
        'Match day refreshments',
        'Annual presentation dinner',
        'Club newsletter updates',
        'Supporter privileges',
      ],
    },
    {
      id: 'underage',
      name: 'Underage Cricketer',
      price: '£10',
      description: 'For a child on their own',
      features: [
        'Full playing rights for junior teams',
        'Training sessions included',
        'Club facilities access',
        'Match day refreshments',
        'Junior coaching program',
        'Annual awards ceremony',
      ],
    },
    {
      id: 'family',
      name: 'Family Membership',
      price: '£25',
      description: 'For a parent and one or more children',
      features: [
        'Family access for one parent and one or more children',
        'Training sessions included',
        'Club facilities access',
        'Match day refreshments',
        'Junior coaching program',
        'Annual awards ceremony',
      ],
    },
  ];

  const handlePayment = async (membershipType: string) => {
    const trimmedName = memberName.trim();
    if (!trimmedName) {
      alert('Please enter the membership name before continuing.');
      return;
    }

    setLoading(membershipType);

    try {
      const response = await fetch('/api/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ membershipType, memberName: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout URL
      window.location.href = data.url;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center">
        <Image src="/images/team-1.jpg" alt="Ardmore Cricket Club team" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-navy-dark/60" />
        <div className="relative text-center text-white px-4">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">Join Ardmore CC</h1>
          <p className="text-gold text-lg">Become part of our cricket family</p>
        </div>
      </section>

      {/* Membership Tiers */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-navy mb-4">Choose Your Membership</h2>
            <p className="text-navy/60 text-lg max-w-2xl mx-auto">
              Join Ardmore Cricket Club and be part of our cricket community. 
              Choose the membership that suits you best.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-10 bg-cream rounded-xl border border-gray-200 p-6">
            <label htmlFor="memberName" className="block text-sm font-semibold text-navy mb-2">
              Membership Name
            </label>
            <input
              id="memberName"
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Enter the member's full name"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
            />
            <p className="mt-2 text-sm text-navy/60">
              This name will be attached to the membership purchase and included in the club notification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {membershipTiers.map((tier) => (
              <div 
                key={tier.id} 
                className="bg-cream rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-center mb-6">
                  <h3 className="font-heading text-2xl font-bold text-navy mb-2">{tier.name}</h3>
                  <div className="text-4xl font-heading font-bold text-gold mb-2">{tier.price}</div>
                  <div className="text-sm text-navy/60 uppercase tracking-wider">per year</div>
                  <p className="text-navy/70 mt-3">{tier.description}</p>
                </div>

                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-navy" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-navy/80 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePayment(tier.id)}
                  disabled={loading === tier.id || !memberName.trim()}
                  className="w-full bg-navy text-white py-3 px-6 rounded-lg font-semibold hover:bg-navy-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === tier.id ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Info */}
      <section className="py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h3 className="font-heading text-2xl font-bold text-navy mb-6">Membership Benefits</h3>
          <div className="prose prose-lg max-w-none text-navy/80">
            <p>
              All memberships run from April to March and provide access to our excellent facilities 
              at The Bleach Green. Members are covered by our comprehensive insurance and can participate 
              in all club activities throughout the season.
            </p>
            <p>
              For more information about membership benefits or if you have any questions, 
              please don&apos;t hesitate to contact us at{' '}
              <a href="mailto:Ardmorecc1879@hotmail.com" className="text-gold hover:underline">
                Ardmorecc1879@hotmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}