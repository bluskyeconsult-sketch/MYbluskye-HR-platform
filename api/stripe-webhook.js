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
