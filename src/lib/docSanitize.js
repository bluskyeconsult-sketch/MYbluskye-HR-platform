// src/lib/docSanitize.js
// Cleans HTML before it is saved or shown in My Documents (pasted text, imported .html files).
// Allows basic formatting only. Removes scripts, styles, frames, forms, event handlers and unsafe links.

const ALLOWED = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'A',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'BLOCKQUOTE', 'HR', 'SPAN', 'DIV', 'CODE', 'PRE', 'SUB', 'SUP']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT',
    'LINK', 'META', 'BASE', 'SVG', 'MATH', 'AUDIO', 'VIDEO', 'CANVAS', 'TEMPLATE', 'NOSCRIPT', 'IMG', 'HEAD', 'TITLE']);

function scrubAttributes(el) {
    const tag = el.tagName;
    for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        let keep = false;
        if (tag === 'A' && name === 'href' && /^(https?:|mailto:|#)/i.test(value.trim())) keep = true;
        if ((tag === 'TD' || tag === 'TH') && (name === 'colspan' || name === 'rowspan') && /^\d{1,2}$/.test(value)) keep = true;
        if (name === 'style') {
            const m = /text-align\s*:\s*(left|center|right|justify)/i.exec(value);
            el.setAttribute('style', m ? 'text-align:' + m[1].toLowerCase() : '');
            if (!m) el.removeAttribute('style');
            continue;
        }
        if (!keep) el.removeAttribute(attr.name);
    }
    if (tag === 'A') {
        if (el.getAttribute('href')) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
    }
}

function clean(node) {
    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 8) { child.remove(); continue; }            // comments
        if (child.nodeType !== 1) continue;                                 // text stays
        if (DROP.has(child.tagName.toUpperCase())) { child.remove(); continue; }
        clean(child);
        if (!ALLOWED.has(child.tagName)) {
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            child.remove();
        } else {
            scrubAttributes(child);
        }
    }
}

export function sanitizeHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString('<body>' + String(html) + '</body>', 'text/html');
    clean(doc.body);
    return doc.body.innerHTML;
}

export function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function textToHtml(text) {
    return String(text).split(/\r?\n/).map(line => '<p>' + (escapeHtml(line) || '<br>') + '</p>').join('');
}
