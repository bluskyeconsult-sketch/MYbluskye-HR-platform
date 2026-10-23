// api/_lib/geoPricing.js
//
// NEW (2026-10-23): regional prices for INDIVIDUAL plans only (today: Professional).
//
// WHAT THIS NEVER DOES
//   - It never changes Employer or Business prices (only tiers in REGIONAL_TIERS can be discounted).
//   - It never discounts a country that has no row in country_price_band. EU/EEA, UK, Switzerland, high-income
//     economies and unknown countries all pay the standard price. This keeps us clear of EU geo-blocking questions.
//   - It never trusts the connection alone: the declared country and the connection country are both used and
//     the HIGHER price wins. Billing address is checked after payment and mismatches are flagged for review.
//   - It never shows a discount that checkout cannot honour: a band is offered only when its Stripe price exists.
import { readNetworkLocation } from './compliance.js';

export const REGIONAL_TIERS = ['professional'];           // individual plans only
const STANDARD = 'A';
const cc = (v) => { const s = String(v || '').trim().toUpperCase(); return /^[A-Z]{2}$/.test(s) ? s : null; };

export const standardPriceUsd = (tier) => (tier === 'professional' ? Number(process.env.PROFESSIONAL_BASE_USD) || 39.99 : null);

async function loadConfig(sb) {
    const [{ data: settings }, { data: bands }, { data: map }] = await Promise.all([
        sb.from('geo_pricing_settings').select('key, value'),
        sb.from('price_bands').select('*').eq('is_active', true),
        sb.from('country_price_band').select('country_code, band_key')
    ]);
    const s = Object.fromEntries((settings || []).map(r => [r.key, r.value]));
    return {
        enabled: s.enabled === 'true',
        floor: Number(s.floor_usd) || 9.99,
        bands: Object.fromEntries((bands || []).map(b => [b.band_key, b])),
        map: Object.fromEntries((map || []).map(r => [r.country_code, r.band_key]))
    };
}

const multOf = (cfg, band) => Number(cfg.bands[band]?.multiplier) || 1;
const bandOf = (cfg, country) => (country && cfg.map[country] && cfg.bands[cfg.map[country]] ? cfg.map[country] : STANDARD);

// Regional price in USD, ending in .99 and never below the floor.
export function regionalPrice(tier, multiplier, floor) {
    const base = standardPriceUsd(tier);
    if (!base) return null;
    if (multiplier >= 1) return base;
    const p = Math.round(base * multiplier) - 0.01;
    return Math.max(Number(floor) || 9.99, Math.min(base, Math.round(p * 100) / 100));
}

// Stripe price id for a tier and band. A band with no configured Stripe price falls back to the standard price.
export function stripePriceId(tier, band) {
    const std = process.env[`STRIPE_PRICE_${tier.toUpperCase()}`];
    if (band === STANDARD || !REGIONAL_TIERS.includes(tier)) return { id: std, band: STANDARD, regional: false };
    const reg = process.env[`STRIPE_PRICE_${tier.toUpperCase()}_${band}`];
    return reg ? { id: reg, band, regional: true } : { id: std, band: STANDARD, regional: false };
}

// Decide the band. declared = the account's saved country; the connection country comes from the request.
// The higher multiplier (higher price) of the available countries wins.
export async function resolveBand(sb, req, { tier, declaredCountry = null }) {
    const cfg = await loadConfig(sb);
    const net = readNetworkLocation(req).country;
    const declared = cc(declaredCountry);
    if (!REGIONAL_TIERS.includes(tier) || !cfg.enabled) return { band: STANDARD, multiplier: 1, cfg, net, declared, reason: 'standard' };
    const candidates = [declared, net].filter(Boolean);
    if (!candidates.length) return { band: STANDARD, multiplier: 1, cfg, net, declared, reason: 'country_unknown' };
    let best = STANDARD, bestMult = 0;
    for (const c of candidates) { const b = bandOf(cfg, c); const m = multOf(cfg, b); if (m > bestMult) { best = b; bestMult = m; } }
    return { band: best, multiplier: bestMult, cfg, net, declared, reason: best === STANDARD ? 'standard' : 'regional' };
}

// After payment: is the billing country in a band that justifies the discount that was given?
// Returns { ok, billingBand, reason }
export async function checkBilling(sb, { chargedBand, billingCountry }) {
    if (!chargedBand || chargedBand === STANDARD) return { ok: true };
    const cfg = await loadConfig(sb);
    const bc = cc(billingCountry);
    if (!bc) return { ok: false, billingBand: null, reason: 'No billing country returned by Stripe' };
    const billingBand = bandOf(cfg, bc);
    if (multOf(cfg, billingBand) > multOf(cfg, chargedBand)) return { ok: false, billingBand, reason: `Billing country ${bc} is in band ${billingBand}, but band ${chargedBand} was charged` };
    return { ok: true, billingBand };
}

export async function recordFlag(sb, row) {
    try { await sb.from('geo_price_flags').insert(row); } catch (e) { console.error('geo flag', e.message); }
}

export function buildGeoPricingHandlers(deps) {
    const { getSupabase, getUserId, isAdmin } = deps;
    const clip = (v, n) => String(v ?? '').slice(0, n);
    const adminOnly = async (req, res, sb) => {
        const uid = await getUserId(req, sb);
        if (!uid || !(await isAdmin(sb, uid))) { res.status(403).json({ success: false, error: 'Admin access required.' }); return null; }
        return uid;
    };
    return {
        // Public. What does this visitor pay for Professional, and why? Never reveals other countries' prices.
        'pricing-quote': async (req, res) => {
            const sb = getSupabase();
            const userId = await getUserId(req, sb);
            let declared = null;
            if (userId) { const { data } = await sb.from('profiles').select('country_code').eq('id', userId).maybeSingle(); declared = data?.country_code || null; }
            const tier = 'professional';
            const r = await resolveBand(sb, req, { tier, declaredCountry: declared });
            const pid = stripePriceId(tier, r.band);
            const regional = pid.regional && r.band !== STANDARD;
            const price = regional ? regionalPrice(tier, r.multiplier, r.cfg.floor) : standardPriceUsd(tier);
            return res.status(200).json({ success: true, tier, standard_price: standardPriceUsd(tier), price, regional, band: regional ? r.band : STANDARD, country: r.declared || r.net || null });
        },

        'admin-geo-pricing-overview': async (req, res) => {
            const sb = getSupabase(); if (!(await adminOnly(req, res, sb))) return;
            const [cfg, flags] = await Promise.all([loadConfig(sb), sb.from('geo_price_flags').select('*').order('created_at', { ascending: false }).limit(100)]);
            const { data: countries } = await sb.from('country_price_band').select('*').order('country_code');
            const stripeReady = Object.fromEntries(Object.keys(cfg.bands).filter(b => b !== STANDARD).map(b => [b, !!process.env[`STRIPE_PRICE_PROFESSIONAL_${b}`]]));
            return res.status(200).json({ success: true, enabled: cfg.enabled, floor: cfg.floor, base: standardPriceUsd('professional'), bands: Object.values(cfg.bands).sort((a, b) => a.sort_order - b.sort_order), countries: countries || [], flags: flags.data || [], stripe_ready: stripeReady });
        },
        'admin-geo-pricing-settings': async (req, res) => {
            const sb = getSupabase(); if (!(await adminOnly(req, res, sb))) return;
            const b = req.body || {};
            if (b.enabled !== undefined) await sb.from('geo_pricing_settings').upsert({ key: 'enabled', value: b.enabled === true ? 'true' : 'false', updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (b.floor !== undefined) { const f = Math.max(5, Math.min(40, Number(b.floor) || 9.99)); await sb.from('geo_pricing_settings').upsert({ key: 'floor_usd', value: String(f), updated_at: new Date().toISOString() }, { onConflict: 'key' }); }
            if (b.band_key && b.multiplier !== undefined) {
                const m = Math.max(0.2, Math.min(1, Number(b.multiplier)));
                if (b.band_key === STANDARD) return res.status(400).json({ success: false, error: 'The standard band is always 100%.' });
                await sb.from('price_bands').update({ multiplier: m, updated_at: new Date().toISOString() }).eq('band_key', b.band_key);
            }
            return res.status(200).json({ success: true });
        },
        'admin-geo-pricing-set-country': async (req, res) => {
            const sb = getSupabase(); if (!(await adminOnly(req, res, sb))) return;
            const country = cc(req.body?.country_code); const band = req.body?.band_key;
            if (!country) return res.status(400).json({ success: false, error: 'Enter a two-letter country code.' });
            if (!band || band === STANDARD) { await sb.from('country_price_band').delete().eq('country_code', country); return res.status(200).json({ success: true }); }
            const { data: b } = await sb.from('price_bands').select('band_key').eq('band_key', band).maybeSingle();
            if (!b) return res.status(400).json({ success: false, error: 'Unknown band.' });
            await sb.from('country_price_band').upsert({ country_code: country, band_key: band, note: clip(req.body?.note, 200) || null, updated_at: new Date().toISOString() }, { onConflict: 'country_code' });
            return res.status(200).json({ success: true });
        },
        'admin-geo-pricing-resolve-flag': async (req, res) => {
            const sb = getSupabase(); const uid = await adminOnly(req, res, sb); if (!uid) return;
            await sb.from('geo_price_flags').update({ status: 'reviewed', note: clip(req.body?.note, 500) || null, reviewed_by: uid, reviewed_at: new Date().toISOString() }).eq('id', req.body?.id);
            return res.status(200).json({ success: true });
        }
    };
}
