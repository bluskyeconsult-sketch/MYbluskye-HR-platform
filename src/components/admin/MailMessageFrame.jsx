// src/components/admin/MailMessageFrame.jsx
//
// NEW (2026-10-16): shows one received email safely. Email from outside people is untrusted, so:
//   - scripts, forms, embeds and styles are stripped (DOMPurify)
//   - remote images are blocked until the admin clicks "Show images" (they can track you)
//   - links are limited to web, mail and phone links, and open in a new tab
//   - the message sits in a sandboxed frame with its own content policy, apart from the admin page

import { useMemo, useRef, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function prepareEmailHtml(html, text, showImages) {
    if (!html) {
        return { html: `<pre style="white-space:pre-wrap;font:14px/1.55 system-ui,sans-serif;margin:0">${esc(text || '')}</pre>`, blocked: 0 };
    }
    const clean = DOMPurify.sanitize(html, {
        FORBID_TAGS: ['style', 'script', 'form', 'input', 'button', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'svg', 'math', 'video', 'audio'],
        FORBID_ATTR: ['srcset', 'background', 'action', 'formaction', 'ping'],
        ALLOW_DATA_ATTR: false
    });
    const doc = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html');
    let blocked = 0;
    doc.querySelectorAll('img').forEach((img) => {
        const src = img.getAttribute('src') || '';
        const isData = /^data:image\/(png|jpe?g|gif|webp);/i.test(src);
        const isRemote = /^https:\/\//i.test(src);
        if (isData) return;
        if (isRemote && showImages) return;
        if (isRemote) blocked++;
        img.removeAttribute('src');
        img.setAttribute('alt', img.getAttribute('alt') || '[image blocked]');
        img.style.display = 'none';
    });
    doc.querySelectorAll('[style]').forEach((el) => {
        const st = el.getAttribute('style') || '';
        if (/url\s*\(|expression|@import|javascript:/i.test(st)) el.removeAttribute('style');
    });
    let mismatched = 0;
    doc.querySelectorAll('a').forEach((a) => {
        const href = (a.getAttribute('href') || '').trim();
        if (!/^(https?:|mailto:|tel:)/i.test(href)) { a.removeAttribute('href'); return; }
        a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer nofollow');
        if (/^https?:/i.test(href)) {
            let host = '';
            try { host = new URL(href).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ }
            const shown = (a.textContent || '').trim();
            const looksLikeUrl = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/|$|\s)/i.test(shown);
            let shownHost = '';
            if (looksLikeUrl) { try { shownHost = new URL(/^https?:/i.test(shown) ? shown.split(/\s/)[0] : `https://${shown.split(/\s|\//)[0]}`).hostname.replace(/^www\./, ''); } catch (e) { /* ignore */ } }
            const bad = looksLikeUrl && shownHost && host && shownHost !== host && !host.endsWith('.' + shownHost);
            if (bad) mismatched++;
            // every link shows where it really goes
            const tag = doc.createElement('span');
            tag.textContent = ` [goes to ${host || 'unknown'}]`;
            tag.setAttribute('style', `font-size:11px;font-weight:600;color:${bad ? '#b91c1c' : '#64748b'}`);
            a.after(tag);
            a.setAttribute('title', href);
        }
    });
    return { html: doc.body.innerHTML, blocked, mismatched };
}

export default function MailMessageFrame({ html, text }) {
    const [showImages, setShowImages] = useState(false);
    const ref = useRef(null);
    const [height, setHeight] = useState(120);
    const prepared = useMemo(() => prepareEmailHtml(html, text, showImages), [html, text, showImages]);

    const srcDoc = useMemo(() => `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${showImages ? 'https:' : ''}; style-src 'unsafe-inline'">
<base target="_blank">
<style>body{margin:0;padding:2px;font:14px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;background:#fff;word-wrap:break-word;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}blockquote{margin:8px 0;padding-left:10px;border-left:3px solid #cbd5e1;color:#475569}a{color:#1d4ed8}</style>
</head><body>${prepared.html}</body></html>`, [prepared.html, showImages]);

    useEffect(() => { setHeight(120); }, [srcDoc]);

    function measure() {
        try {
            const d = ref.current && ref.current.contentDocument;
            if (d && d.documentElement) setHeight(Math.min(4000, Math.max(80, d.documentElement.scrollHeight + 8)));
        } catch (e) { /* keep default */ }
    }

    return (
        <div>
            {prepared.mismatched > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg px-3 py-2 mb-2">
                    {prepared.mismatched} link{prepared.mismatched === 1 ? '' : 's'} in this message show one web address but lead to another. That is a common phishing trick. Do not click them.
                </div>
            )}
            {prepared.blocked > 0 && !showImages && (
                <div className="flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs rounded-lg px-3 py-2 mb-2">
                    <span>{prepared.blocked} remote image{prepared.blocked === 1 ? '' : 's'} blocked to protect your privacy.</span>
                    <button onClick={() => setShowImages(true)} className="underline hover:text-white flex-shrink-0">Show images</button>
                </div>
            )}
            <iframe
                ref={ref}
                title="Email message"
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                srcDoc={srcDoc}
                onLoad={measure}
                style={{ width: '100%', height, border: 0, background: '#fff', borderRadius: 8 }}
            />
        </div>
    );
}
