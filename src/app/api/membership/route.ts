import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { membershipType, memberName } = await request.json();

    const membershipTypes = {
      'adult': { amount: 7000, name: 'Adult Member' }, // £70 in pence
      'social': { amount: 2500, name: 'Social Member' }, // £25 in pence
      'underage': { amount: 1000, name: 'Underage Cricketer' }, // £10 in pence
      'family': { amount: 2500, name: 'Family Membership' }, // £25 in pence
    };

    if (!membershipTypes[membershipType as keyof typeof membershipTypes]) {
      return NextResponse.json({ error: 'Invalid membership type' }, { status: 400 });
    }

    const membership = membershipTypes[membershipType as keyof typeof membershipTypes];
    const trimmedMemberName = typeof memberName === 'string' ? memberName.trim() : '';

    if (!trimmedMemberName) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Ardmore Cricket Club - ${membership.name}`,
              description: `Annual membership for ${membership.name}`,
              metadata: {
                category: 'membership',
                type: membershipType,
              },
            },
            unit_amount: membership.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        membershipType,
        membershipName: membership.name,
        memberName: trimmedMemberName,
        category: 'membership',
      },
      payment_intent_data: {
        metadata: {
          category: 'membership',
          membershipType,
          membershipName: membership.name,
          memberName: trimmedMemberName,
        },
      },
      success_url: `${request.nextUrl.origin}/membership/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/membership`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}