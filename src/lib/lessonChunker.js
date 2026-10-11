// src/lib/lessonChunker.js
//
// NEW (2026-10-11): turns a long lesson (plain text or light markdown) into short,
// readable "steps" for the lesson reader, so learners see one idea at a time instead of
// one long wall of text.
//
// What it does, in order:
//   1. Cleans line endings.
//   2. Heals lessons where inline code was pasted onto its own line (for example
//      "...using the" / "torch.tensor()" / "function. For example...") back into one sentence.
//   3. Groups consecutive code lines into code blocks (also reads ``` fences).
//   4. Splits the lesson into steps: by ## headings when present, otherwise by length
//      (about 2 short paragraphs per step), keeping a code block with the paragraph that
//      introduces it.
//   5. Marks a closing "In summary / In conclusion" paragraph as the recap step.
//
// Pure functions, no dependencies. Never throws: on any problem it returns a single step
// holding the original text.

const SENTENCE_END = /[.!?:)"”'’]$/;
const FRAGMENT_SPACE = /\s/;

function normalise(text) {
    return String(text ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ');
}

// A line that is clearly program code.
function isCodeLine(line) {
    if (!line) return false;
    if (/^( {2,}|\t)\S/.test(line)) return true;                        // indented
    if (/^(import |from \S+ import |class \w+|def \w+\(|@\w+|async def |#include|<\?php|SELECT |INSERT |UPDATE |CREATE )/.test(line)) return true;
    if (/^(for|while|if|elif|else|try|except|finally|with)\b.*:\s*$/.test(line) && /[()=\[\]]|:$/.test(line) && !/[.!?]\s/.test(line)) return true;
    if (/^return\b/.test(line)) return true;
    if (/^[A-Za-z_][\w.]*(\[[^\]]*\])?\s*(=|\+=|-=|\*=|\/=)\s*\S/.test(line) && !/\.\s+[A-Z]/.test(line)) return true; // x = ...
    if (/^[A-Za-z_][\w.]*\(.*\)\s*(#.*)?$/.test(line) && !/\s(is|are|the|and|to)\s/.test(line.split('#')[0])) return true;  // fn(...)
    if (/^(print|console\.log|System\.out)\b/.test(line)) return true;
    return false;
}

// A short token that was meant to sit inside a sentence (an inline code word).
function isFragment(line) {
    const t = line.trim();
    if (!t || t.length > 60) return false;
    if (/^[+\-*/=<>%]{1,3}$/.test(t)) return true;                       // an operator on its own line
    if (FRAGMENT_SPACE.test(t)) return /^[\w.]+=\S+$/.test(t) ? true : false; // no spaces allowed (except key=value written tight)
    return /^[.\w]+(\(.*\))?$/.test(t) || /^[.\w]+\[.*\]$/.test(t) || /^[.\w]+=[\w.]+$/.test(t);
}

// Rejoins "text" / "code" / "text" lines into one sentence with inline code marks.
function healInlineFragments(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prev = out.length ? out[out.length - 1] : null;
        const next = i + 1 < lines.length ? lines[i + 1] : null;
        const proseBefore = prev !== null && prev.trim() !== '' && !isCodeLine(prev) && !prev.startsWith('```');
        const proseAfter = next !== null && next.trim() !== '' && !isCodeLine(next);
        const looksInline =
            proseBefore && proseAfter && isFragment(line) &&
            (!SENTENCE_END.test(prev.trim()) || prev.trim().endsWith(':') === false) &&
            (!SENTENCE_END.test(prev.trim()) || /^[a-z.,;:)]/.test(next.trim()) || /^[.,;:)]/.test(next.trim()));
        if (looksInline && !prev.includes('`__BLOCK__`')) {
            const frag = line.trim();
            const glue = /^[.,;:)]/.test((next || '').trim()) ? '' : ' ';
            out[out.length - 1] = `${prev.replace(/\s+$/, '')} \`${frag}\`${glue}`;
            // pull the following prose line onto the same line so the sentence is whole
            out[out.length - 1] += next.trim();
            i++;
            // a second fragment may follow immediately (rare) - the loop handles it on the next pass
            continue;
        }
        out.push(line);
    }
    return out;
}

// Turns lines into blocks: { type: 'p' | 'code' | 'h2' | 'h3' | 'ul' | 'ol', ... }
function toBlocks(lines) {
    const blocks = [];
    let para = [];
    let code = null;
    let fenced = false;
    let list = null;

    const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ').replace(/\s+/g, ' ').trim() }); para = []; } };
    const flushList = () => { if (list) { blocks.push(list); list = null; } };
    const flushCode = () => { if (code && code.lines.some(l => l.trim())) blocks.push({ type: 'code', text: code.lines.join('\n').replace(/\s+$/, ''), lang: code.lang }); code = null; };

    for (const raw of lines) {
        const line = raw.replace(/\s+$/, '');
        if (/^```/.test(line.trim())) {
            if (fenced) { fenced = false; flushCode(); }
            else { flushPara(); flushList(); fenced = true; code = { lines: [], lang: line.trim().slice(3).trim() }; }
            continue;
        }
        if (fenced) { code.lines.push(raw); continue; }

        if (line.trim() === '') {
            if (code) { code.lines.push(''); continue; }   // blank line inside a run of code
            flushPara(); flushList();
            continue;
        }
        const h = line.match(/^(#{1,3})\s+(.+)/);
        if (h) { flushPara(); flushList(); flushCode(); blocks.push({ type: h[1].length === 1 ? 'h2' : h[1].length === 2 ? 'h2' : 'h3', text: h[2].trim() }); continue; }

        if (isCodeLine(line)) {
            flushPara(); flushList();
            if (!code) code = { lines: [], lang: '' };
            code.lines.push(raw);
            continue;
        }
        if (code) flushCode();

        const ul = line.match(/^\s*[-*•]\s+(.+)/);
        const ol = line.match(/^\s*\d+[.)]\s+(.+)/);
        if (ul || ol) {
            flushPara();
            const kind = ul ? 'ul' : 'ol';
            if (!list || list.type !== kind) { flushList(); list = { type: kind, items: [] }; }
            list.items.push((ul || ol)[1].trim());
            continue;
        }
        flushList();
        para.push(line.trim());
    }
    flushPara(); flushList(); flushCode();
    return blocks;
}

function guessLang(code, hint) {
    if (hint) return hint;
    if (/\b(import|def|class|self|print)\b|torch\.|np\.|:\s*$/m.test(code)) return 'Python';
    if (/\b(const|let|function|=>|console\.log)\b/.test(code)) return 'JavaScript';
    if (/\b(SELECT|INSERT|UPDATE|FROM|WHERE)\b/i.test(code)) return 'SQL';
    return 'Code';
}

const RECAP = /^(in (summary|conclusion|short|closing)|to (summari[sz]e|conclude|recap)|key takeaways?|summary\b)/i;
const wordCount = s => (String(s).match(/\S+/g) || []).length;

function sizeOf(block) {
    if (block.type === 'code') return 0;                                  // code rides with the text before it
    if (block.type === 'p') return wordCount(block.text);
    if (block.type === 'ul' || block.type === 'ol') return block.items.reduce((n, x) => n + wordCount(x), 0);
    return 0;
}

const TARGET_WORDS = 110;      // aim for about a minute of reading per step
const MAX_WORDS = 190;

export function chunkLesson(content) {
    const original = normalise(content).trim();
    if (!original) return [];
    try {
        const lines = healInlineFragments(original.split('\n'));
        const blocks = toBlocks(lines).map(b => b.type === 'code' ? { ...b, lang: guessLang(b.text, b.lang) } : b);
        if (blocks.length === 0) return [{ title: '', kind: 'step', blocks: [{ type: 'p', text: original }] }];

        // 1. Split on headings when the lesson has them.
        const hasHeadings = blocks.some(b => b.type === 'h2');
        const sections = [];
        if (hasHeadings) {
            let cur = { title: '', blocks: [] };
            for (const b of blocks) {
                if (b.type === 'h2') { if (cur.blocks.length || cur.title) sections.push(cur); cur = { title: b.text, blocks: [] }; }
                else cur.blocks.push(b);
            }
            if (cur.blocks.length || cur.title) sections.push(cur);
        } else {
            sections.push({ title: '', blocks });
        }

        // 2. Within each section, group blocks into steps of a comfortable length.
        const steps = [];
        for (const sec of sections) {
            let cur = { title: sec.title, kind: 'step', blocks: [], words: 0 };
            const push = () => { if (cur.blocks.length) steps.push({ title: cur.title, kind: cur.kind, blocks: cur.blocks }); cur = { title: '', kind: 'step', blocks: [], words: 0 }; };
            for (let i = 0; i < sec.blocks.length; i++) {
                const b = sec.blocks[i];
                const w = sizeOf(b);
                if (b.type === 'p' && RECAP.test(b.text)) { push(); steps.push({ title: 'Recap', kind: 'recap', blocks: [b] }); continue; }
                const startsNewTopic = cur.blocks.length > 0 && b.type !== 'code' && (cur.words + w > MAX_WORDS || (cur.words >= TARGET_WORDS && cur.blocks[cur.blocks.length - 1].type !== 'p'));
                const tooFullForAnother = cur.blocks.length > 0 && b.type === 'p' && cur.words >= TARGET_WORDS;
                if (startsNewTopic || tooFullForAnother) push();
                cur.blocks.push(b);
                cur.words += w;
                // A code block closes the step so each example sits with its explanation.
                if (b.type === 'code' && cur.words >= 25) push();
            }
            push();
        }

        // 3. Give steps a friendly label.
        let n = 0;
        return steps.map((s, i) => {
            if (s.kind === 'recap') return { ...s, label: 'Recap' };
            n++;
            const label = s.title || (i === 0 ? 'Introduction' : `Part ${n}`);
            return { ...s, label };
        });
    } catch (e) {
        return [{ title: '', kind: 'step', label: 'Lesson', blocks: [{ type: 'p', text: original }] }];
    }
}

export function readingMinutes(content) {
    const words = wordCount(content);
    return Math.max(1, Math.round(words / 200));
}

// Splits a text line into plain and formatted pieces: `code` and **bold**.
export function inlinePieces(text) {
    const out = [];
    const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let last = 0, m;
    const s = String(text ?? '');
    while ((m = re.exec(s)) !== null) {
        if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
        const tok = m[0];
        out.push(tok.startsWith('`') ? { t: 'code', v: tok.slice(1, -1) } : { t: 'bold', v: tok.slice(2, -2) });
        last = m.index + tok.length;
    }
    if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
    return out;
}
