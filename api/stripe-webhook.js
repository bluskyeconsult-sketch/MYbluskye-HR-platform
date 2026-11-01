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
// 2. Run add-processed-stripe-events-table.sql (new — see fix below)
// 3. In your Stripe Dashboard, create a webhook endpoint pointing to
//    https://yourdomain.com/api/stripe-webhook, listening for:
//    checkout.session.completed, customer.subscription.updated,
//    customer.subscription.deleted, invoice.payment_succeeded (this last
//    one added 2026-08-16 for recurring affiliate commissions — if it's
//    not in your webhook's subscribed events list in the Stripe
//    Dashboard, recurring commissions won't fire)
// 4. Set these environment variables in Vercel:
//    - STRIPE_SECRET_KEY (from Stripe Dashboard > Developers > API keys)
//    - STRIPE_WEBHOOK_SECRET (from the webhook endpoint you create above)
//    - SUPABASE_SERVICE_ROLE_KEY (if not already set — needed to bypass
//      RLS when updating a user's tier from a webhook, since there's no
//      logged-in user session in this context)
//
// FIXED (2026-08-21): Stripe webhooks are delivered with AT-LEAST-ONCE
// guarantees — the same event can legitimately arrive twice (retries on
// timeout, network blips, or this endpoint returning non-200 for any
// reason). Nothing here previously checked whether an event had already
// been processed, so a retried checkout.session.completed could double-
// grant purchased credits, or double-record an affiliate commission.
// Added a processed_stripe_events table: every event.id is checked and
// recorded before processing, and duplicates are skipped with a 200
// (telling Stripe "got it, stop retrying" rather than letting a
// duplicate re-run the whole handler).

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { AFFILIATE_PLAN } from '../src/services/affiliatePlan.js';
import { checkBilling, recordFlag } from './_lib/geoPricing.js';
import { reverseCreditPurchase, restoreAfterDisputeWon } from './_lib/creditReversal.js';

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

// Small mail sender for alerts to support (the webhook has no other mail). Fails quietly: an alert must never break payment handling.
async function sendAlertMail({ to, subject, html }) {
    try {
        const host = process.env.VITE_SMTP_HOST || process.env.SMTP_HOST; if (!host) return;
        const nodemailer = (await import('nodemailer')).default;
        const port = parseInt(process.env.VITE_SMTP_PORT || process.env.SMTP_PORT || '465');
        const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: process.env.VITE_EMAIL_USER || process.env.SMTP_USER, pass: process.env.VITE_EMAIL_PASS || process.env.SMTP_PASSWORD } });
        await t.sendMail({ from: `"ODUSBABA" <${process.env.SMTP_SENDER_EMAIL || process.env.VITE_EMAIL_SENDER || process.env.EMAIL_SENDER_ADDRESS || 'noreply@bluskyeconsult.com'}>`, to, subject, html });
    } catch (e) { console.error('alert mail failed:', e.message); }
}

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

    // NEW (2026-08-21): idempotency check. Try to INSERT this event's id
    // first — if it already exists, this is a duplicate delivery of an
    // event we've already handled. Acknowledge it and stop, rather than
    // re-running the handler (which would re-grant credits, re-record
    // commissions, etc.). Using insert-and-check-conflict here rather
    // than select-then-insert avoids a race between two near-simultaneous
    // deliveries of the same event.
    try {
        const { error: dupeError } = await supabase
            .from('processed_stripe_events')
            .insert({ event_id: event.id, event_type: event.type });

        if (dupeError) {
            // Unique violation on event_id means we've already processed
            // this exact event — safe to acknowledge and skip.
            if (dupeError.code === '23505') {
                console.log(`Skipping duplicate Stripe event: ${event.id} (${event.type})`);
                return res.status(200).json({ received: true, duplicate: true });
            }
            // Any other error recording the event is unexpected — log it,
            // but don't block processing on a logging failure alone.
            console.error('Failed to record processed_stripe_events row:', dupeError.message);
        }
    } catch (idempotencyError) {
        console.error('Idempotency check failed, proceeding anyway:', idempotencyError.message);
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
                // NEW (2026-10-23): pay-per-appraisal packs for small teams. Credited once per payment (the payment id is the
                // key, so a repeated webhook cannot add them twice). Nothing is credited unless the payment is actually paid.
                if (session.metadata?.type === 'appraisal_pack') {
                    const orgId = session.metadata?.orgId; const count = parseInt(session.metadata?.count, 10);
                    if (orgId && [1, 5, 10, 25].includes(count) && session.payment_status === 'paid') {
                        const { error: credErr } = await supabase.rpc('appraisal_credit_adjust', { p_org: orgId, p_delta: count, p_reason: 'purchase', p_ref: session.id, p_appraisal: null });
                        if (credErr) {
                            console.error('appraisal credit failed:', credErr.message);
                            // Forget this event so Stripe's retry is processed, not skipped as a duplicate. The credit is keyed on the payment id, so a retry can never double-credit.
                            await supabase.from('processed_stripe_events').delete().eq('event_id', event.id);
                            return res.status(500).json({ error: 'credit failed' });
                        }
                    }
                    break;
                }

                // NEW (2026-10-23): pay-per-job-post packs. Credited once per payment (keyed on the payment id), only when paid.
                if (session.metadata?.type === 'job_post_pack') {
                    const jpUser = session.metadata?.userId; const jpCount = parseInt(session.metadata?.count, 10);
                    if (jpUser && [1, 3, 5].includes(jpCount) && session.payment_status === 'paid') {
                        const { error: jpErr } = await supabase.rpc('job_post_credit_adjust', { p_user: jpUser, p_delta: jpCount, p_reason: 'purchase', p_ref: session.id, p_job: null });
                        if (jpErr) {
                            console.error('job post credit failed:', jpErr.message);
                            await supabase.from('processed_stripe_events').delete().eq('event_id', event.id);
                            return res.status(500).json({ error: 'credit failed' });
                        }
                    }
                    break;
                }

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

                // NEW (2026-08-23): one-time e-copy book purchases —
                // this is the actual moment access is granted. Unique
                // constraint on (user_id, book_id) means a duplicate
                // webhook delivery for the same purchase (on top of the
                // event.id dedup check already done above) can't create
                // a second row — using upsert with ignoreDuplicates so a
                // retry is a safe no-op rather than an error.
                if (session.metadata?.type === 'book_audio_purchase') {
                    const audioBookId = session.metadata?.bookId;
                    if (userId && audioBookId) {
                        await supabase
                            .from('book_audio_purchases')
                            .upsert({
                                user_id: userId,
                                book_id: audioBookId,
                                stripe_session_id: session.id,
                                amount_paid: session.amount_total ? session.amount_total / 100 : null,
                                purchased_at: new Date().toISOString()
                            }, { onConflict: 'user_id,book_id', ignoreDuplicates: true });
                    }
                    break;
                }

                if (session.metadata?.type === 'book_purchase') {
                    const bookId = session.metadata?.bookId;
                    if (userId && bookId) {
                        await supabase
                            .from('book_purchases')
                            .upsert({
                                user_id: userId,
                                book_id: bookId,
                                stripe_session_id: session.id,
                                amount_paid: session.amount_total ? session.amount_total / 100 : null,
                                purchased_at: new Date().toISOString()
                            }, { onConflict: 'user_id,book_id', ignoreDuplicates: true });
                    }
                    break;
                }

                // NEW (2026-09-20): bulk cart checkout - grants access
                // for every item purchased together in one session,
                // matching the exact, proven patterns already used
                // above for single book purchases (book_purchases
                // upsert) and reusing course_enrollments' own real,
                // existing shape (status: 'active', progress: 0) - the
                // same fields CourseDetail.jsx already inserts on
                // first enrollment.
                // FIXED (2026-09-21): simplified to match the real,
                // fixed cart-checkout backend action - courses are
                // genuinely free, tier-gated enrollment with no
                // payment involved at all, so they're now enrolled
                // synchronously before Stripe is ever reached. This
                // metadata only ever contains books now.
                if (session.metadata?.type === 'cart_checkout') {
                    let items = [];
                    try {
                        items = JSON.parse(session.metadata?.items || '[]');
                    } catch (parseErr) {
                        console.error('Failed to parse cart_checkout items metadata:', session.id, parseErr.message);
                        break;
                    }

                    for (const item of items) {
                        if (item.type === 'book' && userId) {
                            await supabase
                                .from('book_purchases')
                                .upsert({
                                    user_id: userId,
                                    book_id: item.id,
                                    stripe_session_id: session.id,
                                    amount_paid: null,
                                    purchased_at: new Date().toISOString()
                                }, { onConflict: 'user_id,book_id', ignoreDuplicates: true });
                        }
                    }

                    // Clears the purchased books from the cart - course
                    // items were already removed by cart-checkout
                    // itself, right after enrolling.
                    if (userId) {
                        await supabase
                            .from('cart_items')
                            .delete()
                            .eq('user_id', userId)
                            .eq('item_type', 'book')
                            .in('item_id', items.map(i => i.id));
                    }

                    // NEW (2026-09-24): logs the real, confirmed
                    // purchase - genuinely useful for a future dispute
                    // ("I was charged incorrectly"), since this is the
                    // point where payment is actually confirmed
                    // complete, not just attempted. Fire-and-forget.
                    if (userId) {
                        supabase.from('user_activity_log').insert({
                            user_id: userId,
                            action_type: 'purchase_completed',
                            details: { items, stripeSessionId: session.id }
                        }).then(() => {}).catch(() => {});
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
                        subscription_status: 'active',
                        // NEW (2026-08-16): needed for the refund
                        // fulfillment flow — anchors the 14-day
                        // eligibility window. The actual charge to refund
                        // is looked up live from Stripe when a refund is
                        // processed, rather than stored here — for
                        // mode: 'subscription' checkouts (what this app
                        // uses), session.payment_intent isn't reliably
                        // populated the same way it is for one-time
                        // payments; the real payment intent lives on the
                        // subscription's first invoice instead.
                        subscribed_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) {
                    console.error('Failed to upgrade user tier after successful payment:', userId, error);
                }

                // NEW (2026-10-23): regional pricing check. If a discounted band was charged, the billing country on the
                // payment must belong to a band that justifies it. A mismatch never blocks the customer here; it is
                // flagged in Admin > Geo-pricing for a person to review.
                try {
                    const chargedBand = session.metadata?.priceBand;
                    if (chargedBand && chargedBand !== 'A') {
                        const billingCountry = session.customer_details?.address?.country || null;
                        const chk = await checkBilling(supabase, { chargedBand, billingCountry });
                        if (!chk.ok) await recordFlag(supabase, { user_id: userId, stripe_session_id: session.id, charged_band: chargedBand, billing_country: billingCountry, billing_band: chk.billingBand || null, reason: chk.reason });
                    }
                } catch (geoErr) { console.error('geo pricing check failed (non-fatal):', geoErr.message); }

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
                            .select('id, user_id, available_balance, total_earnings')
                            .eq('affiliate_code', referredProfile.referred_by_affiliate_code)
                            .eq('status', 'active')
                            .single();

                        // Self-referral guard: nobody earns commission on their own payment.
                        if (affiliate && affiliate.user_id !== userId && session.amount_total) {
                            const paidAmount = session.amount_total / 100; // Stripe amounts are in cents
                            const commissionRate = AFFILIATE_PLAN.firstPaymentPct / 100; // see src/services/affiliatePlan.js
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
            // NEW (2026-10-23): a card payment for appraisal or job-post credits was refunded in full or disputed: take back the credits
            // that are still unspent (once per charge or dispute). Enable these three events on the Stripe webhook endpoint.
            case 'charge.refunded':
            case 'charge.dispute.created':
            case 'charge.dispute.closed': {
                const obj = event.data.object;
                try {
                    if (event.type === 'charge.refunded') {
                        if (!obj.refunded) { console.log(`Partial refund on ${obj.id}: not changing credits automatically.`); break; }
                        await reverseCreditPurchase({ supabase, stripe, sendMail: sendAlertMail, paymentIntentId: obj.payment_intent, ref: `refund:${obj.id}`, label: 'refunded' });
                    } else if (event.type === 'charge.dispute.created') {
                        await reverseCreditPurchase({ supabase, stripe, sendMail: sendAlertMail, paymentIntentId: obj.payment_intent, ref: `dispute:${obj.id}`, label: 'disputed' });
                    } else if (obj.status === 'won') {
                        await restoreAfterDisputeWon({ supabase, ref: `dispute:${obj.id}` });
                    }
                } catch (e) {
                    console.error('credit reversal failed:', e.message);
                    await supabase.from('processed_stripe_events').delete().eq('event_id', event.id);
                    return res.status(500).json({ error: 'reversal failed' });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await supabase
                    .from('profiles')
                    .update({ subscription_status: subscription.status })
                    .eq('stripe_subscription_id', subscription.id);
                break;
            }

            // NEW (2026-08-16): Affiliate Plan — 10% recurring commission
            // on EVERY renewal of a referred user's subscription (no 12-month cap,
            // matching the Products page: "for as long as they stay subscribed").
            // Fires on every successful renewal invoice, not just the first
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
                            .select('id, user_id, available_balance, total_earnings')
                            .eq('affiliate_code', profile.referred_by_affiliate_code)
                            .eq('status', 'active')
                            .single();

                        if (affiliate && affiliate.user_id !== profile.id && invoice.amount_paid) {
                            const paidAmount = invoice.amount_paid / 100;
                            const commissionRate = AFFILIATE_PLAN.recurringPct / 100; // see src/services/affiliatePlan.js
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
