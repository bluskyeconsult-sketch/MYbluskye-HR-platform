// src/services/contactEmailFinder.js
// NEW (2026-10-10): finds the contact / recruitment email addresses a
// company has itself PUBLISHED on its own website (contact, about,
// careers and privacy pages). It never guesses addresses and never
// goes beyond the company's own domain's public pages.
//
// Safeguards, all deliberate:
//  - every URL (and every redirect hop) must pass isSafeExternalUrl (SSRF guard)
//  - robots.txt is honoured for every page
//  - honest bot user agent, small page budget, capped body size
//  - addresses are labelled role (info@, careers@) vs personal (jane.smith@)
//    so an admin can treat personal ones with care under UK PECR / UK GDPR
//  - addresses on a suppression (do-not-contact) list are removed

import { isSafeExternalUrl, isAllowedByRobotsTxt } from './employerWebsiteScraperService.js';

const UA = 'BluSkyeConsultBot/1.0 (+https://www.bluskyeconsult.com/about-our-bot)';
const TIMEOUT_MS = 10000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 6;
const MAX_REDIRECTS = 3;

const PAGE_HINTS = ['contact', 'about', 'career', 'job', 'vacanc', 'recruit', 'work-with-us', 'join', 'privacy', 'team'];
const ROLE_LOCALS = new Set(['info', 'hello', 'hi', 'contact', 'enquiries', 'enquiry', 'inquiries', 'admin', 'office', 'support', 'help',
    'hr', 'careers', 'career', 'jobs', 'recruitment', 'recruiting', 'vacancies', 'apply', 'applications', 'people', 'team',
    'reception', 'mail', 'sales', 'accounts', 'manager', 'registered.manager', 'referrals', 'care', 'enquire', 'bookings', 'dpo', 'privacy', 'compliance']);
const RECRUITMENT_LOCALS = /^(hr|careers?|jobs|recruit(ment|ing)?|vacancies|apply|applications|people|join)/i;
const JUNK_DOMAINS = /(^|\.)(example\.(com|org)|domain\.com|email\.com|yourdomain\.|sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|schema\.org|w3\.org|godaddy\.com|wordpress\.(com|org)|gravatar\.com)$/i;
const IMAGE_TAIL = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?)$/i;

function registrable(host) {
    const h = host.toLowerCase().replace(/^www\./, '');
    const p = h.split('.');
    if (p.length >= 3 && /^(co|org|gov|ac|ltd|plc|me|net|sch)$/.test(p[p.length - 2]) && p[p.length - 1].length === 2) return p.slice(-3).join('.');
    return p.slice(-2).join('.');
}

async function safeFetch(url, hops = 0) {
    const check = isSafeExternalUrl(url);
    if (!check.safe) throw new Error(check.reason);
    const robots = await isAllowedByRobotsTxt(url);
    if (!robots.allowed) return { skippedByRobots: true };
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, signal: ctl.signal, redirect: 'manual' });
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
            if (hops >= MAX_REDIRECTS) throw new Error('Too many redirects');
            return await safeFetch(new URL(res.headers.get('location'), url).toString(), hops + 1);
        }
        if (!res.ok) return { status: res.status };
        const type = res.headers.get('content-type') || '';
        if (!/html|text/i.test(type)) return { status: 415 };
        const reader = res.body?.getReader?.();
        let html = '';
        if (!reader) html = (await res.text()).slice(0, MAX_BYTES);
        else {
            const dec = new TextDecoder(); let n = 0;
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                n += value.length;
                if (n > MAX_BYTES) { reader.cancel(); break; }
                html += dec.decode(value, { stream: true });
            }
        }
        return { html, finalUrl: url };
    } finally { clearTimeout(t); }
}

function decodeCf(hex) {
    try {
        const k = parseInt(hex.slice(0, 2), 16);
        let out = '';
        for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k);
        return out;
    } catch { return ''; }
}

export function extractEmails(html) {
    const found = new Set();
    const add = e => { e = (e || '').trim().toLowerCase().replace(/^mailto:/, '').split('?')[0].replace(/[.,;:)>\]]+$/, ''); if (/^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)+$/.test(e) && !IMAGE_TAIL.test(e)) found.add(e); };
    for (const m of html.matchAll(/mailto:([^"'\s>]+)/gi)) add(decodeURIComponent(m[1]));
    for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) add(decodeCf(m[1]));
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/&#0*64;|&commat;|%40/gi, '@').replace(/\s*[\[(]\s*(at|AT)\s*[\])]\s*/g, '@').replace(/\s*[\[(]\s*(dot|DOT)\s*[\])]\s*/g, '.');
    for (const m of text.matchAll(/[a-z0-9._%+\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)+/gi)) add(m[0]);
    return [...found];
}

function classify(email, siteDomain) {
    const [local, domain] = email.split('@');
    const sameSite = registrable(domain) === siteDomain;
    const role = ROLE_LOCALS.has(local) || /^(info|hr|careers?|jobs|recruit|enquir|admin|office|contact|support|hello|apply)/.test(local);
    const recruitment = RECRUITMENT_LOCALS.test(local);
    // personal-looking: first.last, first_last, or a name-ish word with a digit-free single token that is not a role
    const personal = !role && (/^[a-z]+[._-][a-z]+$/.test(local) || /^[a-z]\.[a-z]+$/.test(local));
    let score = 0;
    if (sameSite) score += 50;
    if (recruitment) score += 30; else if (role) score += 15;
    if (personal) score -= 20;
    return { email, local, domain, sameSite, kind: recruitment ? 'Recruitment / HR' : role ? 'General role address' : personal ? 'Personal (use with care)' : 'Other', score };
}

function candidateLinks(html, base, siteDomain) {
    const out = [];
    for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["'][^>]*>/gi)) {
        try {
            const u = new URL(m[1], base);
            if (!/^https?:$/.test(u.protocol) || registrable(u.hostname) !== siteDomain) continue;
            const p = (u.pathname + u.search).toLowerCase();
            if (PAGE_HINTS.some(h => p.includes(h))) out.push(u.origin + u.pathname);
        } catch { /* ignore */ }
    }
    return [...new Set(out)];
}

export async function findContactEmails(websiteUrl, { suppressed = new Set() } = {}) {
    let start = websiteUrl.trim();
    if (!/^https?:\/\//i.test(start)) start = 'https://' + start;
    const safe = isSafeExternalUrl(start);
    if (!safe.safe) return { success: false, error: safe.reason };
    const host = new URL(start).hostname;
    const siteDomain = registrable(host);
    const pagesChecked = []; const skipped = []; const byEmail = new Map();
    const queue = [start];
    for (const guess of ['/contact', '/contact-us', '/about', '/careers']) queue.push(new URL(guess, start).toString());
    const seen = new Set();
    while (queue.length && pagesChecked.length < MAX_PAGES) {
        const url = queue.shift();
        const key = url.replace(/\/$/, '');
        if (seen.has(key)) continue; seen.add(key);
        let r;
        try { r = await safeFetch(url); } catch (e) { skipped.push({ url, reason: e.message }); continue; }
        if (r.skippedByRobots) { skipped.push({ url, reason: 'Blocked by the site\'s robots.txt - not fetched' }); continue; }
        if (!r.html) { if (pagesChecked.length === 0 && r.status) skipped.push({ url, reason: `HTTP ${r.status}` }); continue; }
        pagesChecked.push(url);
        for (const e of extractEmails(r.html)) {
            const domain = e.split('@')[1];
            if (JUNK_DOMAINS.test(domain)) continue;
            if (!byEmail.has(e)) byEmail.set(e, { ...classify(e, siteDomain), foundOn: url });
        }
        if (pagesChecked.length === 1) for (const l of candidateLinks(r.html, url, siteDomain)) queue.unshift(l);
    }
    let emails = [...byEmail.values()].sort((a, b) => b.score - a.score);
    const removed = emails.filter(e => suppressed.has(e.email)).map(e => e.email);
    emails = emails.filter(e => !suppressed.has(e.email));
    return { success: true, site: host, pagesChecked, skipped, emails, removedAsDoNotContact: removed };
}
