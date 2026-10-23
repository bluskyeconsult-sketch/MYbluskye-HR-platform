// api/_lib/creditReversal.js
// NEW (2026-10-23): take back credits when the payment for them is refunded in full or disputed, and give them back if a dispute is won.
// Written so it can be tested without Stripe: the caller passes in the database client, a Stripe client and a mail sender.
//
// Rules:
//  - Only a FULL refund or a dispute triggers this. A partial refund is left for you to handle by hand (the webhook logs it).
//  - Only credits that are still unspent can be taken back. Anything already spent is recorded as a shortfall and emailed to support.
//  - Each Stripe charge or dispute is handled once (the 'ref'), so a repeated webhook can never take credits twice.
const SUPPORT = 'support@bluskyeconsult.com';

async function findPack(stripe, paymentIntentId) {
    if (!paymentIntentId) return null;
    const list = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    const session = list?.data?.[0]; const md = session?.metadata || {};
    const count = parseInt(md.count, 10);
    if (!Number.isFinite(count) || count <= 0) return null;
    if (md.type === 'job_post_pack' && md.userId) return { kind: 'job_post', owner: md.userId, count };
    if (md.type === 'appraisal_pack' && md.orgId) return { kind: 'appraisal', owner: md.orgId, count };
    return null;
}

const tables = {
    job_post: { balance: 'job_post_credit_balances', key: 'user_id', fn: 'job_post_credit_adjust', who: 'p_user', extra: { p_job: null } },
    appraisal: { balance: 'appraisal_credit_balances', key: 'org_id', fn: 'appraisal_credit_adjust', who: 'p_org', extra: { p_appraisal: null } }
};

async function adjust(supabase, t, owner, delta, ref) {
    const { data, error } = await supabase.rpc(t.fn, { [t.who]: owner, p_delta: delta, p_reason: 'adjustment', p_ref: ref, ...t.extra });
    if (error) throw new Error(`${t.fn}: ${error.message}`);
    const r = Array.isArray(data) ? data[0] : data;
    return r;
}

export async function reverseCreditPurchase({ supabase, stripe, sendMail, paymentIntentId, ref, label }) {
    const { data: done } = await supabase.from('credit_reversals').select('id').eq('ref', ref).maybeSingle();
    if (done) return { duplicate: true };
    // The same payment can be both disputed and refunded: take credits back only once for it (unless a won dispute restored them).
    if (paymentIntentId) { const { data: same } = await supabase.from('credit_reversals').select('id, restored').eq('payment_intent', paymentIntentId); if ((same || []).some(r => !r.restored)) return { duplicate: true, same_payment: true }; }
    const pack = await findPack(stripe, paymentIntentId);
    if (!pack) return { skipped: 'not a credit pack' };
    const t = tables[pack.kind];
    const { data: bal } = await supabase.from(t.balance).select('balance').eq(t.key, pack.owner).maybeSingle();
    const have = bal?.balance || 0;
    const take = Math.min(pack.count, have);
    if (take > 0) await adjust(supabase, t, pack.owner, -take, `reversal:${ref}`);
    const shortfall = pack.count - take;
    const { error } = await supabase.from('credit_reversals').insert({ ref, payment_intent: paymentIntentId || null, kind: pack.kind, owner_id: pack.owner, purchased: pack.count, clawed_back: take, shortfall });
    if (error && error.code !== '23505') throw new Error(`credit_reversals: ${error.message}`);
    if (shortfall > 0 && sendMail) {
        try {
            await sendMail({
                to: SUPPORT, subject: `Credits already spent after a ${label || 'refund or dispute'}`,
                html: `<p>A payment for ${pack.count} ${pack.kind === 'job_post' ? 'job-post' : 'appraisal'} credit(s) was ${label || 'refunded or disputed'} (${ref}).</p><p>${take} unspent credit(s) were taken back. ${shortfall} had already been used and could not be recovered automatically.</p><p>Account: ${pack.kind === 'job_post' ? 'user' : 'organisation'} ${pack.owner}. Please decide whether to follow up. The record is in the credit_reversals table.</p>`
            });
        } catch (e) { console.error('credit reversal alert', e.message); }
    }
    return { reversed: true, kind: pack.kind, purchased: pack.count, clawed_back: take, shortfall };
}

// A dispute was decided in your favour: give back what was taken (once).
export async function restoreAfterDisputeWon({ supabase, ref }) {
    const { data: rev } = await supabase.from('credit_reversals').select('*').eq('ref', ref).maybeSingle();
    if (!rev) return { skipped: 'no reversal recorded' };
    if (rev.restored > 0 || rev.clawed_back <= 0) return { skipped: 'nothing to restore' };
    const t = tables[rev.kind];
    await adjust(supabase, t, rev.owner_id, rev.clawed_back, `restore:${ref}`);
    await supabase.from('credit_reversals').update({ restored: rev.clawed_back }).eq('id', rev.id);
    return { restored: rev.clawed_back };
}
