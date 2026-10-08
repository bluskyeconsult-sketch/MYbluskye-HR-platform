// src/services/affiliatePlan.js
//
// SINGLE SOURCE OF TRUTH for the affiliate commission plan (2026-10-07).
// Previously the rates were typed separately in the Stripe webhook (20% / 10%),
// the affiliate dashboard (a stale "10%" default) and the Products page copy,
// and they had drifted apart. The webhook, the affiliate-stats API (which the
// dashboard reads) and the invitation emails now all import from here.
//
// THE PLAN (as built in stripe-webhook.js):
//   * 20% of a referred person's FIRST payment
//   * 10% of EVERY renewal payment, for as long as they stay subscribed
//
// TESTING MODE: while testing_mode is on, paid plans are granted free at
// signup and never reach Stripe, so no payment exists to take a commission
// from - commission is therefore naturally zero. It switches on automatically
// the first time a real Stripe payment is confirmed. Nothing needs toggling.

export const AFFILIATE_PLAN = Object.freeze({
    firstPaymentPct: 20,
    recurringPct: 10
});
