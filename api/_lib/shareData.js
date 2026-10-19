// api/_lib/shareData.js
//
// NEW (2026-10-19): what a social network needs to show a good preview card for a link.
//   getShareItem(supabase, type, key)  -> the public details of one article / job / course / book /
//                                         assessment (or a named page), or null if it is not public
//   renderPreviewHtml(item, base)      -> the small HTML page served ONLY to social-network crawlers
//                                         (Facebook, LinkedIn, X, WhatsApp, Telegram, Slack, Discord...)
//
// Real visitors never see this: vercel.json sends only those crawlers here, everyone else gets the
// normal app. Only data that is already public on the site is exposed (published articles, courses and
// books, active jobs and assessments).

export const SITE_DEFAULT_BASE = 'https://bluskyeconsult.com';

export const TYPE_LABEL = {
    article: 'Article',
    job: 'Job',
    course: 'Course',
    book: 'Book',
    assessment: 'Assessment',
    page: 'ODUSBABA'
};

const PAGES = {
    'hr-tools': {
        title: 'AI HR Tools on ODUSBABA',
        description: 'Practical AI tools for HR and career tasks: letters, policies, reviews, contract checks and more. Try them on ODUSBABA.',
        path: '/hr-tools'
    },
    'hire-va': {
        title: 'Hire an AI Virtual Assistant on ODUSBABA',
        description: 'Hand focused tasks to an AI virtual assistant and get finished work back in minutes. See the assistants on ODUSBABA.',
        path: '/hire-va'
    }
};

export function isValidKey(type, key) {
    const k = String(key || '');
    if (type === 'article') return /^[A-Za-z0-9][A-Za-z0-9._~%-]{0,200}$/.test(k);
    if (type === 'page') return Object.prototype.hasOwnProperty.call(PAGES, k);
    return /^[A-Za-z0-9_-]{1,64}$/.test(k);
}

// Plain text only: strips markdown, HTML tags and extra whitespace, then trims on a word boundary.
export function plainSnippet(input, max = 200) {
    let s = String(input || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[#*_`>~|]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim();
    if (s.length <= max) return s;
    return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function absoluteUrl(u, base) {
    const s = String(u || '').trim();
    if (!s) return '';
    if (/^data:image\//i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return `https:${s}`;
    if (s.startsWith('/')) return `${base}${s}`;
    return '';
}

async function query(builder) {
    const { data, error } = await builder;
    if (error) return { data: null, error };
    return { data, error: null };
}

export async function getShareItem(supabase, type, key, base = SITE_DEFAULT_BASE) {
    if (!isValidKey(type, key)) return null;

    if (type === 'page') {
        const p = PAGES[key];
        return { type, key, title: p.title, description: p.description, imageUrl: '', path: p.path, version: '1', subtitle: 'bluskyeconsult.com' };
    }

    if (type === 'article') {
        // share_caption / share_hashtags exist only after add-article-share-caption.sql has been run,
        // so fall back to the plain columns if they are missing.
        let r = await query(supabase.from('articles')
            .select('title, seo_title, seo_description, excerpt, image_url, category, share_caption, updated_at, slug')
            .eq('slug', key).eq('is_published', true).maybeSingle());
        if (r.error) {
            r = await query(supabase.from('articles')
                .select('title, seo_title, seo_description, excerpt, image_url, category, updated_at, slug')
                .eq('slug', key).eq('is_published', true).maybeSingle());
        }
        const a = r.data;
        if (!a) return null;
        const title = plainSnippet(a.seo_title || a.title, 110);
        const description = plainSnippet(a.seo_description || a.excerpt || a.share_caption || '', 200) || 'Read this article on ODUSBABA.';
        return {
            type, key, title, description,
            imageUrl: absoluteUrl(a.image_url, base),
            path: `/articles/${a.slug || key}`,
            version: String(a.updated_at || ''),
            subtitle: a.category || ''
        };
    }

    if (type === 'job') {
        const r = await query(supabase.from('jobs')
            .select('id, title, company, location, job_type, description, is_active, updated_at')
            .eq('id', key).maybeSingle());
        const j = r.data;
        if (!j || j.is_active === false) return null;
        const where = j.location ? ` in ${j.location}` : '';
        const who = j.company ? ` at ${j.company}` : '';
        const lead = plainSnippet(j.description, 140);
        return {
            type, key,
            title: plainSnippet(`${j.title}${who}`, 110),
            description: plainSnippet(`${j.title}${who}${where}. ${lead}`, 200),
            imageUrl: '',
            path: `/jobs/${j.id}`,
            version: String(j.updated_at || ''),
            subtitle: [j.company, j.location].filter(Boolean).join(' · ')
        };
    }

    if (type === 'course') {
        const r = await query(supabase.from('courses')
            .select('id, title, description, image_url, category, updated_at')
            .eq('id', key).eq('is_published', true).maybeSingle());
        const c = r.data;
        if (!c) return null;
        return {
            type, key,
            title: plainSnippet(c.title, 110),
            description: plainSnippet(c.description, 200) || 'Learn at your own pace with this course on ODUSBABA.',
            imageUrl: absoluteUrl(c.image_url, base),
            path: `/courses/${c.id}`,
            version: String(c.updated_at || ''),
            subtitle: c.category || ''
        };
    }

    if (type === 'book') {
        const r = await query(supabase.from('books')
            .select('id, title, author, description, cover_url, updated_at')
            .eq('id', key).eq('is_published', true).maybeSingle());
        const b = r.data;
        if (!b) return null;
        return {
            type, key,
            title: plainSnippet(b.author ? `${b.title} by ${b.author}` : b.title, 110),
            description: plainSnippet(b.description, 200) || 'Available on ODUSBABA.',
            imageUrl: absoluteUrl(b.cover_url, base),
            path: `/books/${b.id}`,
            version: String(b.updated_at || ''),
            subtitle: b.author || ''
        };
    }

    if (type === 'assessment') {
        const r = await query(supabase.from('assessments')
            .select('id, title, description, is_active, updated_at')
            .eq('id', key).maybeSingle());
        const a = r.data;
        if (!a || a.is_active === false) return null;
        return {
            type, key,
            title: plainSnippet(a.title, 110),
            description: plainSnippet(a.description, 200) || 'Take this assessment on ODUSBABA.',
            imageUrl: '',
            path: `/assessments/${a.id}`,
            version: String(a.updated_at || ''),
            subtitle: ''
        };
    }

    return null;
}

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function shareImageUrl(item, base) {
    const v = item.version ? `?v=${encodeURIComponent(String(item.version).replace(/[^0-9A-Za-z]/g, '').slice(0, 20))}` : '';
    return `${base}/share-image/${item.type}/${encodeURIComponent(item.key)}${v}`;
}

export function renderPreviewHtml(item, base) {
    const pageUrl = `${base}${item.path}`;
    const image = shareImageUrl(item, base);
    const alt = `${item.title} on ODUSBABA`;
    const ogType = item.type === 'article' ? 'article' : 'website';
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(item.title)} | ODUSBABA</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(item.description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:site_name" content="ODUSBABA">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:title" content="${esc(item.title)}">
<meta property="og:description" content="${esc(item.description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(alt)}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(item.title)}">
<meta name="twitter:description" content="${esc(item.description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(alt)}">
<meta http-equiv="refresh" content="0; url=${esc(pageUrl)}">
</head>
<body>
<h1>${esc(item.title)}</h1>
<p>${esc(item.description)}</p>
<p><a href="${esc(pageUrl)}">Open on ODUSBABA</a></p>
</body>
</html>`;
}
