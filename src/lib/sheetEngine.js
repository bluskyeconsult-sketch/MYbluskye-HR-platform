// src/lib/sheetEngine.js
// Small, dependency-free spreadsheet engine for My Documents.
// Supports: numbers, text, cell references (A1), ranges (A1:B5), + - * / ^, brackets,
// and the functions SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS.
// Errors: #DIV/0!, #VALUE!, #REF!, #NAME?, #CYCLE!, #ERR!

export const MAX_ROWS = 200;
export const MAX_COLS = 26;

export function colName(i) { return String.fromCharCode(65 + i); }
export function cellKey(r, c) { return colName(c) + (r + 1); }

export function parseRef(ref) {
    const m = /^([A-Z])([1-9][0-9]{0,2})$/.exec(ref);
    if (!m) return null;
    return { c: m[1].charCodeAt(0) - 65, r: parseInt(m[2], 10) - 1 };
}

class SheetError extends Error {
    constructor(code) { super(code); this.code = code; }
}

function tokenize(src) {
    const tokens = [];
    let i = 0;
    while (i < src.length) {
        const ch = src[i];
        if (ch === ' ') { i++; continue; }
        if (/[0-9.]/.test(ch)) {
            let j = i;
            while (j < src.length && /[0-9.]/.test(src[j])) j++;
            const n = Number(src.slice(i, j));
            if (Number.isNaN(n)) throw new SheetError('#ERR!');
            tokens.push({ t: 'num', v: n });
            i = j;
            continue;
        }
        if (/[A-Za-z]/.test(ch)) {
            let j = i;
            while (j < src.length && /[A-Za-z0-9]/.test(src[j])) j++;
            const word = src.slice(i, j).toUpperCase();
            if (src[j] === '(') { tokens.push({ t: 'fn', v: word }); i = j; continue; }
            if (!parseRef(word)) throw new SheetError('#NAME?');
            if (src[j] === ':') {
                let k = j + 1;
                while (k < src.length && /[A-Za-z0-9]/.test(src[k])) k++;
                const end = src.slice(j + 1, k).toUpperCase();
                if (!parseRef(end)) throw new SheetError('#REF!');
                tokens.push({ t: 'range', a: word, b: end });
                i = k;
            } else {
                tokens.push({ t: 'ref', v: word });
                i = j;
            }
            continue;
        }
        if ('+-*/^(),'.includes(ch)) { tokens.push({ t: ch }); i++; continue; }
        throw new SheetError('#ERR!');
    }
    return tokens;
}

const round10 = (v) => Math.round(v * 1e10) / 1e10;

// cells: { "A1": "raw text or =formula" }.  Returns the displayed value (number or string).
export function evaluateCell(cells, key, stack = []) {
    const cache = evaluateCell._cache;
    if (cache && cache.has(key)) return cache.get(key);
    if (stack.includes(key)) return '#CYCLE!';
    const raw = cells[key];
    let result;
    if (raw === undefined || raw === null || raw === '') {
        result = '';
    } else if (typeof raw === 'string' && raw.startsWith('=')) {
        try {
            result = evalFormula(cells, raw.slice(1), [...stack, key]);
            if (typeof result === 'number') result = round10(result);
        } catch (e) {
            result = e instanceof SheetError ? e.code : '#ERR!';
        }
    } else if (typeof raw === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(raw)) {
        result = Number(raw);
    } else {
        result = String(raw);
    }
    if (cache) cache.set(key, result);
    return result;
}

export function evaluateAll(cells) {
    evaluateCell._cache = new Map();
    const out = {};
    try {
        for (const key of Object.keys(cells)) out[key] = evaluateCell(cells, key);
    } finally {
        evaluateCell._cache = null;
    }
    return out;
}

function rangeKeys(a, b) {
    const pa = parseRef(a), pb = parseRef(b);
    if (!pa || !pb) throw new SheetError('#REF!');
    const keys = [];
    for (let r = Math.min(pa.r, pb.r); r <= Math.max(pa.r, pb.r); r++) {
        for (let c = Math.min(pa.c, pb.c); c <= Math.max(pa.c, pb.c); c++) keys.push(cellKey(r, c));
    }
    if (keys.length > 5000) throw new SheetError('#REF!');
    return keys;
}

function evalFormula(cells, src, stack) {
    const tokens = tokenize(src);
    let p = 0;
    const peek = () => tokens[p];
    const take = (t) => { if (tokens[p] && tokens[p].t === t) { return tokens[p++]; } return null; };

    const valueOfCell = (key) => {
        const v = evaluateCell(cells, key, stack);
        if (typeof v === 'string' && v.startsWith('#')) throw new SheetError(v);
        return v;
    };
    const asNumber = (v) => {
        if (v === '') return 0;
        if (typeof v === 'number') return v;
        throw new SheetError('#VALUE!');
    };

    function parseExpr() {
        let left = parseTerm();
        for (;;) {
            if (take('+')) left = asNumber(left) + asNumber(parseTerm());
            else if (take('-')) left = asNumber(left) - asNumber(parseTerm());
            else return left;
        }
    }
    function parseTerm() {
        let left = parseFactor();
        for (;;) {
            if (take('*')) left = asNumber(left) * asNumber(parseFactor());
            else if (take('/')) {
                const d = asNumber(parseFactor());
                if (d === 0) throw new SheetError('#DIV/0!');
                left = asNumber(left) / d;
            } else return left;
        }
    }
    function parseFactor() {
        const base = parseUnary();
        if (take('^')) return Math.pow(asNumber(base), asNumber(parseFactor()));
        return base;
    }
    function parseUnary() {
        if (take('-')) return -asNumber(parseUnary());
        if (take('+')) return asNumber(parseUnary());
        return parsePrimary();
    }
    function parseArgs() {
        const args = [];
        if (take(')')) return args;
        for (;;) {
            const tk = peek();
            if (tk && tk.t === 'range') {
                p++;
                args.push({ range: rangeKeys(tk.a, tk.b).map(valueOfCell) });
            } else {
                args.push(parseExpr());
            }
            if (take(',')) continue;
            if (take(')')) return args;
            throw new SheetError('#ERR!');
        }
    }
    function flatNumbers(args) {
        const nums = [];
        for (const a of args) {
            if (a && typeof a === 'object' && a.range) { for (const v of a.range) if (typeof v === 'number') nums.push(v); }
            else nums.push(asNumber(a));
        }
        return nums;
    }
    function parsePrimary() {
        const tk = peek();
        if (!tk) throw new SheetError('#ERR!');
        if (take('num')) return tk.v;
        if (tk.t === 'ref') { p++; return valueOfCell(tk.v); }
        if (tk.t === 'range') throw new SheetError('#VALUE!');
        if (tk.t === 'fn') {
            p++;
            if (!take('(')) throw new SheetError('#ERR!');
            const args = parseArgs();
            const nums = () => flatNumbers(args);
            switch (tk.v) {
                case 'SUM': return nums().reduce((a, b) => a + b, 0);
                case 'AVERAGE': { const n = nums(); if (!n.length) throw new SheetError('#DIV/0!'); return n.reduce((a, b) => a + b, 0) / n.length; }
                case 'MIN': { const n = nums(); return n.length ? Math.min(...n) : 0; }
                case 'MAX': { const n = nums(); return n.length ? Math.max(...n) : 0; }
                case 'COUNT': return nums().length;
                case 'ABS': return Math.abs(asNumber(args[0]));
                case 'ROUND': { const d = args[1] === undefined ? 0 : asNumber(args[1]); const f = Math.pow(10, d); return Math.round(asNumber(args[0]) * f) / f; }
                default: throw new SheetError('#NAME?');
            }
        }
        if (take('(')) {
            const v = parseExpr();
            if (!take(')')) throw new SheetError('#ERR!');
            return v;
        }
        throw new SheetError('#ERR!');
    }

    const result = parseExpr();
    if (p < tokens.length) throw new SheetError('#ERR!');
    if (result && typeof result === 'object') throw new SheetError('#VALUE!');
    return result === '' ? 0 : result;   // a formula that points at an empty cell shows 0, like Excel
}

// ---------- CSV ----------
export function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
            else field += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (ch !== '\r') field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

export function csvToCells(text) {
    const grid = parseCsv(text).slice(0, MAX_ROWS);
    const cells = {};
    let cols = 0;
    grid.forEach((row, r) => {
        row.slice(0, MAX_COLS).forEach((v, c) => {
            if (v !== '') cells[cellKey(r, c)] = v;
            cols = Math.max(cols, c + 1);
        });
    });
    return { cells, rows: Math.max(grid.length, 20), cols: Math.max(cols, 8) };
}

export function cellsToCsv(cells, rows, cols) {
    const values = evaluateAll(cells);
    const lines = [];
    for (let r = 0; r < rows; r++) {
        const line = [];
        for (let c = 0; c < cols; c++) {
            let v = values[cellKey(r, c)];
            if (v === undefined) v = '';
            let s = String(v);
            // stop spreadsheet programs from running text that starts with a formula character
            if (typeof v === 'string' && /^[=+\-@]/.test(s) && !s.startsWith('#')) s = "'" + s;
            if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
            line.push(s);
        }
        lines.push(line.join(','));
    }
    while (lines.length && /^,*$/.test(lines[lines.length - 1])) lines.pop();
    return lines.join('\r\n');
}
