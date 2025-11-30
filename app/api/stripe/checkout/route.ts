import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe, PRICE_IDS } from '@/lib/stripe/client';

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout session for subscription
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tier } = body;

  if (!tier || !['pro', 'copy', 'enterprise'].includes(tier)) {
    return NextResponse.json(
      { error: 'Invalid tier. Must be pro, copy, or enterprise' },
      { status: 400 }
    );
  }

  const priceId = PRICE_IDS[tier];
  if (!priceId || priceId.startsWith('price_')) {
    return NextResponse.json(
      { error: 'Price ID not configured for this tier' },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin')}/billing?success=true`,
      cancel_url: `${request.headers.get('origin')}/billing?canceled=true`,
      metadata: {
        user_id: user.id,
        tier,
      },
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
