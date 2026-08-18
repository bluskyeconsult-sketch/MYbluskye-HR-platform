// api/stripe-webhook.js
// NEW FILE (2026-08-09) — Phase D: Stripe integration.
//
// IMPORTANT: this is deliberately its own separate Vercel serverless
// function, NOT another action inside api/index.js. Stripe webhook
// signature verification requires the raw, unparsed request body — the
// unified gateway pattern used everywhere else in this app parses JSON
// automatically, which would break signature verification here. This is
// the one legitimate exception to the "everything through api/index.js"
// pattern, and it's how Stripe's own documentation says to do it.
//
// SETUP REQUIRED before this works:
// 1. Run add-stripe-columns.sql in Supabase
// 2. In your Stripe Dashboard, create a webhook endpoint pointing to
//    https://yourdomain.com/api/stripe-webhook, listening for:
//    checkout.session.completed, customer.subscription.updated,
//    customer.subscription.deleted, invoice.payment_succeeded (this last
//    one added 2026-08-16 for recurring affiliate commissions — if it's
//    not in your webhook's subscribed events list in the Stripe
//    Dashboard, recurring commissions won't fire)
//    customer.subscription.deleted
// 3. Set these environment variables in Vercel:
//    - STRIPE_SECRET_KEY (from Stripe Dashboard > Developers > API keys)
//    - STRIPE_WEBHOOK_SECRET (from the webhook endpoint you create above)
//    - SUPABASE_SERVICE_ROLE_KEY (if not already set — needed to bypass
//      RLS when updating a user's tier from a webhook, since there's no
//      logged-in user session in this context)

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
    api: {
        bodyParser: false // required for Stripe signature verification
    }
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            // Fired when a checkout completes — this is the actual
            // moment a user's tier should be upgraded.
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id || session.metadata?.userId;

                // NEW (2026-08-16): one-time credit purchases (distinct
                // from tier subscriptions) — adds to va_credits.balance,
                // the same table/column va-execute already deducts from.
                if (session.metadata?.type === 'credit_purchase') {
                    const creditsToAdd = parseInt(session.metadata?.credits, 10);
                    if (userId && creditsToAdd) {
                        const { data: existing } = await supabase
                            .from('va_credits')
                            .select('balance')
                            .eq('user_id', userId)
                            .single();

                        if (existing) {
                            await supabase
                                .from('va_credits')
                                .update({ balance: (existing.balance || 0) + creditsToAdd })
                                .eq('user_id', userId);
                        } else {
                            await supabase
                                .from('va_credits')
                                .insert({ user_id: userId, balance: creditsToAdd });
                        }
                    }
                    break;
                }

                const tierName = session.metadata?.tierName;

                if (!userId || !tierName) {
                    console.error('Checkout completed but missing userId/tierName in session metadata:', session.id);
                    break;
                }

                const { error } = await supabase
                    .from('profiles')
                    .update({
                        user_type: tierName,
                        tier: tierName,
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        subscription_status: 'active'
                    })
                    .eq('id', userId);

                if (error) {
                    console.error('Failed to upgrade user tier after successful payment:', userId, error);
                }

                // NEW (2026-08-16): Affiliate Plan — 20% commission on a
                // referred user's first payment. This is the actual
                // moment a real payment is confirmed, so it's the correct
                // place to credit the referring affiliate — never happens
                // on a free-access-mode grant, since that skips Stripe
                // entirely and never reaches this webhook at all.
                try {
                    const { data: referredProfile } = await supabase
                        .from('profiles')
                        .select('referred_by_affiliate_code')
                        .eq('id', userId)
                        .single();

                    if (referredProfile?.referred_by_affiliate_code) {
                        const { data: affiliate } = await supabase
                            .from('affiliates')
                            .select('id, available_balance, total_earnings')
                            .eq('affiliate_code', referredProfile.referred_by_affiliate_code)
                            .eq('status', 'active')
                            .single();

                        if (affiliate && session.amount_total) {
                            const paidAmount = session.amount_total / 100; // Stripe amounts are in cents
                            const commissionRate = 0.20; // 20% on first payment — see the Affiliate Plan
                            const commissionAmount = Math.round(paidAmount * commissionRate * 100) / 100;

                            await supabase.from('affiliate_commissions').insert({
                                affiliate_id: affiliate.id,
                                referred_user_id: userId,
                                amount: commissionAmount,
                                commission_type: 'first_payment',
                                tier_name: tierName,
                                stripe_session_id: session.id
                            });

                            await supabase
                                .from('affiliates')
                                .update({
                                    available_balance: (affiliate.available_balance || 0) + commissionAmount,
                                    total_earnings: (affiliate.total_earnings || 0) + commissionAmount
                                })
                                .eq('id', affiliate.id);
                        }
                    }
                } catch (commissionError) {
                    // Never let a commission calculation failure block the
                    // actual tier upgrade above — log and move on.
                    console.error('Affiliate commission calculation failed:', commissionError);
                }

                break;
            }

            // Fired on renewal, plan change, payment failure, etc.
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await supabase
                    .from('profiles')
                    .update({ subscription_status: subscription.status })
                    .eq('stripe_subscription_id', subscription.id);
                break;
            }

            // NEW (2026-08-16): Affiliate Plan — 10% recurring commission
            // for months 2-12 of a referred user's subscription. Fires on
            // every successful renewal invoice, not just the first
            // payment (that's checkout.session.completed above, at 20%).
            // Must be added to your Stripe webhook's subscribed events —
            // it doesn't fire unless the webhook endpoint is configured
            // to listen for it.
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                // Skip the very first invoice — that's already handled at
                // the higher 20% rate via checkout.session.completed.
                if (invoice.billing_reason === 'subscription_create') break;

                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, referred_by_affiliate_code, tier')
                        .eq('stripe_customer_id', invoice.customer)
                        .single();

                    if (profile?.referred_by_affiliate_code) {
                        const { data: affiliate } = await supabase
                            .from('affiliates')
                            .select('id, available_balance, total_earnings')
                            .eq('affiliate_code', profile.referred_by_affiliate_code)
                            .eq('status', 'active')
                            .single();

                        if (affiliate && invoice.amount_paid) {
                            const paidAmount = invoice.amount_paid / 100;
                            const commissionRate = 0.10; // 10% recurring — see the Affiliate Plan
                            const commissionAmount = Math.round(paidAmount * commissionRate * 100) / 100;

                            await supabase.from('affiliate_commissions').insert({
                                affiliate_id: affiliate.id,
                                referred_user_id: profile.id,
                                amount: commissionAmount,
                                commission_type: 'recurring',
                                tier_name: profile.tier,
                                stripe_session_id: invoice.id
                            });

                            await supabase
                                .from('affiliates')
                                .update({
                                    available_balance: (affiliate.available_balance || 0) + commissionAmount,
                                    total_earnings: (affiliate.total_earnings || 0) + commissionAmount
                                })
                                .eq('id', affiliate.id);
                        }
                    }
                } catch (commissionError) {
                    console.error('Recurring commission calculation failed:', commissionError);
                }
                break;
            }

            // Fired when a subscription is cancelled or payment fails
            // permanently — downgrade back to free.
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await supabase
                    .from('profiles')
                    .update({ user_type: 'free', tier: 'free', subscription_status: 'cancelled' })
                    .eq('stripe_subscription_id', subscription.id);
                break;
            }

            default:
                // Unhandled event types are fine to ignore — Stripe sends
                // many more event types than this app currently needs.
                break;
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Stripe webhook handler error:', error);
        return res.status(500).json({ error: error.message });
    }
}
