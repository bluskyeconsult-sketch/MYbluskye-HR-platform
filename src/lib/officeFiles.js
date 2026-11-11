// src/lib/officeFiles.js
// NEW (2026-11-11): real Word (.docx) and Excel (.xlsx) import and export for My Documents.
// No extra libraries: .docx and .xlsx files are zip files of XML, so this file contains a small zip reader/writer
// (uses the browser's built-in DecompressionStream to unpack) plus the XML for the formatting My Documents supports.
//   Word:  headings, bold/italic/underline/strikethrough, bullet and numbered lists (nested), links, tables, alignment.
//   Excel: numbers, text and the formulas My Documents understands (SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS, + - * / ^).
// Not included: images, charts, comments, macros, styles beyond the above, more than 200 rows x 26 columns.
// Safety: files are only read in the browser, size and unpacked-size limits apply, only the needed parts of the zip are
// opened, macros are never read, and everything imported passes through the same HTML sanitiser as other documents.

import { sanitizeHtml } from './docSanitize';
import { MAX_ROWS, MAX_COLS, cellKey, evaluateAll } from './sheetEngine';

const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

export const MAX_OFFICE_FILE_BYTES = 3 * 1024 * 1024;   // upload size limit
const MAX_PART_BYTES = 12 * 1024 * 1024;                // unpacked size limit per part
const MAX_HTML_CHARS = 900000;

// ================================================================ zip (store only for writing, store/deflate for reading)
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function zipStore(files) {
    // files: [{ name, data: Uint8Array }]
    const chunks = [];
    const central = [];
    let offset = 0;
    const DOS_TIME = 0x6000, DOS_DATE = 0x5A21; // fixed timestamp (2025-01-01 12:00)
    for (const f of files) {
        const nameBytes = enc.encode(f.name);
        const crc = crc32(f.data);
        const lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
        lh.setUint16(8, 0, true); lh.setUint16(10, DOS_TIME, true); lh.setUint16(12, DOS_DATE, true);
        lh.setUint32(14, crc, true); lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true);
        lh.setUint16(26, nameBytes.length, true); lh.setUint16(28, 0, true);
        chunks.push(new Uint8Array(lh.buffer), nameBytes, f.data);
        const ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
        ch.setUint16(10, 0, true); ch.setUint16(12, DOS_TIME, true); ch.setUint16(14, DOS_DATE, true);
        ch.setUint32(16, crc, true); ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.data.length, true);
        ch.setUint16(28, nameBytes.length, true); ch.setUint32(42, offset, true);
        central.push(new Uint8Array(ch.buffer), nameBytes);
        offset += 30 + nameBytes.length + f.data.length;
    }
    let centralSize = 0;
    for (const c of central) centralSize += c.length;
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
    const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
    let total = 0;
    for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
}

async function inflateRaw(bytes, limit) {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot open compressed files. Please update your browser.');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    const parts = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > limit) { try { await reader.cancel(); } catch (e) { /* ignore */ } throw new Error('That file is too large once unpacked.'); }
        parts.push(value);
    }
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
}

// Reads only the entries named in `wanted` (a Set of names). Returns { name: Uint8Array }.
async function zipRead(buffer, wanted) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
        if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This does not look like a Word or Excel file.');
    const count = view.getUint16(eocd + 10, true);
    let p = view.getUint32(eocd + 16, true);
    if (count === 0xFFFF || p === 0xFFFFFFFF) throw new Error('This file is too large or uses an unsupported format.');
    if (count > 5000) throw new Error('This file has too many parts to open safely.');
    const result = {};
    for (let n = 0; n < count; n++) {
        if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) throw new Error('This file looks damaged.');
        const flags = view.getUint16(p + 8, true);
        const method = view.getUint16(p + 10, true);
        const compSize = view.getUint32(p + 20, true);
        const size = view.getUint32(p + 24, true);
        const nameLen = view.getUint16(p + 28, true);
        const extraLen = view.getUint16(p + 30, true);
        const commentLen = view.getUint16(p + 32, true);
        const localOffset = view.getUint32(p + 42, true);
        const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
        p += 46 + nameLen + extraLen + commentLen;
        if (!wanted.has(name)) continue;
        if (flags & 1) throw new Error('Password-protected files cannot be opened here.');
        if (size > MAX_PART_BYTES) throw new Error('That file is too large once unpacked.');
        if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('This file looks damaged.');
        const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
        const raw = bytes.subarray(start, start + compSize);
        if (method === 0) result[name] = raw.slice();
        else if (method === 8) result[name] = await inflateRaw(raw, MAX_PART_BYTES);
        else throw new Error('This file uses an unsupported compression method.');
    }
    return result;
}

// ================================================================ small XML helpers
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
// eslint-disable-next-line no-control-regex
const BAD_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
function xesc(s) {
    return String(s).replace(BAD_XML, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseXml(bytes) {
    const doc = new DOMParser().parseFromString(dec.decode(bytes), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('This file looks damaged.');
    return doc;
}
const kids = (el) => Array.from(el.childNodes).filter(n => n.nodeType === 1);
const ln = (el) => el.localName;
function child(el, name) { return kids(el).find(k => ln(k) === name) || null; }
function attr(el, name) {
    if (!el) return null;
    for (const a of Array.from(el.attributes)) if (a.localName === name) return a.value;
    return null;
}

// ================================================================ HTML -> DOCX
const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function docxStyles() {
    return XML_HEAD + '<w:styles ' + W_NS + '>'
        + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault>'
        + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
        + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
        + [['Heading1', 'heading 1', 40], ['Heading2', 'heading 2', 32], ['Heading3', 'heading 3', 26], ['Heading4', 'heading 4', 24]].map(([id, nm, sz]) =>
            '<w:style w:type="paragraph" w:styleId="' + id + '"><w:name w:val="' + nm + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
            + '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="' + (id.slice(-1) - 1) + '"/></w:pPr>'
            + '<w:rPr><w:b/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr></w:style>').join('')
        + '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr></w:style>'
        + '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
        + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
        + '</w:styles>';
}

function docxNumbering(orderedCount) {
    const lvls = (bullet) => {
        let s = '';
        for (let i = 0; i < 9; i++) {
            s += '<w:lvl w:ilvl="' + i + '"><w:start w:val="1"/><w:numFmt w:val="' + (bullet ? 'bullet' : (i % 3 === 0 ? 'decimal' : i % 3 === 1 ? 'lowerLetter' : 'lowerRoman')) + '"/>'
                + '<w:lvlText w:val="' + (bullet ? (i % 2 === 0 ? '•' : 'o') : '%' + (i + 1) + '.') + '"/><w:lvlJc w:val="left"/>'
                + '<w:pPr><w:ind w:left="' + (720 * (i + 1)) + '" w:hanging="360"/></w:pPr>'
                + (bullet ? '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:hint="default"/></w:rPr>' : '') + '</w:lvl>';
        }
        return s;
    };
    let s = XML_HEAD + '<w:numbering ' + W_NS + '>'
        + '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + lvls(true) + '</w:abstractNum>'
        + '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + lvls(false) + '</w:abstractNum>'
        + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
    for (let i = 0; i < orderedCount; i++) {
        s += '<w:num w:numId="' + (2 + i) + '"><w:abstractNumId w:val="1"/>';
        for (let l = 0; l < 9; l++) s += '<w:lvlOverride w:ilvl="' + l + '"><w:startOverride w:val="1"/></w:lvlOverride>';
        s += '</w:num>';
    }
    return s + '</w:numbering>';
}

export function docxFromHtml(html, title) {
    const doc = new DOMParser().parseFromString('<body>' + sanitizeHtml(html) + '</body>', 'text/html');
    const rels = [];                       // hyperlink relationships
    let orderedCount = 0;
    const relFor = (url) => {
        let i = rels.findIndex(r => r.url === url);
        if (i < 0) { rels.push({ url }); i = rels.length - 1; }
        return 'rIdL' + (i + 1);
    };

    const alignOf = (el) => {
        const m = /text-align\s*:\s*(left|center|right|justify)/i.exec(el.getAttribute && el.getAttribute('style') || '');
        if (!m) return '';
        const v = m[1].toLowerCase();
        return '<w:jc w:val="' + (v === 'justify' ? 'both' : v) + '"/>';
    };

    const runXml = (text, f) => {
        if (!text) return '';
        let rpr = '';
        if (f.code) rpr += '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>';
        if (f.b) rpr += '<w:b/><w:bCs/>';
        if (f.i) rpr += '<w:i/><w:iCs/>';
        if (f.s) rpr += '<w:strike/>';
        if (f.link) rpr += '<w:rStyle w:val="Hyperlink"/>';
        if (f.u && !f.link) rpr += '<w:u w:val="single"/>';
        if (f.sup) rpr += '<w:vertAlign w:val="superscript"/>';
        if (f.sub) rpr += '<w:vertAlign w:val="subscript"/>';
        const pieces = String(text).replace(/\r/g, '').split('\n');
        let out = '';
        pieces.forEach((piece, idx) => {
            if (idx > 0) out += '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:br/></w:r>';
            if (piece) out += '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + xesc(piece) + '</w:t></w:r>';
        });
        return out;
    };

    const inlineXml = (node, f) => {
        let out = '';
        for (const n of Array.from(node.childNodes)) {
            if (n.nodeType === 3) { out += runXml(n.nodeValue.replace(/\s+/g, ' '), f); continue; }
            if (n.nodeType !== 1) continue;
            const t = n.tagName;
            if (t === 'BR') { out += '<w:r><w:br/></w:r>'; continue; }
            const nf = { ...f };
            if (t === 'B' || t === 'STRONG') nf.b = true;
            if (t === 'I' || t === 'EM') nf.i = true;
            if (t === 'U') nf.u = true;
            if (t === 'S') nf.s = true;
            if (t === 'CODE') nf.code = true;
            if (t === 'SUP') nf.sup = true;
            if (t === 'SUB') nf.sub = true;
            if (t === 'A') {
                const href = (n.getAttribute('href') || '').trim();
                if (/^(https?:|mailto:)/i.test(href)) {
                    out += '<w:hyperlink r:id="' + relFor(href) + '" w:history="1">' + inlineXml(n, { ...nf, link: true }) + '</w:hyperlink>';
                } else out += inlineXml(n, nf);
                continue;
            }
            out += inlineXml(n, nf);
        }
        return out;
    };

    const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE', 'HR', 'PRE', 'LI']);

    const paragraph = (content, { style, jc, num, ind, extra } = {}) => {
        let ppr = '';
        if (style) ppr += '<w:pStyle w:val="' + style + '"/>';
        if (num) ppr += '<w:numPr><w:ilvl w:val="' + num.lvl + '"/><w:numId w:val="' + num.id + '"/></w:numPr>';
        if (extra) ppr += extra;
        if (ind) ppr += '<w:ind w:left="' + ind + '"/>';
        if (jc) ppr += jc;
        return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + content + '</w:p>';
    };

    const listXml = (list, depth, indent) => {
        const ordered = list.tagName === 'OL';
        const numId = ordered ? 2 + (orderedCount++) : 1;
        let out = '';
        for (const li of kids(list)) {
            if (li.tagName !== 'LI') continue;
            // split LI into inline content and nested lists
            const inlineHolder = doc.createElement('div');
            const nested = [];
            for (const c of Array.from(li.childNodes)) {
                if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL')) nested.push(c);
                else inlineHolder.appendChild(c.cloneNode(true));
            }
            // flatten <p> inside li
            const flat = inlineHolder.innerHTML.replace(/<\/p>\s*<p[^>]*>/gi, '<br>').replace(/<\/?p[^>]*>/gi, '');
            const holder = doc.createElement('div'); holder.innerHTML = flat;
            out += paragraph(inlineXml(holder, {}), { style: 'ListParagraph', num: { id: numId, lvl: Math.min(depth, 8) }, jc: alignOf(li) });
            for (const nl of nested) out += listXml(nl, depth + 1, indent);
        }
        return out;
    };

    const tableXml = (tbl) => {
        const rows = [];
        const collect = (el) => { for (const k of kids(el)) { if (k.tagName === 'TR') rows.push(k); else if (/^(THEAD|TBODY|TFOOT)$/.test(k.tagName)) collect(k); } };
        collect(tbl);
        if (!rows.length) return '';
        const ncols = Math.max(1, ...rows.map(r => kids(r).filter(c => c.tagName === 'TD' || c.tagName === 'TH').reduce((a, c) => a + (parseInt(c.getAttribute('colspan') || '1', 10) || 1), 0)));
        const colW = Math.floor(9000 / ncols);
        let out = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'
            + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => '<w:' + b + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>').join('')
            + '</w:tblBorders><w:tblLayout w:type="autofit"/></w:tblPr><w:tblGrid>' + Array(ncols).fill('<w:gridCol w:w="' + colW + '"/>').join('') + '</w:tblGrid>';
        for (const tr of rows) {
            out += '<w:tr>';
            let used = 0;
            for (const td of kids(tr)) {
                if (td.tagName !== 'TD' && td.tagName !== 'TH') continue;
                const span = Math.min(parseInt(td.getAttribute('colspan') || '1', 10) || 1, ncols);
                used += span;
                const header = td.tagName === 'TH';
                let inner = blocksXml(td, { b: header });
                if (!inner) inner = '<w:p/>';
                out += '<w:tc><w:tcPr><w:tcW w:w="' + (colW * span) + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') + '</w:tcPr>' + inner + '</w:tc>';
            }
            while (used < ncols) { out += '<w:tc><w:tcPr><w:tcW w:w="' + colW + '" w:type="dxa"/></w:tcPr><w:p/></w:tc>'; used++; }
            out += '</w:tr>';
        }
        return out + '</w:tbl><w:p/>';
    };

    const blocksXml = (container, f = {}, indent = 0) => {
        let out = '';
        let pending = [];               // consecutive inline nodes become one paragraph
        const flush = () => {
            if (!pending.length) return;
            const holder = doc.createElement('div');
            pending.forEach(n => holder.appendChild(n.cloneNode(true)));
            const text = holder.textContent.replace(/\s+/g, '');
            if (text || holder.querySelector('br')) out += paragraph(inlineXml(holder, f), { ind: indent || undefined });
            pending = [];
        };
        for (const n of Array.from(container.childNodes)) {
            if (n.nodeType === 3 || (n.nodeType === 1 && !BLOCK.has(n.tagName))) { pending.push(n); continue; }
            if (n.nodeType !== 1) continue;
            flush();
            const t = n.tagName;
            if (t === 'P') out += paragraph(inlineXml(n, f), { jc: alignOf(n), ind: indent || undefined });
            else if (t === 'DIV') {
                const hasBlock = Array.from(n.children).some(c => BLOCK.has(c.tagName));
                out += hasBlock ? blocksXml(n, f, indent) : paragraph(inlineXml(n, f), { jc: alignOf(n), ind: indent || undefined });
            }
            else if (/^H[1-4]$/.test(t)) out += paragraph(inlineXml(n, f), { style: 'Heading' + t[1], jc: alignOf(n) });
            else if (t === 'UL' || t === 'OL') out += listXml(n, 0, indent);
            else if (t === 'TABLE') out += tableXml(n);
            else if (t === 'BLOCKQUOTE') out += blocksXml(n, { ...f, i: true }, indent + 720);
            else if (t === 'HR') out += paragraph('', { extra: '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="808080"/></w:pBdr>' });
            else if (t === 'PRE') out += paragraph(inlineXml(n, { ...f, code: true }), { ind: indent || undefined });
            else if (t === 'LI') out += paragraph(inlineXml(n, f), { ind: indent || undefined });
        }
        flush();
        return out;
    };

    let body = blocksXml(doc.body);
    if (!body) body = '<w:p/>';
    const documentXml = XML_HEAD + '<w:document ' + W_NS + '><w:body>' + body
        + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';

    const relsXml = XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        + '<Relationship Id="rIdN" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
        + rels.map((r, i) => '<Relationship Id="rIdL' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + xesc(r.url) + '" TargetMode="External"/>').join('')
        + '</Relationships>';

    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const files = [
        ['[Content_Types].xml', XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
            + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            + '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
            + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
        ['_rels/.rels', XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
        ['docProps/core.xml', XML_HEAD + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            + '<dc:title>' + xesc(title || 'Document') + '</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created></cp:coreProperties>'],
        ['word/document.xml', documentXml],
        ['word/styles.xml', docxStyles()],
        ['word/numbering.xml', docxNumbering(orderedCount)],
        ['word/_rels/document.xml.rels', relsXml],
    ];
    return zipStore(files.map(([name, text]) => ({ name, data: enc.encode(text) })));
}

// ================================================================ DOCX -> HTML
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function htmlFromDocx(buffer) {
    const parts = await zipRead(buffer, new Set(['word/document.xml', 'word/styles.xml', 'word/numbering.xml', 'word/_rels/document.xml.rels']));
    if (!parts['word/document.xml']) throw new Error('This does not look like a Word (.docx) file.');
    const docXml = parseXml(parts['word/document.xml']);

    // heading styles: styleId -> level
    const headingOf = {};
    const styleNum = {};   // styleId -> { numId, ilvl } for list styles such as "List Bullet"
    if (parts['word/styles.xml']) {
        const sx = parseXml(parts['word/styles.xml']);
        for (const st of Array.from(sx.getElementsByTagNameNS('*', 'style'))) {
            const id = attr(st, 'styleId'); const nm = attr(child(st, 'name'), 'val') || '';
            const m = /^heading\s*([1-6])$/i.exec(nm) || /^heading([1-6])$/i.exec(id || '');
            const sppr = child(st, 'pPr'); const snp = sppr && child(sppr, 'numPr');
            if (snp && id) styleNum[id] = { numId: attr(child(snp, 'numId'), 'val'), ilvl: attr(child(snp, 'ilvl'), 'val') };
            if (m) headingOf[id] = Math.min(Number(m[1]), 4);
            else if (/^title$/i.test(nm)) headingOf[id] = 1;
        }
    }
    // numbering: numId -> abstract -> level formats
    const numKind = {};   // `${numId}:${ilvl}` -> 'ul' | 'ol'
    if (parts['word/numbering.xml']) {
        const nx = parseXml(parts['word/numbering.xml']);
        const abs = {};
        for (const a of Array.from(nx.getElementsByTagNameNS('*', 'abstractNum'))) {
            const id = attr(a, 'abstractNumId'); abs[id] = {};
            for (const l of kids(a)) if (ln(l) === 'lvl') abs[id][attr(l, 'ilvl')] = attr(child(l, 'numFmt'), 'val');
        }
        for (const n of Array.from(nx.getElementsByTagNameNS('*', 'num'))) {
            const id = attr(n, 'numId'); const aid = attr(child(n, 'abstractNumId'), 'val');
            for (let l = 0; l < 9; l++) numKind[id + ':' + l] = (abs[aid] && abs[aid][String(l)] === 'bullet') || !abs[aid] || !abs[aid][String(l)] ? 'ul' : 'ol';
        }
    }
    // hyperlink targets
    const links = {};
    if (parts['word/_rels/document.xml.rels']) {
        const rx = parseXml(parts['word/_rels/document.xml.rels']);
        for (const r of Array.from(rx.getElementsByTagNameNS('*', 'Relationship'))) {
            if (attr(r, 'TargetMode') === 'External') links[attr(r, 'Id')] = attr(r, 'Target') || '';
        }
    }

    const on = (rpr, name) => {
        const e = rpr && child(rpr, name);
        if (!e) return false;
        const v = attr(e, 'val');
        return !(v === '0' || v === 'false' || v === 'none');
    };

    const runHtml = (r) => {
        const rpr = child(r, 'rPr');
        let text = '';
        for (const c of kids(r)) {
            const n = ln(c);
            if (n === 't') text += esc(c.textContent);
            else if (n === 'tab') text += '&emsp;';
            else if (n === 'br' || n === 'cr') { if (attr(c, 'type') !== 'page') text += '<br>'; }
            else if (n === 'noBreakHyphen') text += '-';
        }
        if (!text) return '';
        if (on(rpr, 'b')) text = '<b>' + text + '</b>';
        if (on(rpr, 'i')) text = '<i>' + text + '</i>';
        if (on(rpr, 'u')) text = '<u>' + text + '</u>';
        if (on(rpr, 'strike')) text = '<s>' + text + '</s>';
        const va = rpr && child(rpr, 'vertAlign');
        if (va && attr(va, 'val') === 'superscript') text = '<sup>' + text + '</sup>';
        if (va && attr(va, 'val') === 'subscript') text = '<sub>' + text + '</sub>';
        return text;
    };

    const inlineHtml = (el) => {
        let out = '';
        for (const c of kids(el)) {
            const n = ln(c);
            if (n === 'r') out += runHtml(c);
            else if (n === 'hyperlink') {
                const inner = inlineHtml(c);
                const id = c.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
                const href = id && links[id];
                out += href && /^(https?:|mailto:)/i.test(href.trim()) ? '<a href="' + esc(href.trim()).replace(/"/g, '&quot;') + '">' + inner + '</a>' : inner;
            }
            else if (n === 'del' || n === 'pPr' || n === 'rPr' || n === 'instrText') continue;
            else if (n === 'ins' || n === 'smartTag' || n === 'sdt' || n === 'sdtContent' || n === 'fldSimple' || n === 'bookmarkStart') out += inlineHtml(c);
        }
        return out;
    };

    let listStack = [];
    let topNumId = null;
    const closeLists = () => { let s = ''; while (listStack.length) s += '</li></' + listStack.pop() + '>'; return s; };

    const paragraphHtml = (p, allowLists) => {
        const ppr = child(p, 'pPr');
        const styleId = ppr && attr(child(ppr, 'pStyle'), 'val');
        const numPr = ppr && child(ppr, 'numPr');
        const content = inlineHtml(p);
        const jcv = ppr && attr(child(ppr, 'jc'), 'val');
        const align = jcv === 'center' ? 'center' : jcv === 'right' || jcv === 'end' ? 'right' : jcv === 'both' ? 'justify' : '';
        const styleAttr = align ? ' style="text-align:' + align + '"' : '';
        const own = numPr ? { numId: attr(child(numPr, 'numId'), 'val'), ilvl: attr(child(numPr, 'ilvl'), 'val') } : (styleId && styleNum[styleId]) || null;
        const numId = own && own.numId;
        if (allowLists && own && numId && numId !== '0') {
            const lvl = Math.min(parseInt(own.ilvl || '0', 10) || 0, 5);
            const kind = numKind[numId + ':' + lvl] || 'ul';
            let s = '';
            if (lvl === 0 && listStack.length && topNumId !== null && topNumId !== numId) s += closeLists();   // a new list starts
            if (lvl === 0) topNumId = numId;
            while (listStack.length > lvl + 1) s += '</li></' + listStack.pop() + '>';
            if (listStack.length === lvl + 1) {
                if (listStack[lvl] !== kind) { s += '</li></' + listStack.pop() + '><' + kind + '>'; listStack.push(kind); s += '<li>'; }
                else s += '</li><li>';
            } else {
                while (listStack.length < lvl + 1) { s += '<' + kind + '><li>'; listStack.push(kind); }
            }
            return s + content;
        }
        let s = allowLists ? closeLists() : '';
        if (styleId && headingOf[styleId]) { const h = headingOf[styleId]; return s + '<h' + h + styleAttr + '>' + content + '</h' + h + '>'; }
        return s + '<p' + styleAttr + '>' + (content || '<br>') + '</p>';
    };

    const tableHtml = (tbl) => {
        let s = '<table>';
        for (const tr of kids(tbl)) {
            if (ln(tr) !== 'tr') continue;
            s += '<tr>';
            for (const tc of kids(tr)) {
                if (ln(tc) !== 'tc') continue;
                const tcpr = child(tc, 'tcPr');
                const span = tcpr && attr(child(tcpr, 'gridSpan'), 'val');
                let inner = '';
                for (const b of kids(tc)) {
                    if (ln(b) === 'p') inner += paragraphHtml(b, false);
                    else if (ln(b) === 'tbl') inner += tableHtml(b);
                }
                s += '<td' + (span && /^\d{1,2}$/.test(span) && span !== '1' ? ' colspan="' + span + '"' : '') + '>' + (inner || '<br>') + '</td>';
            }
            s += '</tr>';
        }
        return s + '</table>';
    };

    const body = Array.from(docXml.getElementsByTagNameNS('*', 'body'))[0];
    if (!body) throw new Error('This does not look like a Word (.docx) file.');
    let html = '';
    const walk = (container) => {
        for (const b of kids(container)) {
            const n = ln(b);
            if (n === 'p') html += paragraphHtml(b, true);
            else if (n === 'tbl') { html += closeLists() + tableHtml(b); }
            else if (n === 'sdt') { const sc = child(b, 'sdtContent'); if (sc) walk(sc); }
        }
    };
    walk(body);
    html += closeLists();
    if (html.length > MAX_HTML_CHARS * 3) throw new Error('That document is too large to import.');
    const clean = sanitizeHtml(html).trim();
    if (clean.length > MAX_HTML_CHARS) throw new Error('That document is too large to import (limit about 900 KB of text).');
    return clean || '<p><br></p>';
}

// ================================================================ formulas that are safe to write to / read from Excel
const SAFE_FUNCS = new Set(['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ROUND', 'ABS']);
export function isSafeFormula(src) {
    // src: text after "=". Only cell refs, ranges, numbers, + - * / ^, brackets, commas and the functions above.
    if (typeof src !== 'string' || !src.length || src.length > 500) return false;
    if (!/^[A-Za-z0-9_.+\-*/^(),:\s]+$/.test(src)) return false;
    const names = src.match(/[A-Za-z_][A-Za-z0-9_.]*/g) || [];
    for (const nm of names) {
        if (/^[A-Za-z]{1,2}\d{1,4}$/.test(nm)) continue;                  // cell reference
        if (SAFE_FUNCS.has(nm.toUpperCase()) && new RegExp(nm + '\\s*\\(').test(src)) continue;
        return false;
    }
    return true;
}

// ================================================================ CELLS -> XLSX
const NUM_RE = /^-?(0|[1-9]\d{0,14})(\.\d{1,15})?([eE][-+]?\d{1,3})?$/;

export function xlsxFromCells(cells, rows, cols, title) {
    const values = evaluateAll(cells);
    const maxR = Math.min(rows || MAX_ROWS, MAX_ROWS), maxC = Math.min(cols || MAX_COLS, MAX_COLS);
    let sheetRows = '';
    for (let r = 0; r < maxR; r++) {
        let rowXml = '';
        for (let c = 0; c < maxC; c++) {
            const key = cellKey(r, c);
            const raw = cells[key];
            if (raw === undefined || raw === null || raw === '') continue;
            const text = String(raw);
            if (text.startsWith('=') && isSafeFormula(text.slice(1))) {
                const v = values[key];
                const f = '<f>' + xesc(text.slice(1).trim()) + '</f>';
                if (typeof v === 'number' && isFinite(v)) rowXml += '<c r="' + key + '">' + f + '<v>' + v + '</v></c>';
                else if (typeof v === 'string' && v.startsWith('#')) rowXml += '<c r="' + key + '" t="e">' + f + '<v>' + xesc(v) + '</v></c>';
                else rowXml += '<c r="' + key + '" t="str">' + f + '<v>' + xesc(v === undefined ? '' : v) + '</v></c>';
            } else if (NUM_RE.test(text.trim())) {
                rowXml += '<c r="' + key + '"><v>' + text.trim() + '</v></c>';
            } else {
                // everything else is written as text, so nothing typed into a cell can run as a formula in Excel
                rowXml += '<c r="' + key + '" t="inlineStr"><is><t xml:space="preserve">' + xesc(text) + '</t></is></c>';
            }
        }
        if (rowXml) sheetRows += '<row r="' + (r + 1) + '">' + rowXml + '</row>';
    }
    const sheetXml = XML_HEAD + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="' + maxC + '" width="16" customWidth="1"/></cols><sheetData>' + sheetRows + '</sheetData></worksheet>';
    const name = xesc((title || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet1');
    const files = [
        ['[Content_Types].xml', XML_HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
            + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
        ['_rels/.rels', XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
        ['xl/workbook.xml', XML_HEAD + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + name + '" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'],
        ['xl/_rels/workbook.xml.rels', XML_HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
        ['xl/styles.xml', XML_HEAD + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
        ['xl/worksheets/sheet1.xml', sheetXml],
    ];
    return zipStore(files.map(([n, t]) => ({ name: n, data: enc.encode(t) })));
}

// ================================================================ XLSX -> CELLS
function colIndex(letters) {
    let n = 0;
    for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
}

export async function cellsFromXlsx(buffer) {
    const parts = await zipRead(buffer, new Set(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml']
        .concat(Array.from({ length: 12 }, (_, i) => 'xl/worksheets/sheet' + (i + 1) + '.xml'))));
    if (!parts['xl/workbook.xml']) throw new Error('This does not look like an Excel (.xlsx) file.');
    // first sheet in the workbook
    let sheetPath = 'xl/worksheets/sheet1.xml';
    try {
        const wb = parseXml(parts['xl/workbook.xml']);
        const first = Array.from(wb.getElementsByTagNameNS('*', 'sheet'))[0];
        const rid = first && first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        if (rid && parts['xl/_rels/workbook.xml.rels']) {
            const rx = parseXml(parts['xl/_rels/workbook.xml.rels']);
            const rel = Array.from(rx.getElementsByTagNameNS('*', 'Relationship')).find(r => attr(r, 'Id') === rid);
            if (rel) {
                let t = attr(rel, 'Target') || '';
                t = t.startsWith('/') ? t.slice(1) : 'xl/' + t;
                if (/^xl\/worksheets\/sheet\d+\.xml$/.test(t)) sheetPath = t;
            }
        }
    } catch (e) { /* fall back to sheet1 */ }
    if (!parts[sheetPath]) {
        // the first sheet might be numbered beyond what we pre-read; read it now
        const extra = await zipRead(buffer, new Set([sheetPath]));
        if (extra[sheetPath]) parts[sheetPath] = extra[sheetPath];
    }
    if (!parts[sheetPath]) throw new Error('Could not find the first sheet in this file.');

    const shared = [];
    if (parts['xl/sharedStrings.xml']) {
        const sx = parseXml(parts['xl/sharedStrings.xml']);
        for (const si of Array.from(sx.getElementsByTagNameNS('*', 'si'))) {
            let t = '';
            for (const tn of Array.from(si.getElementsByTagNameNS('*', 't'))) {
                // ignore phonetic runs
                if (tn.parentNode && ln(tn.parentNode) === 'rPh') continue;
                t += tn.textContent;
            }
            shared.push(t);
        }
    }

    const sheet = parseXml(parts[sheetPath]);
    const cells = {};
    let usedRows = 0, usedCols = 0, truncated = false, formulasKept = 0, formulasValueOnly = 0;
    for (const c of Array.from(sheet.getElementsByTagNameNS('*', 'c'))) {
        const ref = attr(c, 'r');
        const m = ref && /^([A-Za-z]{1,3})(\d{1,7})$/.exec(ref);
        if (!m) continue;
        const ci = colIndex(m[1]); const ri = Number(m[2]) - 1;
        if (ci >= MAX_COLS || ri >= MAX_ROWS) { truncated = true; continue; }
        const t = attr(c, 't');
        const vEl = child(c, 'v'); const fEl = child(c, 'f'); const isEl = child(c, 'is');
        let value = '';
        if (t === 's') value = shared[Number(vEl ? vEl.textContent : -1)] || '';
        else if (t === 'inlineStr' && isEl) value = Array.from(isEl.getElementsByTagNameNS('*', 't')).map(x => x.textContent).join('');
        else if (t === 'b') value = vEl && vEl.textContent === '1' ? 'TRUE' : 'FALSE';
        else value = vEl ? vEl.textContent.trim() : '';
        if (fEl) {
            const ftext = (fEl.textContent || '').trim();
            if (ftext && isSafeFormula(ftext)) { value = '=' + ftext; formulasKept++; }
            else if (ftext || attr(fEl, 't') === 'shared') formulasValueOnly++;
        }
        if (value === '') continue;
        cells[cellKey(ri, ci)] = String(value).slice(0, 2000);
        usedRows = Math.max(usedRows, ri + 1); usedCols = Math.max(usedCols, ci + 1);
    }
    return {
        sheet: { cells, rows: Math.min(Math.max(usedRows + 5, 20), MAX_ROWS), cols: Math.min(Math.max(usedCols, 8), MAX_COLS) },
        notes: { truncated, formulasValueOnly },
    };
}

