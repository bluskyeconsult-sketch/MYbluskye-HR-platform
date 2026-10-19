// src/lib/shareCaption.js
//
// NEW (2026-10-19): builds a matching caption and hashtags for every Share button.
// No AI call and no network: it works from the item's own fields, so it is instant,
// free and the same everywhere. Articles can also carry a caption the admin saved
// (written once with "Generate share caption" in the article editor); a saved
// caption always wins over the generated one.
//
// buildShare({ kind, title, url, details, saved }) returns everything the share
// menu needs:
//   caption        one clean line (no hashtags)
//   hashtags       array without '#', e.g. ['Hiring','CareAssistant','Oxford','ODUSBABA']
//   xText          caption trimmed to fit X together with the link
//   xHashtags      comma list for the X "hashtags" parameter
//   plainText      caption only (WhatsApp, email: hashtags are not used there)
//   copyText       caption + link + hashtags, for pasting into LinkedIn / Facebook / Instagram
//
// `details` (all optional): company, location, jobType, category, tags[], author, excerpt.

const BRAND_TAG = 'ODUSBABA';
const MAX_TAGS = 4;

const LEVEL_WORDS = new Set([
    'senior', 'junior', 'lead', 'principal', 'head', 'chief', 'trainee', 'graduate', 'entry', 'level',
    'the', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'with', 'on', 'new', 'our', 'your',
    'part', 'time', 'full', 'fulltime', 'parttime', 'remote', 'hybrid', 'urgent', 'immediate', 'vacancy', 'wanted'
]);

const KIND_TAGS = {
    job: ['Hiring', 'JobSearch'],
    article: ['CareerAdvice', 'HR'],
    course: ['OnlineLearning', 'CareerGrowth'],
    book: ['Books', 'PersonalGrowth'],
    assessment: ['CareerAssessment', 'CareerGrowth'],
    tool: ['HRTools', 'HR'],
    va: ['VirtualAssistant', 'Productivity'],
    generic: ['CareerGrowth']
};

// "Care assistant" -> "CareAssistant". Letters and digits only, never digits alone, max 30 characters.
export function toHashtag(input) {
    const words = String(input || '')
        .replace(/&/g, ' and ')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/[\s-]+/)
        .filter(Boolean);
    if (!words.length) return '';
    const tag = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('').slice(0, 30);
    return /^\d+$/.test(tag) ? '' : tag;
}

// Up to three meaningful words from a title, as one tag ("Senior Care Assistant (Nights)" -> "CareAssistantNights").
function titleTag(title) {
    const words = String(title || '')
        .replace(/\(.*?\)/g, ' ')
        .split(/[^\p{L}\p{N}]+/u)
        .filter(w => w && !LEVEL_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));
    return toHashtag(words.slice(0, 2).join(' '));
}

function cityTag(location) {
    const first = String(location || '').split(/[,/|]/)[0].trim();
    if (!first || /^remote$/i.test(first) || first.length > 24) return '';
    return toHashtag(first);
}

function uniqueTags(list, max = MAX_TAGS) {
    const seen = new Set();
    const out = [];
    for (const t of list) {
        const clean = String(t || '').replace(/^#/, '').trim();
        const key = clean.toLowerCase();
        if (clean.length < 3 || seen.has(key)) continue;
        seen.add(key);
        out.push(clean);
        if (out.length >= max) break;
    }
    return out;
}

// Works out what is being shared from the page address, so older call sites keep working untouched.
export function inferKind(pathname = '') {
    const p = String(pathname).toLowerCase();
    if (p.startsWith('/jobs')) return 'job';
    if (p.startsWith('/articles')) return 'article';
    if (p.startsWith('/books')) return 'book';
    if (p.startsWith('/courses') || p.startsWith('/learning')) return 'course';
    if (p.startsWith('/assessments') || p.startsWith('/assessment-results')) return 'assessment';
    if (p.startsWith('/hr-tools')) return 'tool';
    if (p.startsWith('/hire-va')) return 'va';
    return 'generic';
}

function firstSentence(text, max) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const m = clean.match(/^(.{20,}?[.!?])(\s|$)/);
    const s = m ? m[1] : clean;
    return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : s;
}

function makeCaption(kind, title, d) {
    const t = String(title || '').trim();
    switch (kind) {
        case 'job': {
            const who = d.company ? ` at ${d.company}` : '';
            const where = d.location ? ` (${d.location})` : '';
            return `Hiring: ${t}${who}${where}. See the details and apply on ODUSBABA.`;
        }
        case 'article': {
            const lead = firstSentence(d.excerpt, 140);
            return lead ? `${t}. ${lead}` : `${t}. A practical read from ODUSBABA.`;
        }
        case 'course':
            return `${t}: learn at your own pace with this course on ODUSBABA.`;
        case 'book':
            return `${t}${d.author ? ` by ${d.author}` : ''} is available on ODUSBABA.`;
        case 'assessment':
            return `How do you score? Take the ${t} assessment on ODUSBABA.`;
        case 'tool':
            return `Try the ${t} on ODUSBABA.`;
        case 'va':
            return `${t}: see how a virtual assistant can handle it on ODUSBABA.`;
        default:
            return t;
    }
}

function makeHashtags(kind, title, d) {
    const own = [];
    if (kind === 'job') {
        own.push(titleTag(title), cityTag(d.location));
    } else if (kind === 'article' || kind === 'course' || kind === 'book') {
        own.push(toHashtag(d.category));
        (Array.isArray(d.tags) ? d.tags : []).slice(0, 3).forEach(x => own.push(toHashtag(x)));
    } else if (kind !== 'generic') {
        own.push(titleTag(title));
    }
    const kindTags = KIND_TAGS[kind] || KIND_TAGS.generic;
    // Specific tags first, then the kind's tags, brand tag always last so it is never cut.
    const picked = uniqueTags([...own, ...kindTags], MAX_TAGS - 1);
    return uniqueTags([...picked, BRAND_TAG], MAX_TAGS);
}

// X counts every link as 23 characters; leave room for it and the hashtags.
function fitForX(caption, hashtags) {
    const tagChars = hashtags.reduce((n, h) => n + h.length + 2, 0);
    const room = Math.max(60, 280 - 23 - 2 - tagChars - 2);
    return caption.length <= room ? caption : caption.slice(0, room - 1).replace(/\s+\S*$/, '') + '…';
}

// Adds tracking tags to a shared link so the site's analytics shows which channel brought each visitor:
//   https://site/jobs/5  ->  https://site/jobs/5?utm_source=whatsapp&utm_medium=social&utm_campaign=share&utm_content=job
// Any utm_ tags already on the address (for example when a visitor who arrived from a shared link shares
// it again) are replaced, and every other part of the address is left exactly as it was.
export function withUtm(url, source, kind = 'generic') {
    try {
        const u = new URL(url);
        [...u.searchParams.keys()].filter(k => k.toLowerCase().startsWith('utm_')).forEach(k => u.searchParams.delete(k));
        u.searchParams.set('utm_source', source);
        u.searchParams.set('utm_medium', source === 'email' ? 'email' : 'social');
        u.searchParams.set('utm_campaign', 'share');
        u.searchParams.set('utm_content', kind);
        return u.toString();
    } catch (e) {
        return url;
    }
}

export function buildShare({ kind, title, url = '', text = '', details = {}, saved = {} } = {}) {
    const k = kind || 'generic';
    const d = details || {};
    const t = String(title || '').trim();

    const savedCaption = String(saved.caption || '').trim();
    const savedTags = (Array.isArray(saved.hashtags) ? saved.hashtags : [])
        .map(toHashtag).filter(Boolean);

    // Generic pages (and personal posts such as "I just earned...") keep the caller's own wording.
    const caption = savedCaption || (k === 'generic' ? (String(text || '').trim() || t) : makeCaption(k, t, d));
    const hashtags = savedTags.length ? uniqueTags([...savedTags, BRAND_TAG], 5) : makeHashtags(k, t, d);

    return {
        kind: k,
        caption,
        hashtags,
        xText: fitForX(caption, hashtags),
        xHashtags: hashtags.join(','),
        plainText: caption,
        copyText: `${caption}${url ? `\n\n${url}` : ''}\n\n${hashtags.map(h => `#${h}`).join(' ')}`
    };
}
