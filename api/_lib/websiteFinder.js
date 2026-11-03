// api/_lib/websiteFinder.js
// Suggests a website for an employer from its name and town, using the Brave Search API (free plan: 2,000 searches a month).
// It only SUGGESTS. An admin approves each one before it is saved as the company's website.

const BLOCKED = /(^|\.)(companieshouse\.gov\.uk|find-and-update\.company-information\.service\.gov\.uk|linkedin\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|yell\.com|endole\.co\.uk|opencorporates\.com|checkcompany\.co\.uk|companycheck\.co\.uk|duedil\.com|bizdb\.co\.uk|cylex-uk\.co\.uk|trustpilot\.com|indeed\.com|glassdoor\.com|reed\.co\.uk|totaljobs\.com|gov\.uk|wikipedia\.org|google\.com|maps\.apple\.com|tripadvisor\.com|just-eat\.co\.uk|ubereats\.com|checkatrade\.com|nhs\.uk|ukcompanydata\.com|companieslist\.co\.uk|uk-companies\.com|company-information\.com|vat-search\.co\.uk|food\.gov\.uk|ofsted\.gov\.uk|cqc\.org\.uk|192\.com|dnb\.com|zoominfo\.com|crunchbase\.com|bloomberg\.com|pinterest\.com|tiktok\.com)$/i;
const STOP = new Set(['limited', 'ltd', 'llp', 'plc', 'the', 'and', 'of', 'uk', 'group', 'services', 'service', 'company', 'co', 'trading', 'as', 'ta', 't', 'a', 'international', 'solutions']);

export function nameTokens(name) {
    return String(name || '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(t => t.length > 1 && !STOP.has(t));
}

// Score 0-100: how many of the company's name words appear in the site's domain or in the result title.
export function scoreResult(name, town, r) {
    const toks = nameTokens(name);
    if (!toks.length) return 0;
    let host = '';
    try { host = new URL(r.url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return 0; }
    if (BLOCKED.test(host)) return 0;
    const hostFlat = host.replace(/[^a-z0-9]/g, '');
    const title = String(r.title || '').toLowerCase();
    let hit = 0, inDomain = 0;
    for (const t of toks) {
        if (hostFlat.includes(t)) { inDomain++; hit++; } else if (title.includes(t)) hit++;
    }
    let s = Math.round((hit / toks.length) * 60) + Math.round((inDomain / toks.length) * 30);
    const text = (title + ' ' + String(r.description || '')).toLowerCase();
    if (town && text.includes(String(town).toLowerCase())) s += 10;
    return Math.min(s, 100);
}

export function pickBest(name, town, results) {
    let best = null;
    for (const r of results || []) {
        const s = scoreResult(name, town, r);
        if (s > 0 && (!best || s > best.score)) best = { url: r.url, title: r.title, score: s };
    }
    if (!best) return null;
    // Keep the site's front page: an advert deep inside a site is not the company's website.
    try { const u = new URL(best.url); best.url = u.origin; } catch { return null; }
    best.confidence = best.score >= 75 ? 'likely' : best.score >= 45 ? 'check' : 'weak';
    return best;
}

export async function braveSearch(query, apiKey, fetchFn = fetch) {
    const url = 'https://api.search.brave.com/res/v1/web/search?count=8&country=gb&q=' + encodeURIComponent(query);
    const r = await fetchFn(url, { headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey } });
    if (r.status === 429) { const e = new Error('Search limit reached for now'); e.code = 'RATE'; throw e; }
    if (!r.ok) throw new Error('Search service returned ' + r.status);
    const j = await r.json();
    return (j.web?.results || []).map(x => ({ url: x.url, title: x.title, description: x.description }));
}

export async function suggestWebsite(name, town, apiKey, fetchFn = fetch) {
    const results = await braveSearch(`${name} ${town || ''} official website`.trim(), apiKey, fetchFn);
    return pickBest(name, town, results);
}
